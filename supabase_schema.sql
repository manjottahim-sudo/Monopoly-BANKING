-- Rent Rush Bank / Monopoly-style banking app database setup
-- Run this in Supabase SQL Editor.
-- Safe to run again if you already installed the older version.

create table if not exists public.games (
  code text primary key,
  banker_pin_hash text not null,
  starting_money integer not null default 1500,
  created_at timestamptz default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  game_code text not null references public.games(code) on delete cascade,
  name text not null,
  pin_hash text not null,
  balance integer not null default 1500,
  created_at timestamptz default now()
);

alter table public.players add column if not exists character text default 'Top Hat';
alter table public.players add column if not exists color text default '#d81f34';

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  game_code text not null references public.games(code) on delete cascade,
  from_player_id text not null,
  to_player_id text not null,
  amount integer not null check (amount > 0),
  note text,
  created_at timestamptz default now()
);

alter table public.games enable row level security;
alter table public.players enable row level security;
alter table public.transactions enable row level security;

do $$ begin
  create policy "public games read" on public.games for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public games insert" on public.games for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public players read" on public.players for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public players insert" on public.players for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public players update" on public.players for update using (true) with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public transactions read" on public.transactions for select using (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public transactions insert" on public.transactions for insert with check (true);
exception when duplicate_object then null; end $$;
do $$ begin
  create policy "public transactions delete" on public.transactions for delete using (true);
exception when duplicate_object then null; end $$;

-- Enable live updates. If Supabase says the table is already added, that is okay.
do $$ begin
  alter publication supabase_realtime add table public.players;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.transactions;
exception when duplicate_object then null; end $$;
