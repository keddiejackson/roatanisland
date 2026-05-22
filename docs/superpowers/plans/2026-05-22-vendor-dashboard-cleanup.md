# Vendor Dashboard Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the vendor dashboard easier to scan and use by surfacing urgent bookings, profile completion, listing status, and quick actions while hiding bulky edit forms until needed.

**Architecture:** Keep the existing vendor dashboard route and APIs. Add a small tested helper for dashboard status, stats, completion, and booking sorting, then refactor `app/vendor/dashboard/page.tsx` to use those helpers for cleaner cards and progressive editing.

**Tech Stack:** Next.js App Router 16.2.2, React 19 client components, Tailwind CSS 4, Supabase-backed vendor data, Node built-in test runner.

---

## File Structure

- Create `lib/vendor-dashboard.ts` for pure dashboard helpers.
- Create `lib/vendor-dashboard.test.mjs` for status, completion, stats, and booking sorting tests.
- Modify `app/vendor/dashboard/page.tsx` for layout cleanup, profile checklist, pending bookings, listing status cards, and collapsible listing edit forms.

### Task 1: Add Dashboard Helper Tests

**Files:**
- Create: `lib/vendor-dashboard.test.mjs`

- [ ] **Step 1: Write tests for helper behavior**

Create tests covering listing status labels, profile completion checklist, stats, and booking sorting.

- [ ] **Step 2: Run the tests and confirm they fail**

Run:

```powershell
node --no-warnings --test lib/vendor-dashboard.test.mjs
```

Expected: FAIL because `lib/vendor-dashboard.ts` is not created yet.

### Task 2: Implement Pure Dashboard Helpers

**Files:**
- Create: `lib/vendor-dashboard.ts`

- [ ] **Step 1: Add helper types and functions**

Implement:

- `getListingStatusSummary`
- `getProfileCompletionItems`
- `getVendorDashboardStats`
- `sortVendorBookings`

- [ ] **Step 2: Run helper tests**

Run:

```powershell
node --no-warnings --test lib/vendor-dashboard.test.mjs
```

Expected: PASS.

- [ ] **Step 3: Commit helper work**

Commit:

```powershell
git add lib/vendor-dashboard.ts lib/vendor-dashboard.test.mjs
git commit -m "Add vendor dashboard helpers"
```

### Task 3: Refine Dashboard Layout

**Files:**
- Modify: `app/vendor/dashboard/page.tsx`

- [ ] **Step 1: Import helpers**

Use the helper functions for stats, profile completion, listing statuses, and booking ordering.

- [ ] **Step 2: Improve top dashboard**

Replace the scattered top cards with a clearer hero, four metric cards, and quick action buttons.

- [ ] **Step 3: Add profile completion checklist**

Render a checklist using `getProfileCompletionItems`.

- [ ] **Step 4: Put pending bookings first**

Render new bookings before the full booking table so vendors see urgent requests quickly.

- [ ] **Step 5: Convert listing rows into status cards**

Show status, price, location, photo count, tour time count, map pin state, and quick actions.

- [ ] **Step 6: Hide listing edit forms behind an Edit details button**

Keep all existing editing abilities but render the large form only for expanded listings.

### Task 4: Verify

**Files:**
- No new files.

- [ ] **Step 1: Run tests**

```powershell
node --no-warnings --test lib/vendor-dashboard.test.mjs lib/homepage-settings.test.mjs lib/home-listings.test.mjs lib/site-branding.test.mjs lib/branding-logo-upload.test.mjs lib/site-icon-source.test.mjs
```

- [ ] **Step 2: Run lint**

```powershell
npm.cmd run lint
```

- [ ] **Step 3: Run TypeScript**

```powershell
npx.cmd tsc --noEmit
```

- [ ] **Step 4: Run build**

```powershell
npm.cmd run build
```

Expected: all pass.

## Self-Review

This plan covers the approved branch scope: cleaner dashboard, listing status cards, quick edit buttons, pending bookings first, and profile completion. It avoids SQL/database changes and keeps unrelated listing-detail files untouched. No placeholders or conflicting type names remain.
