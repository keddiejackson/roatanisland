-- Adds a per-listing cancellation policy so each vendor can set their own
-- terms. NULL means "no custom policy" and the site falls back to the
-- general marketplace policy shown on /cancellation-policy.
alter table public.listings
  add column if not exists cancellation_policy text;
