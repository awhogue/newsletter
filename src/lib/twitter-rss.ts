import Parser from 'rss-parser';
import { convert } from 'html-to-text';
import { Source, FeedItem } from '../types';
import { TWITTER_FETCH_TIMEOUT_MS, TWITTER_MAX_RETRIES, SNIPPET_LENGTH, HOURS_LOOKBACK } from '../config/constants';

const RSS_BRIDGE_INSTANCES = [
  'https://rss-bridge.org/bridge01',
  'https://rss-bridge.org/bridge02',
];

const parser = new Parser({ timeout: TWITTER_FETCH_TIMEOUT_MS });

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildBridgeUrl(instance: string, username: string): string {
  return `${instance}/?action=display&bridge=XTwitterBridge&context=By+username&u=${username}&format=Atom`;
}

function makeId(url: string): string {
  return Buffer.from(url).toString('base64url').slice(0, 32);
}

export async function fetchTwitterFeed(source: Source): Promise<FeedItem[]> {
  const username = source.url; // For twitter sources, url field holds the username
  const instances = shuffle(RSS_BRIDGE_INSTANCES);
  const cutoff = new Date(Date.now() - HOURS_LOOKBACK * 60 * 60 * 1000);

  for (let i = 0; i < Math.min(instances.length, TWITTER_MAX_RETRIES); i++) {
    try {
      const bridgeUrl = buildBridgeUrl(instances[i], username);
      const feed = await parser.parseURL(bridgeUrl);

      return (feed.items || [])
        .filter((item) => {
          const pub = item.pubDate ? new Date(item.pubDate) : null;
          return pub && pub > cutoff;
        })
        .map((item) => {
          const rawContent = item.content || item.contentSnippet || '';
          const content = convert(rawContent, { wordwrap: false });
          return {
            id: makeId(item.link || item.guid || ''),
            title: item.title || content.slice(0, 100),
            url: item.link || '',
            content,
            snippet: content.slice(0, SNIPPET_LENGTH),
            sourceName: source.name,
            sourceType: 'twitter' as const,
            publishedAt: new Date(item.pubDate!),
          };
        });
    } catch (err) {
      console.warn(`RSS Bridge instance ${instances[i]} failed for @${username}:`, (err as Error).message);
    }
  }

  throw new Error(`All RSS Bridge instances failed for @${username}`);
}
