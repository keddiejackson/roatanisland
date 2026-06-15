import {
  logoFits,
  logoPositions,
  logoShadows,
  type LogoFit,
  type LogoPosition,
  type LogoShadow,
} from "./site-branding";

export const mobileNavItemKeys = [
  "listings",
  "map",
  "concierge",
  "signin",
  "business",
] as const;

export type MobileNavItemKey = (typeof mobileNavItemKeys)[number];

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
  mobileListingOverviewTitle: string;
  mobileListingStickyCtaLabel: string;
  mobileListingMapLabel: string;
  mobileListingTrustLine: string;
  mobileBookingHeroEyebrow: string;
  mobileBookingHeroTitle: string;
  mobileBookingHeroBody: string;
  mobileBookingStepLabel: string;
  mobileBookingSubmitLabel: string;
  mobileBookingStickyReadyLabel: string;
  mobileSuccessEyebrow: string;
  mobileSuccessTitle: string;
  mobileSuccessBody: string;
  mobileSuccessPrimaryLabel: string;
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
  showMobileHeroPills: boolean;
  showMobileTrustBar: boolean;
  showMobileHomepageSearch: boolean;
  showMobileFinalCta: boolean;
  showMobileNavListings: boolean;
  showMobileNavMap: boolean;
  showMobileNavConcierge: boolean;
  showMobileNavSignIn: boolean;
  showMobileNavBusiness: boolean;
  compactMobileAdminNav: boolean;
  compactMobileVendorDashboard: boolean;
  compactAdminMobileNav: boolean;
  compactVendorMobileNav: boolean;
  useMobileLogoOverrides: boolean;
  mobileLogoWidthPx: number;
  mobileLogoHeightPx: number;
  mobileLogoPaddingPx: number;
  mobileLogoRadiusPx: number;
  mobileLogoBorderWidthPx: number;
  mobileLogoOpacity: number;
  mobileLogoRotateDeg: number;
  mobileLogoScale: number;
  mobileLogoFit: LogoFit;
  mobileLogoPosition: LogoPosition;
  mobileLogoShadow: LogoShadow;
  mobileLogoBackgroundColor: string;
  mobileLogoBorderColor: string;
};

export const defaultMobileSiteControls: MobileSiteControls = {
  mobileHeroEyebrow: "Experience the island",
  mobileHeroHeadline: "Like Never Before.",
  mobileHeroSubhead: "Have the Roatan Island Life, all for yourself.",
  mobilePrimaryCtaLabel: "Plan your Roatan day",
  mobileSecondaryCtaLabel: "Explore",
  mobileHeroCountLabel: "curated option",
  mobileHeroMapLabel: "Map-first planning",
  mobileHeroSupportLabel: "Ask Roa support",
  mobileListingsTitle: "Featured Roatan picks.",
  mobileListingsIntro:
    "Search, choose a trip style, add your date and guests, then open the best matches.",
  mobileListingsSearchPlaceholder:
    "Search by tour, stay, transport, or location",
  mobileListingsMapButtonLabel: "Open matched map",
  mobileListingsFilterButtonLabel: "More filters",
  mobileListingsResultLabel: "curated matches ready.",
  mobileFinalCtaTitle: "Ready for your Roatan day?",
  mobileFinalCtaBody:
    "Start with the map, request help, or open your trips when you are ready.",
  mobileFinalCtaPrimaryLabel: "Browse the map",
  mobileListingHeroEyebrow: "Roatan experience",
  mobileListingOverviewTitle: "The day, clearly planned.",
  mobileListingStickyCtaLabel: "Request booking",
  mobileListingMapLabel: "View map",
  mobileListingTrustLine: "Request reviewed before confirmation.",
  mobileBookingHeroEyebrow: "Private request",
  mobileBookingHeroTitle: "Send one clean booking request.",
  mobileBookingHeroBody:
    "Add date, guests, pickup, and notes. The operator confirms before plans are final.",
  mobileBookingStepLabel: "Booking steps",
  mobileBookingSubmitLabel: "Send request",
  mobileBookingStickyReadyLabel: "Ready to send",
  mobileSuccessEyebrow: "Request sent",
  mobileSuccessTitle: "Your Roatan request is moving.",
  mobileSuccessBody:
    "Check your trip dashboard for messages, payment notes, and pickup details.",
  mobileSuccessPrimaryLabel: "View booking",
  mobileBookingSuccessEyebrow: "Request sent",
  mobileBookingSuccessTitle: "Your Roatan request is moving.",
  mobileBookingSuccessBody:
    "Check your trip dashboard for messages, payment notes, and pickup details.",
  mobileBookingSuccessPrimaryLabel: "View booking",
  mobileAccountEyebrow: "Private guest lounge",
  mobileAccountHeadline: "Your Roatan trip.",
  mobileAccountSignedOutHeadline: "Your Roatan trip, beautifully handled.",
  mobileAccountIntro:
    "Next trip, saved plans, messages, and payment notes in one quiet place.",
  mobileAccountSignedOutIntro:
    "Sign in once to keep bookings, messages, saved map plans, and trip details together.",
  mobileAccountPrimaryActionLabel: "Review trips",
  mobileChatBubbleLabel: "Messages",
  mobileChatBubbleNeedsResponseLabel: "need response",
  mobileNavListingsLabel: "Experiences",
  mobileNavMapLabel: "Map",
  mobileNavConciergeLabel: "Ask Roa",
  mobileNavSignInLabel: "Sign in",
  mobileNavBusinessLabel: "List business",
  showMobileHeroPills: true,
  showMobileTrustBar: true,
  showMobileHomepageSearch: true,
  showMobileFinalCta: true,
  showMobileNavListings: true,
  showMobileNavMap: true,
  showMobileNavConcierge: true,
  showMobileNavSignIn: true,
  showMobileNavBusiness: true,
  compactMobileAdminNav: true,
  compactMobileVendorDashboard: true,
  compactAdminMobileNav: true,
  compactVendorMobileNav: true,
  useMobileLogoOverrides: true,
  mobileLogoWidthPx: 176,
  mobileLogoHeightPx: 86,
  mobileLogoPaddingPx: 0,
  mobileLogoRadiusPx: 22,
  mobileLogoBorderWidthPx: 0,
  mobileLogoOpacity: 1,
  mobileLogoRotateDeg: 0,
  mobileLogoScale: 1,
  mobileLogoFit: "contain",
  mobileLogoPosition: "center",
  mobileLogoShadow: "none",
  mobileLogoBackgroundColor: "transparent",
  mobileLogoBorderColor: "transparent",
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

function cleanRoaLabel(value: unknown, fallback: string) {
  const cleaned = cleanText(value, fallback);
  const normalized = cleaned.toLowerCase();

  if (normalized === "concierge") return "Ask Roa";
  if (normalized === "concierge support") return "Ask Roa support";

  return cleaned;
}

function cleanBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function cleanNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) return fallback;

  return Math.min(max, Math.max(min, numericValue));
}

function cleanWholeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  return Math.round(cleanNumber(value, fallback, min, max));
}

function cleanLogoFit(value: unknown, fallback: LogoFit): LogoFit {
  return typeof value === "string" && logoFits.includes(value as LogoFit)
    ? (value as LogoFit)
    : fallback;
}

function cleanLogoPosition(
  value: unknown,
  fallback: LogoPosition,
): LogoPosition {
  return typeof value === "string" &&
    logoPositions.includes(value as LogoPosition)
    ? (value as LogoPosition)
    : fallback;
}

function cleanLogoShadow(value: unknown, fallback: LogoShadow): LogoShadow {
  return typeof value === "string" && logoShadows.includes(value as LogoShadow)
    ? (value as LogoShadow)
    : fallback;
}

export function normalizeMobileSiteControls(value: unknown): MobileSiteControls {
  const settings = asRecord(value);
  const compactMobileAdminNav = cleanBoolean(
    settings.compactMobileAdminNav,
    cleanBoolean(
      settings.compactAdminMobileNav,
      defaultMobileSiteControls.compactMobileAdminNav,
    ),
  );
  const compactMobileVendorDashboard = cleanBoolean(
    settings.compactMobileVendorDashboard,
    cleanBoolean(
      settings.compactVendorMobileNav,
      defaultMobileSiteControls.compactMobileVendorDashboard,
    ),
  );
  const mobileBookingSuccessEyebrow = cleanText(
    settings.mobileBookingSuccessEyebrow,
    cleanText(
      settings.mobileSuccessEyebrow,
      defaultMobileSiteControls.mobileBookingSuccessEyebrow,
    ),
  );
  const mobileBookingSuccessTitle = cleanText(
    settings.mobileBookingSuccessTitle,
    cleanText(
      settings.mobileSuccessTitle,
      defaultMobileSiteControls.mobileBookingSuccessTitle,
    ),
  );
  const mobileBookingSuccessBody = cleanText(
    settings.mobileBookingSuccessBody,
    cleanText(
      settings.mobileSuccessBody,
      defaultMobileSiteControls.mobileBookingSuccessBody,
    ),
  );
  const mobileBookingSuccessPrimaryLabel = cleanText(
    settings.mobileBookingSuccessPrimaryLabel,
    cleanText(
      settings.mobileSuccessPrimaryLabel,
      defaultMobileSiteControls.mobileBookingSuccessPrimaryLabel,
    ),
  );

  return {
    mobileHeroEyebrow: cleanText(
      settings.mobileHeroEyebrow,
      defaultMobileSiteControls.mobileHeroEyebrow,
    ),
    mobileHeroHeadline: cleanText(
      settings.mobileHeroHeadline,
      defaultMobileSiteControls.mobileHeroHeadline,
    ),
    mobileHeroSubhead: cleanText(
      settings.mobileHeroSubhead,
      defaultMobileSiteControls.mobileHeroSubhead,
    ),
    mobilePrimaryCtaLabel: cleanText(
      settings.mobilePrimaryCtaLabel,
      defaultMobileSiteControls.mobilePrimaryCtaLabel,
    ),
    mobileSecondaryCtaLabel: cleanText(
      settings.mobileSecondaryCtaLabel,
      defaultMobileSiteControls.mobileSecondaryCtaLabel,
    ),
    mobileHeroCountLabel: cleanText(
      settings.mobileHeroCountLabel,
      defaultMobileSiteControls.mobileHeroCountLabel,
    ),
    mobileHeroMapLabel: cleanText(
      settings.mobileHeroMapLabel,
      defaultMobileSiteControls.mobileHeroMapLabel,
    ),
    mobileHeroSupportLabel: cleanRoaLabel(
      settings.mobileHeroSupportLabel,
      defaultMobileSiteControls.mobileHeroSupportLabel,
    ),
    mobileListingsTitle: cleanText(
      settings.mobileListingsTitle,
      defaultMobileSiteControls.mobileListingsTitle,
    ),
    mobileListingsIntro: cleanText(
      settings.mobileListingsIntro,
      defaultMobileSiteControls.mobileListingsIntro,
    ),
    mobileListingsSearchPlaceholder: cleanText(
      settings.mobileListingsSearchPlaceholder,
      defaultMobileSiteControls.mobileListingsSearchPlaceholder,
    ),
    mobileListingsMapButtonLabel: cleanText(
      settings.mobileListingsMapButtonLabel,
      defaultMobileSiteControls.mobileListingsMapButtonLabel,
    ),
    mobileListingsFilterButtonLabel: cleanText(
      settings.mobileListingsFilterButtonLabel,
      defaultMobileSiteControls.mobileListingsFilterButtonLabel,
    ),
    mobileListingsResultLabel: cleanText(
      settings.mobileListingsResultLabel,
      defaultMobileSiteControls.mobileListingsResultLabel,
    ),
    mobileFinalCtaTitle: cleanText(
      settings.mobileFinalCtaTitle,
      defaultMobileSiteControls.mobileFinalCtaTitle,
    ),
    mobileFinalCtaBody: cleanText(
      settings.mobileFinalCtaBody,
      defaultMobileSiteControls.mobileFinalCtaBody,
    ),
    mobileFinalCtaPrimaryLabel: cleanText(
      settings.mobileFinalCtaPrimaryLabel,
      defaultMobileSiteControls.mobileFinalCtaPrimaryLabel,
    ),
    mobileListingHeroEyebrow: cleanText(
      settings.mobileListingHeroEyebrow,
      defaultMobileSiteControls.mobileListingHeroEyebrow,
    ),
    mobileListingOverviewTitle: cleanText(
      settings.mobileListingOverviewTitle,
      defaultMobileSiteControls.mobileListingOverviewTitle,
    ),
    mobileListingStickyCtaLabel: cleanText(
      settings.mobileListingStickyCtaLabel,
      defaultMobileSiteControls.mobileListingStickyCtaLabel,
    ),
    mobileListingMapLabel: cleanText(
      settings.mobileListingMapLabel,
      defaultMobileSiteControls.mobileListingMapLabel,
    ),
    mobileListingTrustLine: cleanText(
      settings.mobileListingTrustLine,
      defaultMobileSiteControls.mobileListingTrustLine,
    ),
    mobileBookingHeroEyebrow: cleanText(
      settings.mobileBookingHeroEyebrow,
      defaultMobileSiteControls.mobileBookingHeroEyebrow,
    ),
    mobileBookingHeroTitle: cleanText(
      settings.mobileBookingHeroTitle,
      defaultMobileSiteControls.mobileBookingHeroTitle,
    ),
    mobileBookingHeroBody: cleanText(
      settings.mobileBookingHeroBody,
      defaultMobileSiteControls.mobileBookingHeroBody,
    ),
    mobileBookingStepLabel: cleanText(
      settings.mobileBookingStepLabel,
      defaultMobileSiteControls.mobileBookingStepLabel,
    ),
    mobileBookingSubmitLabel: cleanText(
      settings.mobileBookingSubmitLabel,
      defaultMobileSiteControls.mobileBookingSubmitLabel,
    ),
    mobileBookingStickyReadyLabel: cleanText(
      settings.mobileBookingStickyReadyLabel,
      defaultMobileSiteControls.mobileBookingStickyReadyLabel,
    ),
    mobileSuccessEyebrow: cleanText(
      settings.mobileSuccessEyebrow,
      mobileBookingSuccessEyebrow,
    ),
    mobileSuccessTitle: cleanText(
      settings.mobileSuccessTitle,
      mobileBookingSuccessTitle,
    ),
    mobileSuccessBody: cleanText(
      settings.mobileSuccessBody,
      mobileBookingSuccessBody,
    ),
    mobileSuccessPrimaryLabel: cleanText(
      settings.mobileSuccessPrimaryLabel,
      mobileBookingSuccessPrimaryLabel,
    ),
    mobileBookingSuccessEyebrow,
    mobileBookingSuccessTitle,
    mobileBookingSuccessBody,
    mobileBookingSuccessPrimaryLabel,
    mobileAccountEyebrow: cleanText(
      settings.mobileAccountEyebrow,
      defaultMobileSiteControls.mobileAccountEyebrow,
    ),
    mobileAccountHeadline: cleanText(
      settings.mobileAccountHeadline,
      defaultMobileSiteControls.mobileAccountHeadline,
    ),
    mobileAccountSignedOutHeadline: cleanText(
      settings.mobileAccountSignedOutHeadline,
      defaultMobileSiteControls.mobileAccountSignedOutHeadline,
    ),
    mobileAccountIntro: cleanText(
      settings.mobileAccountIntro,
      defaultMobileSiteControls.mobileAccountIntro,
    ),
    mobileAccountSignedOutIntro: cleanText(
      settings.mobileAccountSignedOutIntro,
      defaultMobileSiteControls.mobileAccountSignedOutIntro,
    ),
    mobileAccountPrimaryActionLabel: cleanText(
      settings.mobileAccountPrimaryActionLabel,
      defaultMobileSiteControls.mobileAccountPrimaryActionLabel,
    ),
    mobileChatBubbleLabel: cleanText(
      settings.mobileChatBubbleLabel,
      defaultMobileSiteControls.mobileChatBubbleLabel,
    ),
    mobileChatBubbleNeedsResponseLabel: cleanText(
      settings.mobileChatBubbleNeedsResponseLabel,
      defaultMobileSiteControls.mobileChatBubbleNeedsResponseLabel,
    ),
    mobileNavListingsLabel: cleanText(
      settings.mobileNavListingsLabel,
      defaultMobileSiteControls.mobileNavListingsLabel,
    ),
    mobileNavMapLabel: cleanText(
      settings.mobileNavMapLabel,
      defaultMobileSiteControls.mobileNavMapLabel,
    ),
    mobileNavConciergeLabel: cleanRoaLabel(
      settings.mobileNavConciergeLabel,
      defaultMobileSiteControls.mobileNavConciergeLabel,
    ),
    mobileNavSignInLabel: cleanText(
      settings.mobileNavSignInLabel,
      defaultMobileSiteControls.mobileNavSignInLabel,
    ),
    mobileNavBusinessLabel: cleanText(
      settings.mobileNavBusinessLabel,
      defaultMobileSiteControls.mobileNavBusinessLabel,
    ),
    showMobileHeroPills: cleanBoolean(
      settings.showMobileHeroPills,
      defaultMobileSiteControls.showMobileHeroPills,
    ),
    showMobileTrustBar: cleanBoolean(
      settings.showMobileTrustBar,
      defaultMobileSiteControls.showMobileTrustBar,
    ),
    showMobileHomepageSearch: cleanBoolean(
      settings.showMobileHomepageSearch,
      defaultMobileSiteControls.showMobileHomepageSearch,
    ),
    showMobileFinalCta: cleanBoolean(
      settings.showMobileFinalCta,
      defaultMobileSiteControls.showMobileFinalCta,
    ),
    showMobileNavListings: cleanBoolean(
      settings.showMobileNavListings,
      defaultMobileSiteControls.showMobileNavListings,
    ),
    showMobileNavMap: cleanBoolean(
      settings.showMobileNavMap,
      defaultMobileSiteControls.showMobileNavMap,
    ),
    showMobileNavConcierge: cleanBoolean(
      settings.showMobileNavConcierge,
      defaultMobileSiteControls.showMobileNavConcierge,
    ),
    showMobileNavSignIn: cleanBoolean(
      settings.showMobileNavSignIn,
      defaultMobileSiteControls.showMobileNavSignIn,
    ),
    showMobileNavBusiness: cleanBoolean(
      settings.showMobileNavBusiness,
      defaultMobileSiteControls.showMobileNavBusiness,
    ),
    compactMobileAdminNav,
    compactMobileVendorDashboard,
    compactAdminMobileNav: compactMobileAdminNav,
    compactVendorMobileNav: compactMobileVendorDashboard,
    useMobileLogoOverrides: cleanBoolean(
      settings.useMobileLogoOverrides,
      defaultMobileSiteControls.useMobileLogoOverrides,
    ),
    mobileLogoWidthPx: cleanWholeNumber(
      settings.mobileLogoWidthPx,
      defaultMobileSiteControls.mobileLogoWidthPx,
      24,
      2400,
    ),
    mobileLogoHeightPx: cleanWholeNumber(
      settings.mobileLogoHeightPx,
      defaultMobileSiteControls.mobileLogoHeightPx,
      24,
      1200,
    ),
    mobileLogoPaddingPx: cleanWholeNumber(
      settings.mobileLogoPaddingPx,
      defaultMobileSiteControls.mobileLogoPaddingPx,
      0,
      240,
    ),
    mobileLogoRadiusPx: cleanWholeNumber(
      settings.mobileLogoRadiusPx,
      defaultMobileSiteControls.mobileLogoRadiusPx,
      0,
      2000,
    ),
    mobileLogoBorderWidthPx: cleanWholeNumber(
      settings.mobileLogoBorderWidthPx,
      defaultMobileSiteControls.mobileLogoBorderWidthPx,
      0,
      80,
    ),
    mobileLogoOpacity: cleanNumber(
      settings.mobileLogoOpacity,
      defaultMobileSiteControls.mobileLogoOpacity,
      0.25,
      1,
    ),
    mobileLogoRotateDeg: cleanNumber(
      settings.mobileLogoRotateDeg,
      defaultMobileSiteControls.mobileLogoRotateDeg,
      -180,
      180,
    ),
    mobileLogoScale: cleanNumber(
      settings.mobileLogoScale,
      defaultMobileSiteControls.mobileLogoScale,
      0.1,
      4,
    ),
    mobileLogoFit: cleanLogoFit(
      settings.mobileLogoFit,
      defaultMobileSiteControls.mobileLogoFit,
    ),
    mobileLogoPosition: cleanLogoPosition(
      settings.mobileLogoPosition,
      defaultMobileSiteControls.mobileLogoPosition,
    ),
    mobileLogoShadow: cleanLogoShadow(
      settings.mobileLogoShadow,
      defaultMobileSiteControls.mobileLogoShadow,
    ),
    mobileLogoBackgroundColor: cleanText(
      settings.mobileLogoBackgroundColor,
      defaultMobileSiteControls.mobileLogoBackgroundColor,
    ),
    mobileLogoBorderColor: cleanText(
      settings.mobileLogoBorderColor,
      defaultMobileSiteControls.mobileLogoBorderColor,
    ),
  };
}
