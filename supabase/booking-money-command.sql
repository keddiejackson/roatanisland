-- Booking Money Command Center
-- Run this in Supabase SQL Editor before using the new admin money controls.

alter table public.bookings
add column if not exists payment_schedule_type text not null default 'request_later';

alter table public.bookings
drop constraint if exists bookings_payment_schedule_type_check;

alter table public.bookings
add constraint bookings_payment_schedule_type_check
check (
  payment_schedule_type in (
    'request_later',
    'deposit_only',
    'full_payment',
    'split_payment',
    'manual',
    'waived'
  )
);

alter table public.bookings
add column if not exists payment_due_date date;

alter table public.bookings
add column if not exists balance_due_date date;

alter table public.bookings
add column if not exists amount_paid_cents integer not null default 0;

alter table public.bookings
add column if not exists balance_due_cents integer;

alter table public.bookings
add column if not exists payment_method text;

alter table public.bookings
add column if not exists manual_payment_note text;

alter table public.bookings
add column if not exists payment_requested_at timestamptz;

alter table public.bookings
add column if not exists payment_last_sent_at timestamptz;

alter table public.bookings
add column if not exists payment_link_url text;

alter table public.bookings
add column if not exists invoice_number text;

alter table public.bookings
add column if not exists receipt_number text;

alter table public.bookings
add column if not exists refund_status text not null default 'none';

alter table public.bookings
drop constraint if exists bookings_refund_status_check;

alter table public.bookings
add constraint bookings_refund_status_check
check (refund_status in ('none', 'pending', 'partial', 'full', 'declined'));

alter table public.bookings
add column if not exists refund_amount_cents integer;

alter table public.bookings
add column if not exists refund_note text;

alter table public.bookings
add column if not exists payment_issue_flag boolean not null default false;

alter table public.bookings
add column if not exists payment_issue_note text;

alter table public.bookings
add column if not exists commission_override_cents integer;

alter table public.bookings
add column if not exists vendor_private_payout_note text;

create table if not exists public.booking_money_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_type text not null,
  actor_role text not null default 'system'
    check (actor_role in ('guest', 'vendor', 'admin', 'system')),
  actor_email text,
  amount_cents integer,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_money_events_booking_id_idx
on public.booking_money_events(booking_id);

create index if not exists booking_money_events_created_at_idx
on public.booking_money_events(created_at);

alter table public.booking_money_events enable row level security;

grant select, insert on public.booking_money_events to authenticated;

drop policy if exists "Admins can manage booking money events" on public.booking_money_events;
create policy "Admins can manage booking money events"
on public.booking_money_events
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

drop policy if exists "Guests can view own booking money events" on public.booking_money_events;
create policy "Guests can view own booking money events"
on public.booking_money_events
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings
    where bookings.id = booking_money_events.booking_id
      and lower(bookings.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Vendors can view booking money events for own listings" on public.booking_money_events;
create policy "Vendors can view booking money events for own listings"
on public.booking_money_events
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings
    join public.listings on listings.id = bookings.listing_id
    join public.vendor_users on vendor_users.vendor_id = listings.vendor_id
    where bookings.id = booking_money_events.booking_id
      and vendor_users.user_id = auth.uid()
  )
);
