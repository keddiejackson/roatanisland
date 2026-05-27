-- Booking change request workflow
-- Run this in Supabase SQL Editor before using guest/vendor/admin change requests.

create table if not exists public.booking_change_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  requested_by_role text not null
    check (requested_by_role in ('guest', 'vendor', 'admin')),
  requested_by_email text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined', 'countered', 'cancelled')),
  requested_tour_date date,
  requested_tour_time text,
  requested_guests integer check (requested_guests is null or requested_guests > 0),
  requested_pickup_note text,
  reason text,
  response_note text,
  resolved_by_role text
    check (resolved_by_role is null or resolved_by_role in ('guest', 'vendor', 'admin')),
  resolved_by_email text,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_change_requests_booking_id_idx
on public.booking_change_requests(booking_id);

create index if not exists booking_change_requests_status_idx
on public.booking_change_requests(status);

alter table public.booking_change_requests enable row level security;

grant select, insert, update on public.booking_change_requests to authenticated;

drop policy if exists "Admins can manage booking change requests" on public.booking_change_requests;
create policy "Admins can manage booking change requests"
on public.booking_change_requests
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

drop policy if exists "Guests can view own booking change requests" on public.booking_change_requests;
create policy "Guests can view own booking change requests"
on public.booking_change_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings
    where bookings.id = booking_change_requests.booking_id
      and lower(bookings.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Guests can create own booking change requests" on public.booking_change_requests;
create policy "Guests can create own booking change requests"
on public.booking_change_requests
for insert
to authenticated
with check (
  requested_by_role = 'guest'
  and status = 'pending'
  and lower(requested_by_email) = lower(auth.jwt() ->> 'email')
  and exists (
    select 1
    from public.bookings
    where bookings.id = booking_change_requests.booking_id
      and lower(bookings.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Vendors can view booking change requests for own listings" on public.booking_change_requests;
create policy "Vendors can view booking change requests for own listings"
on public.booking_change_requests
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings
    join public.listings on listings.id = bookings.listing_id
    join public.vendor_users on vendor_users.vendor_id = listings.vendor_id
    where bookings.id = booking_change_requests.booking_id
      and vendor_users.user_id = auth.uid()
  )
);
