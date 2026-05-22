# Admin Homepage Control Center Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the admin a simple settings panel for editing homepage copy, section visibility, chips, proof points, and badge labels without code changes.

**Architecture:** Store homepage controls inside the existing `site_settings.value` JSON object and normalize them through a small tested helper. The public homepage reads the normalized controls and renders the existing sections conditionally, while Admin Settings exposes practical text, checkbox, and list controls.

**Tech Stack:** Next.js App Router 16.2.2, React 19 client components, Tailwind CSS 4 utility classes, Supabase `site_settings`, Node built-in test runner.

---

## File Structure

- Create `lib/homepage-settings.ts` for homepage control defaults, types, and normalization.
- Create `lib/homepage-settings.test.mjs` for malformed, partial, legacy, and blank-value settings tests.
- Modify `app/page.tsx` so the homepage uses normalized admin controls and section toggles.
- Modify `app/BrandAbout.tsx` so trust copy and proof points can be supplied by the homepage.
- Modify `app/admin/settings/page.tsx` so admins can edit the new controls through the existing settings save flow.

### Task 1: Add Tested Homepage Settings Normalization

**Files:**
- Create: `lib/homepage-settings.ts`
- Create: `lib/homepage-settings.test.mjs`

- [ ] **Step 1: Write failing tests for homepage settings behavior**

Create `lib/homepage-settings.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultHomepageControls,
  normalizeHomepageControls,
} from "./homepage-settings.ts";

test("normalizes missing and malformed homepage controls to defaults", () => {
  const controls = normalizeHomepageControls({
    heroEyebrow: 123,
    showFeaturedListings: "yes",
    mapChips: "not an array",
    trustPoints: [{ title: "", text: "" }],
  });

  assert.equal(controls.heroEyebrow, defaultHomepageControls.heroEyebrow);
  assert.equal(controls.showFeaturedListings, true);
  assert.deepEqual(controls.mapChips, defaultHomepageControls.mapChips);
  assert.deepEqual(controls.trustPoints, defaultHomepageControls.trustPoints);
});

test("preserves legacy homepage headline and subhead settings", () => {
  const controls = normalizeHomepageControls({
    homepageHeadline: "  Custom island headline  ",
    homepageSubhead: "  Custom subhead  ",
  });

  assert.equal(controls.homepageHeadline, "Custom island headline");
  assert.equal(controls.homepageSubhead, "Custom subhead");
});

test("keeps explicit disabled section toggles", () => {
  const controls = normalizeHomepageControls({
    showFeaturedListings: false,
    showExploreRoutes: false,
    showMapCallout: false,
    showTrustSection: false,
    showPlanningHelp: false,
  });

  assert.equal(controls.showFeaturedListings, false);
  assert.equal(controls.showExploreRoutes, false);
  assert.equal(controls.showMapCallout, false);
  assert.equal(controls.showTrustSection, false);
  assert.equal(controls.showPlanningHelp, false);
});

test("filters blank chips and trust points while keeping useful rows", () => {
  const controls = normalizeHomepageControls({
    mapChips: [" Airport pickup ", "", "Cruise timing"],
    planningChips: ["", " Private day "],
    trustPoints: [
      { title: " Local help ", text: " Good planning context " },
      { title: "", text: "Missing title" },
      { title: "Missing text", text: "" },
    ],
  });

  assert.deepEqual(controls.mapChips, ["Airport pickup", "Cruise timing"]);
  assert.deepEqual(controls.planningChips, ["Private day"]);
  assert.deepEqual(controls.trustPoints, [
    { title: "Local help", text: "Good planning context" },
  ]);
});

test("empty public text fields fall back to safe copy", () => {
  const controls = normalizeHomepageControls({
    primaryCtaLabel: "   ",
    secondaryCtaLabel: "",
    featuredBadgeLabel: "",
    topRatedBadgeLabel: "   ",
  });

  assert.equal(controls.primaryCtaLabel, defaultHomepageControls.primaryCtaLabel);
  assert.equal(controls.secondaryCtaLabel, defaultHomepageControls.secondaryCtaLabel);
  assert.equal(controls.featuredBadgeLabel, "Featured");
  assert.equal(controls.topRatedBadgeLabel, "Top rated");
});
```

- [ ] **Step 2: Run the new tests and confirm they fail**

Run:

```powershell
node --no-warnings --test lib/homepage-settings.test.mjs
```

Expected: FAIL because `lib/homepage-settings.ts` does not exist yet.

- [ ] **Step 3: Add homepage settings types, defaults, and normalization**

Create `lib/homepage-settings.ts`:

```ts
export type HomepageTrustPoint = {
  title: string;
  text: string;
};

export type HomepageControls = {
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
  trustPoints: HomepageTrustPoint[];
  featuredBadgeLabel: string;
  topRatedBadgeLabel: string;
};

export const defaultHomepageControls: HomepageControls = {
  heroEyebrow: "Roatan experiences",
  homepageHeadline: "Plan your best Roatan day in one place.",
  homepageSubhead:
    "Browse local experiences, compare prices, and request bookings from a simple island directory built for travelers.",
  primaryCtaLabel: "Explore listings",
  secondaryCtaLabel: "View map",
  showFeaturedListings: true,
  showExploreRoutes: true,
  showMapCallout: true,
  showTrustSection: true,
  showPlanningHelp: true,
  listingsEyebrow: "Explore listings",
  listingsTitle: "Find the Roatan day that fits.",
  listingsIntro:
    "Start with a search or a category. Open more filters when the details matter.",
  mapEyebrow: "Plan by place",
  mapTitle: "See Roatan around your day.",
  mapBody:
    "Check beach areas, cruise ports, the airport, and nearby experiences before you request a booking.",
  mapCtaLabel: "Open the map",
  mapChips: ["Airport pickup", "Cruise ports", "Beach areas"],
  planningEyebrow: "Planning help",
  planningTitle: "Need help choosing?",
  planningBody:
    "Send your dates, group size, pickup area, and the kind of day you want. We can point you toward a closer fit.",
  planningChips: ["Cruise timing", "Airport pickup", "Private days"],
  trustEyebrow: "Why it helps",
  trustTitle: "Plan a Roatan day with a little more clarity.",
  trustBody:
    "See the experience, understand the area, and send a booking request with the details an operator needs to respond well.",
  trustPoints: [
    {
      title: "Local operators",
      text: "Browse listings shaped by the people offering the experience.",
    },
    {
      title: "Map context",
      text: "Plan around beaches, ports, towns, and the airport before you request.",
    },
    {
      title: "Flexible requests",
      text: "Share your date and group details before availability is confirmed.",
    },
  ],
  featuredBadgeLabel: "Featured",
  topRatedBadgeLabel: "Top rated",
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function cleanBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function cleanTextList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const rows = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  return rows.length > 0 ? rows : fallback;
}

function cleanTrustPoints(value: unknown, fallback: HomepageTrustPoint[]) {
  if (!Array.isArray(value)) return fallback;
  const rows = value
    .map((item) => {
      const row = asRecord(item);
      return {
        title: typeof row.title === "string" ? row.title.trim() : "",
        text: typeof row.text === "string" ? row.text.trim() : "",
      };
    })
    .filter((item) => item.title && item.text);
  return rows.length > 0 ? rows : fallback;
}

export function normalizeHomepageControls(value: unknown): HomepageControls {
  const settings = asRecord(value);

  return {
    heroEyebrow: cleanText(settings.heroEyebrow, defaultHomepageControls.heroEyebrow),
    homepageHeadline: cleanText(
      settings.homepageHeadline,
      defaultHomepageControls.homepageHeadline,
    ),
    homepageSubhead: cleanText(
      settings.homepageSubhead,
      defaultHomepageControls.homepageSubhead,
    ),
    primaryCtaLabel: cleanText(
      settings.primaryCtaLabel,
      defaultHomepageControls.primaryCtaLabel,
    ),
    secondaryCtaLabel: cleanText(
      settings.secondaryCtaLabel,
      defaultHomepageControls.secondaryCtaLabel,
    ),
    showFeaturedListings: cleanBoolean(
      settings.showFeaturedListings,
      defaultHomepageControls.showFeaturedListings,
    ),
    showExploreRoutes: cleanBoolean(
      settings.showExploreRoutes,
      defaultHomepageControls.showExploreRoutes,
    ),
    showMapCallout: cleanBoolean(
      settings.showMapCallout,
      defaultHomepageControls.showMapCallout,
    ),
    showTrustSection: cleanBoolean(
      settings.showTrustSection,
      defaultHomepageControls.showTrustSection,
    ),
    showPlanningHelp: cleanBoolean(
      settings.showPlanningHelp,
      defaultHomepageControls.showPlanningHelp,
    ),
    listingsEyebrow: cleanText(
      settings.listingsEyebrow,
      defaultHomepageControls.listingsEyebrow,
    ),
    listingsTitle: cleanText(
      settings.listingsTitle,
      defaultHomepageControls.listingsTitle,
    ),
    listingsIntro: cleanText(
      settings.listingsIntro,
      defaultHomepageControls.listingsIntro,
    ),
    mapEyebrow: cleanText(settings.mapEyebrow, defaultHomepageControls.mapEyebrow),
    mapTitle: cleanText(settings.mapTitle, defaultHomepageControls.mapTitle),
    mapBody: cleanText(settings.mapBody, defaultHomepageControls.mapBody),
    mapCtaLabel: cleanText(settings.mapCtaLabel, defaultHomepageControls.mapCtaLabel),
    mapChips: cleanTextList(settings.mapChips, defaultHomepageControls.mapChips),
    planningEyebrow: cleanText(
      settings.planningEyebrow,
      defaultHomepageControls.planningEyebrow,
    ),
    planningTitle: cleanText(
      settings.planningTitle,
      defaultHomepageControls.planningTitle,
    ),
    planningBody: cleanText(
      settings.planningBody,
      defaultHomepageControls.planningBody,
    ),
    planningChips: cleanTextList(
      settings.planningChips,
      defaultHomepageControls.planningChips,
    ),
    trustEyebrow: cleanText(
      settings.trustEyebrow,
      defaultHomepageControls.trustEyebrow,
    ),
    trustTitle: cleanText(settings.trustTitle, defaultHomepageControls.trustTitle),
    trustBody: cleanText(settings.trustBody, defaultHomepageControls.trustBody),
    trustPoints: cleanTrustPoints(
      settings.trustPoints,
      defaultHomepageControls.trustPoints,
    ),
    featuredBadgeLabel: cleanText(
      settings.featuredBadgeLabel,
      defaultHomepageControls.featuredBadgeLabel,
    ),
    topRatedBadgeLabel: cleanText(
      settings.topRatedBadgeLabel,
      defaultHomepageControls.topRatedBadgeLabel,
    ),
  };
}
```

- [ ] **Step 4: Run settings tests and commit**

Run:

```powershell
node --no-warnings --test lib/homepage-settings.test.mjs
```

Expected: PASS.

Commit:

```powershell
git add lib/homepage-settings.ts lib/homepage-settings.test.mjs
git commit -m "Add homepage settings normalization"
```

### Task 2: Wire Homepage Controls Into The Public Homepage

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Import the homepage settings helper**

In `app/page.tsx`, add:

```ts
import {
  defaultHomepageControls,
  normalizeHomepageControls,
  type HomepageControls,
} from "@/lib/homepage-settings";
```

Replace the local `defaultSettings` object with `defaultHomepageControls`.

- [ ] **Step 2: Store normalized controls in homepage state**

Replace:

```ts
const [siteSettings, setSiteSettings] = useState(defaultSettings);
```

with:

```ts
const [homepageControls, setHomepageControls] = useState(defaultHomepageControls);
```

In the settings fetch block, replace the merge call with:

```ts
setHomepageControls(normalizeHomepageControls(settingsData.value));
```

- [ ] **Step 3: Make listing badges use admin labels**

Change the badge helper to:

```ts
function listingBadge(listing: Listing, controls: HomepageControls) {
  if (listing.is_featured) return controls.featuredBadgeLabel;
  if ((listing.rating || 0) >= 4.8) return controls.topRatedBadgeLabel;
  return listing.category || "Listing";
}
```

Add `homepageControls: HomepageControls` to the `ListingCard` props and call:

```tsx
{listingBadge(listing, homepageControls)}
```

Pass `homepageControls={homepageControls}` to each `ListingCard`.

- [ ] **Step 4: Replace hard-coded homepage text with controls**

Use these replacements in `app/page.tsx`:

```tsx
{homepageControls.heroEyebrow}
{homepageControls.homepageHeadline}
{homepageControls.homepageSubhead}
{homepageControls.primaryCtaLabel}
{homepageControls.secondaryCtaLabel}
{homepageControls.listingsEyebrow}
{homepageControls.listingsTitle}
{homepageControls.listingsIntro}
{homepageControls.mapEyebrow}
{homepageControls.mapTitle}
{homepageControls.mapBody}
{homepageControls.mapCtaLabel}
{homepageControls.planningEyebrow}
{homepageControls.planningTitle}
{homepageControls.planningBody}
```

Map chips render with:

```tsx
{homepageControls.mapChips.length > 0 ? (
  <div className="mt-5 flex flex-wrap gap-2">
    {homepageControls.mapChips.map((chip) => (
      <span key={chip} className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white">
        {chip}
      </span>
    ))}
  </div>
) : null}
```

Planning chips render with:

```tsx
{homepageControls.planningChips.length > 0 ? (
  <div className="flex flex-wrap gap-2">
    {homepageControls.planningChips.map((chip) => (
      <span key={chip} className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white">
        {chip}
      </span>
    ))}
  </div>
) : null}
```

- [ ] **Step 5: Add section toggles**

Wrap existing sections with these checks:

```tsx
{homepageControls.showFeaturedListings && spotlightListings.length > 0 ? (
  <section>...</section>
) : null}

{homepageControls.showExploreRoutes ? (
  <section>...</section>
) : null}

{homepageControls.showMapCallout ? (
  <section>...</section>
) : null}

{homepageControls.showTrustSection ? (
  <BrandAbout
    eyebrow={homepageControls.trustEyebrow}
    title={homepageControls.trustTitle}
    body={homepageControls.trustBody}
    trustPoints={homepageControls.trustPoints}
  />
) : null}

{homepageControls.showPlanningHelp ? (
  <section>...</section>
) : null}
```

- [ ] **Step 6: Run TypeScript and commit**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: PASS.

Commit:

```powershell
git add app/page.tsx
git commit -m "Use admin homepage controls"
```

### Task 3: Make The Trust Section Reusable

**Files:**
- Modify: `app/BrandAbout.tsx`

- [ ] **Step 1: Add props and fallbacks**

Change `app/BrandAbout.tsx` so it exports this prop shape and accepts optional content:

```ts
export type BrandAboutTrustPoint = {
  title: string;
  text: string;
};

type BrandAboutProps = {
  eyebrow?: string;
  title?: string;
  body?: string;
  trustPoints?: BrandAboutTrustPoint[];
};
```

Keep the current trust rows as `defaultTrustPoints`, then start the component with:

```ts
export default function BrandAbout({
  eyebrow = "Why it helps",
  title = "Plan a Roatan day with a little more clarity.",
  body =
    "See the experience, understand the area, and send a booking request with the details an operator needs to respond well.",
  trustPoints = defaultTrustPoints,
}: BrandAboutProps) {
  const visibleTrustPoints = trustPoints.filter(
    (point) => point.title.trim() && point.text.trim(),
  );
```

- [ ] **Step 2: Render supplied content**

Render `eyebrow`, `title`, `body`, and `visibleTrustPoints`. Only render the trust grid if `visibleTrustPoints.length > 0`.

- [ ] **Step 3: Run TypeScript and commit**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: PASS.

Commit:

```powershell
git add app/BrandAbout.tsx app/page.tsx
git commit -m "Make homepage trust copy configurable"
```

### Task 4: Add Admin Homepage Controls UI

**Files:**
- Modify: `app/admin/settings/page.tsx`

- [ ] **Step 1: Import homepage defaults and types**

In `app/admin/settings/page.tsx`, add:

```ts
import {
  defaultHomepageControls,
  normalizeHomepageControls,
  type HomepageTrustPoint,
} from "@/lib/homepage-settings";
```

Update `defaultSettings` to spread homepage defaults:

```ts
const defaultSettings = {
  siteName: "RoatanIsland.life",
  adminEmails: "",
  depositAmountCents: "5000",
  commissionRate: "0.10",
  logoUrl: "",
  logoSize: "medium" as LogoSize,
  logoShape: "original" as LogoShape,
  ...defaultHomepageControls,
};
```

When loading saved settings, merge normalized homepage values:

```ts
setSettings({
  ...defaultSettings,
  ...savedSettings,
  ...normalizeHomepageControls(savedSettings),
  ...normalizeSiteBranding(savedSettings),
});
```

- [ ] **Step 2: Add typed update helpers**

Add these helpers inside the component:

```ts
function updateSetting<Key extends keyof typeof settings>(
  field: Key,
  value: (typeof settings)[Key],
) {
  setSettings((current) => ({ ...current, [field]: value }));
}

function textListToLines(value: string[]) {
  return value.join("\n");
}

function linesToTextList(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function updateTrustPoint(
  index: number,
  field: keyof HomepageTrustPoint,
  value: string,
) {
  setSettings((current) => {
    const points = [...current.trustPoints];
    points[index] = {
      ...(points[index] || { title: "", text: "" }),
      [field]: value,
    };
    return { ...current, trustPoints: points };
  });
}
```

- [ ] **Step 3: Add field configuration arrays**

Add these constants near the existing field arrays:

```ts
const homepageToggleFields = [
  ["showFeaturedListings", "Featured listings"],
  ["showExploreRoutes", "Explore routes"],
  ["showMapCallout", "Map callout"],
  ["showTrustSection", "Trust section"],
  ["showPlanningHelp", "Planning help"],
] as const;

const homepageTextFields = [
  ["heroEyebrow", "Hero Eyebrow", 1],
  ["homepageHeadline", "Hero Headline", 2],
  ["homepageSubhead", "Hero Subhead", 3],
  ["primaryCtaLabel", "Primary Button Label", 1],
  ["secondaryCtaLabel", "Secondary Button Label", 1],
  ["listingsEyebrow", "Listings Eyebrow", 1],
  ["listingsTitle", "Listings Title", 2],
  ["listingsIntro", "Listings Intro", 3],
  ["mapEyebrow", "Map Eyebrow", 1],
  ["mapTitle", "Map Title", 2],
  ["mapBody", "Map Body", 3],
  ["mapCtaLabel", "Map Button Label", 1],
  ["planningEyebrow", "Planning Eyebrow", 1],
  ["planningTitle", "Planning Title", 2],
  ["planningBody", "Planning Body", 3],
  ["trustEyebrow", "Trust Eyebrow", 1],
  ["trustTitle", "Trust Title", 2],
  ["trustBody", "Trust Body", 3],
  ["featuredBadgeLabel", "Featured Badge Label", 1],
  ["topRatedBadgeLabel", "Top Rated Badge Label", 1],
] as const;
```

- [ ] **Step 4: Render the Homepage Controls section**

Place this section below the existing Branding section:

```tsx
<section className="space-y-5 rounded-lg border border-[#d7e6ea] bg-white p-6 shadow-sm">
  <div>
    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0fa9b6]">
      Homepage Controls
    </p>
    <h2 className="mt-2 text-2xl font-bold text-[#053c5e]">
      Control the public homepage
    </h2>
    <p className="mt-2 text-sm text-slate-600">
      Edit the homepage copy, turn sections on or off, and tune the labels travelers see.
    </p>
  </div>

  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    {homepageToggleFields.map(([field, label]) => (
      <label
        key={field}
        className="flex items-center gap-3 rounded-lg border border-[#d7e6ea] bg-[#f6fbfc] px-4 py-3 text-sm font-semibold text-[#053c5e]"
      >
        <input
          type="checkbox"
          checked={Boolean(settings[field])}
          onChange={(event) => updateSetting(field, event.target.checked)}
          className="h-4 w-4 accent-[#0fa9b6]"
        />
        {label}
      </label>
    ))}
  </div>

  <div className="grid gap-4 lg:grid-cols-2">
    {homepageTextFields.map(([field, label, rows]) => (
      <label key={field} className={rows > 2 ? "lg:col-span-2" : ""}>
        <span className="text-sm font-semibold text-[#053c5e]">{label}</span>
        <textarea
          value={String(settings[field])}
          rows={rows}
          onChange={(event) => updateSetting(field, event.target.value)}
          className="mt-2 w-full resize-y rounded-lg border border-[#d7e6ea] px-4 py-3 text-[#082f49] outline-none transition focus:border-[#0fa9b6] focus:ring-2 focus:ring-[#0fa9b6]/20"
        />
      </label>
    ))}
  </div>

  <div className="grid gap-4 lg:grid-cols-2">
    <label>
      <span className="text-sm font-semibold text-[#053c5e]">
        Map Chips
      </span>
      <textarea
        value={textListToLines(settings.mapChips)}
        rows={4}
        onChange={(event) => updateSetting("mapChips", linesToTextList(event.target.value))}
        className="mt-2 w-full resize-y rounded-lg border border-[#d7e6ea] px-4 py-3 text-[#082f49] outline-none transition focus:border-[#0fa9b6] focus:ring-2 focus:ring-[#0fa9b6]/20"
      />
    </label>
    <label>
      <span className="text-sm font-semibold text-[#053c5e]">
        Planning Chips
      </span>
      <textarea
        value={textListToLines(settings.planningChips)}
        rows={4}
        onChange={(event) => updateSetting("planningChips", linesToTextList(event.target.value))}
        className="mt-2 w-full resize-y rounded-lg border border-[#d7e6ea] px-4 py-3 text-[#082f49] outline-none transition focus:border-[#0fa9b6] focus:ring-2 focus:ring-[#0fa9b6]/20"
      />
    </label>
  </div>

  <div className="space-y-3">
    <h3 className="text-lg font-bold text-[#053c5e]">Trust Proof Points</h3>
    {settings.trustPoints.slice(0, 3).map((point, index) => (
      <div key={index} className="grid gap-3 rounded-lg border border-[#d7e6ea] bg-[#f6fbfc] p-4 lg:grid-cols-2">
        <label>
          <span className="text-sm font-semibold text-[#053c5e]">
            Proof Title {index + 1}
          </span>
          <input
            value={point.title}
            onChange={(event) => updateTrustPoint(index, "title", event.target.value)}
            className="mt-2 w-full rounded-lg border border-[#d7e6ea] px-4 py-3 text-[#082f49] outline-none transition focus:border-[#0fa9b6] focus:ring-2 focus:ring-[#0fa9b6]/20"
          />
        </label>
        <label>
          <span className="text-sm font-semibold text-[#053c5e]">
            Proof Text {index + 1}
          </span>
          <input
            value={point.text}
            onChange={(event) => updateTrustPoint(index, "text", event.target.value)}
            className="mt-2 w-full rounded-lg border border-[#d7e6ea] px-4 py-3 text-[#082f49] outline-none transition focus:border-[#0fa9b6] focus:ring-2 focus:ring-[#0fa9b6]/20"
          />
        </label>
      </div>
    ))}
  </div>
</section>
```

- [ ] **Step 5: Run TypeScript and commit**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: PASS.

Commit:

```powershell
git add app/admin/settings/page.tsx
git commit -m "Add admin homepage controls"
```

### Task 5: Verify The Complete Flow

**Files:**
- No new files.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
node --no-warnings --test lib/homepage-settings.test.mjs lib/home-listings.test.mjs lib/site-branding.test.mjs lib/branding-logo-upload.test.mjs lib/site-icon-source.test.mjs
```

Expected: all tests PASS.

- [ ] **Step 2: Run lint**

Run:

```powershell
npm.cmd run lint
```

Expected: PASS.

- [ ] **Step 3: Run TypeScript**

Run:

```powershell
npx.cmd tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Run production build**

Run:

```powershell
npm.cmd run build
```

Expected: PASS. If the known local Windows `spawn EPERM` appears only after compilation, record it clearly and verify lint and TypeScript still pass.

- [ ] **Step 5: Browser check**

Start the local app if needed, open `http://localhost:3000`, and verify:

- The homepage loads with no console errors.
- The hero, listings, map callout, trust, and planning sections still render.
- Listing badges still show readable labels.
- The layout remains clean on desktop and mobile widths.

- [ ] **Step 6: Final commit if verification required small fixes**

If verification changes were needed:

```powershell
git add app/page.tsx app/BrandAbout.tsx app/admin/settings/page.tsx lib/homepage-settings.ts lib/homepage-settings.test.mjs
git commit -m "Polish admin homepage controls"
```

## Self-Review

Spec coverage:

- Admin Settings gains a Homepage Controls section in Task 4.
- Public homepage reads normalized saved controls in Task 2.
- Featured listings keep using `is_featured` in Task 2.
- Homepage section show/hide toggles are implemented in Task 2 and exposed in Task 4.
- Map, planning, trust, and badge text are editable in Tasks 2 through 4.
- No traveler favorites, new listing schema, SEO route, or booking flow work is included.

Placeholder scan:

- No `TBD`, `TODO`, `implement later`, or vague "add validation" steps are present.
- Each task includes exact files, exact commands, and expected results.

Type consistency:

- `HomepageControls`, `HomepageTrustPoint`, `defaultHomepageControls`, and `normalizeHomepageControls` names are defined in Task 1 and reused consistently.
- `BrandAbout` prop names match the values passed from `app/page.tsx`.
- Admin settings arrays use fields that exist on `defaultSettings` after `defaultHomepageControls` is spread in.
