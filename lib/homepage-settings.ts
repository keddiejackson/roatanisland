export type HomepageTrustPoint = {
  title: string;
  text: string;
};

export const publishedSiteSettingsKey = "site";
export const draftSiteSettingsKey = "site_draft";

export function getHomepageSettingsKey(previewDraft: boolean) {
  return previewDraft ? draftSiteSettingsKey : publishedSiteSettingsKey;
}

export const homepageSectionKeys = [
  "trustBar",
  "marketplace",
  "finalCta",
] as const;

export type HomepageSectionKey = (typeof homepageSectionKeys)[number];

export const homepageSectionOptions: {
  key: HomepageSectionKey;
  label: string;
  description: string;
}[] = [
  {
    key: "trustBar",
    label: "Trust proof strip",
    description: "The small confidence bar below the hero.",
  },
  {
    key: "marketplace",
    label: "Featured marketplace",
    description: "Search, filters, and selected homepage listings.",
  },
  {
    key: "finalCta",
    label: "Final planning panel",
    description: "The closing call to action near the footer.",
  },
];

export type HomepageControls = {
  heroImageUrl: string;
  listingFallbackImageUrl: string;
  finalCtaImageUrl: string;
  heroEyebrow: string;
  homepageHeadline: string;
  homepageSubhead: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  primaryCtaHref: string;
  secondaryCtaHref: string;
  heroCountLabel: string;
  heroMapLabel: string;
  heroSupportLabel: string;
  showFeaturedListings: boolean;
  showExploreRoutes: boolean;
  showMapCallout: boolean;
  showTrustSection: boolean;
  showPlanningHelp: boolean;
  showFinalCta: boolean;
  sectionOrder: HomepageSectionKey[];
  homepageFeaturedListingIds: string[];
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
  finalCtaEyebrow: string;
  finalCtaTitle: string;
  finalCtaBody: string;
  finalCtaPrimaryLabel: string;
  finalCtaSecondaryLabel: string;
  finalCtaTertiaryLabel: string;
  finalCtaPrimaryHref: string;
  finalCtaSecondaryHref: string;
  finalCtaTertiaryHref: string;
  featuredBadgeLabel: string;
  topRatedBadgeLabel: string;
};

export const defaultHomepageControls: HomepageControls = {
  heroImageUrl: "/images/roatan.jpeg",
  listingFallbackImageUrl: "/images/roatan.jpeg",
  finalCtaImageUrl: "",
  heroEyebrow: "Private Roatan days",
  homepageHeadline: "The island, arranged beautifully.",
  homepageSubhead:
    "Plan your Roatan day with vetted local experiences, map context, and concierge help in one calm place.",
  primaryCtaLabel: "Plan your Roatan day",
  secondaryCtaLabel: "Explore experiences",
  primaryCtaHref: "#marketplace",
  secondaryCtaHref: "/map",
  heroCountLabel: "curated options",
  heroMapLabel: "Map-first planning",
  heroSupportLabel: "Concierge support",
  showFeaturedListings: true,
  showExploreRoutes: true,
  showMapCallout: true,
  showTrustSection: true,
  showPlanningHelp: true,
  showFinalCta: true,
  sectionOrder: ["trustBar", "marketplace", "finalCta"],
  homepageFeaturedListingIds: [],
  listingsEyebrow: "Curated trip planner",
  listingsTitle: "Featured Roatan picks.",
  listingsIntro:
    "Start with the basics. Search, choose a trip style, add your date and guest count, then open only the best matches.",
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
      title: "Verified local operators",
      text: "Profiles, photos, times, map context, and listing quality are shaped around guest confidence.",
    },
    {
      title: "Secure request flow",
      text: "Guests can request, message, review payments, and keep support in one signed-in account.",
    },
    {
      title: "Cruise and airport aware",
      text: "Planning highlights pickup areas, cruise timing, airport transfers, beaches, and nearby stops.",
    },
  ],
  finalCtaEyebrow: "Ready when you are",
  finalCtaTitle: "Ready to plan your Roatan day?",
  finalCtaBody:
    "Start with the map, let the concierge help, or open your trip dashboard to keep every saved plan and booking in one place.",
  finalCtaPrimaryLabel: "Browse the map",
  finalCtaSecondaryLabel: "Concierge",
  finalCtaTertiaryLabel: "My trips",
  finalCtaPrimaryHref: "/map",
  finalCtaSecondaryHref: "/concierge",
  finalCtaTertiaryHref: "/account",
  featuredBadgeLabel: "Featured",
  topRatedBadgeLabel: "Top rated",
};

const legacyHomepageTextDefaults: Record<string, string> = {
  heroEyebrow: "Roatan experiences",
  homepageHeadline: "Plan your best Roatan day in one place.",
  homepageSubhead:
    "Browse local experiences, compare prices, and request bookings from a simple island directory built for travelers.",
  primaryCtaLabel: "Explore listings",
  secondaryCtaLabel: "View map",
  listingsEyebrow: "Explore listings",
  listingsTitle: "Find the Roatan day that fits.",
  listingsIntro:
    "Start with a search or a category. Open more filters when the details matter.",
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

function cleanHomepageText(
  value: unknown,
  fallback: string,
  legacyFallback?: string,
) {
  const cleaned = cleanText(value, fallback);
  return legacyFallback && cleaned === legacyFallback ? fallback : cleaned;
}

function cleanBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function cleanHomepageUrl(value: unknown, fallback: string, allowBlank = false) {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();
  if (!trimmed) return allowBlank ? "" : fallback;

  const lowered = trimmed.toLowerCase();
  const safePrefixes = ["/", "#", "http://", "https://", "mailto:", "tel:"];
  const isSafe = safePrefixes.some((prefix) => lowered.startsWith(prefix));

  return isSafe ? trimmed : fallback;
}

function cleanTextList(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;

  const rows = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return rows.length > 0 ? rows : fallback;
}

function cleanListingIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function cleanSectionOrder(value: unknown) {
  if (!Array.isArray(value)) return defaultHomepageControls.sectionOrder;

  const knownSections = new Set(homepageSectionKeys);
  const sections = value.filter(
    (item): item is HomepageSectionKey =>
      typeof item === "string" && knownSections.has(item as HomepageSectionKey),
  );
  const uniqueSections = Array.from(new Set(sections));
  const missingSections = defaultHomepageControls.sectionOrder.filter(
    (section) => !uniqueSections.includes(section),
  );

  return uniqueSections.length > 0
    ? [...uniqueSections, ...missingSections]
    : defaultHomepageControls.sectionOrder;
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
    heroImageUrl: cleanHomepageUrl(
      settings.heroImageUrl,
      defaultHomepageControls.heroImageUrl,
    ),
    listingFallbackImageUrl: cleanHomepageUrl(
      settings.listingFallbackImageUrl,
      defaultHomepageControls.listingFallbackImageUrl,
    ),
    finalCtaImageUrl: cleanHomepageUrl(
      settings.finalCtaImageUrl,
      defaultHomepageControls.finalCtaImageUrl,
      true,
    ),
    heroEyebrow: cleanHomepageText(
      settings.heroEyebrow,
      defaultHomepageControls.heroEyebrow,
      legacyHomepageTextDefaults.heroEyebrow,
    ),
    homepageHeadline: cleanHomepageText(
      settings.homepageHeadline,
      defaultHomepageControls.homepageHeadline,
      legacyHomepageTextDefaults.homepageHeadline,
    ),
    homepageSubhead: cleanHomepageText(
      settings.homepageSubhead,
      defaultHomepageControls.homepageSubhead,
      legacyHomepageTextDefaults.homepageSubhead,
    ),
    primaryCtaLabel: cleanHomepageText(
      settings.primaryCtaLabel,
      defaultHomepageControls.primaryCtaLabel,
      legacyHomepageTextDefaults.primaryCtaLabel,
    ),
    secondaryCtaLabel: cleanHomepageText(
      settings.secondaryCtaLabel,
      defaultHomepageControls.secondaryCtaLabel,
      legacyHomepageTextDefaults.secondaryCtaLabel,
    ),
    primaryCtaHref: cleanHomepageUrl(
      settings.primaryCtaHref,
      defaultHomepageControls.primaryCtaHref,
    ),
    secondaryCtaHref: cleanHomepageUrl(
      settings.secondaryCtaHref,
      defaultHomepageControls.secondaryCtaHref,
    ),
    heroCountLabel: cleanText(
      settings.heroCountLabel,
      defaultHomepageControls.heroCountLabel,
    ),
    heroMapLabel: cleanText(settings.heroMapLabel, defaultHomepageControls.heroMapLabel),
    heroSupportLabel: cleanText(
      settings.heroSupportLabel,
      defaultHomepageControls.heroSupportLabel,
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
    showFinalCta: cleanBoolean(
      settings.showFinalCta,
      defaultHomepageControls.showFinalCta,
    ),
    sectionOrder: cleanSectionOrder(settings.sectionOrder),
    homepageFeaturedListingIds: cleanListingIds(
      settings.homepageFeaturedListingIds,
    ),
    listingsEyebrow: cleanHomepageText(
      settings.listingsEyebrow,
      defaultHomepageControls.listingsEyebrow,
      legacyHomepageTextDefaults.listingsEyebrow,
    ),
    listingsTitle: cleanHomepageText(
      settings.listingsTitle,
      defaultHomepageControls.listingsTitle,
      legacyHomepageTextDefaults.listingsTitle,
    ),
    listingsIntro: cleanHomepageText(
      settings.listingsIntro,
      defaultHomepageControls.listingsIntro,
      legacyHomepageTextDefaults.listingsIntro,
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
    finalCtaEyebrow: cleanText(
      settings.finalCtaEyebrow,
      defaultHomepageControls.finalCtaEyebrow,
    ),
    finalCtaTitle: cleanText(
      settings.finalCtaTitle,
      defaultHomepageControls.finalCtaTitle,
    ),
    finalCtaBody: cleanText(
      settings.finalCtaBody,
      defaultHomepageControls.finalCtaBody,
    ),
    finalCtaPrimaryLabel: cleanText(
      settings.finalCtaPrimaryLabel,
      defaultHomepageControls.finalCtaPrimaryLabel,
    ),
    finalCtaSecondaryLabel: cleanText(
      settings.finalCtaSecondaryLabel,
      defaultHomepageControls.finalCtaSecondaryLabel,
    ),
    finalCtaTertiaryLabel: cleanText(
      settings.finalCtaTertiaryLabel,
      defaultHomepageControls.finalCtaTertiaryLabel,
    ),
    finalCtaPrimaryHref: cleanHomepageUrl(
      settings.finalCtaPrimaryHref,
      defaultHomepageControls.finalCtaPrimaryHref,
    ),
    finalCtaSecondaryHref: cleanHomepageUrl(
      settings.finalCtaSecondaryHref,
      defaultHomepageControls.finalCtaSecondaryHref,
    ),
    finalCtaTertiaryHref: cleanHomepageUrl(
      settings.finalCtaTertiaryHref,
      defaultHomepageControls.finalCtaTertiaryHref,
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

export function getVisibleHomepageSections(controls: HomepageControls) {
  return controls.sectionOrder.filter((section) => {
    if (section === "trustBar") return controls.showTrustSection;
    if (section === "marketplace") return controls.showFeaturedListings;
    if (section === "finalCta") return controls.showFinalCta;
    return false;
  });
}

export type HomepageQualityContext = {
  availableListingCount: number;
  selectedListingCount: number;
};

export type HomepageQualityChecklistItem = {
  id: string;
  label: string;
  status: "ok" | "warning";
  detail: string;
};

export function getHomepageQualityChecklist(
  controls: HomepageControls,
  context: HomepageQualityContext,
): HomepageQualityChecklistItem[] {
  const items: HomepageQualityChecklistItem[] = [];

  items.push({
    id: "hero-image",
    label: "Hero image",
    status:
      controls.heroImageUrl &&
      controls.heroImageUrl !== defaultHomepageControls.heroImageUrl
        ? "ok"
        : "warning",
    detail:
      controls.heroImageUrl &&
      controls.heroImageUrl !== defaultHomepageControls.heroImageUrl
        ? "Custom hero image is ready."
        : "The homepage is using the default hero image.",
  });

  items.push({
    id: "button-links",
    label: "Button links",
    status:
      controls.primaryCtaHref &&
      controls.secondaryCtaHref &&
      controls.finalCtaPrimaryHref
        ? "ok"
        : "warning",
    detail:
      controls.primaryCtaHref &&
      controls.secondaryCtaHref &&
      controls.finalCtaPrimaryHref
        ? "Main homepage buttons have destinations."
        : "Add destinations for the main homepage buttons.",
  });

  const hasEnoughFeaturedListings =
    context.selectedListingCount > 0 || context.availableListingCount > 0;

  items.push({
    id: "featured-listings",
    label: "Featured listings",
    status: hasEnoughFeaturedListings ? "ok" : "warning",
    detail: hasEnoughFeaturedListings
      ? `${Math.max(
          context.selectedListingCount,
          context.availableListingCount,
        )} homepage listing option${
          Math.max(context.selectedListingCount, context.availableListingCount) ===
          1
            ? ""
            : "s"
        } ready.`
      : "Choose featured listings or add polished active listings.",
  });

  items.push({
    id: "trust-points",
    label: "Trust proof",
    status: controls.trustPoints.length >= 3 ? "ok" : "warning",
    detail:
      controls.trustPoints.length >= 3
        ? "Three confidence points are ready."
        : "Add three trust proof points before publishing.",
  });

  items.push({
    id: "section-flow",
    label: "Section flow",
    status: getVisibleHomepageSections(controls).length >= 2 ? "ok" : "warning",
    detail:
      getVisibleHomepageSections(controls).length >= 2
        ? "Homepage has enough visible sections."
        : "Turn on at least two homepage sections for a complete guest path.",
  });

  return items;
}
