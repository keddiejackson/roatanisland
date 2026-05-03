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
  profile_image_url text,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'pending', 'verified', 'rejected')),
  verification_note text,
  verification_document_urls text[] not null default '{}'::text[],
  show_contact_name boolean not null default true,
  show_email boolean not null default true,
  show_phone boolean not null default true,
  show_website boolean not null default true,
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
add column if not exists profile_image_url text;

alter table public.vendors
add column if not exists verification_status text not null default 'unverified'
check (verification_status in ('unverified', 'pending', 'verified', 'rejected'));

alter table public.vendors
add column if not exists verification_note text;

alter table public.vendors
add column if not exists verification_document_urls text[] not null default '{}'::text[];

alter table public.vendors
add column if not exists show_contact_name boolean not null default true;

alter table public.vendors
add column if not exists show_email boolean not null default true;

alter table public.vendors
add column if not exists show_phone boolean not null default true;

alter table public.vendors
add column if not exists show_website boolean not null default true;

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
  gallery_image_urls text[] not null default '{}'::text[],
  category text not null default 'Tours',
  tour_times text[] not null default array['10:30 AM', '4:30 PM Sunset Cruise']::text[],
  blocked_dates date[] not null default '{}'::date[],
  availability_note text,
  max_guests integer,
  minimum_notice_hours integer,
  is_active boolean not null default true,
  approval_status text not null default 'approved' check (approval_status in ('pending', 'approved', 'rejected')),
  approval_note text,
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
add column if not exists approval_status text not null default 'approved'
check (approval_status in ('pending', 'approved', 'rejected'));

alter table public.listings
add column if not exists approval_note text;

alter table public.listings
add column if not exists vendor_id uuid references public.vendors(id) on delete set null;

alter table public.listings
add column if not exists tour_times text[] not null default array['10:30 AM', '4:30 PM Sunset Cruise']::text[];

alter table public.listings
add column if not exists gallery_image_urls text[] not null default '{}'::text[];

alter table public.listings
add column if not exists blocked_dates date[] not null default '{}'::date[];

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
  vendor_note text,
  status text not null default 'new' check (status in ('new', 'confirmed', 'completed', 'cancelled')),
  admin_notes text,
  listing_id uuid references public.listings(id) on delete set null,
  deposit_status text not null default 'not_requested',
  deposit_amount_cents integer,
  booking_value_cents integer,
  commission_rate numeric not null default 0.10,
  commission_amount_cents integer,
  commission_status text not null default 'unpaid' check (commission_status in ('unpaid', 'paid', 'waived')),
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

create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  actor_role text not null default 'system',
  action text not null,
  target_type text not null,
  target_id text,
  target_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  reviewer_name text not null,
  reviewer_email text,
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  photo_urls text[] not null default '{}',
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.vendor_invites (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  email text not null,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_percent integer check (discount_percent between 1 and 100),
  discount_amount_cents integer,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_addons (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  name text not null,
  price_cents integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  reporter_name text,
  reporter_email text,
  reason text not null,
  details text,
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved')),
  created_at timestamptz not null default now()
);

create table if not exists public.vendor_documents (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  title text not null,
  file_url text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now()
);

alter table public.vendors
add column if not exists is_verified boolean not null default false;

alter table public.listings
add column if not exists latitude numeric;

alter table public.listings
add column if not exists longitude numeric;

alter table public.bookings
add column if not exists status text not null default 'new'
check (status in ('new', 'confirmed', 'completed', 'cancelled'));

alter table public.bookings
add column if not exists admin_notes text;

alter table public.bookings
add column if not exists guest_message text;

alter table public.bookings
add column if not exists vendor_note text;

alter table public.bookings
add column if not exists deposit_status text not null default 'not_requested';

alter table public.bookings
add column if not exists deposit_amount_cents integer;

alter table public.bookings
add column if not exists booking_value_cents integer;

alter table public.bookings
add column if not exists commission_rate numeric not null default 0.10;

alter table public.bookings
add column if not exists commission_amount_cents integer;

alter table public.bookings
add column if not exists commission_status text not null default 'unpaid'
check (commission_status in ('unpaid', 'paid', 'waived'));

alter table public.bookings
add column if not exists stripe_checkout_session_id text;

alter table public.bookings
add column if not exists stripe_payment_intent_id text;

alter table public.bookings
add column if not exists paid_at timestamptz;

alter table public.bookings
add column if not exists promo_code text;

alter table public.bookings
add column if not exists discount_amount_cents integer;

alter table public.bookings
add column if not exists selected_addons jsonb not null default '[]'::jsonb;

alter table public.analytics_events
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.app_errors
add column if not exists resolved boolean not null default false;

alter table public.admin_activity_logs
add column if not exists actor_email text;

alter table public.admin_activity_logs
add column if not exists actor_role text not null default 'system';

alter table public.admin_activity_logs
add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.listing_reviews
add column if not exists reviewer_email text;

alter table public.listing_reviews
add column if not exists is_approved boolean not null default false;

alter table public.listing_reviews
add column if not exists photo_urls text[] not null default '{}';

alter table public.vendor_invites
add column if not exists accepted_at timestamptz;

alter table public.vendor_invites
add column if not exists expires_at timestamptz not null default (now() + interval '14 days');

alter table public.promo_codes
add column if not exists is_active boolean not null default true;

alter table public.listing_reports
add column if not exists status text not null default 'new'
check (status in ('new', 'reviewing', 'resolved'));

alter table public.vendor_documents
add column if not exists status text not null default 'pending'
check (status in ('pending', 'approved', 'rejected'));

alter table public.admin_users enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_users enable row level security;
alter table public.listings enable row level security;
alter table public.bookings enable row level security;
alter table public.analytics_events enable row level security;
alter table public.app_errors enable row level security;
alter table public.admin_activity_logs enable row level security;
alter table public.listing_reviews enable row level security;
alter table public.vendor_invites enable row level security;
alter table public.site_settings enable row level security;
alter table public.promo_codes enable row level security;
alter table public.listing_addons enable row level security;
alter table public.listing_reports enable row level security;
alter table public.vendor_documents enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on public.vendors to anon, authenticated;
grant select, insert on public.vendor_users to anon, authenticated;
grant select, insert on public.listings to anon, authenticated;
grant select, insert on public.bookings to anon, authenticated;
grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;
grant select, update on public.app_errors to authenticated;
grant select, insert on public.admin_activity_logs to authenticated;
grant select, insert on public.listing_reviews to anon, authenticated;
grant update, delete on public.listing_reviews to authenticated;
grant select, insert, update on public.vendor_invites to authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update on public.site_settings to authenticated;
grant select on public.promo_codes to anon, authenticated;
grant insert, update, delete on public.promo_codes to authenticated;
grant select, insert, update, delete on public.listing_addons to authenticated;
grant select on public.listing_addons to anon, authenticated;
grant insert on public.listing_reports to anon, authenticated;
grant select, update on public.listing_reports to authenticated;
grant select, insert, update on public.vendor_documents to authenticated;
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

drop policy if exists "Admins can manage vendor invites" on public.vendor_invites;
create policy "Admins can manage vendor invites"
on public.vendor_invites
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

drop policy if exists "Vendors can view their invite" on public.vendor_invites;
create policy "Vendors can view their invite"
on public.vendor_invites
for select
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'));

drop policy if exists "Anyone can view site settings" on public.site_settings;
create policy "Anyone can view site settings"
on public.site_settings
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage site settings" on public.site_settings;
create policy "Admins can manage site settings"
on public.site_settings
for all
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Anyone can view active promo codes" on public.promo_codes;
create policy "Anyone can view active promo codes"
on public.promo_codes
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage promo codes" on public.promo_codes;
create policy "Admins can manage promo codes"
on public.promo_codes
for all
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Anyone can view active listing addons" on public.listing_addons;
create policy "Anyone can view active listing addons"
on public.listing_addons
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Vendors can manage own listing addons" on public.listing_addons;
create policy "Vendors can manage own listing addons"
on public.listing_addons
for all
to authenticated
using (
  exists (
    select 1
    from public.listings
    join public.vendor_users on vendor_users.vendor_id = listings.vendor_id
    where listings.id = listing_addons.listing_id
      and vendor_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.listings
    join public.vendor_users on vendor_users.vendor_id = listings.vendor_id
    where listings.id = listing_addons.listing_id
      and vendor_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can manage listing addons" on public.listing_addons;
create policy "Admins can manage listing addons"
on public.listing_addons
for all
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Anyone can submit listing reports" on public.listing_reports;
create policy "Anyone can submit listing reports"
on public.listing_reports
for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can view listing reports" on public.listing_reports;
create policy "Admins can view listing reports"
on public.listing_reports
for select
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can update listing reports" on public.listing_reports;
create policy "Admins can update listing reports"
on public.listing_reports
for update
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
)
with check (
  exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Vendors can manage own documents" on public.vendor_documents;
create policy "Vendors can manage own documents"
on public.vendor_documents
for all
to authenticated
using (
  exists (
    select 1
    from public.vendor_users
    where vendor_users.vendor_id = vendor_documents.vendor_id
      and vendor_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.vendor_users
    where vendor_users.vendor_id = vendor_documents.vendor_id
      and vendor_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can manage vendor documents" on public.vendor_documents;
create policy "Admins can manage vendor documents"
on public.vendor_documents
for all
to authenticated
using (
  exists (
    select 1 from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
)
with check (
  exists (
    select 1 from public.admin_users
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

drop policy if exists "Admins can view activity logs" on public.admin_activity_logs;
create policy "Admins can view activity logs"
on public.admin_activity_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can create activity logs" on public.admin_activity_logs;
create policy "Admins can create activity logs"
on public.admin_activity_logs
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Anyone can submit reviews" on public.listing_reviews;
create policy "Anyone can submit reviews"
on public.listing_reviews
for insert
to anon, authenticated
with check (is_approved = false);

drop policy if exists "Anyone can view approved reviews" on public.listing_reviews;
create policy "Anyone can view approved reviews"
on public.listing_reviews
for select
to anon, authenticated
using (is_approved = true);

drop policy if exists "Admins can view all reviews" on public.listing_reviews;
create policy "Admins can view all reviews"
on public.listing_reviews
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can update reviews" on public.listing_reviews;
create policy "Admins can update reviews"
on public.listing_reviews
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

drop policy if exists "Admins can delete reviews" on public.listing_reviews;
create policy "Admins can delete reviews"
on public.listing_reviews
for delete
to authenticated
using (
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
