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
