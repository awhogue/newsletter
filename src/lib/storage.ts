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

export async function storeDigest(date: string, digest: Digest): Promise<void> {
  const { error } = await getSupabase()
    .from('digests')
    .upsert({ date, payload: digest }, { onConflict: 'date' });

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
