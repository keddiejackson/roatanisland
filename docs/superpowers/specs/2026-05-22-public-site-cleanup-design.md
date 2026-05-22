# Public Site Cleanup Design

## Goal

Make the public website feel calmer, clearer, and more premium by focusing the
homepage on the traveler journey first. The first cleanup pass should help a
visitor understand what RoatanIsland.life offers, browse listings quickly, open
the map, and reach a booking path without wading through platform explanations
or role-based admin/vendor shortcuts.

## Current Problem

The current homepage asks one page to do too many jobs at once:

- Introduce the Roatan marketplace.
- Explain the product and workflow.
- Serve travelers, vendors, operators, and admins equally.
- Surface a large listing search/filter experience.
- Promote trip types, map planning, concierge help, and lead capture.

That creates repeated card groups, repeated calls to action, dense controls, and
too many visual priorities before the visitor reaches the listings.

## Recommended Direction

Use a traveler-first public homepage with a quieter supporting path for vendors.
Admin access should stay available where it is useful, but it should not compete
with the travel experience on the homepage.

The cleanup should favor:

- Fewer sections.
- Stronger image-led hierarchy.
- One primary action per section.
- Search and filters that reveal complexity gradually.
- Shorter copy and less platform language.
- Shared spacing and visual rhythm across public sections.

## Approaches Considered

### 1. Traveler-First Homepage

Reduce the homepage to the best discovery and trust sections, keep vendor links
in navigation and footer, and move admin-focused shortcuts off the public body.
This is the recommended option because it directly removes clutter while keeping
the marketplace easy to use.

### 2. Role-Based Homepage

Keep traveler, vendor, operator, and admin entry points near the top, but make
each role path visually cleaner. This preserves every shortcut, but it still
asks first-time travelers to sort through internal platform roles.

### 3. Minimal Hero Plus Search

Turn the homepage into an almost single-purpose search page with a hero and
listings. This is the cleanest layout, but it drops too much trust-building and
brand storytelling while the marketplace is still growing.

## Scope

This pass changes the public homepage and the public content it composes. It may
extract small homepage-only components if that keeps the implementation easier
to read and test.

This pass does not redesign:

- Admin dashboards.
- Vendor dashboards and forms.
- Booking form logic.
- Map interaction logic.
- Database data structures.

The map remains a major destination, but the homepage should preview and link to
it instead of trying to explain every map capability inline.

## Homepage Structure

The cleaned homepage should use this order:

1. Hero with brand, one clear traveler message, and primary discovery actions.
2. Featured or recent listings with strong photos and concise listing cards.
3. Explore by category or area with a small number of clear routes.
4. Map preview callout that sends visitors into the richer map page.
5. Trust section explaining why the site is useful and how requests work.
6. Compact planning/help prompt when a traveler needs guidance.
7. Shared footer with vendor links and secondary site navigation.

## Section Design

### Hero

Keep the full-bleed Roatan image and shared logo. Simplify the navigation and
hero copy so the page immediately reads as a travel discovery site.

Primary actions:

- Explore listings.
- View map.

Vendor signup can remain visible in navigation as a secondary action. Admin
login should not be promoted in the hero body.

### Listings

Listings should appear earlier and with less setup around them. Featured
listings should lead when available. If there are no featured listings, recent
active listings should still provide a useful browsing surface.

The listing filter area should show the essentials first:

- Search.
- Category.

Location, price, rating, and sort options should sit in a calmer advanced-filter
area so the first view feels approachable instead of dashboard-like.

### Explore Routes

Replace repeated product and role shortcut cards with a small discovery surface.
The routes should help travelers choose by intent, category, or island area
without presenting every possible feature at once.

### Map Preview

Use a focused map callout with short copy and a direct link to the map. It should
highlight practical planning value such as beaches, airport pickup, cruise
ports, and nearby experiences without embedding another dense planning panel on
the homepage.

### Trust And Help

Keep the strongest trust explanation from the existing About section and explain
the request-first booking model in traveler language. The planning form should
remain available but should read like a compact support option, not a second
main product surface.

## Navigation And Secondary Paths

Public navigation should prioritize traveler destinations such as listings,
map, tours, and vendors. Vendor signup/login remain accessible but visually
secondary.

Admin access should stay reachable through its existing route and any existing
admin surfaces, but it should not receive homepage body real estate.

The footer remains the natural place for broader public links and vendor entry
points.

## Components And Boundaries

- The homepage page component continues to own listing fetch and filter state.
- Listing card rendering should stay reusable inside the homepage cleanup.
- Homepage-only sections may be extracted when they have a clear responsibility
  such as explore routes, map callout, or traveler trust.
- Shared components such as `SiteLogo`, `SiteFooter`, and `BrandAbout` should be
  reused or lightly adjusted rather than duplicated.

## Empty And Loading States

- If listings are still loading or none match, the homepage should keep a calm
  empty state with a route to the map and a reset path for filters.
- The absence of featured listings should not leave a dead section.
- Filter expansion should not hide the ability to reset filters after a search.

## Visual Rules

- Reduce stacked panels and repeated small cards.
- Prefer open section spacing and strong photo surfaces over dense dashboard
  blocks.
- Keep buttons and controls visually consistent with the current Roatan palette.
- Use compact supporting copy and avoid product-management wording on traveler
  sections.
- Keep the page polished on mobile by avoiding long control rows and card grids
  that feel compressed.

## Verification

Implementation should verify:

- The homepage still loads active listings and filter/reset behavior works.
- Primary traveler actions reach the listings and map.
- Vendor signup remains easy to find.
- Public layout remains coherent on desktop and mobile widths.
- Existing site branding and footer behavior continue to work.
- Lint, TypeScript, and the production build pass.
