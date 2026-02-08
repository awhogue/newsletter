import { ScoredArticle, SummarizedArticle } from '../types';
import { SUMMARIZE_CONCURRENCY, FULL_CONTENT_LENGTH } from '../config/constants';
import { callClaude } from './claude';

async function summarizeOne(article: ScoredArticle): Promise<SummarizedArticle> {
  if (article.feedSummary) {
    return { ...article, summary: article.feedSummary };
  }

  const truncatedContent = article.content.slice(0, FULL_CONTENT_LENGTH);

  const prompt = `
Summarize this article in 2-3 concise sentences. Focus on the key insight or takeaway. 
Do not use phrases like "This article discusses" — just state the substance directly.
Do not start the summary with "Summary:", just get right into it. Do not repeat the title.

Title: ${article.title}
Source: ${article.sourceName}

Content:
${truncatedContent}`;

  try {
    const summary = await callClaude(prompt);
    return { ...article, summary: summary.trim() };
  } catch (err) {
    console.error(`Summarization failed for "${article.title}":`, (err as Error).message);
    return { ...article, summary: article.snippet.slice(0, 200) };
  }
}

export async function summarizeArticles(
  articles: ScoredArticle[]
): Promise<SummarizedArticle[]> {
  const results: SummarizedArticle[] = [];

  // Process in batches with concurrency limit
  for (let i = 0; i < articles.length; i += SUMMARIZE_CONCURRENCY) {
    const batch = articles.slice(i, i + SUMMARIZE_CONCURRENCY);
    const batchResults = await Promise.all(batch.map(summarizeOne));
    results.push(...batchResults);
  }

  return results;
}
