import { Rettiwt } from 'rettiwt-api';
import { FeedItem } from '../types';
import { HOURS_LOOKBACK, SNIPPET_LENGTH, TWEET_MIN_WORDS } from '../config/constants';

function makeId(url: string): string {
  return Buffer.from(url).toString('base64url').slice(0, 32);
}

function tweetUrl(username: string, tweetId: string): string {
  return `https://x.com/${username}/status/${tweetId}`;
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).length;
}

export async function fetchTwitterTimeline(): Promise<FeedItem[]> {
  const apiKey = process.env.TWITTER_API_KEY;
  if (!apiKey) {
    console.warn('TWITTER_API_KEY not set — skipping Twitter timeline');
    return [];
  }

  let timeline;
  try {
    const rettiwt = new Rettiwt({ apiKey });
    timeline = await rettiwt.user.followed();
  } catch (err) {
    console.warn('Twitter API error:', (err as Error).message);
    return [];
  }
  const cutoff = new Date(Date.now() - HOURS_LOOKBACK * 60 * 60 * 1000);

  const items: FeedItem[] = [];
  const seenUsers = new Set<string>();

  for (const tweet of timeline.list) {
    const createdAt = new Date(tweet.createdAt);
    if (createdAt <= cutoff) continue;

    const text = tweet.fullText || '';
    const urls = (tweet.entities?.urls || []).filter((u): u is string => !!u);
    const username = tweet.tweetBy?.userName || 'unknown';
    const permalink = tweetUrl(username, tweet.id);
    const hasExternalUrl = urls.length > 0;
    const isSubstantiveText = wordCount(text) >= TWEET_MIN_WORDS;

    if (!hasExternalUrl && !isSubstantiveText) continue;

    // Limit to one tweet per user to avoid any single account dominating the digest
    const userKey = username.toLowerCase();
    if (seenUsers.has(userKey)) continue;
    seenUsers.add(userKey);

    if (hasExternalUrl) {
      // Link tweet — use the shared URL; enrichThinItems will fetch full article content
      const sharedUrl = urls[0];
      items.push({
        id: makeId(sharedUrl),
        title: `@${username}: ${text.slice(0, 120)}`,
        url: sharedUrl,
        content: text,
        snippet: text.slice(0, SNIPPET_LENGTH),
        sourceName: 'Twitter Timeline',
        sourceType: 'twitter',
        viaUrl: permalink,
        publishedAt: createdAt,
      });
    } else {
      // Substantive text-only tweet (200+ words)
      items.push({
        id: makeId(permalink),
        title: `@${username}: ${text.slice(0, 120)}`,
        url: permalink,
        content: text,
        snippet: text.slice(0, SNIPPET_LENGTH),
        sourceName: 'Twitter Timeline',
        sourceType: 'twitter',
        publishedAt: createdAt,
      });
    }
  }

  return items;
}
