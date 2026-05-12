-- ============================================================
-- INBOX ASSASSIN — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- PROFILES
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  google_id text unique,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);


-- OAUTH TOKENS (Gmail API access + refresh tokens)
create table public.oauth_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  access_token text not null,
  refresh_token text,
  token_expiry timestamptz,
  scope text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.oauth_tokens enable row level security;

create policy "Users can manage own tokens"
  on public.oauth_tokens for all using (auth.uid() = user_id);


-- RULES
create table public.rules (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  rule_type text not null check (rule_type in ('sender', 'domain', 'age', 'keyword', 'label', 'newsletter')),
  config jsonb not null default '{}',
  -- config examples:
  -- sender:      { "email": "groupon@groupon.com" }
  -- domain:      { "domain": "promotions.example.com" }
  -- age:         { "older_than_days": 90, "scope": "all" }
  -- keyword:     { "keywords": ["unsubscribe", "promo"], "match": "any" }
  -- label:       { "label": "SPAM" }
  -- newsletter:  { "auto_detect": true }
  is_active boolean default true,
  sort_order integer default 0,
  run_count integer default 0,
  last_run_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.rules enable row level security;

create policy "Users can manage own rules"
  on public.rules for all using (auth.uid() = user_id);


-- DELETION LOGS (audit trail per run)
create table public.deletion_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  run_label text, -- e.g. "Manual Run", "Batch 3 of 14"
  batch_number integer default 1,
  total_batches integer,
  rules_applied jsonb default '[]',
  -- [{ rule_id, rule_name, emails_deleted, emails_moved }]
  total_deleted integer default 0,
  total_moved integer default 0,
  storage_freed_bytes bigint default 0,
  duration_ms integer,
  status text default 'completed' check (status in ('running', 'completed', 'failed', 'partial')),
  error_message text,
  run_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.deletion_logs enable row level security;

create policy "Users can view own logs"
  on public.deletion_logs for select using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on public.deletion_logs for insert with check (auth.uid() = user_id);


-- BATCH SESSIONS (resumable batch processing state)
create table public.batch_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  direction text not null default 'oldest_first' check (direction in ('oldest_first', 'newest_first')),
  batch_size integer default 500,
  current_batch integer default 0,
  total_batches integer,
  page_token text,           -- Gmail API pagination cursor
  emails_processed integer default 0,
  emails_deleted integer default 0,
  status text default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.batch_sessions enable row level security;

create policy "Users can manage own batch sessions"
  on public.batch_sessions for all using (auth.uid() = user_id);


-- UPDATED_AT triggers
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger oauth_tokens_updated_at before update on public.oauth_tokens
  for each row execute procedure public.handle_updated_at();

create trigger rules_updated_at before update on public.rules
  for each row execute procedure public.handle_updated_at();

create trigger batch_sessions_updated_at before update on public.batch_sessions
  for each row execute procedure public.handle_updated_at();


-- AUTO-CREATE PROFILE on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'email',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
