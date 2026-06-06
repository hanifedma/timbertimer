-- Canopy Focus database setup for Supabase.
-- This setup supports many Google-authenticated accounts.
-- Row-level security keeps each user's focus records private.

create extension if not exists pgcrypto;

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  duration_minutes integer not null check (duration_minutes between 1 and 600),
  actual_minutes integer not null check (actual_minutes between 0 and 600),
  status text not null check (status in ('completed', 'abandoned')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  tree_kind text not null default 'young sprout',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists focus_sessions_user_started_idx
  on public.focus_sessions (user_id, started_at desc);

alter table public.focus_sessions enable row level security;

drop policy if exists "single account can read sessions" on public.focus_sessions;
drop policy if exists "single account can insert sessions" on public.focus_sessions;
drop policy if exists "single account can update sessions" on public.focus_sessions;
drop policy if exists "single account can delete sessions" on public.focus_sessions;
drop policy if exists "users can read own sessions" on public.focus_sessions;
drop policy if exists "users can insert own sessions" on public.focus_sessions;
drop policy if exists "users can update own sessions" on public.focus_sessions;
drop policy if exists "users can delete own sessions" on public.focus_sessions;

create policy "users can read own sessions"
  on public.focus_sessions
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "users can insert own sessions"
  on public.focus_sessions
  for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "users can update own sessions"
  on public.focus_sessions
  for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "users can delete own sessions"
  on public.focus_sessions
  for delete
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists focus_sessions_set_updated_at on public.focus_sessions;

create trigger focus_sessions_set_updated_at
  before update on public.focus_sessions
  for each row
  execute function public.set_updated_at();
