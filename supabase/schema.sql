-- RoatanIsland.life Supabase setup
-- Run this in Supabase SQL Editor, then replace the admin email at the bottom.

create extension if not exists pgcrypto;

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
  is_active boolean not null default true,
  rating numeric default 5,
  reviews_count integer default 0,
  created_at timestamptz not null default now()
);

alter table public.listings
add column if not exists is_active boolean not null default true;

alter table public.listings
add column if not exists vendor_id uuid references public.vendors(id) on delete set null;

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  tour_date date not null,
  tour_time text not null,
  guests integer not null check (guests > 0),
  status text not null default 'new' check (status in ('new', 'confirmed', 'completed', 'cancelled')),
  admin_notes text,
  listing_id uuid references public.listings(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.bookings
add column if not exists status text not null default 'new'
check (status in ('new', 'confirmed', 'completed', 'cancelled'));

alter table public.bookings
add column if not exists admin_notes text;

alter table public.admin_users enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_users enable row level security;
alter table public.listings enable row level security;
alter table public.bookings enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on public.vendors to anon, authenticated;
grant select, insert on public.vendor_users to anon, authenticated;
grant select, insert on public.listings to anon, authenticated;
grant select, insert on public.bookings to anon, authenticated;
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

-- Replace this email with your real admin email after creating the Auth user.
insert into public.admin_users (email)
values ('keddiejackson@hotmail.com')
on conflict (email) do nothing;
