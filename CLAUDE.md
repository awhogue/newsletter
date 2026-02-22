# Newsletter — Claude Code Instructions

## What This Project Is

A personal daily news digest pipeline. It fetches content from RSS feeds, Reddit, and Twitter/X, scores articles with Claude Haiku for relevance, summarizes the top ones, and delivers an email digest each morning. A Next.js web UI lets you view digests and give thumbs up/down feedback that refines future scoring.

## Tech Stack

- **Runtime**: Node.js 20 (on macOS: `/opt/homebrew/opt/node@20/bin`)
- **Framework**: Next.js 15 (App Router) + TypeScript + Tailwind CSS
- **AI**: Anthropic SDK with Claude Haiku (`claude-haiku-4-5-20251001`)
- **Storage**: Supabase (PostgreSQL) — tables: `digests`, `feedback`, `runs`
- **Email**: Resend
- **Feeds**: rss-parser (RSS/Reddit), rettiwt-api (Twitter/X)

## Project Layout

```
src/
  pipeline/daily-digest.ts   # Main orchestrator — entry point for the daily run
  config/
    sources.ts               # Feed URLs, Reddit subs, Twitter config
    profile.ts               # Interest profile prompt for scoring
    constants.ts             # Tunable parameters (thresholds, timeouts, etc.)
  lib/
    feeds.ts                 # RSS/Reddit fetching, dedup, content enrichment
    twitter.ts               # Twitter/X home timeline fetcher (rettiwt-api)
    scoring.ts               # Batch relevance scoring via Claude
    summarizer.ts            # Article summarization via Claude
    claude.ts                # Anthropic SDK wrapper + token tracking
    email.ts                 # Resend email delivery
    storage.ts               # Supabase queries
    feedback-aggregator.ts   # Preference learning from user feedback
  templates/
    digest-email.ts          # HTML email template
  app/                       # Next.js web UI
    page.tsx                 # Redirects to today's digest
    digest/[date]/page.tsx   # Digest viewer with feedback buttons
    api/feedback/route.ts    # POST: record thumbs up/down
    api/trigger/route.ts     # POST: manual pipeline trigger
  types/index.ts             # Shared TypeScript interfaces
```

## Key Commands

```bash
# Ensure PATH includes node 20
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# Run the pipeline locally (loads .env.local automatically)
npx tsx src/pipeline/daily-digest.ts

# Run with debug output (prints all fetched/scored articles)
npx tsx src/pipeline/daily-digest.ts --debug

# Clear today's digest and re-run
npx tsx src/pipeline/daily-digest.ts --clear --debug

# Skip deduplication against recent digests
npx tsx src/pipeline/daily-digest.ts --no-dedupe

# Type-check
npx tsc --noEmit

# Start the web UI
npm run dev

# Build for production
npm run build
```

## Architecture Notes

### Pipeline Flow
1. **Fetch** — `fetchAllFeeds()` in `feeds.ts` runs all sources in parallel. RSS/Reddit use `rss-parser`; Twitter uses `rettiwt-api`. Results are deduped by URL.
2. **Enrich** — Thin articles (< 200 chars content) get full page content fetched via `enrichThinItems()`.
3. **Score** — Articles sent to Claude Haiku in batches of `SCORING_BATCH_SIZE` with the interest profile from `profile.ts`.
4. **Summarize** — Articles above `DIGEST_THRESHOLD` get 2-3 sentence summaries.
5. **Deliver** — Digest stored in Supabase, emailed via Resend.

### Source Types
- `'rss'` — Standard RSS/Atom feeds
- `'reddit'` — Reddit RSS feeds (only keeps posts with external links)
- `'twitter'` — Twitter/X home timeline via cookie-based auth (only keeps tweets with links or 200+ words)

### Adding a New Source Type
1. Add the type string to `Source.type` and `FeedItem.sourceType` unions in `src/types/index.ts`
2. Create a fetcher in `src/lib/` that returns `FeedItem[]`
3. Add routing in `fetchAllFeeds()` in `src/lib/feeds.ts`
4. Add source entries in `src/config/sources.ts`

### Important Patterns
- **Supabase client must be lazy-initialized** (not module-level) to avoid build errors when env vars are missing at build time.
- **Graceful degradation**: If an optional env var (like `TWITTER_API_KEY`) is missing, the source is silently skipped. Failed feeds log a warning but don't crash the pipeline.
- **Token tracking**: All Claude API calls go through `src/lib/claude.ts` which tracks input/output tokens for the run metadata.

## Environment Variables

Required:
- `ANTHROPIC_API_KEY` — Anthropic API key
- `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` — Supabase project credentials
- `RESEND_API_KEY` — Resend email API key
- `DIGEST_EMAIL_TO` / `DIGEST_EMAIL_FROM` — Email addresses

Optional:
- `TWITTER_API_KEY` — Twitter/X API key (from X Auth Helper browser extension)
- `NEXT_PUBLIC_APP_URL` — Deployed app URL for feedback links in emails
- `TRIGGER_SECRET` — Auth token for manual trigger API endpoint

## Testing Changes

After any code change, verify with:
1. `npx tsc --noEmit` — type-check passes
2. `npx tsx src/pipeline/daily-digest.ts --clear --debug` — pipeline runs end-to-end
3. For web UI changes: `npm run dev` and check browser console for errors
