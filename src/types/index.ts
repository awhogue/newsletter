export interface Source {
  name: string;
  url: string;
  type: 'rss' | 'reddit';
}

export interface FeedItem {
  id: string;
  title: string;
  url: string;
  content: string;
  snippet: string;
  feedSummary?: string;
  sourceName: string;
  sourceType: 'rss' | 'reddit';
  publishedAt: Date;
}

export interface ScoredArticle extends FeedItem {
  score: number;
  reason: string;
}

export interface SummarizedArticle extends ScoredArticle {
  summary: string;
}

export interface Digest {
  date: string;
  topStories: SummarizedArticle[];
  alsoInteresting: SummarizedArticle[];
  metadata: DigestMetadata;
}

export interface DigestMetadata {
  totalFetched: number;
  totalScored: number;
  sourcesSucceeded: string[];
  sourcesFailed: string[];
  durationMs: number;
  tokensUsed: { input: number; output: number };
}

export interface FeedbackRecord {
  date: string;
  articleId: string;
  title: string;
  sourceName: string;
  vote: 'up' | 'down';
}

export interface ScoreResult {
  index: number;
  score: number;
  reason: string;
}

export interface LearnedPreferences {
  sourcePreferences: string[];
  topicPreferences: string[];
}
