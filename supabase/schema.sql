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
  booking_cutoff_hours integer,
  auto_confirm_bookings boolean not null default false,
  private_booking_mode boolean not null default false,
  available_weekdays integer[] not null default array[0,1,2,3,4,5,6]::integer[],
  season_start_date text,
  season_end_date text,
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
  payment_schedule_type text not null default 'request_later'
    check (payment_schedule_type in ('request_later', 'deposit_only', 'full_payment', 'split_payment', 'manual', 'waived')),
  payment_due_date date,
  balance_due_date date,
  amount_paid_cents integer not null default 0,
  balance_due_cents integer,
  payment_method text,
  manual_payment_note text,
  payment_requested_at timestamptz,
  payment_last_sent_at timestamptz,
  payment_link_url text,
  invoice_number text,
  receipt_number text,
  refund_status text not null default 'none'
    check (refund_status in ('none', 'pending', 'partial', 'full', 'declined')),
  refund_amount_cents integer,
  refund_note text,
  payment_issue_flag boolean not null default false,
  payment_issue_note text,
  commission_rate numeric not null default 0.10,
  commission_amount_cents integer,
  commission_override_cents integer,
  commission_status text not null default 'unpaid' check (commission_status in ('unpaid', 'scheduled', 'paid', 'waived')),
  payout_note text,
  vendor_private_payout_note text,
  payout_scheduled_for date,
  payout_paid_at timestamptz,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_role text not null default 'guest'
    check (sender_role in ('guest', 'vendor', 'admin', 'system')),
  sender_email text,
  message text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists booking_messages_booking_id_idx
on public.booking_messages(booking_id);

create index if not exists booking_messages_created_at_idx
on public.booking_messages(created_at);

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

create table if not exists public.guest_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  email text not null,
  display_name text,
  profile_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guest_profiles_email_idx
on public.guest_profiles(lower(email));

create table if not exists public.guest_trip_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  name text not null,
  pickup_area text,
  arrival_type text,
  trip_date date,
  trip_time text,
  guest_count integer check (guest_count is null or guest_count > 0),
  source text not null default 'map',
  status text not null default 'saved'
    check (status in ('saved', 'concierge_requested', 'quoted', 'booked', 'archived')),
  concierge_lead_id uuid,
  stops jsonb not null default '[]'::jsonb,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guest_trip_plans_user_id_idx
on public.guest_trip_plans(user_id, updated_at desc);

create index if not exists guest_trip_plans_email_idx
on public.guest_trip_plans(lower(email));

create index if not exists guest_trip_plans_status_idx
on public.guest_trip_plans(status, updated_at desc);

alter table public.guest_trip_plans
add column if not exists concierge_lead_id uuid;

create index if not exists guest_trip_plans_concierge_lead_id_idx
on public.guest_trip_plans(concierge_lead_id);

create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  event_type text not null default 'status_change',
  actor_role text not null default 'system'
    check (actor_role in ('guest', 'vendor', 'admin', 'system')),
  actor_email text,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists booking_events_booking_id_idx
on public.booking_events(booking_id);

create index if not exists booking_events_created_at_idx
on public.booking_events(created_at);

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

create table if not exists public.concierge_leads (
  id uuid primary key default gen_random_uuid(),
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  lead_type text not null default 'planning_lead',
  status text not null default 'new'
    check (status in ('new', 'reviewing', 'contacted', 'quoted', 'booked', 'closed')),
  priority text not null default 'general'
    check (priority in ('urgent', 'cruise', 'airport', 'family', 'luxury', 'general')),
  interest text,
  message text not null,
  travel_date date,
  guests integer,
  pickup_area text,
  arrival_type text,
  trip_style text,
  budget text,
  plan jsonb not null default '{}'::jsonb,
  source_path text,
  admin_notes text,
  follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'guest_trip_plans_concierge_lead_id_fkey'
  ) then
    alter table public.guest_trip_plans
    add constraint guest_trip_plans_concierge_lead_id_fkey
    foreign key (concierge_lead_id)
    references public.concierge_leads(id)
    on delete set null;
  end if;
end $$;

create table if not exists public.concierge_lead_assignments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.concierge_leads(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  status text not null default 'recommended'
    check (status in ('recommended', 'contacted', 'quoted', 'confirmed', 'declined')),
  contact_method text,
  vendor_note text,
  guest_quote_cents integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists concierge_lead_assignments_lead_id_idx
on public.concierge_lead_assignments(lead_id);

create index if not exists concierge_lead_assignments_status_idx
on public.concierge_lead_assignments(status);

create table if not exists public.concierge_quotes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.concierge_leads(id) on delete cascade,
  public_token uuid not null unique default gen_random_uuid(),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'approved', 'change_requested', 'deposit_started', 'paid', 'expired', 'cancelled')),
  title text not null default 'Roatan concierge quote',
  line_items jsonb not null default '[]'::jsonb,
  total_amount_cents integer not null default 0,
  deposit_amount_cents integer,
  guest_note text,
  admin_note text,
  guest_response text,
  booking_id uuid references public.bookings(id) on delete set null,
  expires_at date,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.concierge_quotes
add column if not exists public_token uuid not null default gen_random_uuid();

create index if not exists concierge_quotes_lead_id_idx
on public.concierge_quotes(lead_id);

create index if not exists concierge_quotes_public_token_idx
on public.concierge_quotes(public_token);

create unique index if not exists concierge_quotes_public_token_unique_idx
on public.concierge_quotes(public_token);

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

alter table public.listings
add column if not exists cancellation_policy text;

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
add column if not exists payment_schedule_type text not null default 'request_later';

alter table public.bookings
drop constraint if exists bookings_payment_schedule_type_check;

alter table public.bookings
add constraint bookings_payment_schedule_type_check
check (payment_schedule_type in ('request_later', 'deposit_only', 'full_payment', 'split_payment', 'manual', 'waived'));

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
add column if not exists commission_rate numeric not null default 0.10;

alter table public.bookings
add column if not exists commission_amount_cents integer;

alter table public.bookings
add column if not exists commission_override_cents integer;

alter table public.bookings
add column if not exists commission_status text not null default 'unpaid'
check (commission_status in ('unpaid', 'scheduled', 'paid', 'waived'));

alter table public.bookings
drop constraint if exists bookings_commission_status_check;

alter table public.bookings
add constraint bookings_commission_status_check
check (commission_status in ('unpaid', 'scheduled', 'paid', 'waived'));

alter table public.bookings
add column if not exists payout_note text;

alter table public.bookings
add column if not exists vendor_private_payout_note text;

alter table public.bookings
add column if not exists payout_scheduled_for date;

alter table public.bookings
add column if not exists payout_paid_at timestamptz;

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

alter table public.booking_messages
add column if not exists is_internal boolean not null default false;

alter table public.booking_events
add column if not exists note text;

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

alter table public.concierge_leads
add column if not exists lead_type text not null default 'planning_lead';

alter table public.concierge_leads
add column if not exists status text not null default 'new'
check (status in ('new', 'reviewing', 'contacted', 'quoted', 'booked', 'closed'));

alter table public.concierge_leads
add column if not exists priority text not null default 'general'
check (priority in ('urgent', 'cruise', 'airport', 'family', 'luxury', 'general'));

alter table public.concierge_leads
add column if not exists plan jsonb not null default '{}'::jsonb;

alter table public.concierge_leads
add column if not exists source_path text;

alter table public.concierge_leads
add column if not exists admin_notes text;

alter table public.concierge_leads
add column if not exists follow_up_date date;

alter table public.concierge_leads
add column if not exists updated_at timestamptz not null default now();

alter table public.concierge_lead_assignments
add column if not exists listing_id uuid references public.listings(id) on delete set null;

alter table public.concierge_lead_assignments
add column if not exists vendor_id uuid references public.vendors(id) on delete set null;

alter table public.concierge_lead_assignments
add column if not exists status text not null default 'recommended'
check (status in ('recommended', 'contacted', 'quoted', 'confirmed', 'declined'));

alter table public.concierge_lead_assignments
add column if not exists contact_method text;

alter table public.concierge_lead_assignments
add column if not exists vendor_note text;

alter table public.concierge_lead_assignments
add column if not exists guest_quote_cents integer;

alter table public.concierge_lead_assignments
add column if not exists updated_at timestamptz not null default now();

alter table public.concierge_quotes
add column if not exists public_token uuid not null default gen_random_uuid();

alter table public.concierge_quotes
add column if not exists status text not null default 'draft'
check (status in ('draft', 'sent', 'approved', 'change_requested', 'deposit_started', 'paid', 'expired', 'cancelled'));

alter table public.concierge_quotes
add column if not exists title text not null default 'Roatan concierge quote';

alter table public.concierge_quotes
add column if not exists line_items jsonb not null default '[]'::jsonb;

alter table public.concierge_quotes
add column if not exists total_amount_cents integer not null default 0;

alter table public.concierge_quotes
add column if not exists deposit_amount_cents integer;

alter table public.concierge_quotes
add column if not exists guest_note text;

alter table public.concierge_quotes
add column if not exists admin_note text;

alter table public.concierge_quotes
add column if not exists guest_response text;

alter table public.concierge_quotes
add column if not exists booking_id uuid references public.bookings(id) on delete set null;

alter table public.concierge_quotes
add column if not exists expires_at date;

alter table public.concierge_quotes
add column if not exists approved_at timestamptz;

alter table public.concierge_quotes
add column if not exists updated_at timestamptz not null default now();

alter table public.vendor_documents
add column if not exists status text not null default 'pending'
check (status in ('pending', 'approved', 'rejected'));

alter table public.admin_users enable row level security;
alter table public.vendors enable row level security;
alter table public.vendor_users enable row level security;
alter table public.listings enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_messages enable row level security;
alter table public.booking_message_reads enable row level security;
alter table public.booking_change_requests enable row level security;
alter table public.guest_profiles enable row level security;
alter table public.guest_trip_plans enable row level security;
alter table public.booking_events enable row level security;
alter table public.booking_money_events enable row level security;
alter table public.booking_reminder_settings enable row level security;
alter table public.booking_reminder_logs enable row level security;
alter table public.analytics_events enable row level security;
alter table public.app_errors enable row level security;
alter table public.admin_activity_logs enable row level security;
alter table public.listing_reviews enable row level security;
alter table public.vendor_invites enable row level security;
alter table public.site_settings enable row level security;
alter table public.promo_codes enable row level security;
alter table public.listing_addons enable row level security;
alter table public.listing_reports enable row level security;
alter table public.concierge_leads enable row level security;
alter table public.concierge_lead_assignments enable row level security;
alter table public.concierge_quotes enable row level security;
alter table public.vendor_documents enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert on public.vendors to anon, authenticated;
grant select, insert on public.vendor_users to anon, authenticated;
grant select, insert on public.listings to anon, authenticated;
grant select, insert on public.bookings to anon, authenticated;
grant select, insert on public.booking_messages to authenticated;
grant select, insert, update on public.booking_message_reads to authenticated;
grant select, insert, update on public.booking_change_requests to authenticated;
grant select, insert, update on public.guest_profiles to authenticated;
grant select, insert, update, delete on public.guest_trip_plans to authenticated;
grant select, insert on public.booking_events to authenticated;
grant select, insert on public.booking_money_events to authenticated;
grant select, insert, update on public.booking_reminder_settings to authenticated;
grant select, insert on public.booking_reminder_logs to authenticated;
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
grant insert on public.concierge_leads to anon, authenticated;
grant select, update on public.concierge_leads to authenticated;
grant select, insert, update, delete on public.concierge_lead_assignments to authenticated;
grant select, insert, update, delete on public.concierge_quotes to authenticated;
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

drop policy if exists "Guests can manage own profile" on public.guest_profiles;
create policy "Guests can manage own profile"
on public.guest_profiles
for all
to authenticated
using (
  user_id = auth.uid()
  and lower(email) = lower(auth.jwt() ->> 'email')
)
with check (
  user_id = auth.uid()
  and lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "Admins can view guest profiles" on public.guest_profiles;
create policy "Admins can view guest profiles"
on public.guest_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Guests can manage own trip plans" on public.guest_trip_plans;
create policy "Guests can manage own trip plans"
on public.guest_trip_plans
for all
to authenticated
using (
  user_id = auth.uid()
  and lower(email) = lower(auth.jwt() ->> 'email')
)
with check (
  user_id = auth.uid()
  and lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists "Admins can view guest trip plans" on public.guest_trip_plans;
create policy "Admins can view guest trip plans"
on public.guest_trip_plans
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can update guest trip plans" on public.guest_trip_plans;
create policy "Admins can update guest trip plans"
on public.guest_trip_plans
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

drop policy if exists "Guests can view own bookings" on public.bookings;
create policy "Guests can view own bookings"
on public.bookings
for select
to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'));

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

drop policy if exists "Admins can manage booking messages" on public.booking_messages;
create policy "Admins can manage booking messages"
on public.booking_messages
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

drop policy if exists "Guests can view own booking messages" on public.booking_messages;
create policy "Guests can view own booking messages"
on public.booking_messages
for select
to authenticated
using (
  is_internal = false
  and exists (
    select 1
    from public.bookings
    where bookings.id = booking_messages.booking_id
      and lower(bookings.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Guests can create own booking messages" on public.booking_messages;
create policy "Guests can create own booking messages"
on public.booking_messages
for insert
to authenticated
with check (
  sender_role = 'guest'
  and is_internal = false
  and exists (
    select 1
    from public.bookings
    where bookings.id = booking_messages.booking_id
      and lower(bookings.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Vendors can view booking messages for own listings" on public.booking_messages;
create policy "Vendors can view booking messages for own listings"
on public.booking_messages
for select
to authenticated
using (
  is_internal = false
  and exists (
    select 1
    from public.bookings
    join public.listings on listings.id = bookings.listing_id
    join public.vendor_users on vendor_users.vendor_id = listings.vendor_id
    where bookings.id = booking_messages.booking_id
      and vendor_users.user_id = auth.uid()
  )
);

drop policy if exists "Vendors can create booking messages for own listings" on public.booking_messages;
create policy "Vendors can create booking messages for own listings"
on public.booking_messages
for insert
to authenticated
with check (
  sender_role = 'vendor'
  and is_internal = false
  and exists (
    select 1
    from public.bookings
    join public.listings on listings.id = bookings.listing_id
    join public.vendor_users on vendor_users.vendor_id = listings.vendor_id
    where bookings.id = booking_messages.booking_id
      and vendor_users.user_id = auth.uid()
  )
);

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

drop policy if exists "Admins can manage booking events" on public.booking_events;
create policy "Admins can manage booking events"
on public.booking_events
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

drop policy if exists "Guests can view own booking events" on public.booking_events;
create policy "Guests can view own booking events"
on public.booking_events
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings
    where bookings.id = booking_events.booking_id
      and lower(bookings.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Vendors can view booking events for own listings" on public.booking_events;
create policy "Vendors can view booking events for own listings"
on public.booking_events
for select
to authenticated
using (
  exists (
    select 1
    from public.bookings
    join public.listings on listings.id = bookings.listing_id
    join public.vendor_users on vendor_users.vendor_id = listings.vendor_id
    where bookings.id = booking_events.booking_id
      and vendor_users.user_id = auth.uid()
  )
);

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

drop policy if exists "Anyone can create concierge leads" on public.concierge_leads;
create policy "Anyone can create concierge leads"
on public.concierge_leads
for insert
to anon, authenticated
with check (true);

drop policy if exists "Admins can view concierge leads" on public.concierge_leads;
create policy "Admins can view concierge leads"
on public.concierge_leads
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can update concierge leads" on public.concierge_leads;
create policy "Admins can update concierge leads"
on public.concierge_leads
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

drop policy if exists "Admins can view concierge assignments" on public.concierge_lead_assignments;
create policy "Admins can view concierge assignments"
on public.concierge_lead_assignments
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can create concierge assignments" on public.concierge_lead_assignments;
create policy "Admins can create concierge assignments"
on public.concierge_lead_assignments
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can update concierge assignments" on public.concierge_lead_assignments;
create policy "Admins can update concierge assignments"
on public.concierge_lead_assignments
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

drop policy if exists "Admins can delete concierge assignments" on public.concierge_lead_assignments;
create policy "Admins can delete concierge assignments"
on public.concierge_lead_assignments
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can view concierge quotes" on public.concierge_quotes;
create policy "Admins can view concierge quotes"
on public.concierge_quotes
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can create concierge quotes" on public.concierge_quotes;
create policy "Admins can create concierge quotes"
on public.concierge_quotes
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where lower(admin_users.email) = lower(auth.jwt() ->> 'email')
  )
);

drop policy if exists "Admins can update concierge quotes" on public.concierge_quotes;
create policy "Admins can update concierge quotes"
on public.concierge_quotes
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

drop policy if exists "Admins can delete concierge quotes" on public.concierge_quotes;
create policy "Admins can delete concierge quotes"
on public.concierge_quotes
for delete
to authenticated
using (
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
