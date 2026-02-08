import Parser from 'rss-parser';
import { convert } from 'html-to-text';
import { Source, FeedItem } from '../types';
import { FEED_FETCH_TIMEOUT_MS, SNIPPET_LENGTH, HOURS_LOOKBACK } from '../config/constants';
import { fetchTwitterFeed } from './twitter-rss';

const parser = new Parser({
  timeout: FEED_FETCH_TIMEOUT_MS,
  headers: {
    'User-Agent': 'DailyDigest/1.0',
  },
});

function stripHtml(html: string): string {
  return convert(html, {
    wordwrap: false,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
    ],
  });
}

function makeId(url: string): string {
  return Buffer.from(url).toString('base64url').slice(0, 32);
}

async function fetchRssFeed(source: Source): Promise<FeedItem[]> {
  const feed = await parser.parseURL(source.url);
  const cutoff = new Date(Date.now() - HOURS_LOOKBACK * 60 * 60 * 1000);

  return (feed.items || [])
    .filter((item) => {
      const pub = item.pubDate ? new Date(item.pubDate) : null;
      return pub && pub > cutoff;
    })
    .map((item) => {
      const rawContent = item['content:encoded'] || item.content || item.contentSnippet || '';
      const content = stripHtml(rawContent);
      return {
        id: makeId(item.link || item.guid || item.title || ''),
        title: item.title || 'Untitled',
        url: item.link || '',
        content,
        snippet: content.slice(0, SNIPPET_LENGTH),
        sourceName: source.name,
        sourceType: source.type,
        publishedAt: new Date(item.pubDate!),
      };
    });
}

export async function fetchAllFeeds(
  sources: Source[]
): Promise<{ items: FeedItem[]; succeeded: string[]; failed: string[] }> {
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const items =
        source.type === 'twitter'
          ? await fetchTwitterFeed(source)
          : await fetchRssFeed(source);
      return { source, items };
    })
  );

  const items: FeedItem[] = [];
  const succeeded: string[] = [];
  const failed: string[] = [];
  const seenUrls = new Set<string>();

  for (const result of results) {
    if (result.status === 'fulfilled') {
      succeeded.push(result.value.source.name);
      for (const item of result.value.items) {
        if (item.url && !seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          items.push(item);
        }
      }
    } else {
      const source = sources[results.indexOf(result)];
      failed.push(source.name);
      console.warn(`Failed to fetch ${source.name}:`, result.reason?.message || result.reason);
    }
  }

  items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  return { items, succeeded, failed };
}
