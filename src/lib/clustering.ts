import { ScoredArticle, RelatedSource } from '../types';
import { callClaude } from './claude';
import { SNIPPET_LENGTH } from '../config/constants';

interface ClusterSpec {
  indices: number[];
  title: string;
  summary: string;
}

interface ClusterResponse {
  clusters: ClusterSpec[];
}

function buildClusteringPrompt(articles: ScoredArticle[]): string {
  const articleList = articles
    .map((a, i) => {
      const snippet = (a.snippet || a.content || '').slice(0, SNIPPET_LENGTH);
      return `[${i}] "${a.title}" (${a.sourceName})\n${snippet}`;
    })
    .join('\n\n');

  return `Identify groups of articles covering the SAME specific story or event — for example, the same product announcement, the same paper release, the same acquisition, the same incident. Do NOT group articles that merely share a topic or theme (e.g., "both about AI safety" is NOT a cluster; "both about yesterday's GPT-5 launch" IS a cluster).

For each cluster of 2 or more articles, write:
- a unified title (neutral, news-style, <= 90 chars) that describes the shared story
- a unified 2-3 sentence summary that synthesizes what all the sources are saying. Do not start with "This article" or "Summary:". Get straight to the substance.

Return ONLY a JSON object in this shape (no prose, no markdown):
{
  "clusters": [
    { "indices": [0, 3, 5], "title": "...", "summary": "..." }
  ]
}

If no articles cover the same story, return {"clusters": []}. Every index must appear in at most one cluster. Singletons should NOT be returned.

Articles:

${articleList}`;
}

function parseClusterResponse(response: string): ClusterResponse {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON object found in clustering response');
  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed || !Array.isArray(parsed.clusters)) {
    throw new Error('Clustering response missing clusters array');
  }
  return parsed as ClusterResponse;
}

/**
 * Identify articles covering the same story and collapse them into a single
 * "primary" entry with the others attached as relatedSources. The primary is
 * the highest-scoring member of the cluster; its title and feedSummary are
 * replaced with the unified cluster title/summary so the downstream summarizer
 * will pass them through without another Claude call.
 */
export async function clusterArticles(
  articles: ScoredArticle[]
): Promise<ScoredArticle[]> {
  if (articles.length < 2) return articles;

  let parsed: ClusterResponse;
  try {
    const response = await callClaude(buildClusteringPrompt(articles));
    parsed = parseClusterResponse(response);
  } catch (err) {
    console.warn('Clustering failed, continuing without clustering:', (err as Error).message);
    return articles;
  }

  const absorbed = new Set<number>();
  const clustered: ScoredArticle[] = [];

  for (const cluster of parsed.clusters) {
    const validIndices = (cluster.indices || []).filter(
      (i) => Number.isInteger(i) && i >= 0 && i < articles.length && !absorbed.has(i)
    );
    if (validIndices.length < 2) continue;

    const members = validIndices.map((i) => articles[i]);
    // Highest score wins. Tie-breaker: earlier publishedAt (so we prefer the
    // original reporting over later aggregators).
    members.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.publishedAt.getTime() - b.publishedAt.getTime();
    });

    const primary = members[0];
    const related: RelatedSource[] = members.slice(1).map((m) => ({
      title: m.title,
      url: m.url,
      sourceName: m.sourceName,
      viaUrl: m.viaUrl,
    }));

    validIndices.forEach((i) => absorbed.add(i));

    const unifiedTitle = (cluster.title || '').trim() || primary.title;
    const unifiedSummary = (cluster.summary || '').trim();

    clustered.push({
      ...primary,
      title: unifiedTitle,
      // Inject the unified summary as feedSummary so summarizeOne() will use
      // it directly and skip the per-article Claude call.
      feedSummary: unifiedSummary || primary.feedSummary,
      relatedSources: related,
    });
  }

  const leftovers = articles.filter((_, i) => !absorbed.has(i));
  const result = [...clustered, ...leftovers];
  result.sort((a, b) => b.score - a.score);
  return result;
}
