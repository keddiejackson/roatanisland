-- RoatanIsland.life community forum
-- Run this in Supabase SQL Editor to make the community page persistent.

create table if not exists public.community_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (email = lower(email)),
  category text not null default 'Trip ideas',
  title text not null,
  body text not null,
  display_name text,
  profile_image_url text,
  anonymous boolean not null default false,
  status text not null default 'active' check (status in ('active', 'hidden', 'removed')),
  reply_count integer not null default 0,
  last_reply_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_replies (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.community_threads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (email = lower(email)),
  body text not null,
  display_name text,
  profile_image_url text,
  anonymous boolean not null default false,
  status text not null default 'active' check (status in ('active', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.community_threads
add column if not exists author_role text not null default 'traveler';

alter table public.community_threads
add column if not exists is_verified_local boolean not null default false;

alter table public.community_threads
add column if not exists is_verified_operator boolean not null default false;

alter table public.community_threads
add column if not exists trip_date date;

alter table public.community_threads
add column if not exists area text;

alter table public.community_threads
add column if not exists group_size integer check (group_size is null or group_size > 0);

alter table public.community_threads
add column if not exists arrival_type text not null default 'Not sure';

alter table public.community_threads
add column if not exists arrival_time text;

alter table public.community_threads
add column if not exists budget text;

alter table public.community_threads
add column if not exists related_listing_id uuid references public.listings(id) on delete set null;

alter table public.community_threads
add column if not exists related_listing_title text;

alter table public.community_threads
add column if not exists map_area text;

alter table public.community_threads
add column if not exists roa_summary text;

alter table public.community_threads
add column if not exists is_pinned boolean not null default false;

alter table public.community_threads
add column if not exists is_featured boolean not null default false;

alter table public.community_threads
add column if not exists best_reply_id uuid;

alter table public.community_threads
add column if not exists concierge_pick_reply_id uuid;

alter table public.community_threads
add column if not exists helpful_count integer not null default 0;

alter table public.community_replies
add column if not exists author_role text not null default 'traveler';

alter table public.community_replies
add column if not exists is_verified_local boolean not null default false;

alter table public.community_replies
add column if not exists is_verified_operator boolean not null default false;

alter table public.community_replies
add column if not exists is_best_answer boolean not null default false;

alter table public.community_replies
add column if not exists is_concierge_pick boolean not null default false;

alter table public.community_replies
add column if not exists helpful_count integer not null default 0;

create index if not exists community_threads_status_last_reply_idx
on public.community_threads (status, last_reply_at desc);

create index if not exists community_threads_pinned_featured_idx
on public.community_threads (status, is_pinned desc, is_featured desc, last_reply_at desc);

create index if not exists community_threads_category_status_idx
on public.community_threads (category, status);

create index if not exists community_threads_map_area_idx
on public.community_threads (map_area, status);

create index if not exists community_threads_user_id_idx
on public.community_threads (user_id);

create index if not exists community_replies_thread_id_created_idx
on public.community_replies (thread_id, created_at);

create index if not exists community_replies_user_id_idx
on public.community_replies (user_id);

create or replace function public.increment_community_thread_reply_count(
  thread_id_input uuid,
  last_reply_at_input timestamptz default now()
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.community_threads
  set
    reply_count = reply_count + 1,
    last_reply_at = coalesce(last_reply_at_input, now()),
    updated_at = now()
  where id = thread_id_input;
$$;

alter table public.community_threads enable row level security;
alter table public.community_replies enable row level security;

drop policy if exists "Anyone can view active community threads" on public.community_threads;
create policy "Anyone can view active community threads"
on public.community_threads
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "Signed in guests can create community threads" on public.community_threads;
create policy "Signed in guests can create community threads"
on public.community_threads
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Guests can update own community threads" on public.community_threads;
create policy "Guests can update own community threads"
on public.community_threads
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Admins can manage community threads" on public.community_threads;
create policy "Admins can manage community threads"
on public.community_threads
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Anyone can view active community replies" on public.community_replies;
create policy "Anyone can view active community replies"
on public.community_replies
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "Signed in guests can reply in community" on public.community_replies;
create policy "Signed in guests can reply in community"
on public.community_replies
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Guests can update own community replies" on public.community_replies;
create policy "Guests can update own community replies"
on public.community_replies
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "Admins can manage community replies" on public.community_replies;
create policy "Admins can manage community replies"
on public.community_replies
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);
