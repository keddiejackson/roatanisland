-- RoatanIsland.life Supabase setup
-- Run this in Supabase SQL Editor, then replace the admin email at the bottom.

create extension if not exists pgcrypto;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'listing-images',
  'listing-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.admin_users (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_name text,
  email text,
  phone text,
  website text,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vendor_users (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  user_id uuid not null,
  email text not null,
  created_at timestamptz not null default now(),
  unique (vendor_id, user_id)
);

alter table public.vendors
drop constraint if exists vendors_id_fkey;

alter table public.vendors
alter column id set default gen_random_uuid();

alter table public.vendor_users
alter column id set default gen_random_uuid();

alter table public.listings
alter column id set default gen_random_uuid();

alter table public.bookings
alter column id set default gen_random_uuid();

alter table public.vendors
add column if not exists contact_name text;

alter table public.vendors
add column if not exists email text;

alter table public.vendors
add column if not exists phone text;

alter table public.vendors
add column if not exists website text;

alter table public.vendors
add column if not exists notes text;

alter table public.vendors
add column if not exists is_active boolean not null default true;

alter table public.vendor_users
add column if not exists email text;

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete set null,
  title text not null,
  description text,
  price numeric,
  location text,
  image_url text,
  category text not null default 'Tours',
  tour_times text[] not null default array['10:30 AM', '4:30 PM Sunset Cruise']::text[],
  availability_note text,
  max_guests integer,
  minimum_notice_hours integer,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  rating numeric default 5,
  reviews_count integer default 0,
  created_at timestamptz not null default now()
);

alter table public.listings
add column if not exists is_active boolean not null default true;

alter table public.listings
add column if not exists is_featured boolean not null default false;

alter table public.listings
add column if not exists vendor_id uuid references public.vendors(id) on delete set null;

alter table public.listings
add column if not exists tour_times text[] not null default array['10:30 AM', '4:30 PM Sunset Cruise']::text[];

alter table public.listings
add column if not exists availability_note text;

alter table public.listings
add column if not exists max_guests integer;

alter table public.listings
add column if not exists minimum_notice_hours integer;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  tour_date date not null,
  tour_time text not null,
  guests integer not null check (guests > 0),
  guest_message text,
  status text not null default 'new' check (status in ('new', 'confirmed', 'completed', 'cancelled')),
  admin_notes text,
  listing_id uuid references public.listings(id) on delete set null,
  deposit_status text not null default 'not_requested',
  deposit_amount_cents integer,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null default 'page_view',
  path text,
  listing_id uuid references public.listings(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.app_errors (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  severity text not null default 'error',
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.bookings
add column if not exists status text not null default 'new'
check (status in ('new', 'confirmed', 'completed', 'cancelled'));

alter table public.bookings
add column if not exists admin_notes text;

alter table public.bookings
add column if not exists guest_message text;

alter table public.bookings
add column if not exists deposit_status text not null default 'not_requested';

alter table public.bookings
add column if not exists deposit_amount_cents integer;

alter table public.bookings
add column if not exists stripe_checkout_session_id text;

alter table public.bookings
add column if not exists stripe_payment_intent_id text;

alter table public.bookings
add column if not exists paid_at timestamptz;

alter table public.analytics_events
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.app_errors
add column if not exists resolved boolean not null default false;

alter table public.admin_users enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_users enable row level security;
alter table public.listings enable row level security;
alter table public.bookings enable row level security;
alter table public.analytics_events enable row level security;
alter table public.app_errors enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on public.vendors to anon, authenticated;
grant select, insert on public.vendor_users to anon, authenticated;
grant select, insert on public.listings to anon, authenticated;
grant select, insert on public.bookings to anon, authenticated;
grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;
grant select, update on public.app_errors to authenticated;
grant select, update on public.vendors to authenticated;
grant select, update on public.listings to authenticated;
grant select, update on public.bookings to authenticated;

drop policy if exists "Admins can read their own admin record" on public.admin_users;
create policy "Admins can read their own admin record"
on public.admin_users
for select
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Vendors can view own account link" on public.vendor_users;
create policy "Vendors can view own account link"
on public.vendor_users
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Vendor signup can create account link" on public.vendor_users;
create policy "Vendor signup can create account link"
on public.vendor_users
for insert
to public
with check (true);

drop policy if exists "Admins can view vendors" on public.vendors;
create policy "Admins can view vendors"
on public.vendors
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Vendors can view own vendor profile" on public.vendors;
create policy "Vendors can view own vendor profile"
on public.vendors
for select
to authenticated
using (
  exists (
    select 1
    from public.vendor_users
    where vendor_users.vendor_id = vendors.id
      and vendor_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can create vendors" on public.vendors;
create policy "Admins can create vendors"
on public.vendors
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Anyone can submit vendors" on public.vendors;
create policy "Anyone can submit vendors"
on public.vendors
for insert
to public
with check (true);

drop policy if exists "Admins can update vendors" on public.vendors;
create policy "Admins can update vendors"
on public.vendors
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

drop policy if exists "Anyone can view listings" on public.listings;
create policy "Anyone can view listings"
on public.listings
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can create listings" on public.listings;
create policy "Admins can create listings"
on public.listings
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Vendors can submit inactive listings" on public.listings;
create policy "Vendors can submit inactive listings"
on public.listings
for insert
to public
with check (is_active = false);

drop policy if exists "Vendors can view own listings" on public.listings;
create policy "Vendors can view own listings"
on public.listings
for select
to authenticated
using (
  exists (
    select 1
    from public.vendor_users
    where vendor_users.vendor_id = listings.vendor_id
      and vendor_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can update listings" on public.listings;
create policy "Admins can update listings"
on public.listings
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

drop policy if exists "Admins can delete listings" on public.listings;
create policy "Admins can delete listings"
on public.listings
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Anyone can create bookings" on public.bookings;
create policy "Anyone can create bookings"
on public.bookings
for insert
to anon, authenticated
with check (true);

drop policy if exists "Anyone can create analytics events" on public.analytics_events;
create policy "Anyone can create analytics events"
on public.analytics_events
for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can view analytics events" on public.analytics_events;
create policy "Admins can view analytics events"
on public.analytics_events
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can view app errors" on public.app_errors;
create policy "Admins can view app errors"
on public.app_errors
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can update app errors" on public.app_errors;
create policy "Admins can update app errors"
on public.app_errors
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

drop policy if exists "Admins can view bookings" on public.bookings;
create policy "Admins can view bookings"
on public.bookings
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings"
on public.bookings
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

create or replace function public.create_vendor_account(
  business_name text,
  contact_name text default null,
  phone text default null,
  website text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  current_email text;
  created_vendor_id uuid;
begin
  current_user_id := auth.uid();
  current_email := auth.jwt() ->> 'email';

  if current_user_id is null then
    raise exception 'You must be signed in to create a vendor account.';
  end if;

  insert into public.vendors (
    id,
    business_name,
    contact_name,
    email,
    phone,
    website,
    is_active
  )
  values (
    current_user_id,
    business_name,
    contact_name,
    current_email,
    phone,
    website,
    true
  )
  on conflict (id) do update
  set
    business_name = excluded.business_name,
    contact_name = excluded.contact_name,
    email = excluded.email,
    phone = excluded.phone,
    website = excluded.website
  returning id into created_vendor_id;

  insert into public.vendor_users (
    vendor_id,
    user_id,
    email
  )
  values (
    created_vendor_id,
    current_user_id,
    current_email
  )
  on conflict (vendor_id, user_id) do nothing;

  return created_vendor_id;
end;
$$;

grant execute on function public.create_vendor_account(text, text, text, text)
to authenticated;

-- Replace this email with your real admin email after creating the Auth user.
insert into public.admin_users (email)
values ('keddiejackson@hotmail.com')
on conflict (email) do nothing;
