# Mobile Booking Checkout Polish

## Goal

Make the booking request page easier to finish on a phone without changing the booking data model or requiring new SQL.

## Scope

1. Add testable helper logic for the mobile checkout steps and sticky CTA.
2. Add a compact mobile progress strip to the booking form.
3. Add stable section anchors for guest details, date/time, pickup, and review.
4. Add a mobile sticky bottom action that either jumps to the first missing section or submits when ready.
5. Verify with focused tests, lint, and production build.

## Out Of Scope

- No database changes.
- No payment logic changes.
- No vendor/admin booking workflow changes.
