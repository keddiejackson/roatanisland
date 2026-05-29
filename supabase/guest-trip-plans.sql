-- Guest saved map plans
-- Run this in Supabase SQL Editor before testing account-saved map plans live.

create table if not exists public.guest_trip_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  name text not null,
  pickup_area text,
  arrival_type text,
  trip_date date,
  trip_time text,
  guest_count integer check (guest_count is null or guest_count > 0),
  source text not null default 'map',
  status text not null default 'saved'
    check (status in ('saved', 'concierge_requested', 'quoted', 'booked', 'archived')),
  stops jsonb not null default '[]'::jsonb,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.guest_trip_plans
add column if not exists user_id uuid;

alter table public.guest_trip_plans
add column if not exists email text;

alter table public.guest_trip_plans
add column if not exists name text;

alter table public.guest_trip_plans
add column if not exists pickup_area text;

alter table public.guest_trip_plans
add column if not exists arrival_type text;

alter table public.guest_trip_plans
add column if not exists trip_date date;

alter table public.guest_trip_plans
add column if not exists trip_time text;

alter table public.guest_trip_plans
add column if not exists guest_count integer;

alter table public.guest_trip_plans
add column if not exists source text not null default 'map';

alter table public.guest_trip_plans
add column if not exists status text not null default 'saved';

alter table public.guest_trip_plans
add column if not exists stops jsonb not null default '[]'::jsonb;

alter table public.guest_trip_plans
add column if not exists admin_notes text;

alter table public.guest_trip_plans
add column if not exists updated_at timestamptz not null default now();

create index if not exists guest_trip_plans_user_id_idx
on public.guest_trip_plans(user_id, updated_at desc);

create index if not exists guest_trip_plans_email_idx
on public.guest_trip_plans(lower(email));

create index if not exists guest_trip_plans_status_idx
on public.guest_trip_plans(status, updated_at desc);

alter table public.guest_trip_plans enable row level security;

grant select, insert, update, delete on public.guest_trip_plans to authenticated;

drop policy if exists "Guests can manage own trip plans" on public.guest_trip_plans;
create policy "Guests can manage own trip plans"
on public.guest_trip_plans
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

drop policy if exists "Admins can view guest trip plans" on public.guest_trip_plans;
create policy "Admins can view guest trip plans"
on public.guest_trip_plans
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can update guest trip plans" on public.guest_trip_plans;
create policy "Admins can update guest trip plans"
on public.guest_trip_plans
for update
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
