-- Smart booking rules for listings.
-- Run this once in Supabase SQL Editor.

alter table public.listings
add column if not exists booking_cutoff_hours integer;

alter table public.listings
add column if not exists auto_confirm_bookings boolean not null default false;

alter table public.listings
add column if not exists private_booking_mode boolean not null default false;

alter table public.listings
add column if not exists available_weekdays integer[] not null default array[0,1,2,3,4,5,6]::integer[];

alter table public.listings
add column if not exists season_start_date text;

alter table public.listings
add column if not exists season_end_date text;
