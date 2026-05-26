-- Booking chat read receipts
-- Run this in Supabase SQL Editor after applying the chat upgrade.

create table if not exists public.booking_message_reads (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reader_role text not null
    check (reader_role in ('guest', 'vendor', 'admin')),
  reader_email text not null,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, reader_role, reader_email)
);

create index if not exists booking_message_reads_booking_id_idx
on public.booking_message_reads(booking_id);

create index if not exists booking_message_reads_reader_idx
on public.booking_message_reads(reader_role, reader_email);

alter table public.booking_message_reads enable row level security;

grant select, insert, update on public.booking_message_reads to authenticated;

drop policy if exists "Admins can manage booking message reads" on public.booking_message_reads;
create policy "Admins can manage booking message reads"
on public.booking_message_reads
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

drop policy if exists "Guests can manage own booking message reads" on public.booking_message_reads;
create policy "Guests can manage own booking message reads"
on public.booking_message_reads
for all
to authenticated
using (
  reader_role = 'guest'
  and lower(reader_email) = lower(auth.jwt() ->> 'email')
  and exists (
    select 1
    from public.bookings
    where bookings.id = booking_message_reads.booking_id
      and lower(bookings.email) = lower(auth.jwt() ->> 'email')
  )
)
with check (
  reader_role = 'guest'
  and lower(reader_email) = lower(auth.jwt() ->> 'email')
  and exists (
    select 1
    from public.bookings
    where bookings.id = booking_message_reads.booking_id
      and lower(bookings.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Vendors can manage booking message reads for own listings" on public.booking_message_reads;
create policy "Vendors can manage booking message reads for own listings"
on public.booking_message_reads
for all
to authenticated
using (
  reader_role = 'vendor'
  and lower(reader_email) = lower(auth.jwt() ->> 'email')
  and exists (
    select 1
    from public.bookings
    join public.listings on listings.id = bookings.listing_id
    join public.vendor_users on vendor_users.vendor_id = listings.vendor_id
    where bookings.id = booking_message_reads.booking_id
      and vendor_users.user_id = auth.uid()
  )
)
with check (
  reader_role = 'vendor'
  and lower(reader_email) = lower(auth.jwt() ->> 'email')
  and exists (
    select 1
    from public.bookings
    join public.listings on listings.id = bookings.listing_id
    join public.vendor_users on vendor_users.vendor_id = listings.vendor_id
    where bookings.id = booking_message_reads.booking_id
      and vendor_users.user_id = auth.uid()
  )
);
