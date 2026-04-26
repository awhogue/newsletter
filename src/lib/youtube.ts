import Parser from 'rss-parser';
import { YoutubeTranscript } from 'youtube-transcript';
import { Source, FeedItem } from '../types';
import {
  FEED_FETCH_TIMEOUT_MS,
  HOURS_LOOKBACK,
  SNIPPET_LENGTH,
  YOUTUBE_TRANSCRIPT_MAX_CHARS,
} from '../config/constants';

interface YouTubeFeedItem {
  title?: string;
  link?: string;
  id?: string;
  pubDate?: string;
  isoDate?: string;
  'media:group'?: {
    'media:description'?: string | string[];
  };
}

const parser: Parser<unknown, YouTubeFeedItem> = new Parser({
  customFields: {
    item: [['media:group', 'media:group']],
  },
});

const FEED_USER_AGENT = 'DailyDigest/1.0 (personal news aggregator)';
const FEED_ACCEPT = 'application/rss+xml, application/atom+xml, application/xml, text/xml';

function makeId(url: string): string {
  return Buffer.from(url).toString('base64url').slice(0, 32);
}

function extractVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    const v = u.searchParams.get('v');
    if (v) return v;
    if (u.hostname === 'youtu.be') return u.pathname.slice(1) || null;
    return null;
  } catch {
    return null;
  }
}

function extractDescription(item: YouTubeFeedItem): string {
  const desc = item['media:group']?.['media:description'];
  if (!desc) return '';
  if (Array.isArray(desc)) return desc[0] ?? '';
  return desc;
}

async function fetchTranscriptText(videoId: string): Promise<string | null> {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);
    if (!segments || segments.length === 0) return null;
    const text = segments
      .map((s) => s.text)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 0 ? text : null;
  } catch (err) {
    console.warn(`No transcript for video ${videoId}: ${(err as Error).message}`);
    return null;
  }
}

export async function fetchYouTubeChannel(source: Source): Promise<FeedItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FEED_FETCH_TIMEOUT_MS);
  let xml: string;
  try {
    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'User-Agent': FEED_USER_AGENT, 'Accept': FEED_ACCEPT },
    });
    if (!res.ok) throw new Error(`Status code ${res.status}`);
    xml = await res.text();
  } finally {
    clearTimeout(timeout);
  }

  const feed = await parser.parseString(xml);
  const cutoff = new Date(Date.now() - HOURS_LOOKBACK * 60 * 60 * 1000);

  const recent = (feed.items || []).filter((item) => {
    const dateStr = item.pubDate || item.isoDate;
    if (!dateStr) return false;
    return new Date(dateStr) > cutoff;
  });

  const results: FeedItem[] = [];
  for (const item of recent) {
    const url = item.link || '';
    const videoId = extractVideoId(url);
    if (!videoId) continue;

    const transcript = await fetchTranscriptText(videoId);
    if (!transcript) continue;

    const description = extractDescription(item);
    const truncatedTranscript = transcript.slice(0, YOUTUBE_TRANSCRIPT_MAX_CHARS);
    const snippet = (description || truncatedTranscript).slice(0, SNIPPET_LENGTH);

    results.push({
      id: makeId(url),
      title: item.title || 'Untitled',
      url,
      content: truncatedTranscript,
      snippet,
      sourceName: source.name,
      sourceType: 'youtube',
      publishedAt: new Date(item.pubDate || item.isoDate!),
    });
  }

  return results;
}
