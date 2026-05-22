# Admin Homepage Control Center Design

## Goal

Give the admin a simple way to curate the public homepage without code changes.
The admin should be able to edit important homepage text, choose which public
sections appear, and control a small set of homepage badges and featured listing
behavior from the existing Admin Settings area.

This is Phase 1 of the broader site-improvement roadmap. Later phases can polish
listing details, traveler favorites, booking status, and SEO landing pages.

## Scope

This phase focuses on homepage control only:

- Admin Settings gains a Homepage Controls section.
- Public homepage reads the saved controls.
- Existing featured listing flags continue to drive featured listing selection.
- Homepage sections can be shown or hidden.
- Homepage text for map, planning help, and trust sections can be edited.
- Homepage listing badge labels can be controlled from settings.

This phase does not add traveler favorites, new listing-detail schema, new SEO
routes, or booking flow changes.

## Existing Foundation

The project already has most of the needed pieces:

- `site_settings` stores JSON site settings.
- Admin Settings already edits site name, hero headline, hero subhead, and logo.
- Listings already have `is_featured`.
- The homepage already reads `site_settings`.
- The homepage already has sections for listings, explore routes, map callout,
  trust, planning help, and footer.

The first version should reuse those foundations instead of adding new database
tables.

## Admin Experience

The Admin Settings page gets a new Homepage Controls section below Branding.
It should feel like a practical control panel, not a design editor.

Controls include:

- Hero eyebrow text.
- Hero headline.
- Hero subhead.
- Primary CTA label.
- Secondary CTA label.
- Show or hide Featured Listings.
- Show or hide Explore Routes.
- Show or hide Map Callout.
- Show or hide Trust Section.
- Show or hide Planning Help.
- Listings section eyebrow, title, and intro text.
- Map callout eyebrow, title, body, CTA label, and three short chips.
- Planning help eyebrow, title, body, and chips.
- Trust section eyebrow, title, body, and three proof points.
- Badge labels for featured listings and high-rated listings.

The existing homepage headline and subhead controls should remain compatible.
If the admin does not set the new fields, the public site should use the current
hard-coded text as fallback.

## Public Homepage Behavior

The homepage reads the normalized homepage controls from `site_settings`.

If a section is enabled, it renders with saved admin copy. If a section is
disabled, it is skipped cleanly and neighboring spacing still looks intentional.

Featured listings should continue using listing `is_featured` rows first, then
fall back to visible listings. The badge text should use admin settings:

- Featured listing badge defaults to `Featured`.
- High-rated listing badge defaults to `Top rated`.
- Category badge remains the fallback.

The homepage should never render empty admin text. Missing fields use fallbacks.
Empty chip/proof-point values are filtered out. If all chips or proof points are
empty, the chip/proof list is hidden.

## Data Shape

Homepage controls are stored inside the existing `site_settings.value` JSON
object. The normalized settings should support this shape:

```ts
type HomepageControls = {
  heroEyebrow: string;
  homepageHeadline: string;
  homepageSubhead: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  showFeaturedListings: boolean;
  showExploreRoutes: boolean;
  showMapCallout: boolean;
  showTrustSection: boolean;
  showPlanningHelp: boolean;
  listingsEyebrow: string;
  listingsTitle: string;
  listingsIntro: string;
  mapEyebrow: string;
  mapTitle: string;
  mapBody: string;
  mapCtaLabel: string;
  mapChips: string[];
  planningEyebrow: string;
  planningTitle: string;
  planningBody: string;
  planningChips: string[];
  trustEyebrow: string;
  trustTitle: string;
  trustBody: string;
  trustPoints: Array<{ title: string; text: string }>;
  featuredBadgeLabel: string;
  topRatedBadgeLabel: string;
};
```

Implementation can keep this type in a helper file and expose normalization
utilities that preserve existing site settings.

## Components And Boundaries

### `lib/homepage-settings.ts`

Owns default homepage control values, normalization, and helper behavior for
chips and trust points. This keeps fallback logic out of the page component and
makes it easy to test.

### `app/admin/settings/page.tsx`

Owns the admin form controls. It should continue saving through the existing
`/api/admin/settings` route.

The settings page should not become a full website builder. It should use
simple textareas, checkboxes, and compact grouped controls.

### `app/page.tsx`

Reads normalized homepage controls and renders sections conditionally. Listing
filter behavior should continue using `lib/home-listings.ts`.

### `app/BrandAbout.tsx`

Accepts optional trust content props so the homepage can pass admin-controlled
copy. If no props are passed, it should use the current trust fallback content.

## Errors And Fallbacks

- If settings cannot load, the homepage uses defaults.
- If saved settings are malformed, normalization repairs them.
- If an admin clears a text field, the public homepage falls back to safe copy.
- If section toggles are missing, sections default to visible.
- If trust points or chips are blank, blank items are filtered.

## Verification

Implementation should verify:

- Homepage settings normalize malformed and partial data.
- Existing branding settings still normalize and save.
- Admin Settings renders Homepage Controls after login.
- Public homepage uses saved labels and section toggles.
- Disabling each homepage section does not break layout.
- Featured and top-rated badge labels use admin settings.
- Lint, TypeScript, tests, and production build pass.
