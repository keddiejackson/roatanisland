export const mobileNavItemKeys = [
  "listings",
  "map",
  "concierge",
  "signIn",
  "business",
] as const;

export type MobileNavItemKey = (typeof mobileNavItemKeys)[number];

const mobileLogoFits = ["contain", "cover", "fill"] as const;
const mobileLogoPositions = ["center", "top", "bottom", "left", "right"] as const;
const mobileLogoShadows = ["none", "soft", "strong"] as const;

type MobileLogoFit = (typeof mobileLogoFits)[number];
type MobileLogoPosition = (typeof mobileLogoPositions)[number];
type MobileLogoShadow = (typeof mobileLogoShadows)[number];

export type MobileSiteControls = {
  mobileHeroEyebrow: string;
  mobileHeroHeadline: string;
  mobileHeroSubhead: string;
  mobilePrimaryCtaLabel: string;
  mobileSecondaryCtaLabel: string;
  mobileHeroCountLabel: string;
  mobileHeroMapLabel: string;
  mobileHeroSupportLabel: string;
  mobileListingsTitle: string;
  mobileListingsIntro: string;
  mobileListingsSearchPlaceholder: string;
  mobileListingsMapButtonLabel: string;
  mobileListingsFilterButtonLabel: string;
  mobileListingsResultLabel: string;
  mobileFinalCtaTitle: string;
  mobileFinalCtaBody: string;
  mobileFinalCtaPrimaryLabel: string;
  mobileListingHeroEyebrow: string;
  mobileListingTrustLine: string;
  mobileListingOverviewTitle: string;
  mobileListingStickyCtaLabel: string;
  mobileListingMapLabel: string;
  mobileBookingHeroEyebrow: string;
  mobileBookingHeroTitle: string;
  mobileBookingHeroBody: string;
  mobileBookingSubmitLabel: string;
  mobileBookingStickyReadyLabel: string;
  mobileBookingStepLabel: string;
  mobileBookingSuccessEyebrow: string;
  mobileBookingSuccessTitle: string;
  mobileBookingSuccessBody: string;
  mobileBookingSuccessPrimaryLabel: string;
  mobileAccountEyebrow: string;
  mobileAccountHeadline: string;
  mobileAccountSignedOutHeadline: string;
  mobileAccountIntro: string;
  mobileAccountSignedOutIntro: string;
  mobileAccountPrimaryActionLabel: string;
  mobileChatBubbleLabel: string;
  mobileChatBubbleNeedsResponseLabel: string;
  mobileNavListingsLabel: string;
  mobileNavMapLabel: string;
  mobileNavConciergeLabel: string;
  mobileNavSignInLabel: string;
  mobileNavBusinessLabel: string;
  showMobileNavListings: boolean;
  showMobileNavMap: boolean;
  showMobileNavConcierge: boolean;
  showMobileNavSignIn: boolean;
  showMobileNavBusiness: boolean;
  showMobileHeroPills: boolean;
  showMobileTrustBar: boolean;
  showMobileHomepageSearch: boolean;
  showMobileFinalCta: boolean;
  compactMobileAdminNav: boolean;
  compactMobileVendorDashboard: boolean;
  useMobileLogoOverrides: boolean;
  mobileLogoWidthPx: number;
  mobileLogoHeightPx: number;
  mobileLogoPaddingPx: number;
  mobileLogoRadiusPx: number;
  mobileLogoBorderWidthPx: number;
  mobileLogoOpacity: number;
  mobileLogoRotateDeg: number;
  mobileLogoScale: number;
  mobileLogoFit: MobileLogoFit;
  mobileLogoPosition: MobileLogoPosition;
  mobileLogoShadow: MobileLogoShadow;
  mobileLogoBackgroundColor: string;
  mobileLogoBorderColor: string;
};

export const defaultMobileSiteControls: MobileSiteControls = {
  mobileHeroEyebrow: "Experience the island",
  mobileHeroHeadline: "Like Never Before.",
  mobileHeroSubhead: "Have the Roatan Island Life, all for yourself.",
  mobilePrimaryCtaLabel: "Plan your Roatan day",
  mobileSecondaryCtaLabel: "Explore experiences",
  mobileHeroCountLabel: "curated option",
  mobileHeroMapLabel: "Map-first planning",
  mobileHeroSupportLabel: "Concierge support",
  mobileListingsTitle: "Featured Roatan picks.",
  mobileListingsIntro:
    "Start with the basics, then open only the best matches.",
  mobileListingsSearchPlaceholder: "Search by tour, stay, or location",
  mobileListingsMapButtonLabel: "Open matched map",
  mobileListingsFilterButtonLabel: "More filters",
  mobileListingsResultLabel: "curated matches ready.",
  mobileFinalCtaTitle: "Ready to plan your Roatan day?",
  mobileFinalCtaBody:
    "Open the map, save a plan, or ask the concierge for help.",
  mobileFinalCtaPrimaryLabel: "Browse the map",
  mobileListingHeroEyebrow: "Roatan experience",
  mobileListingTrustLine: "Verified local operator",
  mobileListingOverviewTitle: "What to expect",
  mobileListingStickyCtaLabel: "Request booking",
  mobileListingMapLabel: "Map",
  mobileBookingHeroEyebrow: "Private request",
  mobileBookingHeroTitle: "Send a clear request.",
  mobileBookingHeroBody:
    "Date, pickup, payment, and messages in one simple flow.",
  mobileBookingSubmitLabel: "Send request",
  mobileBookingStickyReadyLabel: "Ready to send",
  mobileBookingStepLabel: "Request steps",
  mobileBookingSuccessEyebrow: "Request sent",
  mobileBookingSuccessTitle: "Your Roatan request is moving.",
  mobileBookingSuccessBody:
    "The operator confirms availability and next steps before plans are final.",
  mobileBookingSuccessPrimaryLabel: "View status",
  mobileAccountEyebrow: "Private guest lounge",
  mobileAccountHeadline: "Your trip, beautifully handled.",
  mobileAccountSignedOutHeadline: "Open your trip lounge.",
  mobileAccountIntro:
    "Review bookings, saved map plans, messages, payments, and support.",
  mobileAccountSignedOutIntro:
    "Sign in to see your bookings, messages, and saved plans.",
  mobileAccountPrimaryActionLabel: "Review trips",
  mobileChatBubbleLabel: "Messages",
  mobileChatBubbleNeedsResponseLabel: "need response",
  mobileNavListingsLabel: "Listings",
  mobileNavMapLabel: "Map",
  mobileNavConciergeLabel: "Concierge",
  mobileNavSignInLabel: "Sign in",
  mobileNavBusinessLabel: "List your business",
  showMobileNavListings: true,
  showMobileNavMap: true,
  showMobileNavConcierge: true,
  showMobileNavSignIn: true,
  showMobileNavBusiness: true,
  showMobileHeroPills: true,
  showMobileTrustBar: true,
  showMobileHomepageSearch: true,
  showMobileFinalCta: true,
  compactMobileAdminNav: true,
  compactMobileVendorDashboard: true,
  useMobileLogoOverrides: false,
  mobileLogoWidthPx: 228,
  mobileLogoHeightPx: 72,
  mobileLogoPaddingPx: 0,
  mobileLogoRadiusPx: 0,
  mobileLogoBorderWidthPx: 0,
  mobileLogoOpacity: 1,
  mobileLogoRotateDeg: 0,
  mobileLogoScale: 1,
  mobileLogoFit: "contain",
  mobileLogoPosition: "center",
  mobileLogoShadow: "none",
  mobileLogoBackgroundColor: "#ffffff",
  mobileLogoBorderColor: "#ffffff",
};

const textFields = Object.keys(defaultMobileSiteControls).filter((key) =>
  key.startsWith("mobile"),
) as (keyof MobileSiteControls)[];

const booleanFields = Object.keys(defaultMobileSiteControls).filter((key) =>
  key.startsWith("showMobile") ||
  key.startsWith("compactMobile") ||
  key.startsWith("useMobile"),
) as (keyof MobileSiteControls)[];

const numberFields = [
  "mobileLogoWidthPx",
  "mobileLogoHeightPx",
  "mobileLogoPaddingPx",
  "mobileLogoRadiusPx",
  "mobileLogoBorderWidthPx",
  "mobileLogoOpacity",
  "mobileLogoRotateDeg",
  "mobileLogoScale",
] as const satisfies readonly (keyof MobileSiteControls)[];

const numberRanges = {
  mobileLogoWidthPx: [24, 2400],
  mobileLogoHeightPx: [24, 1200],
  mobileLogoPaddingPx: [0, 240],
  mobileLogoRadiusPx: [0, 2000],
  mobileLogoBorderWidthPx: [0, 80],
  mobileLogoOpacity: [0.25, 1],
  mobileLogoRotateDeg: [-180, 180],
  mobileLogoScale: [0.1, 4],
} as const;

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function cleanNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function cleanHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const color = value.trim().toLowerCase();
  if (color === "transparent") return color;
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}

export function normalizeMobileSiteControls(
  value: unknown,
): MobileSiteControls {
  const input =
    value && typeof value === "object"
      ? (value as Partial<MobileSiteControls>)
      : {};
  const normalized = { ...defaultMobileSiteControls };

  for (const field of textFields) {
    normalized[field] = cleanText(
      input[field],
      defaultMobileSiteControls[field] as string,
    ) as never;
  }

  for (const field of booleanFields) {
    normalized[field] =
      typeof input[field] === "boolean"
        ? (input[field] as never)
        : (defaultMobileSiteControls[field] as never);
  }

  for (const field of numberFields) {
    const [min, max] = numberRanges[field];
    normalized[field] = cleanNumber(
      input[field],
      defaultMobileSiteControls[field] as number,
      min,
      max,
    ) as never;
  }

  normalized.mobileLogoFit =
    typeof input.mobileLogoFit === "string" &&
    mobileLogoFits.includes(input.mobileLogoFit as MobileLogoFit)
      ? (input.mobileLogoFit as MobileLogoFit)
      : defaultMobileSiteControls.mobileLogoFit;
  normalized.mobileLogoPosition =
    typeof input.mobileLogoPosition === "string" &&
    mobileLogoPositions.includes(input.mobileLogoPosition as MobileLogoPosition)
      ? (input.mobileLogoPosition as MobileLogoPosition)
      : defaultMobileSiteControls.mobileLogoPosition;
  normalized.mobileLogoShadow =
    typeof input.mobileLogoShadow === "string" &&
    mobileLogoShadows.includes(input.mobileLogoShadow as MobileLogoShadow)
      ? (input.mobileLogoShadow as MobileLogoShadow)
      : defaultMobileSiteControls.mobileLogoShadow;
  normalized.mobileLogoBackgroundColor = cleanHexColor(
    input.mobileLogoBackgroundColor,
    defaultMobileSiteControls.mobileLogoBackgroundColor,
  );
  normalized.mobileLogoBorderColor = cleanHexColor(
    input.mobileLogoBorderColor,
    defaultMobileSiteControls.mobileLogoBorderColor,
  );

  return normalized;
}
