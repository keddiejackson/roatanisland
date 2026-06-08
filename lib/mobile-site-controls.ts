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
  mobileListingsTitle: string;
  mobileListingsIntro: string;
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
  compactAdminMobileNav: boolean;
  compactVendorMobileNav: boolean;
};

export const defaultMobileSiteControls: MobileSiteControls = {
  mobileHeroEyebrow: "Experience the island",
  mobileHeroHeadline: "Like Never Before.",
  mobileHeroSubhead: "Have the Roatan Island Life, all for yourself.",
  mobilePrimaryCtaLabel: "Plan your Roatan day",
  mobileSecondaryCtaLabel: "Explore",
  mobileListingsTitle: "Featured Roatan picks.",
  mobileListingsIntro:
    "Search, choose a trip style, add your date and guests, then open the best matches.",
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
  mobileNavConciergeLabel: "Concierge",
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
  compactAdminMobileNav: true,
  compactVendorMobileNav: true,
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

export function normalizeMobileSiteControls(value: unknown): MobileSiteControls {
  const settings = asRecord(value);

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
    mobileListingsTitle: cleanText(
      settings.mobileListingsTitle,
      defaultMobileSiteControls.mobileListingsTitle,
    ),
    mobileListingsIntro: cleanText(
      settings.mobileListingsIntro,
      defaultMobileSiteControls.mobileListingsIntro,
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
      defaultMobileSiteControls.mobileSuccessEyebrow,
    ),
    mobileSuccessTitle: cleanText(
      settings.mobileSuccessTitle,
      defaultMobileSiteControls.mobileSuccessTitle,
    ),
    mobileSuccessBody: cleanText(
      settings.mobileSuccessBody,
      defaultMobileSiteControls.mobileSuccessBody,
    ),
    mobileSuccessPrimaryLabel: cleanText(
      settings.mobileSuccessPrimaryLabel,
      defaultMobileSiteControls.mobileSuccessPrimaryLabel,
    ),
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
    mobileNavConciergeLabel: cleanText(
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
    compactAdminMobileNav: cleanBoolean(
      settings.compactAdminMobileNav,
      defaultMobileSiteControls.compactAdminMobileNav,
    ),
    compactVendorMobileNav: cleanBoolean(
      settings.compactVendorMobileNav,
      defaultMobileSiteControls.compactVendorMobileNav,
    ),
  };
}
