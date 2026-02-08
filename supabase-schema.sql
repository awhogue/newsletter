-- Daily digest results
create table digests (
  id serial primary key,
  date date unique not null,
  payload jsonb not null,
  created_at timestamptz default now()
);

-- Article feedback
create table feedback (
  id serial primary key,
  date date not null,
  article_id text not null,
  title text,
  source_name text,
  vote text check (vote in ('up', 'down')) not null,
  created_at timestamptz default now(),
  unique(date, article_id)
);

-- Pipeline run metadata
create table runs (
  id serial primary key,
  date date unique not null,
  total_fetched int,
  total_scored int,
  sources_succeeded text[],
  sources_failed text[],
  duration_ms int,
  tokens_used jsonb,
  created_at timestamptz default now()
);
