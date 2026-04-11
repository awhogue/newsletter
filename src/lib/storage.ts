import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Digest, FeedbackRecord, DigestMetadata } from '../types';

let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return _supabase;
}

function sanitizeForJson(obj: unknown): unknown {
  if (typeof obj === 'string') {
    // Remove characters that PostgreSQL JSONB rejects:
    // - Actual surrogate characters (U+D800 to U+DFFF)
    // - Null characters (U+0000)
    // - Literal \uDxxx escape sequences in text
    return obj
      .replace(/[\uD800-\uDFFF]/g, '')
      .replace(/\0/g, '')
      .replace(/\\u[dD][89a-fA-F][0-9a-fA-F]{2}/g, '');
  }
  if (Array.isArray(obj)) return obj.map(sanitizeForJson);
  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeForJson(value);
    }
    return result;
  }
  return obj;
}

export async function storeDigest(date: string, digest: Digest): Promise<void> {
  const sanitized = sanitizeForJson(digest) as Digest;
  const { error } = await getSupabase()
    .from('digests')
    .upsert({ date, payload: sanitized }, { onConflict: 'date' });

  if (error) throw new Error(`Failed to store digest: ${error.message}`);
}

export async function getDigest(date: string): Promise<Digest | null> {
  const { data, error } = await getSupabase()
    .from('digests')
    .select('payload')
    .eq('date', date)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw new Error(`Failed to get digest: ${error.message}`);
  }

  return data?.payload as Digest;
}

export async function getAdjacentDigestDates(
  date: string
): Promise<{ prev: string | null; next: string | null }> {
  const db = getSupabase();
  const [prevRes, nextRes] = await Promise.all([
    db
      .from('digests')
      .select('date')
      .lt('date', date)
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('digests')
      .select('date')
      .gt('date', date)
      .order('date', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (prevRes.error) throw new Error(`Failed to get prev digest: ${prevRes.error.message}`);
  if (nextRes.error) throw new Error(`Failed to get next digest: ${nextRes.error.message}`);

  return {
    prev: prevRes.data?.date ?? null,
    next: nextRes.data?.date ?? null,
  };
}

export async function storeFeedback(feedback: FeedbackRecord): Promise<void> {
  const { error } = await getSupabase()
    .from('feedback')
    .upsert(
      {
        date: feedback.date,
        article_id: feedback.articleId,
        title: feedback.title,
        source_name: feedback.sourceName,
        vote: feedback.vote,
      },
      { onConflict: 'date,article_id' }
    );

  if (error) throw new Error(`Failed to store feedback: ${error.message}`);
}

export async function getRecentFeedback(days: number): Promise<FeedbackRecord[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await getSupabase()
    .from('feedback')
    .select('*')
    .gte('date', since)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get feedback: ${error.message}`);

  return (data || []).map((row) => ({
    date: row.date,
    articleId: row.article_id,
    title: row.title,
    sourceName: row.source_name,
    vote: row.vote,
  }));
}

export async function getRecentArticleUrls(days: number): Promise<Set<string>> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const { data, error } = await getSupabase()
    .from('digests')
    .select('payload')
    .gte('date', since);

  if (error) throw new Error(`Failed to get recent digests: ${error.message}`);

  const urls = new Set<string>();
  for (const row of data || []) {
    const digest = row.payload as Digest;
    for (const article of [...digest.topStories, ...digest.alsoInteresting]) {
      if (article.url) urls.add(article.url);
    }
  }
  return urls;
}

export async function clearDate(date: string): Promise<void> {
  const db = getSupabase();
  const results = await Promise.all([
    db.from('digests').delete().eq('date', date),
    db.from('runs').delete().eq('date', date),
    db.from('feedback').delete().eq('date', date),
  ]);
  for (const { error } of results) {
    if (error) throw new Error(`Failed to clear date: ${error.message}`);
  }
}

export async function storeRun(metadata: DigestMetadata & { date: string }): Promise<void> {
  const { error } = await getSupabase().from('runs').upsert(
    {
      date: metadata.date,
      total_fetched: metadata.totalFetched,
      total_scored: metadata.totalScored,
      sources_succeeded: metadata.sourcesSucceeded,
      sources_failed: metadata.sourcesFailed,
      duration_ms: metadata.durationMs,
      tokens_used: metadata.tokensUsed,
    },
    { onConflict: 'date' }
  );

  if (error) throw new Error(`Failed to store run: ${error.message}`);
}
