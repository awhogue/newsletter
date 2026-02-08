# Daily News Digest

A personal daily news digest that fetches content from RSS feeds and blogs, uses Claude to score and summarize the most relevant articles, and delivers the digest via email each morning. Thumbs up/down feedback refines what gets surfaced over time.

## How It Works

1. **Fetch** — Pulls articles from 15-40 RSS feeds, Substacks, and (optionally) Twitter/X accounts in parallel
2. **Score** — Sends articles to Claude Haiku in batches with your interest profile; each article gets a 0-10 relevance score
3. **Summarize** — Top-scoring articles get 2-3 sentence summaries via Claude
4. **Deliver** — Stores the digest in Supabase, sends an HTML email via Resend, and logs run metadata
5. **Learn** — Feedback (thumbs up/down from email or web UI) is aggregated and injected into future scoring prompts

## Architecture

| Component | Purpose | Platform |
|-----------|---------|----------|
| Daily pipeline | Fetch, score, summarize, email | GitHub Actions (cron) |
| Web UI | Digest viewer + feedback buttons | Vercel (Next.js) |
| Storage | Digests, feedback, run logs | Supabase (PostgreSQL) |

**Estimated cost: ~$3/month** (Claude Haiku API). Everything else runs on free tiers.

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Redirects to today's digest
│   ├── digest/[date]/page.tsx    # Web viewer with feedback UI
│   └── api/
│       ├── feedback/route.ts     # POST: record thumbs up/down
│       └── trigger/route.ts      # POST: manual pipeline trigger
├── config/
│   ├── sources.ts                # Feed URLs + Twitter usernames
│   ├── profile.ts                # Interest profile for scoring
│   └── constants.ts              # Tunable parameters
├── lib/
│   ├── feeds.ts                  # RSS fetching + dedup
│   ├── twitter-rss.ts            # RSS Bridge fallback for Twitter/X
│   ├── claude.ts                 # Anthropic SDK wrapper
│   ├── scoring.ts                # Batch relevance scoring
│   ├── summarizer.ts             # Article summarization
│   ├── email.ts                  # Resend email delivery
│   ├── storage.ts                # Supabase queries
│   └── feedback-aggregator.ts    # Preference learning from feedback
├── pipeline/
│   └── daily-digest.ts           # Main orchestrator
├── templates/
│   └── digest-email.ts           # HTML email template
└── types/
    └── index.ts                  # Shared TypeScript interfaces
```

## Setup

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier)
- An [Anthropic](https://console.anthropic.com) API key
- A [Resend](https://resend.com) API key (free tier, 100 emails/day)

### 1. Install dependencies

```bash
npm install
```

### 2. Create the database

Run the contents of `supabase-schema.sql` in the Supabase SQL Editor to create the `digests`, `feedback`, and `runs` tables.

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in your keys:

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `RESEND_API_KEY` | Resend API key |
| `DIGEST_EMAIL_TO` | Your email address |
| `DIGEST_EMAIL_FROM` | Sender address (must be verified in Resend) |
| `NEXT_PUBLIC_APP_URL` | Your deployed app URL (for feedback links) |

### 4. Customize your sources and interests

- Edit `src/config/sources.ts` to add/remove RSS feeds
- Edit `src/config/profile.ts` to adjust the scoring criteria

### 5. Run locally

```bash
# Run the pipeline once
npx tsx src/pipeline/daily-digest.ts

# Start the web UI
npm run dev
```

Visit `http://localhost:3000` to view the digest.

## Deployment

### Vercel (web UI)

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables in Vercel project settings
4. Deploy

### GitHub Actions (daily pipeline)

Add the following secrets in your GitHub repo settings (Settings > Secrets > Actions):

- `ANTHROPIC_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `RESEND_API_KEY`
- `DIGEST_EMAIL_TO`
- `DIGEST_EMAIL_FROM`
- `NEXT_PUBLIC_APP_URL`

The pipeline runs automatically at 11:00 UTC daily. You can also trigger it manually from the Actions tab using `workflow_dispatch`.

## Tuning

Key parameters in `src/config/constants.ts`:

| Constant | Default | Description |
|----------|---------|-------------|
| `TOP_STORY_THRESHOLD` | 7 | Minimum score for "Top Stories" section |
| `DIGEST_THRESHOLD` | 4 | Minimum score to appear in digest at all |
| `SCORING_BATCH_SIZE` | 20 | Articles per Claude scoring call |
| `SUMMARIZE_CONCURRENCY` | 5 | Parallel summarization requests |
| `HOURS_LOOKBACK` | 24 | How far back to fetch articles |
| `FEEDBACK_LOOKBACK_DAYS` | 30 | Feedback history window for learning |
