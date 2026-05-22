# Public Site Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the public homepage calmer and more traveler-focused while preserving listing discovery, map access, vendor entry points, and planning help.

**Architecture:** Keep the cleanup scoped to the current public homepage. Extract listing filtering and featured-card selection into a small pure helper so the UI can get simpler without burying browsing rules inside the page component, then reshape `app/page.tsx` and the existing trust section into a quieter traveler-first flow.

**Tech Stack:** Next.js App Router 16.2.2, React 19 client components, Tailwind CSS 4 utility classes, Supabase listing data, Node built-in test runner.

---

## File Structure

- Create `lib/home-listings.ts` for homepage listing types, filter rules, featured fallback selection, and reset defaults.
- Create `lib/home-listings.test.mjs` for focused tests around listing filtering and card selection.
- Modify `app/page.tsx` for the simplified traveler-first homepage, lighter search controls, advanced filter reveal, map callout, and compact planning prompt.
- Modify `app/BrandAbout.tsx` for a leaner traveler-trust section that supports the cleaned homepage rhythm.

### Task 1: Extract Homepage Listing Behavior

**Files:**
- Create: `lib/home-listings.ts`
- Create: `lib/home-listings.test.mjs`
- Modify: `app/page.tsx`

- [ ] **Step 1: Write failing tests for homepage listing behavior**

Create `lib/home-listings.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  filterHomeListings,
  homeListingFilterDefaults,
  selectHomeSpotlightListings,
} from "./home-listings.ts";

const listings = [
  {
    id: "featured-tour",
    title: "Sunset Charter",
    description: "Private west end water time",
    price: 180,
    location: "West End",
    category: "Private Charters",
    is_featured: true,
    rating: 4.9,
    tour_times: ["4:30 PM"],
  },
  {
    id: "reef-tour",
    title: "Family Reef Tour",
    description: "Easy snorkeling",
    price: 70,
    location: "West Bay",
    category: "Tours",
    is_featured: false,
    rating: 4.4,
    tour_times: ["9:00 AM"],
  },
  {
    id: "hotel",
    title: "Harbour Stay",
    description: "Mid-island hotel",
    price: 220,
    location: "French Harbour",
    category: "Hotels",
    is_featured: false,
    rating: 5,
    tour_times: [],
  },
];

test("filters homepage listings by the calm and advanced controls", () => {
  const rows = filterHomeListings(listings, {
    ...homeListingFilterDefaults,
    search: "reef 9:00",
    category: "Tours",
    location: "West Bay",
    maxPrice: "100",
    minimumRating: "4",
    sortBy: "Rating",
  });

  assert.deepEqual(rows.map((listing) => listing.id), ["reef-tour"]);
});

test("spotlight listings prefer featured rows and fall back to visible rows", () => {
  assert.deepEqual(
    selectHomeSpotlightListings(listings, listings).map((listing) => listing.id),
    ["featured-tour"],
  );

  assert.deepEqual(
    selectHomeSpotlightListings(
      listings.map((listing) => ({ ...listing, is_featured: false })),
      listings,
    ).map((listing) => listing.id),
    ["featured-tour", "reef-tour", "hotel"],
  );
});
```

- [ ] **Step 2: Run the new tests and confirm they fail**

Run:

```powershell
node --no-warnings --test lib/home-listings.test.mjs
```

Expected: FAIL because `lib/home-listings.ts` does not exist yet.

- [ ] **Step 3: Add the pure homepage listing helper**

Create `lib/home-listings.ts`:

```ts
export type HomeListing = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  image_url?: string | null;
  category: string | null;
  is_active?: boolean | null;
  is_featured: boolean | null;
  rating: number | null;
  reviews_count?: number | null;
  tour_times: string[] | null;
};

export type HomeListingFilters = {
  search: string;
  category: string;
  location: string;
  maxPrice: string;
  minimumRating: string;
  sortBy: string;
};

export const homeListingFilterDefaults: HomeListingFilters = {
  search: "",
  category: "All",
  location: "All",
  maxPrice: "",
  minimumRating: "All",
  sortBy: "Featured",
};

export function filterHomeListings(
  listings: HomeListing[],
  filters: HomeListingFilters,
) {
  const priceLimit = filters.maxPrice ? Number(filters.maxPrice) : null;
  const search = filters.search.toLowerCase();

  return listings
    .filter((listing) => {
      const searchBlob = [
        listing.title,
        listing.location || "",
        listing.description || "",
        ...(listing.tour_times || []),
      ]
        .join(" ")
        .toLowerCase();

      return (
        searchBlob.includes(search) &&
        (filters.category === "All" || listing.category === filters.category) &&
        (filters.location === "All" || listing.location === filters.location) &&
        (!priceLimit || !listing.price || listing.price <= priceLimit) &&
        (filters.minimumRating === "All" ||
          (listing.rating ?? 5) >= Number(filters.minimumRating))
      );
    })
    .sort((first, second) => {
      if (filters.sortBy === "Price low") return (first.price || 0) - (second.price || 0);
      if (filters.sortBy === "Price high") return (second.price || 0) - (first.price || 0);
      if (filters.sortBy === "Rating") return (second.rating || 5) - (first.rating || 5);
      if (Boolean(first.is_featured) === Boolean(second.is_featured)) {
        return (second.rating || 5) - (first.rating || 5);
      }
      return first.is_featured ? -1 : 1;
    });
}

export function selectHomeSpotlightListings(
  listings: HomeListing[],
  visibleListings: HomeListing[],
) {
  const featured = listings.filter((listing) => listing.is_featured).slice(0, 3);
  return featured.length > 0 ? featured : visibleListings.slice(0, 3);
}
```

Update `app/page.tsx` imports and replace the inline filter/sort memo with:

```ts
import {
  filterHomeListings,
  homeListingFilterDefaults,
  selectHomeSpotlightListings,
  type HomeListing,
} from "@/lib/home-listings";

type Listing = HomeListing & {
  image_url: string | null;
  reviews_count: number | null;
};

const filteredListings = useMemo(
  () =>
    filterHomeListings(listings, {
      search,
      category,
      location: locationFilter,
      maxPrice,
      minimumRating,
      sortBy,
    }),
  [category, listings, locationFilter, maxPrice, minimumRating, search, sortBy],
);

const spotlightListings = useMemo(
  () => selectHomeSpotlightListings(listings, filteredListings),
  [filteredListings, listings],
);
```

- [ ] **Step 4: Run the helper tests and TypeScript**

Run:

```powershell
node --no-warnings --test lib/home-listings.test.mjs
npx.cmd tsc --noEmit
```

Expected: tests PASS and TypeScript reports no errors.

- [ ] **Step 5: Commit the extracted behavior**

```powershell
git add -- lib/home-listings.ts lib/home-listings.test.mjs app/page.tsx
git commit -m "Extract homepage listing filters"
```

### Task 2: Simplify The Homepage Discovery Flow

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Add state for progressive filter disclosure**

Add the filter reveal state next to the existing homepage filter state:

```ts
const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
```

- [ ] **Step 2: Replace the dense top-of-page homepage sections**

In `app/page.tsx`, remove the current metrics grid, `Roatan Command Center`,
`Quick launch`, product-highlight cards, and workflow panel. Keep the image hero
but reshape it around this structure:

```tsx
<section className="relative min-h-[720px] overflow-hidden bg-[#071F2F] text-white">
  <Image src="/images/roatan.jpeg" alt="Roatan coastline" fill priority sizes="100vw" className="object-cover" />
  <div className="absolute inset-0 bg-[#071F2F]/65" />
  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,31,47,0.06)_0%,rgba(7,31,47,0.82)_76%,#F7F3EA_100%)]" />
  <div className="relative mx-auto flex min-h-[720px] max-w-7xl flex-col px-5 py-5 sm:px-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <SiteLogo variant="light" priority />
      <nav className="flex flex-wrap items-center justify-end gap-2 text-sm font-semibold text-white/90">
        <a href="#marketplace" className="rounded-lg px-3 py-2 hover:bg-white/10">Listings</a>
        <Link href="/map" className="rounded-lg px-3 py-2 hover:bg-white/10">Map</Link>
        <Link href="/tours" className="rounded-lg px-3 py-2 hover:bg-white/10">Tours</Link>
        <Link href="/vendors" className="rounded-lg px-3 py-2 hover:bg-white/10">Vendors</Link>
        <Link href="/vendor/signup" className="rounded-lg bg-white px-4 py-2 text-[#071F2F] shadow-lg shadow-black/10">List your business</Link>
      </nav>
    </header>
    <div className="motion-rise flex flex-1 flex-col justify-center py-20">
      <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#9EE8E3]">Roatan experiences</p>
      <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl">{siteSettings.homepageHeadline}</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-white/84 sm:text-xl">{siteSettings.homepageSubhead}</p>
      <div className="mt-9 flex flex-wrap gap-3">
        <a href="#marketplace" className="rounded-lg bg-[#00A8A8] px-6 py-3 font-bold text-white">Explore listings</a>
        <Link href="/map" className="rounded-lg border border-white/25 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur">View map</Link>
      </div>
    </div>
  </div>
</section>
```

- [ ] **Step 3: Move listings directly after the hero**

Keep the marketplace section near the top of the page, render
`spotlightListings` before the main grid, and change the filter controls so the
first row contains only search, category pills, result count, and a toggle:

```tsx
<button
  type="button"
  onClick={() => setShowAdvancedFilters((current) => !current)}
  className="rounded-lg border border-[#D6B56D]/30 bg-white px-4 py-3 text-sm font-bold text-[#0B3C5D]"
>
  {showAdvancedFilters ? "Hide filters" : "More filters"}
</button>
```

Only render location, price, rating, and sort when `showAdvancedFilters` is
true. Keep the existing reset button and make it restore
`homeListingFilterDefaults` values and close the advanced filter tray.

- [ ] **Step 4: Add quiet explore and map sections**

Reuse the existing `tripTypes` routes as a compact explore section after the
listings, then add a full-width map callout with one media-backed surface and a
single map action:

```tsx
<section className="px-5 py-16 sm:px-6">
  <div className="mx-auto grid max-w-7xl overflow-hidden rounded-lg bg-[#071F2F] text-white lg:grid-cols-[1fr_0.9fr]">
    <div className="p-6 sm:p-10">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#D6B56D]">Plan by place</p>
      <h2 className="mt-3 text-3xl font-black sm:text-5xl">See Roatan around your day.</h2>
      <p className="mt-4 max-w-xl leading-8 text-white/75">Check beach areas, cruise ports, the airport, and nearby experiences before you request a booking.</p>
      <Link href="/map" className="mt-7 inline-flex rounded-lg bg-[#D6B56D] px-5 py-3 font-black text-[#071F2F]">Open the map</Link>
    </div>
    <div className="relative min-h-72">
      <Image src="/images/roatan.jpeg" alt="Roatan island water and coast" fill sizes="(min-width: 1024px) 40vw, 100vw" className="object-cover" />
    </div>
  </div>
</section>
```

- [ ] **Step 5: Run lint and TypeScript after the homepage reshape**

Run:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
```

Expected: both commands PASS.

- [ ] **Step 6: Commit the homepage layout cleanup**

```powershell
git add -- app/page.tsx
git commit -m "Simplify traveler homepage flow"
```

### Task 3: Tighten Trust And Planning Support

**Files:**
- Modify: `app/BrandAbout.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Reduce the About section density**

Update `app/BrandAbout.tsx` so the section keeps one trust headline and three
lighter proof points:

```tsx
const trustPoints = [
  ["Local operators", "Browse listings shaped by the people offering the experience."],
  ["Map context", "Plan around beaches, ports, towns, and the airport before you request."],
  ["Flexible requests", "Share your date and group details before availability is confirmed."],
];
```

Use an open section layout and smaller proof rows instead of a heavy stack of
large cards.

- [ ] **Step 2: Make the planning help section feel secondary**

In `app/page.tsx`, keep the existing contact submission logic and success state,
but shorten the section copy, reduce repeated support chips, and make the form
panel feel like a compact help option after trust content rather than a second
hero.

- [ ] **Step 3: Verify the full public homepage**

Run:

```powershell
node --no-warnings --test lib/home-listings.test.mjs
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd run build
```

Expected: helper tests PASS, TypeScript PASS, lint PASS, and the production
build completes.

- [ ] **Step 4: Check desktop and mobile views**

Start the local site if needed:

```powershell
npm.cmd run dev
```

Open `/` in the browser at a desktop width and a mobile width. Confirm:

- Hero shows one clear traveler message and two traveler actions.
- Listings appear before role-based explanations.
- Advanced filters open and reset correctly.
- Vendor signup remains easy to find.
- Map preview, trust, planning help, and footer do not overlap or crowd each
  other.

- [ ] **Step 5: Commit the trust and support cleanup**

```powershell
git add -- app/BrandAbout.tsx app/page.tsx
git commit -m "Refine public homepage support sections"
```
