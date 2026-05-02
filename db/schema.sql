create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key,
  email text unique not null,
  credits int not null default 10,
  plan text not null default 'free' check (plan in ('free','monthly','yearly')),
  created_at timestamptz not null default now()
);

create table if not exists public.presentations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  topic text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.slides (
  id uuid primary key default uuid_generate_v4(),
  presentation_id uuid not null references public.presentations(id) on delete cascade,
  title text not null,
  content jsonb not null,
  layout_type text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.reels (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  video_url text not null,
  analysis_data jsonb not null,
  created_at timestamptz not null default now()
);

alter publication supabase_realtime add table public.slides;

alter table public.users enable row level security;
alter table public.presentations enable row level security;
alter table public.slides enable row level security;
alter table public.reels enable row level security;

create policy "users own row" on public.users for select using (auth.uid() = id);
create policy "users own presentations" on public.presentations for all using (auth.uid() = user_id);
create policy "users own reels" on public.reels for all using (auth.uid() = user_id);
create policy "slides through own presentations" on public.slides for all using (
  exists(select 1 from public.presentations p where p.id = presentation_id and p.user_id = auth.uid())
);
