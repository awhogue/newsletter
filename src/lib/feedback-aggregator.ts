import { LearnedPreferences } from '../types';
import { getRecentFeedback } from './storage';
import { FEEDBACK_LOOKBACK_DAYS } from '../config/constants';

interface SourceStats {
  up: number;
  down: number;
  total: number;
}

export async function aggregateFeedback(): Promise<LearnedPreferences> {
  const feedback = await getRecentFeedback(FEEDBACK_LOOKBACK_DAYS);

  if (feedback.length === 0) {
    return { sourcePreferences: [], topicPreferences: [] };
  }

  // Aggregate by source
  const sourceStats = new Map<string, SourceStats>();
  for (const f of feedback) {
    const stats = sourceStats.get(f.sourceName) || { up: 0, down: 0, total: 0 };
    if (f.vote === 'up') stats.up++;
    else stats.down++;
    stats.total++;
    sourceStats.set(f.sourceName, stats);
  }

  const sourcePreferences: string[] = [];
  for (const [source, stats] of sourceStats) {
    if (stats.total < 2) continue; // Need enough data

    const upRate = stats.up / stats.total;
    if (upRate >= 0.7) {
      sourcePreferences.push(
        `- User upvoted ${stats.up}/${stats.total} articles from ${source} — boost scores from this source`
      );
    } else if (upRate <= 0.3) {
      sourcePreferences.push(
        `- User downvoted ${stats.down}/${stats.total} articles from ${source} — lower scores from this source`
      );
    }
  }

  return { sourcePreferences, topicPreferences: [] };
}
