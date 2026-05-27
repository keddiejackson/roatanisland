-- Booking reminders and trip packet follow-up logs
-- Run this in Supabase SQL Editor before turning on automatic reminders.

create table if not exists public.booking_reminder_settings (
  reminder_type text primary key,
  enabled boolean not null default true,
  subject_template text,
  body_template text,
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_reminder_logs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reminder_type text not null,
  recipient_role text not null check (recipient_role in ('guest', 'vendor')),
  recipient_email text,
  subject text,
  status text not null default 'sent'
    check (status in ('sent', 'manual', 'skipped', 'failed')),
  trigger_key text,
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists booking_reminder_logs_booking_id_idx
on public.booking_reminder_logs(booking_id);

create index if not exists booking_reminder_logs_sent_at_idx
on public.booking_reminder_logs(sent_at);

create index if not exists booking_reminder_logs_dedupe_idx
on public.booking_reminder_logs(booking_id, reminder_type, recipient_role, recipient_email, trigger_key);

alter table public.booking_reminder_settings enable row level security;
alter table public.booking_reminder_logs enable row level security;

grant select, insert, update on public.booking_reminder_settings to authenticated;
grant select, insert on public.booking_reminder_logs to authenticated;

insert into public.booking_reminder_settings
  (reminder_type, enabled, subject_template, body_template)
values
  ('guest_payment_due_soon', true, 'Payment due soon for {listingTitle}', 'Hi {guestName}, your {amountDue} balance for {listingTitle} is {dueLabel}.'),
  ('guest_payment_overdue', true, 'Payment reminder for {listingTitle}', 'Hi {guestName}, your {amountDue} balance for {listingTitle} is {dueLabel}.'),
  ('guest_trip_tomorrow', true, 'Your Roatan trip is tomorrow', 'Hi {guestName}, your {listingTitle} booking is tomorrow at {time}. Review your trip packet before you go.'),
  ('guest_review_request', true, 'How was your Roatan experience?', 'Hi {guestName}, thank you for booking {listingTitle}. We would love your review when you have a minute.'),
  ('vendor_booking_needs_response', true, 'Booking needs your response', '{vendorName}, {guestName}''s {listingTitle} request still needs a response.'),
  ('vendor_guest_message', true, 'Guest message needs a reply', '{vendorName}, {guestName} sent a message about {listingTitle}. Please reply from your dashboard.'),
  ('vendor_trip_tomorrow', true, 'Tomorrow''s booking reminder', '{vendorName}, {guestName}''s {listingTitle} booking is tomorrow at {time}. Confirm pickup and final details.'),
  ('vendor_payout_paid', true, 'Payout marked paid', '{vendorName}, a payout for {listingTitle} has been marked paid by RoatanIsland.life.')
on conflict (reminder_type) do nothing;

drop policy if exists "Admins can manage booking reminder settings" on public.booking_reminder_settings;
create policy "Admins can manage booking reminder settings"
on public.booking_reminder_settings
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

drop policy if exists "Admins can manage booking reminder logs" on public.booking_reminder_logs;
create policy "Admins can manage booking reminder logs"
on public.booking_reminder_logs
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

drop policy if exists "Guests can view own booking reminder logs" on public.booking_reminder_logs;
create policy "Guests can view own booking reminder logs"
on public.booking_reminder_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings
    where bookings.id = booking_reminder_logs.booking_id
      and lower(bookings.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Vendors can view booking reminder logs for own listings" on public.booking_reminder_logs;
create policy "Vendors can view booking reminder logs for own listings"
on public.booking_reminder_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings
    join public.listings on listings.id = bookings.listing_id
    join public.vendor_users on vendor_users.vendor_id = listings.vendor_id
    where bookings.id = booking_reminder_logs.booking_id
      and vendor_users.user_id = auth.uid()
  )
);
