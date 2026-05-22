# Booking Flow Polish Design

## Goal

Make the traveler booking flow feel clearer, calmer, and more trustworthy
without changing payment logic or requiring new database columns.

## Scope

This branch improves the existing booking surfaces:

- `/book` gets a cleaner page shell.
- `BookingForm` gets an updating booking summary.
- Required-field and submission errors show inline instead of browser alerts.
- Confirmation after submitting a booking request shows next steps, booking ID,
  status link, payment options when enabled, and easy return paths.
- `/book/success` looks like a polished deposit-success screen.
- `/book/status/[id]` gets a visual status tracker and clearer booking details.

This branch does not rewrite payments, email notifications, vendor workflows, or
customer accounts. It also avoids SQL changes unless an existing query is already
using a column.

## Existing Foundation

The project already has:

- `app/book/page.tsx` for the booking page shell.
- `app/book/BookingForm.tsx` for request submission.
- `app/api/bookings/route.ts` for validation, booking creation, emails, analytics,
  selected add-ons, promo code, estimated value, and commission.
- `app/book/success/page.tsx` for deposit checkout completion.
- `app/book/status/[id]/page.tsx` for public booking status lookup.
- Existing columns for `booking_value_cents`, `discount_amount_cents`,
  `deposit_status`, selected add-ons, status, guests, date, and time.

## Traveler Experience

Before submitting, the traveler should see:

- Listing title, location, and base price when available.
- Date, time, guest count, selected add-ons, promo code, and message state.
- Estimated total based on listing price times guests plus selected add-ons.
- Friendly helper text explaining that final availability is confirmed by the
  operator.
- Inline error messages for failed requests.

After submitting, the traveler should see:

- A success panel with the booking ID.
- A simple next-step tracker.
- The booking summary they just submitted.
- Payment buttons when deposits are enabled.
- Links to booking status, the listing, and more listings.
- Optional customer account creation, still using the existing Supabase signup.

## Status Page Experience

The public status page should feel like a real tracker:

- Header with the listing title or general booking title.
- Step tracker for `Request received`, `Operator reviewing`, `Confirmed`, and
  `Completed`.
- Current status and deposit status.
- Traveler details in organized sections.
- Clear CTAs back to the listing and homepage.

Unknown or missing bookings keep the existing safe "booking not found" behavior,
but with a cleaner visual treatment.

## Components And Boundaries

### `lib/booking-flow.ts`

Owns pure formatting and summary helpers:

- Money formatting from cents and dollar values.
- Add-on total calculation.
- Estimated booking total from listing price, guests, and add-ons.
- Booking status step mapping.
- Human-friendly booking and deposit labels.

This keeps calculations testable and keeps UI files smaller.

### `app/book/BookingForm.tsx`

Owns the interactive form and confirmation state. It should use the helper file
for totals and labels, display inline errors, and render a summary panel.

### `app/book/page.tsx`

Owns the booking page shell and trust copy. It should stay simple and pass the
listing ID into `BookingForm`.

### `app/book/success/page.tsx`

Owns deposit checkout success copy and status/listing navigation.

### `app/book/status/[id]/page.tsx`

Owns server-rendered booking status display. It should use the helper for labels
and status-step state.

## Fallbacks

- If listing price is missing, totals show `Ask` or `Pending`.
- If guest count is blank, summary uses one guest for price preview only after a
  listing exists; the form still requires a real guest count before submitting.
- If add-ons are unavailable, the add-on summary is hidden.
- If booking status is unknown, it behaves like `new`.
- If deposit status is missing, it shows `Not requested`.

## Verification

Verify:

- Booking helper tests cover money formatting, add-on totals, estimated totals,
  and status step state.
- Booking form compiles with the existing API contract.
- Status and success pages compile.
- Lint, TypeScript, focused tests, and production build pass.
- Browser check confirms `/book` loads with no console errors.
