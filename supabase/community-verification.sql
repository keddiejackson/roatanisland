-- RoatanIsland.life community verification and closed discussions
-- Run this in Supabase SQL Editor after the community forum SQL.

alter table public.guest_profiles
add column if not exists community_verification_type text not null default 'unverified'
check (community_verification_type in ('admin', 'vendor', 'local', 'traveler', 'unverified'));

alter table public.guest_profiles
add column if not exists community_verified_at timestamptz;

alter table public.guest_profiles
add column if not exists community_verified_by text;

alter table public.guest_profiles
add column if not exists community_verification_note text;

alter table public.community_threads
add column if not exists community_verification_type text not null default 'unverified'
check (community_verification_type in ('admin', 'vendor', 'local', 'traveler', 'unverified'));

alter table public.community_threads
add column if not exists is_locked boolean not null default false;

alter table public.community_threads
add column if not exists locked_at timestamptz;

alter table public.community_threads
add column if not exists locked_by text;

alter table public.community_threads
add column if not exists locked_reason text;

alter table public.community_replies
add column if not exists community_verification_type text not null default 'unverified'
check (community_verification_type in ('admin', 'vendor', 'local', 'traveler', 'unverified'));

create table if not exists public.community_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null check (email = lower(email)),
  display_name text,
  requested_type text not null default 'traveler'
    check (requested_type in ('vendor', 'local', 'traveler')),
  approved_type text
    check (approved_type in ('admin', 'vendor', 'local', 'traveler', 'unverified')),
  status text not null default 'pending'
    check (status in ('pending', 'needs_info', 'approved', 'denied')),
  social_links text[] not null default '{}'::text[],
  notes text,
  admin_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_verification_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.community_verification_requests(id) on delete cascade,
  sender_user_id uuid references auth.users(id) on delete set null,
  sender_email text,
  sender_role text not null default 'traveler'
    check (sender_role in ('admin', 'traveler')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists community_verification_requests_status_idx
on public.community_verification_requests(status, created_at desc);

create index if not exists community_verification_requests_user_idx
on public.community_verification_requests(user_id, created_at desc);

create index if not exists community_verification_messages_request_idx
on public.community_verification_messages(request_id, created_at);

alter table public.community_verification_requests enable row level security;
alter table public.community_verification_messages enable row level security;

drop policy if exists "Signed in guests can reply in community" on public.community_replies;
create policy "Signed in guests can reply in community"
on public.community_replies
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.community_threads
    where community_threads.id = community_replies.thread_id
      and community_threads.status = 'active'
      and community_threads.is_locked = false
  )
);

drop policy if exists "Guests can view own verification requests" on public.community_verification_requests;
create policy "Guests can view own verification requests"
on public.community_verification_requests
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Guests can create own verification requests" on public.community_verification_requests;
create policy "Guests can create own verification requests"
on public.community_verification_requests
for insert
to authenticated
with check (user_id = auth.uid() and lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Admins can manage verification requests" on public.community_verification_requests;
create policy "Admins can manage verification requests"
on public.community_verification_requests
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

drop policy if exists "Guests can view own verification messages" on public.community_verification_messages;
create policy "Guests can view own verification messages"
on public.community_verification_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.community_verification_requests
    where community_verification_requests.id = community_verification_messages.request_id
      and community_verification_requests.user_id = auth.uid()
  )
);

drop policy if exists "Guests can create own verification messages" on public.community_verification_messages;
create policy "Guests can create own verification messages"
on public.community_verification_messages
for insert
to authenticated
with check (
  sender_role = 'traveler'
  and exists (
    select 1
    from public.community_verification_requests
    where community_verification_requests.id = community_verification_messages.request_id
      and community_verification_requests.user_id = auth.uid()
  )
);

drop policy if exists "Admins can manage verification messages" on public.community_verification_messages;
create policy "Admins can manage verification messages"
on public.community_verification_messages
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
