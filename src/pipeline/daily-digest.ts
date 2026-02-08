import { sources } from '../config/sources';
import {
  DIGEST_THRESHOLD,
  TOP_STORY_THRESHOLD,
  MAX_TOP_STORIES,
  MAX_ALSO_INTERESTING,
} from '../config/constants';
import { fetchAllFeeds } from '../lib/feeds';
import { scoreArticles } from '../lib/scoring';
import { summarizeArticles } from '../lib/summarizer';
import { sendDigestEmail } from '../lib/email';
import { storeDigest, storeRun } from '../lib/storage';
import { aggregateFeedback } from '../lib/feedback-aggregator';
import { getTokenUsage, resetTokenUsage } from '../lib/claude';
import { Digest, SummarizedArticle } from '../types';

async function run() {
  const startTime = Date.now();
  const today = new Date().toISOString().split('T')[0];
  console.log(`Starting daily digest for ${today}`);

  resetTokenUsage();

  // 1. Load learned preferences from feedback
  console.log('Loading feedback preferences...');
  let preferences;
  try {
    preferences = await aggregateFeedback();
    if (preferences.sourcePreferences.length > 0) {
      console.log(`Loaded ${preferences.sourcePreferences.length} source preferences`);
    }
  } catch (err) {
    console.warn('Failed to load feedback, continuing without preferences:', (err as Error).message);
  }

  // 2. Fetch all feeds
  console.log(`Fetching ${sources.length} sources...`);
  const { items, succeeded, failed } = await fetchAllFeeds(sources);
  console.log(`Fetched ${items.length} items from ${succeeded.length} sources (${failed.length} failed)`);

  if (items.length === 0) {
    console.log('No items fetched, skipping digest');
    return;
  }

  // 3. Score articles
  console.log('Scoring articles...');
  const scored = await scoreArticles(items, preferences);
  const aboveThreshold = scored.filter((a) => a.score >= DIGEST_THRESHOLD);
  console.log(`${aboveThreshold.length} articles scored >= ${DIGEST_THRESHOLD}`);

  // 4. Split into top stories and also interesting
  const topCandidates = aboveThreshold
    .filter((a) => a.score >= TOP_STORY_THRESHOLD)
    .slice(0, MAX_TOP_STORIES);
  const alsoCandidates = aboveThreshold
    .filter((a) => a.score >= DIGEST_THRESHOLD && a.score < TOP_STORY_THRESHOLD)
    .slice(0, MAX_ALSO_INTERESTING);

  // 5. Summarize all articles that made the cut
  const allToSummarize = [...topCandidates, ...alsoCandidates];
  console.log(`Summarizing ${allToSummarize.length} articles...`);
  const summarized = await summarizeArticles(allToSummarize);

  const topStories: SummarizedArticle[] = summarized.filter(
    (a) => a.score >= TOP_STORY_THRESHOLD
  );
  const alsoInteresting: SummarizedArticle[] = summarized.filter(
    (a) => a.score >= DIGEST_THRESHOLD && a.score < TOP_STORY_THRESHOLD
  );

  // 6. Build digest
  const tokens = getTokenUsage();
  const digest: Digest = {
    date: today,
    topStories,
    alsoInteresting,
    metadata: {
      totalFetched: items.length,
      totalScored: scored.length,
      sourcesSucceeded: succeeded,
      sourcesFailed: failed,
      durationMs: Date.now() - startTime,
      tokensUsed: tokens,
    },
  };

  // 7. Store digest
  console.log('Storing digest...');
  await storeDigest(today, digest);

  // 8. Send email
  console.log('Sending email...');
  await sendDigestEmail(digest);

  // 9. Store run metadata
  await storeRun({ ...digest.metadata, date: today });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `Done! ${topStories.length} top stories, ${alsoInteresting.length} also interesting. ` +
      `${tokens.input + tokens.output} tokens used. ${durationSec}s elapsed.`
  );
}

run().catch((err) => {
  console.error('Pipeline failed:', err);
  process.exit(1);
});
