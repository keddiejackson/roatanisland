# Booking Flow Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the booking request, confirmation, payment success, and booking status screens clearer and more polished without changing database structure.

**Architecture:** Add a small tested helper for booking totals, labels, and tracker state, then use it from the booking form and status pages. Keep API behavior unchanged and make the polish mostly UI-level.

**Tech Stack:** Next.js App Router 16.2.2, React 19 client components, Tailwind CSS 4 utility classes, Supabase booking data, Node built-in test runner.

---

## File Structure

- Create `lib/booking-flow.ts` for booking summary calculations and status labels.
- Create `lib/booking-flow.test.mjs` for focused helper tests.
- Modify `app/book/BookingForm.tsx` for inline errors, summary panel, and stronger confirmation screen.
- Modify `app/book/page.tsx` for a cleaner booking page shell.
- Modify `app/book/success/page.tsx` for a polished deposit-success page.
- Modify `app/book/status/[id]/page.tsx` for a tracker-style status page.

### Task 1: Booking Helper

- [ ] Write failing tests for money formatting, add-on totals, estimated totals, and status tracker steps.
- [ ] Add `lib/booking-flow.ts` with pure helper functions.
- [ ] Run `node --no-warnings --test lib/booking-flow.test.mjs`.

### Task 2: Booking Form

- [ ] Replace alert-only submit errors with an inline error state.
- [ ] Add a booking summary panel that updates from selected date, time, guests, add-ons, promo code, and listing price.
- [ ] Improve the submitted confirmation view with booking ID, next steps, summary, status link, payment buttons, listing link, and account creation.
- [ ] Run `npx.cmd tsc --noEmit`.

### Task 3: Booking Page Shell

- [ ] Make `/book` feel calmer with a two-column intro and clear trust points.
- [ ] Keep the existing `searchParams` Promise shape required by this Next.js version.
- [ ] Run `npx.cmd tsc --noEmit`.

### Task 4: Success And Status Pages

- [ ] Upgrade `/book/success` with clearer deposit success copy and next actions.
- [ ] Upgrade `/book/status/[id]` with a visual tracker and organized details.
- [ ] Run `npx.cmd tsc --noEmit`.

### Task 5: Verification

- [ ] Run focused tests.
- [ ] Run lint.
- [ ] Run TypeScript.
- [ ] Run production build.
- [ ] Browser-check `/book` for load and console errors.

## Self-Review

The plan covers the approved booking-flow polish scope and avoids SQL, payment
rewrites, vendor dashboard work, or customer account rebuilds. There are no open
placeholders. Helper names and UI responsibilities match the design document.
