-- TimberTimer database setup for Supabase.
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

create table if not exists public.active_focus_timers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timer_id uuid not null default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 80),
  duration_minutes integer not null check (duration_minutes between 1 and 600),
  duration_seconds integer not null check (duration_seconds between 60 and 36000),
  started_at timestamptz not null,
  end_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.active_focus_timers
  add column if not exists timer_id uuid not null default gen_random_uuid();

alter table public.active_focus_timers enable row level security;

drop policy if exists "users can read own active timer" on public.active_focus_timers;
drop policy if exists "users can insert own active timer" on public.active_focus_timers;
drop policy if exists "users can update own active timer" on public.active_focus_timers;
drop policy if exists "users can delete own active timer" on public.active_focus_timers;

create policy "users can read own active timer"
  on public.active_focus_timers
  for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "users can insert own active timer"
  on public.active_focus_timers
  for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "users can update own active timer"
  on public.active_focus_timers
  for update
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "users can delete own active timer"
  on public.active_focus_timers
  for delete
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

drop trigger if exists active_focus_timers_set_updated_at on public.active_focus_timers;

create trigger active_focus_timers_set_updated_at
  before update on public.active_focus_timers
  for each row
  execute function public.set_updated_at();

-- Migration: stopwatch sync support.
-- Run this if the table already exists from a previous setup.
alter table public.active_focus_timers
  add column if not exists mode text not null default 'countdown';

alter table public.active_focus_timers
  drop constraint if exists active_focus_timers_duration_minutes_check;
alter table public.active_focus_timers
  add constraint active_focus_timers_duration_minutes_check
  check (duration_minutes between 0 and 600);

alter table public.active_focus_timers
  drop constraint if exists active_focus_timers_duration_seconds_check;
alter table public.active_focus_timers
  add constraint active_focus_timers_duration_seconds_check
  check (duration_seconds between 0 and 86400);

-- Rest timer sync: one row per user, just stores when rest started.
create table if not exists public.active_rest_timers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.active_rest_timers enable row level security;

drop policy if exists "users can read own rest timer" on public.active_rest_timers;
drop policy if exists "users can insert own rest timer" on public.active_rest_timers;
drop policy if exists "users can update own rest timer" on public.active_rest_timers;
drop policy if exists "users can delete own rest timer" on public.active_rest_timers;

create policy "users can read own rest timer"
  on public.active_rest_timers for select to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own rest timer"
  on public.active_rest_timers for insert to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own rest timer"
  on public.active_rest_timers for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can delete own rest timer"
  on public.active_rest_timers for delete to authenticated
  using (auth.uid() = user_id);

drop trigger if exists active_rest_timers_set_updated_at on public.active_rest_timers;

create trigger active_rest_timers_set_updated_at
  before update on public.active_rest_timers
  for each row
  execute function public.set_updated_at();

-- Notes / to-do list (one list per user, synced across devices).
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null check (char_length(text) between 1 and 500),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration: manual to-do ordering, synced across devices.
-- Safe to re-run; run this if the notes table already exists.
alter table public.notes
  add column if not exists sort_order integer not null default 0;

create index if not exists notes_user_sort_idx
  on public.notes (user_id, sort_order);

create index if not exists notes_user_created_idx
  on public.notes (user_id, created_at desc);

alter table public.notes enable row level security;

drop policy if exists "users can read own notes" on public.notes;
drop policy if exists "users can insert own notes" on public.notes;
drop policy if exists "users can update own notes" on public.notes;
drop policy if exists "users can delete own notes" on public.notes;

create policy "users can read own notes"
  on public.notes for select to authenticated
  using (auth.uid() = user_id);

create policy "users can insert own notes"
  on public.notes for insert to authenticated
  with check (auth.uid() = user_id);

create policy "users can update own notes"
  on public.notes for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users can delete own notes"
  on public.notes for delete to authenticated
  using (auth.uid() = user_id);

drop trigger if exists notes_set_updated_at on public.notes;

create trigger notes_set_updated_at
  before update on public.notes
  for each row
  execute function public.set_updated_at();
