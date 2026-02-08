import { FeedItem, ScoreResult, ScoredArticle, LearnedPreferences } from '../types';
import { interestProfile } from '../config/profile';
import { SCORING_BATCH_SIZE } from '../config/constants';
import { callClaude } from './claude';

function buildScoringPrompt(
  articles: { index: number; title: string; snippet: string; sourceName: string }[],
  preferences?: LearnedPreferences
): string {
  let preferencesText = '';
  if (preferences) {
    const lines: string[] = [];
    if (preferences.sourcePreferences.length > 0) {
      lines.push('LEARNED SOURCE PREFERENCES:', ...preferences.sourcePreferences);
    }
    if (preferences.topicPreferences.length > 0) {
      lines.push('', 'LEARNED TOPIC PREFERENCES:', ...preferences.topicPreferences);
    }
    if (lines.length > 0) {
      preferencesText = '\n\n' + lines.join('\n');
    }
  }

  const articleList = articles
    .map((a) => `[${a.index}] "${a.title}" (${a.sourceName})\n${a.snippet}`)
    .join('\n\n');

  return `Score the following articles for relevance to the reader.
${preferencesText}

Return ONLY a JSON array with one object per article: [{"index": 0, "score": 7, "reason": "brief reason"}, ...]

Articles:

${articleList}`;
}

function parseScoreResults(response: string): ScoreResult[] {
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array found in scoring response');
  return JSON.parse(jsonMatch[0]);
}

export async function scoreArticles(
  items: FeedItem[],
  preferences?: LearnedPreferences
): Promise<ScoredArticle[]> {
  const batches: FeedItem[][] = [];
  for (let i = 0; i < items.length; i += SCORING_BATCH_SIZE) {
    batches.push(items.slice(i, i + SCORING_BATCH_SIZE));
  }

  const scoredArticles: ScoredArticle[] = [];

  for (const batch of batches) {
    const articleData = batch.map((item, idx) => ({
      index: idx,
      title: item.title,
      snippet: item.snippet,
      sourceName: item.sourceName,
    }));

    try {
      const response = await callClaude(
        buildScoringPrompt(articleData, preferences),
        interestProfile
      );
      const scores = parseScoreResults(response);

      for (const score of scores) {
        if (score.index >= 0 && score.index < batch.length) {
          scoredArticles.push({
            ...batch[score.index],
            score: score.score,
            reason: score.reason,
          });
        }
      }
    } catch (err) {
      console.error('Scoring batch failed:', (err as Error).message);
      // Add unscored articles with score 0 so they're not lost
      for (const item of batch) {
        scoredArticles.push({ ...item, score: 0, reason: 'Scoring failed' });
      }
    }
  }

  return scoredArticles.sort((a, b) => b.score - a.score);
}
