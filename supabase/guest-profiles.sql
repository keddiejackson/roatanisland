-- Guest profile photos and chat identity
-- Run this in Supabase SQL Editor before testing profile image uploads live.

create table if not exists public.guest_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text not null,
  display_name text,
  profile_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guest_profiles_email_idx
on public.guest_profiles(lower(email));

alter table public.guest_profiles enable row level security;

grant select, insert, update on public.guest_profiles to authenticated;

drop policy if exists "Guests can manage own profile" on public.guest_profiles;
create policy "Guests can manage own profile"
on public.guest_profiles
for all
to authenticated
using (
  user_id = auth.uid()
  and lower(email) = lower(auth.jwt() ->> 'email')
)
with check (
  user_id = auth.uid()
  and lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "Admins can view guest profiles" on public.guest_profiles;
create policy "Admins can view guest profiles"
on public.guest_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);
