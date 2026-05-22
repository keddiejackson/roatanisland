-- RoatanIsland.life Concierge Leads setup
-- Run this in Supabase SQL Editor before using Admin > Concierge.

create table if not exists public.concierge_leads (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  lead_type text not null default 'planning_lead',
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'contacted', 'quoted', 'booked', 'closed')),
  priority text not null default 'general'
    check (priority in ('urgent', 'cruise', 'airport', 'family', 'luxury', 'general')),
  interest text,
  message text not null,
  travel_date date,
  guests integer,
  pickup_area text,
  arrival_type text,
  trip_style text,
  budget text,
  plan jsonb not null default '{}'::jsonb,
  source_path text,
  admin_notes text,
  follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.concierge_leads
add column if not exists lead_type text not null default 'planning_lead';

alter table public.concierge_leads
add column if not exists status text not null default 'new'
check (status in ('new', 'reviewing', 'contacted', 'quoted', 'booked', 'closed'));

alter table public.concierge_leads
add column if not exists priority text not null default 'general'
check (priority in ('urgent', 'cruise', 'airport', 'family', 'luxury', 'general'));

alter table public.concierge_leads
add column if not exists plan jsonb not null default '{}'::jsonb;

alter table public.concierge_leads
add column if not exists source_path text;

alter table public.concierge_leads
add column if not exists admin_notes text;

alter table public.concierge_leads
add column if not exists follow_up_date date;

alter table public.concierge_leads
add column if not exists updated_at timestamptz not null default now();

alter table public.concierge_leads enable row level security;

grant insert on public.concierge_leads to anon, authenticated;
grant select, update on public.concierge_leads to authenticated;

drop policy if exists "Anyone can create concierge leads" on public.concierge_leads;
create policy "Anyone can create concierge leads"
on public.concierge_leads
for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can view concierge leads" on public.concierge_leads;
create policy "Admins can view concierge leads"
on public.concierge_leads
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can update concierge leads" on public.concierge_leads;
create policy "Admins can update concierge leads"
on public.concierge_leads
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
