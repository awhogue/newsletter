import Parser from 'rss-parser';
import { convert } from 'html-to-text';
import { Source, FeedItem } from '../types';
import {
  FEED_FETCH_TIMEOUT_MS,
  SNIPPET_LENGTH,
  HOURS_LOOKBACK,
  ARTICLE_FETCH_TIMEOUT_MS,
  ARTICLE_FETCH_CONCURRENCY,
  THIN_CONTENT_THRESHOLD,
} from '../config/constants';

const parser = new Parser({
  timeout: FEED_FETCH_TIMEOUT_MS,
  headers: {
    'User-Agent': 'DailyDigest/1.0 (personal news aggregator)',
    'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
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

function extractRedditExternalLink(html: string): string | null {
  // Reddit RSS entries have [link] and [comments] anchors.
  // For link posts, [link] points to an external URL.
  // For self-posts, [link] points back to reddit.com.
  const match = html.match(/href="([^"]+)">\[link\]/);
  if (!match) return null;
  const url = match[1];
  try {
    const host = new URL(url).hostname;
    if (host.endsWith('reddit.com') || host.endsWith('redd.it')) return null;
    return url;
  } catch {
    return null;
  }
}

async function fetchRssFeed(source: Source): Promise<FeedItem[]> {
  const feed = await parser.parseURL(source.url);
  const cutoff = new Date(Date.now() - HOURS_LOOKBACK * 60 * 60 * 1000);
  const isReddit = source.type === 'reddit';

  return (feed.items || [])
    .filter((item) => {
      const pub = item.pubDate ? new Date(item.pubDate) : null;
      if (!pub || pub <= cutoff) return false;
      // For Reddit, only keep posts linking to external sources
      if (isReddit) {
        const rawContent = item['content:encoded'] || item.content || '';
        return extractRedditExternalLink(rawContent) !== null;
      }
      return true;
    })
    .map((item) => {
      const rawContent = item['content:encoded'] || item.content || item.contentSnippet || '';
      const content = stripHtml(rawContent);
      // For Reddit link posts, use the external URL instead of the comments page
      const externalUrl = isReddit ? extractRedditExternalLink(rawContent) : null;
      // Use <summary> (Atom) or contentSnippet (RSS) as a pre-built summary if available
      const rawSummary = item.summary || item.contentSnippet || '';
      const feedSummary = stripHtml(rawSummary).trim();
      return {
        id: makeId(externalUrl || item.link || item.guid || item.title || ''),
        title: item.title || 'Untitled',
        url: externalUrl || item.link || '',
        content,
        snippet: content.slice(0, SNIPPET_LENGTH),
        feedSummary: feedSummary.length >= 50 ? feedSummary : undefined,
        sourceName: source.name,
        sourceType: source.type,
        publishedAt: new Date(item.pubDate!),
      };
    });
}

async function fetchArticleContent(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ARTICLE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'DailyDigest/1.0 (personal news aggregator)' },
    });
    if (!res.ok) return '';
    const html = await res.text();
    return stripHtml(html);
  } catch {
    return '';
  } finally {
    clearTimeout(timeout);
  }
}

function extractDomain(url: string): string | null {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host;
  } catch {
    return null;
  }
}

async function enrichThinItems(items: FeedItem[]): Promise<void> {
  const thin = items.filter((item) => item.content.length < THIN_CONTENT_THRESHOLD && item.url);
  if (thin.length === 0) return;

  console.log(`Fetching full content for ${thin.length} thin articles...`);
  for (let i = 0; i < thin.length; i += ARTICLE_FETCH_CONCURRENCY) {
    const batch = thin.slice(i, i + ARTICLE_FETCH_CONCURRENCY);
    await Promise.all(
      batch.map(async (item) => {
        const content = await fetchArticleContent(item.url);
        if (content.length > item.content.length) {
          item.content = content;
          item.snippet = content.slice(0, SNIPPET_LENGTH);
        }
        const domain = extractDomain(item.url);
        if (domain) {
          item.sourceName = `${domain} (via ${item.sourceName})`;
        }
      })
    );
  }
}

export async function fetchAllFeeds(
  sources: Source[]
): Promise<{ items: FeedItem[]; succeeded: string[]; failed: string[] }> {
  const results = await Promise.allSettled(
    sources.map(async (source) => {
      const items = await fetchRssFeed(source);
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

  // Fetch full content for articles with thin RSS content (e.g. HN links)
  await enrichThinItems(items);

  return { items, succeeded, failed };
}
