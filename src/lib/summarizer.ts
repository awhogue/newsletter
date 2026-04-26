import { ScoredArticle, SummarizedArticle } from '../types';
import {
  SUMMARIZE_CONCURRENCY,
  FULL_CONTENT_LENGTH,
  LONG_WRITEUP_CONTENT_LENGTH,
} from '../config/constants';
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

export async function generateLongWriteup(
  article: SummarizedArticle
): Promise<string | null> {
  const truncated = article.content.slice(0, LONG_WRITEUP_CONTENT_LENGTH);

  const prompt = `
You are writing a structured long-form writeup of a podcast or video discussion based on its transcript. The reader has not watched the video and wants to extract the substance quickly.

Output Markdown with exactly these four sections, using these headings verbatim:

## TL;DR
2-3 sentences capturing the core of the conversation.

## Main discussion points
4-7 bullet points covering the substantive topics discussed, in roughly the order they appear. Each bullet should be a complete thought (one or two sentences) — not a one-word topic label.

## Notable insights
2-4 bullet points capturing specific claims, frameworks, predictions, or quotes worth remembering. Be concrete.

## Why it matters
1-2 sentences on why someone tracking this space should care.

Do not invent content not supported by the transcript. Do not include preamble, sign-off, or meta commentary about the format.

Title: ${article.title}
Source: ${article.sourceName}

Transcript:
${truncated}`;

  try {
    const writeup = await callClaude(prompt);
    return writeup.trim();
  } catch (err) {
    console.error(`Long writeup failed for "${article.title}":`, (err as Error).message);
    return null;
  }
}
