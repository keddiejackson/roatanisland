-- RoatanIsland.life support ticket queue
-- Run this in Supabase SQL Editor before using /admin/support.

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  intent text not null default 'Support request',
  booking_reference text,
  message text not null,
  status text not null default 'new'
    check (status in ('new', 'in_progress', 'waiting_on_guest', 'resolved')),
  priority text not null default 'normal'
    check (priority in ('urgent', 'normal', 'low')),
  admin_notes text,
  source_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets
add column if not exists phone text;

alter table public.support_tickets
add column if not exists intent text not null default 'Support request';

alter table public.support_tickets
add column if not exists booking_reference text;

alter table public.support_tickets
add column if not exists status text not null default 'new'
check (status in ('new', 'in_progress', 'waiting_on_guest', 'resolved'));

alter table public.support_tickets
add column if not exists priority text not null default 'normal'
check (priority in ('urgent', 'normal', 'low'));

alter table public.support_tickets
add column if not exists admin_notes text;

alter table public.support_tickets
add column if not exists source_path text;

alter table public.support_tickets
add column if not exists updated_at timestamptz not null default now();

create index if not exists support_tickets_email_idx
on public.support_tickets (lower(email));

create index if not exists support_tickets_status_priority_idx
on public.support_tickets (status, priority, created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists "Anyone can create support tickets" on public.support_tickets;
create policy "Anyone can create support tickets"
on public.support_tickets
for insert
to anon, authenticated
with check (true);

drop policy if exists "Guests can view own support tickets" on public.support_tickets;
create policy "Guests can view own support tickets"
on public.support_tickets
for select
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Admins can view support tickets" on public.support_tickets;
create policy "Admins can view support tickets"
on public.support_tickets
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can update support tickets" on public.support_tickets;
create policy "Admins can update support tickets"
on public.support_tickets
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

drop policy if exists "Admins can delete support tickets" on public.support_tickets;
create policy "Admins can delete support tickets"
on public.support_tickets
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);
