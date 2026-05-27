-- Vendor payout management upgrade
-- Run this in Supabase SQL Editor before using the new payout controls.

alter table public.bookings
add column if not exists payout_note text;

alter table public.bookings
add column if not exists payout_scheduled_for date;

alter table public.bookings
add column if not exists payout_paid_at timestamptz;

alter table public.bookings
drop constraint if exists bookings_commission_status_check;

alter table public.bookings
add constraint bookings_commission_status_check
check (commission_status in ('unpaid', 'scheduled', 'paid', 'waived'));
