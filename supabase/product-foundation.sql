-- RoatanIsland.life product foundation hardening
-- Run this file once in the Supabase SQL Editor before deploying the matching app changes.

create table if not exists public.api_rate_limits (
  scope text not null,
  identifier text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now(),
  primary key (scope, identifier, window_started_at)
);

alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create index if not exists api_rate_limits_window_idx
on public.api_rate_limits(window_started_at);

create or replace function public.consume_api_rate_limit(
  p_identifier text,
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_window timestamptz;
  next_count integer;
begin
  if coalesce(length(trim(p_identifier)), 0) < 16
    or coalesce(length(trim(p_scope)), 0) < 2
    or p_limit < 1
    or p_window_seconds < 1 then
    return false;
  end if;

  current_window := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.api_rate_limits (
    scope,
    identifier,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    left(p_scope, 80),
    left(p_identifier, 128),
    current_window,
    1,
    now()
  )
  on conflict (scope, identifier, window_started_at)
  do update set
    request_count = api_rate_limits.request_count + 1,
    updated_at = now()
  returning request_count into next_count;

  delete from public.api_rate_limits
  where window_started_at < now() - interval '2 days';

  return next_count <= p_limit;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_api_rate_limit(text, text, integer, integer)
to service_role;

alter table public.bookings
add column if not exists request_key text;

create unique index if not exists bookings_request_key_unique_idx
on public.bookings(request_key)
where request_key is not null;

create index if not exists bookings_slot_capacity_idx
on public.bookings(listing_id, tour_date, tour_time, status)
where status in ('new', 'confirmed');

create index if not exists bookings_guest_email_idx
on public.bookings(lower(email), created_at desc);

create index if not exists vendor_users_user_vendor_idx
on public.vendor_users(user_id, vendor_id);

create index if not exists listings_vendor_status_idx
on public.listings(vendor_id, approval_status, is_active);

create or replace function public.create_booking_request(
  p_request_key text,
  p_full_name text,
  p_email text,
  p_tour_date date,
  p_tour_time text,
  p_guests integer,
  p_guest_message text,
  p_listing_id uuid,
  p_status text,
  p_booking_value_cents integer,
  p_commission_rate numeric,
  p_commission_amount_cents integer,
  p_promo_code text,
  p_discount_amount_cents integer,
  p_selected_addons jsonb
)
returns setof public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_row public.listings%rowtype;
  reserved_guests integer := 0;
begin
  if p_guests < 1 then
    raise exception 'Guest count must be at least one.';
  end if;

  if p_request_key is not null then
    return query
    select *
    from public.bookings
    where request_key = p_request_key;

    if found then
      return;
    end if;
  end if;

  if p_listing_id is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(
        p_listing_id::text || '|' || p_tour_date::text || '|' || p_tour_time,
        0
      )
    );

    select *
    into listing_row
    from public.listings
    where id = p_listing_id
      and is_active = true
      and approval_status = 'approved';

    if not found then
      raise exception 'This experience is not currently available.';
    end if;

    select coalesce(sum(guests), 0)
    into reserved_guests
    from public.bookings
    where listing_id = p_listing_id
      and tour_date = p_tour_date
      and tour_time = p_tour_time
      and status in ('new', 'confirmed');

    if listing_row.private_booking_mode and reserved_guests > 0 then
      raise exception 'That private time is no longer available.';
    end if;

    if listing_row.max_guests is not null
      and reserved_guests + p_guests > listing_row.max_guests then
      raise exception 'That time no longer has enough space.';
    end if;
  end if;

  return query
  insert into public.bookings (
    request_key,
    full_name,
    email,
    tour_date,
    tour_time,
    guests,
    guest_message,
    status,
    listing_id,
    booking_value_cents,
    commission_rate,
    commission_amount_cents,
    promo_code,
    discount_amount_cents,
    selected_addons
  )
  values (
    nullif(trim(p_request_key), ''),
    trim(p_full_name),
    lower(trim(p_email)),
    p_tour_date,
    trim(p_tour_time),
    p_guests,
    nullif(trim(p_guest_message), ''),
    p_status,
    p_listing_id,
    p_booking_value_cents,
    p_commission_rate,
    p_commission_amount_cents,
    nullif(trim(p_promo_code), ''),
    p_discount_amount_cents,
    coalesce(p_selected_addons, '[]'::jsonb)
  )
  on conflict (request_key) where request_key is not null
  do update set request_key = excluded.request_key
  returning *;
end;
$$;

revoke all on function public.create_booking_request(
  text, text, text, date, text, integer, text, uuid, text, integer,
  numeric, integer, text, integer, jsonb
) from public, anon, authenticated;
grant execute on function public.create_booking_request(
  text, text, text, date, text, integer, text, uuid, text, integer,
  numeric, integer, text, integer, jsonb
) to service_role;

create table if not exists public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd',
  provider text not null default 'stripe',
  provider_session_id text not null unique,
  provider_payment_intent_id text,
  status text not null default 'paid',
  created_at timestamptz not null default now()
);

alter table public.booking_payments enable row level security;
revoke all on public.booking_payments from anon, authenticated;

create index if not exists booking_payments_booking_created_idx
on public.booking_payments(booking_id, created_at desc);

create or replace function public.record_stripe_booking_payment(
  p_booking_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_amount_cents integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_count integer := 0;
  booking_total integer := 0;
  next_paid integer := 0;
begin
  if p_amount_cents < 1 or coalesce(length(trim(p_session_id)), 0) < 3 then
    return false;
  end if;

  perform 1
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    return false;
  end if;

  insert into public.booking_payments (
    booking_id,
    amount_cents,
    provider_session_id,
    provider_payment_intent_id,
    status
  )
  values (
    p_booking_id,
    p_amount_cents,
    p_session_id,
    nullif(trim(p_payment_intent_id), ''),
    'paid'
  )
  on conflict (provider_session_id) do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count = 0 then
    return false;
  end if;

  select
    coalesce(booking_value_cents, p_amount_cents),
    coalesce(amount_paid_cents, 0) + p_amount_cents
  into booking_total, next_paid
  from public.bookings
  where id = p_booking_id;

  update public.bookings
  set
    deposit_status = case
      when next_paid >= booking_total then 'paid'
      else 'partial_paid'
    end,
    amount_paid_cents = next_paid,
    balance_due_cents = greatest(0, booking_total - next_paid),
    stripe_checkout_session_id = p_session_id,
    stripe_payment_intent_id = nullif(trim(p_payment_intent_id), ''),
    paid_at = now(),
    receipt_number = coalesce(
      receipt_number,
      'RCT-' || upper(right(replace(p_booking_id::text, '-', ''), 8))
    )
  where id = p_booking_id;

  return true;
end;
$$;

revoke all on function public.record_stripe_booking_payment(uuid, text, text, integer)
from public, anon, authenticated;
grant execute on function public.record_stripe_booking_payment(uuid, text, text, integer)
to service_role;

-- Public writes now go through validated server routes or the dedicated signup RPC.
drop policy if exists "Vendor signup can create account link" on public.vendor_users;
drop policy if exists "Anyone can submit vendors" on public.vendors;
drop policy if exists "Vendors can submit inactive listings" on public.listings;
drop policy if exists "Anyone can create bookings" on public.bookings;
drop policy if exists "Anyone can create analytics events" on public.analytics_events;
drop policy if exists "Anyone can submit listing reports" on public.listing_reports;
drop policy if exists "Anyone can submit listing reviews" on public.listing_reviews;
drop policy if exists "Anyone can create listing reviews" on public.listing_reviews;
drop policy if exists "Anyone can submit concierge leads" on public.concierge_leads;
drop policy if exists "Anyone can create concierge leads" on public.concierge_leads;

revoke insert on public.vendor_users from anon, authenticated;
revoke insert on public.vendors from anon;
revoke insert on public.listings from anon;
revoke insert on public.bookings from anon, authenticated;
revoke insert on public.analytics_events from anon, authenticated;
revoke insert on public.listing_reports from anon, authenticated;
revoke insert on public.listing_reviews from anon, authenticated;
revoke insert on public.concierge_leads from anon, authenticated;
