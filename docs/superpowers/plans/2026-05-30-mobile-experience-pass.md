# Mobile Experience Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the whole RoatanIsland.life experience feel calmer, faster, and easier on phones.

**Architecture:** Use shared mobile CSS utilities for touch targets, safe areas, horizontal scroll rows, and iOS-friendly form controls, then apply them to the highest-traffic components. Keep the desktop design intact while making mobile navigation, search, map, chat, account, admin, and vendor pages fit cleanly.

**Tech Stack:** Next.js App Router, React client components, Tailwind CSS classes, Framer Motion already in the app.

---

### Task 1: Mobile Foundation

**Files:**
- Modify: `app/globals.css`
- Test: `lib/mobile-experience.test.mjs`

- [x] Add mobile utility classes for horizontal scroll rows, safe bottom padding, and compact mobile cards.
- [x] Force mobile form fields to use at least 16px text so iOS does not zoom fields.
- [x] Keep reduced-motion behavior intact.

### Task 2: Public Mobile Shell

**Files:**
- Modify: `app/HomeHeroHeader.tsx`
- Modify: `app/page.tsx`
- Modify: `app/map/page.tsx`
- Modify: `app/account/page.tsx`
- Modify: `app/book/page.tsx`
- Modify: `app/listings/[id]/page.tsx`

- [x] Compact the homepage mobile nav into a single scrollable row with the vendor CTA included.
- [x] Reduce mobile hero height and remove negative letter spacing so large headlines fit better.
- [x] Tighten public page padding on mobile while preserving desktop spacing.
- [x] Make map and listing headers wrap into touch-friendly rows.

### Task 3: Mobile Chat And Account Controls

**Files:**
- Modify: `app/GlobalAccountButton.tsx`
- Modify: `app/BookingChatDrawer.tsx`

- [x] Make the floating sign-in/account chip smaller and safer on narrow screens.
- [x] Make the chat opener full-width-ish on phone so it is easy to tap without covering content awkwardly.
- [x] Add safe-area padding to the chat composer and drawer.

### Task 4: Operator Mobile Views

**Files:**
- Modify: `app/admin/bookings/page.tsx`
- Modify: `app/vendor/dashboard/page.tsx`

- [x] Hide wide data tables on phones and rely on the existing card views.
- [x] Keep the full table available on tablet/desktop.

### Task 5: Verification

**Files:**
- Test: `lib/mobile-experience.test.mjs`

- [x] Add source tests proving the mobile foundation and page hooks exist.
- [x] Run focused tests, lint, and the production build.
