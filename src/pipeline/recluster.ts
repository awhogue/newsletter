import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getDigest, storeDigest } from '../lib/storage';
import { clusterArticles } from '../lib/clustering';
import { resetTokenUsage, getTokenUsage } from '../lib/claude';
import {
  DIGEST_THRESHOLD,
  TOP_STORY_THRESHOLD,
} from '../config/constants';
import { SummarizedArticle, ScoredArticle, Digest } from '../types';

/**
 * Reclusters an existing stored digest. Loads the articles that are already
 * in the digest, strips any prior relatedSources, runs them through
 * clusterArticles(), and writes the new digest back. Useful for testing
 * clustering on historical content without re-fetching feeds.
 */

const date = process.argv[2];
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('Usage: npx tsx src/pipeline/recluster.ts YYYY-MM-DD');
  process.exit(1);
}

async function run() {
  resetTokenUsage();
  console.log(`Loading digest for ${date}...`);
  const digest = await getDigest(date);
  if (!digest) {
    console.error(`No digest found for ${date}`);
    process.exit(1);
  }

  const existing: SummarizedArticle[] = [
    ...digest.topStories,
    ...digest.alsoInteresting,
  ];
  console.log(
    `Loaded ${existing.length} articles (${digest.topStories.length} top, ${digest.alsoInteresting.length} also interesting)`
  );

  // Strip any prior clustering output and normalize publishedAt (JSON gives us strings)
  const normalized: ScoredArticle[] = existing.map((a) => {
    const copy = { ...a } as Partial<SummarizedArticle>;
    delete copy.relatedSources;
    delete copy.summary;
    return {
      ...(copy as ScoredArticle),
      publishedAt: new Date(a.publishedAt as unknown as string),
    };
  });

  console.log(`Clustering ${normalized.length} articles...`);
  const clustered = await clusterArticles(normalized);
  const clusterCount = clustered.filter(
    (a) => a.relatedSources && a.relatedSources.length > 0
  ).length;
  const absorbed = normalized.length - clustered.length;
  console.log(
    `Found ${clusterCount} clusters (absorbed ${absorbed} articles into ${clusterCount} primary entries)`
  );

  // Restore summaries: for new clusters use the freshly-generated unified summary
  // (stashed in feedSummary by clusterArticles); for everything else preserve
  // the original per-article summary.
  const existingById = new Map(existing.map((a) => [a.id, a]));
  const summarized: SummarizedArticle[] = clustered.map((a) => {
    if (a.relatedSources && a.relatedSources.length > 0 && a.feedSummary) {
      return { ...a, summary: a.feedSummary };
    }
    const orig = existingById.get(a.id);
    return { ...a, summary: orig?.summary || '' };
  });

  // Print cluster details
  for (const a of summarized) {
    if (a.relatedSources && a.relatedSources.length > 0) {
      console.log(`\n  CLUSTER [${a.score}/10] ${a.title}`);
      console.log(`    ${a.summary}`);
      console.log(`    primary: ${a.sourceName} — ${a.url}`);
      for (const r of a.relatedSources) {
        console.log(`    related: ${r.sourceName} — ${r.url}`);
      }
    }
  }

  summarized.sort((a, b) => b.score - a.score);
  const topStories = summarized.filter((a) => a.score >= TOP_STORY_THRESHOLD);
  const alsoInteresting = summarized.filter(
    (a) => a.score >= DIGEST_THRESHOLD && a.score < TOP_STORY_THRESHOLD
  );

  const tokens = getTokenUsage();
  const newDigest: Digest = {
    ...digest,
    topStories,
    alsoInteresting,
    metadata: {
      ...digest.metadata,
      tokensUsed: {
        input: (digest.metadata.tokensUsed?.input || 0) + tokens.input,
        output: (digest.metadata.tokensUsed?.output || 0) + tokens.output,
      },
    },
  };

  console.log(
    `\nStoring updated digest (${topStories.length} top, ${alsoInteresting.length} also interesting)...`
  );
  await storeDigest(date, newDigest);
  console.log(`Done. ${tokens.input + tokens.output} tokens used for clustering.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Recluster failed:', err);
    process.exit(1);
  });
