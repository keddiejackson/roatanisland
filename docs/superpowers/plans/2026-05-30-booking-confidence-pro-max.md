# Booking Confidence Pro Max Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make booking feel safer, clearer, and more premium for guests while giving admin and vendors sharper next-action cues.

**Architecture:** Add shared booking-confidence helpers in `lib/booking-flow.ts`, then surface the same language across booking, success/status, guest account, admin bookings, and vendor dashboard. Keep database shape unchanged and derive confidence from data the app already has.

**Tech Stack:** Next.js App Router, React client components where the existing pages are interactive, Supabase data already loaded by each page, Node test runner.

---

### Task 1: Shared Confidence Logic

**Files:**
- Modify: `lib/booking-flow.ts`
- Test: `lib/booking-confidence-pro-max.test.mjs`

- [ ] Add tests for confidence scoring, success next steps, and ops priority.
- [ ] Implement `getBookingConfidenceCommandCenter`, `getBookingSuccessNextSteps`, and `getBookingOpsPriority`.
- [ ] Verify the helper test fails before implementation and passes after implementation.

### Task 2: Guest Booking Surfaces

**Files:**
- Modify: `app/book/BookingForm.tsx`
- Modify: `app/book/success/page.tsx`
- Modify: `app/book/status/[id]/page.tsx`

- [ ] Show a compact command center on the booking form with score, primary action, and smart signals.
- [ ] Upgrade the submitted state and success page with next-step cards.
- [ ] Add a travel confidence panel on the status page without changing data requirements.

### Task 3: Account, Admin, Vendor Cues

**Files:**
- Modify: `app/account/page.tsx`
- Modify: `app/admin/bookings/page.tsx`
- Modify: `app/vendor/dashboard/page.tsx`

- [ ] Add guest booking cue text that tells the traveler what needs attention.
- [ ] Add admin priority labels for response, payment, and review risk.
- [ ] Add vendor response cues that make guest follow-up obvious.

### Task 4: Verification and Patch

**Files:**
- Patch output: `booking-confidence-pro-max.patch`

- [ ] Run focused tests.
- [ ] Run lint on touched files.
- [ ] Run full build.
- [ ] Generate a clean patch against `C:\Users\keddi\roatanisland`.
