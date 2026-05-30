"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import type { BrandingMediaItem } from "@/lib/branding-logo-upload";
import {
  defaultHomepageControls,
  draftSiteSettingsKey,
  getHomepageQualityChecklist,
  homepageSectionOptions,
  normalizeHomepageControls,
  publishedSiteSettingsKey,
  type HomepageSectionKey,
  type HomepageTrustPoint,
} from "@/lib/homepage-settings";
import {
  defaultMobileSiteControls,
  normalizeMobileSiteControls,
  type MobileSiteControls,
} from "@/lib/mobile-site-controls";
import {
  brandingForPlacement,
  defaultSiteBranding,
  logoFits,
  logoFrameStyle,
  logoImageStyle,
  logoPositions,
  logoShadows,
  logoShapes,
  logoSizes,
  normalizeSiteBranding,
  type LogoFit,
  type LogoPlacement,
  type LogoPosition,
  type LogoShape,
  type LogoShadow,
  type LogoSize,
} from "@/lib/site-branding";
import { supabase } from "@/lib/supabase";

const defaultSettings = {
  siteName: "RoatanIsland.life",
  adminEmails: "",
  depositAmountCents: "5000",
  commissionRate: "0.10",
  ...defaultSiteBranding,
  ...defaultHomepageControls,
  ...defaultMobileSiteControls,
};

const logoSizePresets: Record<
  LogoSize,
  { label: string; width: number; height: number }
> = {
  small: { label: "Small", width: 160, height: 52 },
  medium: { label: "Medium", width: 240, height: 72 },
  large: { label: "Large", width: 340, height: 96 },
};

const logoShapePresets: Record<
  LogoShape,
  { label: string; fit: LogoFit; radius: number }
> = {
  original: { label: "Original", fit: "contain", radius: 0 },
  rounded: { label: "Rounded", fit: "contain", radius: 18 },
  circle: { label: "Circle", fit: "cover", radius: 999 },
  square: { label: "Square", fit: "contain", radius: 14 },
};

const logoNumberControls = [
  { field: "logoWidthPx", label: "Width", min: 24, max: 2400, step: 1 },
  { field: "logoHeightPx", label: "Height", min: 24, max: 1200, step: 1 },
  { field: "logoPaddingPx", label: "Padding", min: 0, max: 240, step: 1 },
  { field: "logoRadiusPx", label: "Corner Radius", min: 0, max: 2000, step: 1 },
  { field: "logoBorderWidthPx", label: "Border", min: 0, max: 80, step: 1 },
  { field: "logoOpacity", label: "Opacity", min: 0.25, max: 1, step: 0.05 },
  { field: "logoRotateDeg", label: "Rotation", min: -180, max: 180, step: 1 },
  { field: "logoScale", label: "Scale", min: 0.1, max: 4, step: 0.05 },
] as const;

type NumericLogoField = (typeof logoNumberControls)[number]["field"];

type LogoToggleField =
  | "showCustomLogoOnSite"
  | "showCustomLogoInChat"
  | "showCustomLogoInEmail"
  | "showCustomLogoAsFavicon";

const logoLocationFields = [
  {
    placement: "site",
    toggleField: "showCustomLogoOnSite",
    urlField: "siteLogoUrl",
    label: "Website pages",
    helper: "Header, footer, homepage, map, listings, and public pages.",
  },
  {
    placement: "chat",
    toggleField: "showCustomLogoInChat",
    urlField: "chatLogoUrl",
    label: "Booking chat",
    helper: "The admin profile image travelers see in chat.",
  },
  {
    placement: "email",
    toggleField: "showCustomLogoInEmail",
    urlField: "emailLogoUrl",
    label: "Emails",
    helper: "Confirmation, booking, concierge, and message emails.",
  },
  {
    placement: "favicon",
    toggleField: "showCustomLogoAsFavicon",
    urlField: "faviconLogoUrl",
    label: "Browser tab",
    helper: "The small icon shown in browser tabs and bookmarks.",
  },
] as const satisfies readonly {
  placement: LogoPlacement;
  toggleField: LogoToggleField;
  urlField: "siteLogoUrl" | "chatLogoUrl" | "emailLogoUrl" | "faviconLogoUrl";
  label: string;
  helper: string;
}[];

type LogoUploadTarget =
  | "logoUrl"
  | (typeof logoLocationFields)[number]["urlField"];

type SettingsListing = {
  id: string;
  title: string;
  category: string | null;
  is_active: boolean | null;
  image_url: string | null;
};

const logoUploadTargets: { field: LogoUploadTarget; label: string }[] = [
  { field: "logoUrl", label: "Main fallback logo" },
  ...logoLocationFields.map(({ urlField, label }) => ({
    field: urlField,
    label,
  })),
];

const businessSettingFields = [
  { field: "siteName", label: "Site Name", rows: 1 },
  { field: "adminEmails", label: "Admin Emails", rows: 2 },
  { field: "depositAmountCents", label: "Deposit Amount Cents", rows: 1 },
  { field: "commissionRate", label: "Commission Rate", rows: 1 },
] as const;

const homepageToggleFields = [
  { field: "showTrustSection", label: "Trust proof strip" },
  { field: "showFeaturedListings", label: "Featured marketplace" },
  { field: "showFinalCta", label: "Final planning panel" },
] as const;

const homepageImageFields = [
  { field: "heroImageUrl", label: "Hero Background Image" },
  { field: "listingFallbackImageUrl", label: "Listing Fallback Image" },
  { field: "finalCtaImageUrl", label: "Final CTA Background Image" },
] as const;

type HomepageImageUploadTarget = (typeof homepageImageFields)[number]["field"];

const homepageLinkFields = [
  { field: "primaryCtaHref", label: "Primary Button Link" },
  { field: "secondaryCtaHref", label: "Secondary Button Link" },
  { field: "finalCtaPrimaryHref", label: "Final Main Button Link" },
  { field: "finalCtaSecondaryHref", label: "Final Text Link 1 URL" },
  { field: "finalCtaTertiaryHref", label: "Final Text Link 2 URL" },
] as const;

const homepageTextFields = [
  { field: "heroEyebrow", label: "Hero Eyebrow", rows: 1 },
  { field: "homepageHeadline", label: "Hero Headline", rows: 2 },
  { field: "homepageSubhead", label: "Hero Subhead", rows: 3 },
  { field: "primaryCtaLabel", label: "Primary Button Label", rows: 1 },
  { field: "secondaryCtaLabel", label: "Secondary Button Label", rows: 1 },
  { field: "heroCountLabel", label: "Hero Count Label", rows: 1 },
  { field: "heroMapLabel", label: "Hero Map Pill", rows: 1 },
  { field: "heroSupportLabel", label: "Hero Support Pill", rows: 1 },
  { field: "listingsEyebrow", label: "Listings Eyebrow", rows: 1 },
  { field: "listingsTitle", label: "Listings Title", rows: 2 },
  { field: "listingsIntro", label: "Listings Intro", rows: 3 },
  { field: "mapEyebrow", label: "Map Eyebrow", rows: 1 },
  { field: "mapTitle", label: "Map Title", rows: 2 },
  { field: "mapBody", label: "Map Body", rows: 3 },
  { field: "mapCtaLabel", label: "Map Button Label", rows: 1 },
  { field: "planningEyebrow", label: "Planning Eyebrow", rows: 1 },
  { field: "planningTitle", label: "Planning Title", rows: 2 },
  { field: "planningBody", label: "Planning Body", rows: 3 },
  { field: "trustEyebrow", label: "Trust Eyebrow", rows: 1 },
  { field: "trustTitle", label: "Trust Title", rows: 2 },
  { field: "trustBody", label: "Trust Body", rows: 3 },
  { field: "finalCtaEyebrow", label: "Final CTA Eyebrow", rows: 1 },
  { field: "finalCtaTitle", label: "Final CTA Title", rows: 2 },
  { field: "finalCtaBody", label: "Final CTA Body", rows: 3 },
  { field: "finalCtaPrimaryLabel", label: "Final Main Button", rows: 1 },
  { field: "finalCtaSecondaryLabel", label: "Final Text Link 1", rows: 1 },
  { field: "finalCtaTertiaryLabel", label: "Final Text Link 2", rows: 1 },
  { field: "featuredBadgeLabel", label: "Featured Badge Label", rows: 1 },
  { field: "topRatedBadgeLabel", label: "Top Rated Badge Label", rows: 1 },
] as const;

const mobileTextFields: {
  field: keyof Pick<
    MobileSiteControls,
    | "mobileHeroEyebrow"
    | "mobileHeroHeadline"
    | "mobileHeroSubhead"
    | "mobilePrimaryCtaLabel"
    | "mobileSecondaryCtaLabel"
    | "mobileHeroCountLabel"
    | "mobileHeroMapLabel"
    | "mobileHeroSupportLabel"
    | "mobileListingsTitle"
    | "mobileListingsIntro"
    | "mobileListingsSearchPlaceholder"
    | "mobileListingsMapButtonLabel"
    | "mobileListingsFilterButtonLabel"
    | "mobileListingsResultLabel"
    | "mobileFinalCtaTitle"
    | "mobileFinalCtaBody"
    | "mobileFinalCtaPrimaryLabel"
    | "mobileListingHeroEyebrow"
    | "mobileListingTrustLine"
    | "mobileListingOverviewTitle"
    | "mobileListingStickyCtaLabel"
    | "mobileListingMapLabel"
    | "mobileBookingHeroEyebrow"
    | "mobileBookingHeroTitle"
    | "mobileBookingHeroBody"
    | "mobileBookingSubmitLabel"
    | "mobileBookingStickyReadyLabel"
    | "mobileBookingStepLabel"
    | "mobileBookingSuccessEyebrow"
    | "mobileBookingSuccessTitle"
    | "mobileBookingSuccessBody"
    | "mobileBookingSuccessPrimaryLabel"
    | "mobileAccountEyebrow"
    | "mobileAccountHeadline"
    | "mobileAccountSignedOutHeadline"
    | "mobileAccountIntro"
    | "mobileAccountSignedOutIntro"
    | "mobileAccountPrimaryActionLabel"
    | "mobileChatBubbleLabel"
    | "mobileChatBubbleNeedsResponseLabel"
    | "mobileNavListingsLabel"
    | "mobileNavMapLabel"
    | "mobileNavConciergeLabel"
    | "mobileNavSignInLabel"
    | "mobileNavBusinessLabel"
  >;
  label: string;
  group: string;
  rows: number;
}[] = [
  { field: "mobileHeroEyebrow", label: "Hero eyebrow", group: "Home", rows: 1 },
  { field: "mobileHeroHeadline", label: "Hero headline", group: "Home", rows: 2 },
  { field: "mobileHeroSubhead", label: "Hero subhead", group: "Home", rows: 2 },
  { field: "mobilePrimaryCtaLabel", label: "Primary button", group: "Home", rows: 1 },
  { field: "mobileSecondaryCtaLabel", label: "Secondary button", group: "Home", rows: 1 },
  { field: "mobileHeroCountLabel", label: "Hero count pill", group: "Home", rows: 1 },
  { field: "mobileHeroMapLabel", label: "Hero map pill", group: "Home", rows: 1 },
  { field: "mobileHeroSupportLabel", label: "Hero support pill", group: "Home", rows: 1 },
  { field: "mobileListingsTitle", label: "Listings title", group: "Search", rows: 2 },
  { field: "mobileListingsIntro", label: "Listings intro", group: "Search", rows: 2 },
  { field: "mobileListingsSearchPlaceholder", label: "Search placeholder", group: "Search", rows: 1 },
  { field: "mobileListingsMapButtonLabel", label: "Map button", group: "Search", rows: 1 },
  { field: "mobileListingsFilterButtonLabel", label: "Filters button", group: "Search", rows: 1 },
  { field: "mobileListingsResultLabel", label: "Result summary", group: "Search", rows: 1 },
  { field: "mobileFinalCtaTitle", label: "Final CTA title", group: "Home", rows: 2 },
  { field: "mobileFinalCtaBody", label: "Final CTA body", group: "Home", rows: 2 },
  { field: "mobileFinalCtaPrimaryLabel", label: "Final CTA button", group: "Home", rows: 1 },
  { field: "mobileListingHeroEyebrow", label: "Listing hero eyebrow", group: "Listing", rows: 1 },
  { field: "mobileListingTrustLine", label: "Listing trust line", group: "Listing", rows: 1 },
  { field: "mobileListingOverviewTitle", label: "Listing overview title", group: "Listing", rows: 1 },
  { field: "mobileListingStickyCtaLabel", label: "Sticky request button", group: "Listing", rows: 1 },
  { field: "mobileListingMapLabel", label: "Sticky map button", group: "Listing", rows: 1 },
  { field: "mobileBookingHeroEyebrow", label: "Booking eyebrow", group: "Booking", rows: 1 },
  { field: "mobileBookingHeroTitle", label: "Booking title", group: "Booking", rows: 2 },
  { field: "mobileBookingHeroBody", label: "Booking body", group: "Booking", rows: 2 },
  { field: "mobileBookingSubmitLabel", label: "Submit button", group: "Booking", rows: 1 },
  { field: "mobileBookingStickyReadyLabel", label: "Sticky ready label", group: "Booking", rows: 1 },
  { field: "mobileBookingStepLabel", label: "Step panel label", group: "Booking", rows: 1 },
  { field: "mobileBookingSuccessEyebrow", label: "Success eyebrow", group: "Booking", rows: 1 },
  { field: "mobileBookingSuccessTitle", label: "Success title", group: "Booking", rows: 2 },
  { field: "mobileBookingSuccessBody", label: "Success body", group: "Booking", rows: 2 },
  { field: "mobileBookingSuccessPrimaryLabel", label: "Success main button", group: "Booking", rows: 1 },
  { field: "mobileAccountEyebrow", label: "Account eyebrow", group: "Account", rows: 1 },
  { field: "mobileAccountHeadline", label: "Signed-in headline", group: "Account", rows: 2 },
  { field: "mobileAccountSignedOutHeadline", label: "Signed-out headline", group: "Account", rows: 2 },
  { field: "mobileAccountIntro", label: "Signed-in intro", group: "Account", rows: 2 },
  { field: "mobileAccountSignedOutIntro", label: "Signed-out intro", group: "Account", rows: 2 },
  { field: "mobileAccountPrimaryActionLabel", label: "Primary action", group: "Account", rows: 1 },
  { field: "mobileChatBubbleLabel", label: "Chat bubble title", group: "Chat", rows: 1 },
  { field: "mobileChatBubbleNeedsResponseLabel", label: "Chat response text", group: "Chat", rows: 1 },
  { field: "mobileNavListingsLabel", label: "Nav listings", group: "Nav", rows: 1 },
  { field: "mobileNavMapLabel", label: "Nav map", group: "Nav", rows: 1 },
  { field: "mobileNavConciergeLabel", label: "Nav concierge", group: "Nav", rows: 1 },
  { field: "mobileNavSignInLabel", label: "Nav sign in", group: "Nav", rows: 1 },
  { field: "mobileNavBusinessLabel", label: "Nav business", group: "Nav", rows: 1 },
];

const mobileToggleFields: {
  field: keyof Pick<
    MobileSiteControls,
    | "showMobileNavListings"
    | "showMobileNavMap"
    | "showMobileNavConcierge"
    | "showMobileNavSignIn"
    | "showMobileNavBusiness"
    | "showMobileHeroPills"
    | "showMobileTrustBar"
    | "showMobileHomepageSearch"
    | "showMobileFinalCta"
  | "compactMobileAdminNav"
  | "compactMobileVendorDashboard"
    | "useMobileLogoOverrides"
  >;
  label: string;
  help: string;
}[] = [
  {
    field: "showMobileNavListings",
    label: "Show Listings in mobile nav",
    help: "Controls the top mobile menu on the homepage.",
  },
  {
    field: "showMobileNavMap",
    label: "Show Map in mobile nav",
    help: "Keep the mobile header focused on the paths guests use most.",
  },
  {
    field: "showMobileNavConcierge",
    label: "Show Concierge in mobile nav",
    help: "Useful when concierge is a main sales path.",
  },
  {
    field: "showMobileNavSignIn",
    label: "Show Sign in in mobile nav",
    help: "Signed-in guests still see their account menu.",
  },
  {
    field: "showMobileNavBusiness",
    label: "Show List your business",
    help: "Hide this if you want the phone view to be guest-only.",
  },
  {
    field: "showMobileHeroPills",
    label: "Show hero trust pills",
    help: "Turn off for the cleanest first screen.",
  },
  {
    field: "showMobileTrustBar",
    label: "Show trust bar",
    help: "Hides the white trust strip under the hero on phones.",
  },
  {
    field: "showMobileHomepageSearch",
    label: "Show homepage search form",
    help: "Hide it to make mobile guests start with map or concierge.",
  },
  {
    field: "showMobileFinalCta",
    label: "Show final CTA",
    help: "Controls the last large call-to-action panel on phones.",
  },
  {
    field: "useMobileLogoOverrides",
    label: "Use separate mobile logo controls",
    help: "Lets the phone header use its own logo size, crop, shape, and spacing.",
  },
  {
    field: "compactMobileAdminNav",
    label: "Compact admin nav on phones",
    help: "Makes admin tools easier to scan on small screens.",
  },
  {
    field: "compactMobileVendorDashboard",
    label: "Compact vendor dashboard on phones",
    help: "Keeps vendor screens tighter on mobile.",
  },
];

const mobileLogoNumberControls = [
  { field: "mobileLogoWidthPx", label: "Mobile logo width", min: 24, max: 2400, step: 1 },
  { field: "mobileLogoHeightPx", label: "Mobile logo height", min: 24, max: 1200, step: 1 },
  { field: "mobileLogoPaddingPx", label: "Mobile logo padding", min: 0, max: 240, step: 1 },
  { field: "mobileLogoRadiusPx", label: "Mobile logo radius", min: 0, max: 2000, step: 1 },
  { field: "mobileLogoBorderWidthPx", label: "Mobile logo border", min: 0, max: 80, step: 1 },
  { field: "mobileLogoOpacity", label: "Mobile logo opacity", min: 0.25, max: 1, step: 0.05 },
  { field: "mobileLogoRotateDeg", label: "Mobile logo rotation", min: -180, max: 180, step: 1 },
  { field: "mobileLogoScale", label: "Mobile logo scale", min: 0.1, max: 4, step: 0.05 },
] as const;

type MobileLogoNumberField = (typeof mobileLogoNumberControls)[number]["field"];

const mobileControlGroups = ["Home", "Search", "Listing", "Booking", "Account", "Chat", "Nav"];

export default function AdminSettingsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState("");
  const [logoUploadTarget, setLogoUploadTarget] =
    useState<LogoUploadTarget>("logoUrl");
  const [homepageImageUploading, setHomepageImageUploading] = useState(false);
  const [homepageImageUploadError, setHomepageImageUploadError] = useState("");
  const [homepageImageUploadTarget, setHomepageImageUploadTarget] =
    useState<HomepageImageUploadTarget>("heroImageUrl");
  const [listingOptions, setListingOptions] = useState<SettingsListing[]>([]);
  const [mediaItems, setMediaItems] = useState<BrandingMediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [settingsMode, setSettingsMode] = useState<"draft" | "published">(
    "published",
  );
  const [statusMessage, setStatusMessage] = useState("");

  const getAdminHeaders = useCallback(async (includeJson = false) => {
    const { data: sessionData } = await supabase.auth.getSession();
    return {
      ...(includeJson ? { "Content-Type": "application/json" } : {}),
      ...(sessionData.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : {}),
    };
  }, []);

  const loadMediaLibrary = useCallback(async () => {
    setMediaLoading(true);
    const response = await fetch("/api/admin/branding-logo", {
      headers: await getAdminHeaders(),
    });
    setMediaLoading(false);

    if (!response.ok) return;

    const result = (await response.json()) as { media?: BrandingMediaItem[] };
    setMediaItems(result.media || []);
  }, [getAdminHeaders]);

  useEffect(() => {
    async function verifyAdminSession() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user || !(await isAdminUser(data.user.email))) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }
      setAuthorized(true);
      setCheckingAuth(false);
    }
    verifyAdminSession();
  }, [router]);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from("site_settings")
        .select("key,value")
        .in("key", [publishedSiteSettingsKey, draftSiteSettingsKey]);
      const rows = (data || []) as {
        key: string;
        value: Partial<typeof defaultSettings> | null;
      }[];
      const draftSettings = rows.find((row) => row.key === draftSiteSettingsKey);
      const publishedSettings = rows.find(
        (row) => row.key === publishedSiteSettingsKey,
      );
      const selectedSettings =
        draftSettings?.value && typeof draftSettings.value === "object"
          ? draftSettings.value
          : publishedSettings?.value && typeof publishedSettings.value === "object"
            ? publishedSettings.value
            : null;

      setSettingsMode(draftSettings?.value ? "draft" : "published");

      if (selectedSettings) {
        const savedSettings = selectedSettings as Partial<typeof defaultSettings>;

        setSettings({
          ...defaultSettings,
          ...savedSettings,
          ...normalizeHomepageControls(savedSettings),
          ...normalizeSiteBranding(savedSettings),
          ...normalizeMobileSiteControls(savedSettings),
        });
      }

      const { data: listingData } = await supabase
        .from("listings")
        .select("id,title,category,is_active,image_url")
        .order("created_at", { ascending: false })
        .limit(80);

      setListingOptions(
        ((listingData as SettingsListing[]) || []).filter(
          (listing) => listing.is_active !== false,
        ),
      );

      await loadMediaLibrary();
    }

    if (authorized) fetchSettings();
  }, [authorized, loadMediaLibrary]);

  if (checkingAuth || !authorized) return null;

  function updateSetting<Key extends keyof typeof settings>(
    field: Key,
    value: (typeof settings)[Key],
  ) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  function updateNumericLogoSetting(field: NumericLogoField, value: string) {
    const numericValue = Number.parseFloat(value);
    updateSetting(field, Number.isFinite(numericValue) ? numericValue : 0);
  }

  function updateNumericMobileLogoSetting(
    field: MobileLogoNumberField,
    value: string,
  ) {
    const numericValue = Number.parseFloat(value);
    updateSetting(field, Number.isFinite(numericValue) ? numericValue : 0);
  }

  function applyLogoSize(size: LogoSize) {
    const preset = logoSizePresets[size];
    setSettings((current) => ({
      ...current,
      logoSize: size,
      logoWidthPx: preset.width,
      logoHeightPx: preset.height,
    }));
  }

  function applyLogoShape(shape: LogoShape) {
    const preset = logoShapePresets[shape];
    setSettings((current) => ({
      ...current,
      logoShape: shape,
      logoFit: preset.fit,
      logoRadiusPx: preset.radius,
    }));
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

  function isHomepageSectionEnabled(section: HomepageSectionKey) {
    if (section === "trustBar") return settings.showTrustSection;
    if (section === "marketplace") return settings.showFeaturedListings;
    if (section === "finalCta") return settings.showFinalCta;
    return false;
  }

  function toggleHomepageSection(section: HomepageSectionKey, enabled: boolean) {
    if (section === "trustBar") updateSetting("showTrustSection", enabled);
    if (section === "marketplace") updateSetting("showFeaturedListings", enabled);
    if (section === "finalCta") updateSetting("showFinalCta", enabled);
  }

  function moveHomepageSection(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= settings.sectionOrder.length) return;

    const nextOrder = [...settings.sectionOrder];
    const [section] = nextOrder.splice(index, 1);
    nextOrder.splice(nextIndex, 0, section);
    updateSetting("sectionOrder", nextOrder);
  }

  function toggleHomepageFeaturedListing(listingId: string, enabled: boolean) {
    setSettings((current) => {
      const currentIds = new Set(current.homepageFeaturedListingIds);

      if (enabled) {
        currentIds.add(listingId);
      } else {
        currentIds.delete(listingId);
      }

      return {
        ...current,
        homepageFeaturedListingIds: Array.from(currentIds).slice(0, 12),
      };
    });
  }

  async function persistSettings(action: "save_draft" | "publish") {
    setSaving(true);
    setStatusMessage("");
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: await getAdminHeaders(true),
      body: JSON.stringify({ action, settings }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      const message = result.error || "Unable to save settings.";
      setStatusMessage(message);
      alert(message);
      return false;
    }

    setSettingsMode(action === "save_draft" ? "draft" : "published");
    setStatusMessage(
      action === "save_draft"
        ? "Draft saved. Your live homepage has not changed yet."
        : "Published live. Visitors now see these homepage settings.",
    );
    return true;
  }

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await persistSettings("publish");
  }

  async function previewDraft() {
    const saved = await persistSettings("save_draft");
    if (saved) {
      window.open("/?homepagePreview=draft", "_blank", "noopener,noreferrer");
    }
  }

  function restoreHomepageDefaults() {
    setSettings((current) => ({
      ...current,
      ...defaultHomepageControls,
    }));
    setSettingsMode("draft");
    setStatusMessage("Homepage defaults restored in draft. Publish when ready.");
  }

  async function deleteMediaItem(item: BrandingMediaItem) {
    if (!confirm("Delete this image from the media library?")) return;

    const response = await fetch("/api/admin/branding-logo", {
      method: "DELETE",
      headers: await getAdminHeaders(true),
      body: JSON.stringify({ path: item.path }),
    });

    if (!response.ok) {
      const result = await response.json();
      alert(result.error || "Unable to delete image.");
      return;
    }

    setMediaItems((current) =>
      current.filter((mediaItem) => mediaItem.path !== item.path),
    );
  }

  async function uploadLogo(file: File) {
    const formData = new FormData();
    formData.append("logo", file);

    setLogoUploading(true);
    setLogoUploadError("");

    const response = await fetch("/api/admin/branding-logo", {
      method: "POST",
      headers: await getAdminHeaders(),
      body: formData,
    });
    const result = await response.json();
    setLogoUploading(false);

    if (!response.ok) {
      setLogoUploadError(result.error || "Unable to upload logo.");
      return;
    }

    updateSetting(logoUploadTarget, result.logoUrl);
    await loadMediaLibrary();
  }

  async function uploadHomepageImage(file: File) {
    const formData = new FormData();
    formData.append("logo", file);

    setHomepageImageUploading(true);
    setHomepageImageUploadError("");

    const response = await fetch("/api/admin/branding-logo", {
      method: "POST",
      headers: await getAdminHeaders(),
      body: formData,
    });
    const result = await response.json();
    setHomepageImageUploading(false);

    if (!response.ok) {
      setHomepageImageUploadError(result.error || "Unable to upload image.");
      return;
    }

    updateSetting(homepageImageUploadTarget, result.logoUrl);
    await loadMediaLibrary();
  }

  const displayedTrustPoints = [
    ...settings.trustPoints,
    ...defaultHomepageControls.trustPoints.slice(settings.trustPoints.length),
  ].slice(0, 3);
  const orderedHomepageSections = settings.sectionOrder
    .map((sectionKey) =>
      homepageSectionOptions.find((section) => section.key === sectionKey),
    )
    .filter(
      (section): section is (typeof homepageSectionOptions)[number] =>
        Boolean(section),
    );
  const homepageQualityChecklist = getHomepageQualityChecklist(
    normalizeHomepageControls(settings),
    {
      availableListingCount: listingOptions.length,
      selectedListingCount: settings.homepageFeaturedListingIds.length,
    },
  );
  const previewBranding = normalizeSiteBranding(settings);
  const mobileControlsPreview = normalizeMobileSiteControls(settings);
  const sitePreviewBranding = brandingForPlacement(previewBranding, "site");
  const mobileLogoPreviewBranding = mobileControlsPreview.useMobileLogoOverrides
    ? {
        ...sitePreviewBranding,
        logoWidthPx: mobileControlsPreview.mobileLogoWidthPx,
        logoHeightPx: mobileControlsPreview.mobileLogoHeightPx,
        logoPaddingPx: mobileControlsPreview.mobileLogoPaddingPx,
        logoRadiusPx: mobileControlsPreview.mobileLogoRadiusPx,
        logoBorderWidthPx: mobileControlsPreview.mobileLogoBorderWidthPx,
        logoOpacity: mobileControlsPreview.mobileLogoOpacity,
        logoRotateDeg: mobileControlsPreview.mobileLogoRotateDeg,
        logoScale: mobileControlsPreview.mobileLogoScale,
        logoFit: mobileControlsPreview.mobileLogoFit,
        logoPosition: mobileControlsPreview.mobileLogoPosition,
        logoShadow: mobileControlsPreview.mobileLogoShadow,
        logoBackgroundColor: mobileControlsPreview.mobileLogoBackgroundColor,
        logoBorderColor: mobileControlsPreview.mobileLogoBorderColor,
      }
    : sitePreviewBranding;
  const faviconPreviewBranding = brandingForPlacement(
    previewBranding,
    "favicon",
  );

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-5xl">
        <AdminNav />
        <section className="rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold text-[#0B3C5D]">Settings</h1>
          <p className="mt-2 text-gray-600">
            Manage public copy and business rules without changing code.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#D6B56D]/25 bg-[#FFF9EC] p-4">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#0B3C5D] shadow-sm">
              {settingsMode === "draft" ? "Draft loaded" : "Published loaded"}
            </span>
            <button
              type="button"
              onClick={() => persistSettings("save_draft")}
              disabled={saving}
              className="rounded-xl border border-[#0B3C5D]/15 bg-white px-4 py-2 text-sm font-black text-[#0B3C5D] disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={previewDraft}
              disabled={saving}
              className="rounded-xl border border-[#0fa9b6]/20 bg-[#EAF7F7] px-4 py-2 text-sm font-black text-[#007B7B] disabled:opacity-50"
            >
              Preview Draft
            </button>
            <button
              type="button"
              onClick={() => persistSettings("publish")}
              disabled={saving}
              className="rounded-xl bg-[#00A8A8] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
            >
              Publish Live
            </button>
            <button
              type="button"
              onClick={restoreHomepageDefaults}
              className="rounded-xl border border-red-100 bg-white px-4 py-2 text-sm font-black text-red-700"
            >
              Restore Homepage Defaults
            </button>
            {statusMessage ? (
              <p className="basis-full text-sm font-semibold text-[#0B3C5D]">
                {statusMessage}
              </p>
            ) : null}
          </div>
          <form onSubmit={saveSettings} className="mt-8 grid gap-5">
            <section className="grid gap-6 rounded-2xl border border-[#D6B56D]/25 bg-[#FFF9EC] p-5">
              <div>
                <h2 className="text-xl font-bold text-[#0B3C5D]">Branding</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Upload, crop, style, and tune the logo used across the site
                  and browser tab.
                </p>
              </div>

              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
                <div className="grid gap-5">
                  <div className="grid gap-4 rounded-2xl border border-[#D6B56D]/20 bg-white p-5">
                    <label className="grid gap-2 font-medium text-[#0B3C5D]">
                      Upload Destination
                      <select
                        value={logoUploadTarget}
                        onChange={(e) =>
                          setLogoUploadTarget(e.target.value as LogoUploadTarget)
                        }
                        disabled={logoUploading}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-3 disabled:opacity-60"
                      >
                        {logoUploadTargets.map(({ field, label }) => (
                          <option key={field} value={field}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 font-medium text-[#0B3C5D]">
                      Upload Logo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        disabled={logoUploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadLogo(file);
                        }}
                        className="rounded-xl border border-gray-300 bg-white px-4 py-3 disabled:opacity-60"
                      />
                    </label>

                    <label className="grid gap-2 font-medium text-[#0B3C5D]">
                      Main Logo URL
                      <input
                        value={settings.logoUrl}
                        onChange={(e) => updateSetting("logoUrl", e.target.value)}
                        placeholder="https://..."
                        className="rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none focus:border-[#00A8A8] focus:ring-2 focus:ring-[#00A8A8]/20"
                      />
                    </label>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => updateSetting("logoUrl", "")}
                        className="rounded-xl border border-[#0B3C5D]/15 bg-white px-4 py-2 text-sm font-bold text-[#0B3C5D]"
                      >
                        Clear main logo
                      </button>
                      {logoUploading && (
                        <p className="self-center text-sm text-[#0B3C5D]">
                          Uploading logo...
                        </p>
                      )}
                      {logoUploadError && (
                        <p className="self-center text-sm text-red-600">
                          {logoUploadError}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-3 rounded-2xl border border-[#D6B56D]/20 bg-[#FFF9EC] p-4">
                      <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                        Different Logos By Location
                      </p>
                      <p className="text-sm text-gray-600">
                        Leave a location blank to use the main logo there.
                      </p>
                      <div className="grid gap-4">
                        {logoLocationFields.map(
                          ({ toggleField, urlField, label, helper }) => (
                            <div
                              key={urlField}
                              className="grid gap-3 rounded-xl border border-[#D6B56D]/30 bg-white p-4"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <label className="flex items-center gap-3 text-sm font-bold text-[#0B3C5D]">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(settings[toggleField])}
                                    onChange={(e) =>
                                      updateSetting(
                                        toggleField,
                                        e.target.checked,
                                      )
                                    }
                                    className="h-4 w-4 accent-[#00A8A8]"
                                  />
                                  {label}
                                </label>
                                <button
                                  type="button"
                                  onClick={() => updateSetting(urlField, "")}
                                  className="rounded-lg border border-[#0B3C5D]/15 bg-[#F4EBD0] px-3 py-1.5 text-xs font-black text-[#0B3C5D]"
                                >
                                  Use main
                                </button>
                              </div>
                              <p className="text-xs text-gray-500">{helper}</p>
                              <input
                                value={settings[urlField]}
                                onChange={(e) =>
                                  updateSetting(urlField, e.target.value)
                                }
                                placeholder="Optional logo URL for this location"
                                className="rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#00A8A8] focus:ring-2 focus:ring-[#00A8A8]/20"
                              />
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 rounded-2xl border border-[#D6B56D]/20 bg-white p-5">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                        Presets
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        {logoSizes.map((size) => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => applyLogoSize(size)}
                            className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                              settings.logoSize === size
                                ? "border-[#0B3C5D] bg-[#0B3C5D] text-white"
                                : "border-[#D6B56D]/35 bg-[#FFF9EC] text-[#0B3C5D]"
                            }`}
                          >
                            {logoSizePresets[size].label}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-4">
                        {logoShapes.map((shape) => (
                          <button
                            key={shape}
                            type="button"
                            onClick={() => applyLogoShape(shape)}
                            className={`rounded-xl border px-4 py-3 text-sm font-bold ${
                              settings.logoShape === shape
                                ? "border-[#00A8A8] bg-[#00A8A8] text-white"
                                : "border-[#D6B56D]/35 bg-white text-[#0B3C5D]"
                            }`}
                          >
                            {logoShapePresets[shape].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
                        Crop
                        <select
                          value={settings.logoFit}
                          onChange={(e) =>
                            updateSetting("logoFit", e.target.value as LogoFit)
                          }
                          className="rounded-xl border border-gray-300 bg-white px-4 py-3"
                        >
                          {logoFits.map((fit) => (
                            <option key={fit} value={fit}>
                              {fit[0].toUpperCase() + fit.slice(1)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
                        Focus
                        <select
                          value={settings.logoPosition}
                          onChange={(e) =>
                            updateSetting(
                              "logoPosition",
                              e.target.value as LogoPosition,
                            )
                          }
                          className="rounded-xl border border-gray-300 bg-white px-4 py-3"
                        >
                          {logoPositions.map((position) => (
                            <option key={position} value={position}>
                              {position[0].toUpperCase() + position.slice(1)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
                        Shadow
                        <select
                          value={settings.logoShadow}
                          onChange={(e) =>
                            updateSetting(
                              "logoShadow",
                              e.target.value as LogoShadow,
                            )
                          }
                          className="rounded-xl border border-gray-300 bg-white px-4 py-3"
                        >
                          {logoShadows.map((shadow) => (
                            <option key={shadow} value={shadow}>
                              {shadow[0].toUpperCase() + shadow.slice(1)}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
                        Background
                        <div className="flex gap-3">
                          <input
                            type="color"
                            value={
                              previewBranding.logoBackgroundColor ===
                              "transparent"
                                ? "#ffffff"
                                : previewBranding.logoBackgroundColor
                            }
                            onChange={(e) =>
                              updateSetting("logoBackgroundColor", e.target.value)
                            }
                            className="h-12 w-14 rounded-xl border border-gray-300 bg-white p-1"
                          />
                          <input
                            value={settings.logoBackgroundColor}
                            onChange={(e) =>
                              updateSetting("logoBackgroundColor", e.target.value)
                            }
                            className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateSetting("logoBackgroundColor", "transparent")
                            }
                            className="rounded-xl border border-[#0B3C5D]/15 bg-white px-3 py-2 text-xs font-black text-[#0B3C5D]"
                          >
                            Transparent
                          </button>
                        </div>
                      </label>
                      <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
                        Border Color
                        <div className="flex gap-3">
                          <input
                            type="color"
                            value={previewBranding.logoBorderColor}
                            onChange={(e) =>
                              updateSetting("logoBorderColor", e.target.value)
                            }
                            className="h-12 w-14 rounded-xl border border-gray-300 bg-white p-1"
                          />
                          <input
                            value={settings.logoBorderColor}
                            onChange={(e) =>
                              updateSetting("logoBorderColor", e.target.value)
                            }
                            className="min-w-0 flex-1 rounded-xl border border-gray-300 px-4 py-3"
                          />
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-4 rounded-2xl border border-[#D6B56D]/20 bg-white p-5">
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                      Fine Tune
                    </p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {logoNumberControls.map((control) => (
                        <label
                          key={control.field}
                          className="grid gap-2 text-sm font-bold text-[#0B3C5D]"
                        >
                          <span className="flex items-center justify-between gap-3">
                            {control.label}
                            <input
                              type="number"
                              min={control.min}
                              max={control.max}
                              step={control.step}
                              value={Number(settings[control.field])}
                              onChange={(e) =>
                                updateNumericLogoSetting(
                                  control.field,
                                  e.target.value,
                                )
                              }
                              className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-right"
                            />
                          </span>
                          <input
                            type="range"
                            min={control.min}
                            max={control.max}
                            step={control.step}
                            value={Number(settings[control.field])}
                            onChange={(e) =>
                              updateNumericLogoSetting(
                                control.field,
                                e.target.value,
                              )
                            }
                            className="accent-[#00A8A8]"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-[#00A8A8]/35 bg-white p-5">
                  <p className="text-sm font-semibold text-gray-500">
                    Live Preview
                  </p>
                  <div className="mt-4 overflow-x-auto rounded-2xl bg-[#071F2F] p-6">
                    <div className="flex min-h-52 min-w-max items-center justify-center">
                      {sitePreviewBranding.logoUrl ? (
                        <span style={logoFrameStyle(sitePreviewBranding)}>
                          {/* Admin uploads can come from any public Supabase asset URL. */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={sitePreviewBranding.logoUrl}
                            alt="Website logo preview"
                            style={logoImageStyle(sitePreviewBranding)}
                          />
                        </span>
                      ) : (
                        <p className="text-center text-sm text-white/75">
                          The default Roatan mark will show until a logo is set.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl border border-[#D6B56D]/25 bg-[#FFF9EC] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                      Browser Tab
                    </p>
                    <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#D6B56D]/25 bg-white px-3 py-2">
                      <span
                        className="flex h-10 w-10 items-center justify-center overflow-hidden"
                        style={{
                          backgroundColor:
                            faviconPreviewBranding.logoBackgroundColor,
                          border: `${Math.min(
                            faviconPreviewBranding.logoBorderWidthPx,
                            3,
                          )}px solid ${faviconPreviewBranding.logoBorderColor}`,
                          borderRadius: `${
                            faviconPreviewBranding.logoRadiusPx >= 999
                              ? faviconPreviewBranding.logoRadiusPx
                              : Math.min(
                                  faviconPreviewBranding.logoRadiusPx,
                                  14,
                                )
                          }px`,
                          padding: `${Math.min(
                            faviconPreviewBranding.logoPaddingPx,
                            6,
                          )}px`,
                        }}
                      >
                        {faviconPreviewBranding.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={faviconPreviewBranding.logoUrl}
                            alt=""
                            style={{
                              ...logoImageStyle(faviconPreviewBranding),
                              transform: `rotate(${faviconPreviewBranding.logoRotateDeg}deg) scale(${faviconPreviewBranding.logoScale})`,
                            }}
                          />
                        ) : (
                          <span className="text-sm font-black text-[#0B3C5D]">
                            R
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-bold text-[#0B3C5D]">
                        Roatan Island Life
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <section className="grid gap-5 rounded-2xl border border-[#D6B56D]/25 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0fa9b6]">
                    Media Library
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-[#053c5e]">
                    Reuse uploaded images
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Apply any uploaded image to the hero, fallback listing image,
                    final callout, or logo locations.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadMediaLibrary}
                  disabled={mediaLoading}
                  className="rounded-xl border border-[#0B3C5D]/15 bg-[#FFF9EC] px-4 py-2 text-sm font-black text-[#0B3C5D] disabled:opacity-50"
                >
                  {mediaLoading ? "Refreshing..." : "Refresh Library"}
                </button>
              </div>
              {mediaItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#d7e6ea] bg-[#f6fbfc] p-5 text-sm text-slate-600">
                  No uploaded media found yet. Upload a logo or homepage image
                  above and it will appear here.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {mediaItems.map((item) => (
                    <article
                      key={item.path}
                      className="overflow-hidden rounded-2xl border border-[#d7e6ea] bg-[#f6fbfc]"
                    >
                      <div className="relative flex h-40 items-center justify-center bg-[#061D2C]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.url}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="grid gap-3 p-4">
                        <p className="truncate text-sm font-black text-[#053c5e]">
                          {item.name}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {homepageImageFields.map(({ field, label }) => (
                            <button
                              key={field}
                              type="button"
                              onClick={() => updateSetting(field, item.url)}
                              className="rounded-lg border border-[#d7e6ea] bg-white px-3 py-2 text-xs font-black text-[#053c5e]"
                            >
                              {label.replace(" Image", "")}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => updateSetting("logoUrl", item.url)}
                            className="rounded-lg border border-[#d7e6ea] bg-white px-3 py-2 text-xs font-black text-[#053c5e]"
                          >
                            Main logo
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteMediaItem(item)}
                          className="rounded-lg border border-red-100 bg-white px-3 py-2 text-xs font-black text-red-700"
                        >
                          Delete image
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section className="space-y-5 rounded-lg border border-[#d7e6ea] bg-white p-6 shadow-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0fa9b6]">
                  Homepage Controls
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#053c5e]">
                  Control the public homepage
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Edit the homepage copy, turn sections on or off, and tune the
                  labels travelers see.
                </p>
              </div>

              <div className="grid gap-4 rounded-2xl border border-[#0fa9b6]/20 bg-[#f6fbfc] p-4 lg:grid-cols-[1fr_0.9fr]">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0fa9b6]">
                    Homepage Preview
                  </p>
                  <div
                    className="mt-3 overflow-hidden rounded-2xl bg-[#061D2C] p-5 text-white shadow-inner"
                    style={{
                      backgroundImage: `linear-gradient(90deg, rgba(6,29,44,0.92), rgba(6,29,44,0.42)), url(${settings.heroImageUrl})`,
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                    }}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D6B56D]">
                      {settings.heroEyebrow}
                    </p>
                    <h3 className="mt-3 max-w-lg text-3xl font-black leading-tight">
                      {settings.homepageHeadline}
                    </h3>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-white/78">
                      {settings.homepageSubhead}
                    </p>
                    <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-[#00A8A8] px-3 py-2 text-white">
                        {settings.primaryCtaLabel}
                      </span>
                      <span className="rounded-full border border-white/25 bg-white/10 px-3 py-2">
                        {settings.secondaryCtaLabel}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-[#d7e6ea] bg-white p-4">
                  <p className="text-sm font-black text-[#053c5e]">
                    Section Order
                  </p>
                  <div className="mt-3 grid gap-2">
                    {orderedHomepageSections.map((section, index) => (
                      <div
                        key={section.key}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d7e6ea] bg-[#fffaf0] p-3"
                      >
                        <label className="flex min-w-0 flex-1 items-start gap-3">
                          <input
                            type="checkbox"
                            checked={isHomepageSectionEnabled(section.key)}
                            onChange={(e) =>
                              toggleHomepageSection(
                                section.key,
                                e.target.checked,
                              )
                            }
                            className="mt-1 h-4 w-4 accent-[#0fa9b6]"
                          />
                          <span>
                            <span className="block text-sm font-black text-[#053c5e]">
                              {section.label}
                            </span>
                            <span className="block text-xs leading-5 text-slate-500">
                              {section.description}
                            </span>
                          </span>
                        </label>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => moveHomepageSection(index, -1)}
                            disabled={index === 0}
                            className="rounded-lg border border-[#d7e6ea] bg-white px-3 py-2 text-xs font-black text-[#053c5e] disabled:opacity-35"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveHomepageSection(index, 1)}
                            disabled={index === orderedHomepageSections.length - 1}
                            className="rounded-lg border border-[#d7e6ea] bg-white px-3 py-2 text-xs font-black text-[#053c5e] disabled:opacity-35"
                          >
                            Down
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-[#D6B56D]/25 bg-[#FFF9EC] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0fa9b6]">
                      Homepage Quality Checklist
                    </p>
                    <h3 className="mt-1 text-lg font-bold text-[#053c5e]">
                      Publish confidence
                    </h3>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#053c5e]">
                    {
                      homepageQualityChecklist.filter(
                        (item) => item.status === "ok",
                      ).length
                    }
                    /{homepageQualityChecklist.length} ready
                  </span>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {homepageQualityChecklist.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[#d7e6ea] bg-white p-3"
                    >
                      <p className="flex items-center gap-2 text-sm font-black text-[#053c5e]">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                            item.status === "ok"
                              ? "bg-[#EAF7F7] text-[#007B7B]"
                              : "bg-[#FFF3CD] text-[#8A5A00]"
                          }`}
                        >
                          {item.status === "ok" ? "OK" : "!"}
                        </span>
                        {item.label}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {homepageToggleFields.map(({ field, label }) => (
                  <label
                    key={field}
                    className="flex items-center gap-3 rounded-lg border border-[#d7e6ea] bg-[#f6fbfc] px-4 py-3 text-sm font-semibold text-[#053c5e]"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(settings[field])}
                      onChange={(e) => updateSetting(field, e.target.checked)}
                      className="h-4 w-4 accent-[#0fa9b6]"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="grid gap-4 rounded-2xl border border-[#d7e6ea] bg-[#fffaf0] p-4">
                <div>
                  <h3 className="text-lg font-bold text-[#053c5e]">
                    Homepage Images
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Upload or paste image URLs for the hero, listing fallback,
                    and final callout.
                  </p>
                </div>
                <div className="grid gap-3 lg:grid-cols-[0.85fr_1fr]">
                  <label className="grid gap-2 text-sm font-semibold text-[#053c5e]">
                    Upload image to
                    <select
                      value={homepageImageUploadTarget}
                      onChange={(e) =>
                        setHomepageImageUploadTarget(
                          e.target.value as HomepageImageUploadTarget,
                        )
                      }
                      disabled={homepageImageUploading}
                      className="rounded-lg border border-[#d7e6ea] bg-white px-4 py-3"
                    >
                      {homepageImageFields.map(({ field, label }) => (
                        <option key={field} value={field}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-semibold text-[#053c5e]">
                    Image file
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={homepageImageUploading}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadHomepageImage(file);
                      }}
                      className="rounded-lg border border-[#d7e6ea] bg-white px-4 py-3 disabled:opacity-60"
                    />
                  </label>
                </div>
                {homepageImageUploading ? (
                  <p className="text-sm font-semibold text-[#053c5e]">
                    Uploading homepage image...
                  </p>
                ) : null}
                {homepageImageUploadError ? (
                  <p className="text-sm font-semibold text-red-600">
                    {homepageImageUploadError}
                  </p>
                ) : null}
                <div className="grid gap-4 lg:grid-cols-3">
                  {homepageImageFields.map(({ field, label }) => (
                    <label key={field}>
                      <span className="text-sm font-semibold text-[#053c5e]">
                        {label}
                      </span>
                      <input
                        value={settings[field]}
                        onChange={(e) => updateSetting(field, e.target.value)}
                        placeholder="/images/roatan.jpeg or https://..."
                        className="mt-2 w-full rounded-lg border border-[#d7e6ea] px-4 py-3 text-[#082f49] outline-none transition focus:border-[#0fa9b6] focus:ring-2 focus:ring-[#0fa9b6]/20"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {homepageLinkFields.map(({ field, label }) => (
                  <label key={field}>
                    <span className="text-sm font-semibold text-[#053c5e]">
                      {label}
                    </span>
                    <input
                      value={settings[field]}
                      onChange={(e) => updateSetting(field, e.target.value)}
                      placeholder="/map, /concierge, #marketplace, or https://..."
                      className="mt-2 w-full rounded-lg border border-[#d7e6ea] px-4 py-3 text-[#082f49] outline-none transition focus:border-[#0fa9b6] focus:ring-2 focus:ring-[#0fa9b6]/20"
                    />
                  </label>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {homepageTextFields.map(({ field, label, rows }) => (
                  <label key={field} className={rows > 2 ? "lg:col-span-2" : ""}>
                    <span className="text-sm font-semibold text-[#053c5e]">
                      {label}
                    </span>
                    <textarea
                      value={String(settings[field])}
                      rows={rows}
                      onChange={(e) => updateSetting(field, e.target.value)}
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
                    onChange={(e) =>
                      updateSetting("mapChips", linesToTextList(e.target.value))
                    }
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
                    onChange={(e) =>
                      updateSetting(
                        "planningChips",
                        linesToTextList(e.target.value),
                      )
                    }
                    className="mt-2 w-full resize-y rounded-lg border border-[#d7e6ea] px-4 py-3 text-[#082f49] outline-none transition focus:border-[#0fa9b6] focus:ring-2 focus:ring-[#0fa9b6]/20"
                  />
                </label>
              </div>

              <div className="grid gap-4 rounded-2xl border border-[#d7e6ea] bg-[#f6fbfc] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-[#053c5e]">
                      Homepage Featured Listings
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Pick the listings you want the homepage to show first.
                      Leave empty to use the normal featured/rating order.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateSetting("homepageFeaturedListingIds", [])}
                    className="rounded-lg border border-[#d7e6ea] bg-white px-4 py-2 text-sm font-black text-[#053c5e]"
                  >
                    Clear picks
                  </button>
                </div>
                {listingOptions.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#d7e6ea] bg-white p-4 text-sm text-slate-500">
                    No active listings found yet.
                  </p>
                ) : (
                  <div className="grid max-h-80 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                    {listingOptions.map((listing) => (
                      <label
                        key={listing.id}
                        className="flex items-start gap-3 rounded-xl border border-[#d7e6ea] bg-white p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={settings.homepageFeaturedListingIds.includes(
                            listing.id,
                          )}
                          onChange={(e) =>
                            toggleHomepageFeaturedListing(
                              listing.id,
                              e.target.checked,
                            )
                          }
                          className="mt-1 h-4 w-4 accent-[#0fa9b6]"
                        />
                        <span>
                          <span className="block font-black text-[#053c5e]">
                            {listing.title}
                          </span>
                          <span className="text-xs text-slate-500">
                            {listing.category || "Listing"}
                            {listing.image_url ? " with image" : " no image yet"}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-lg font-bold text-[#053c5e]">
                  Trust Proof Points
                </h3>
                {displayedTrustPoints.map((point, index) => (
                  <div
                    key={index}
                    className="grid gap-3 rounded-lg border border-[#d7e6ea] bg-[#f6fbfc] p-4 lg:grid-cols-2"
                  >
                    <label>
                      <span className="text-sm font-semibold text-[#053c5e]">
                        Proof Title {index + 1}
                      </span>
                      <input
                        value={point.title}
                        onChange={(e) =>
                          updateTrustPoint(index, "title", e.target.value)
                        }
                        className="mt-2 w-full rounded-lg border border-[#d7e6ea] px-4 py-3 text-[#082f49] outline-none transition focus:border-[#0fa9b6] focus:ring-2 focus:ring-[#0fa9b6]/20"
                      />
                    </label>
                    <label>
                      <span className="text-sm font-semibold text-[#053c5e]">
                        Proof Text {index + 1}
                      </span>
                      <input
                        value={point.text}
                        onChange={(e) =>
                          updateTrustPoint(index, "text", e.target.value)
                        }
                        className="mt-2 w-full rounded-lg border border-[#d7e6ea] px-4 py-3 text-[#082f49] outline-none transition focus:border-[#0fa9b6] focus:ring-2 focus:ring-[#0fa9b6]/20"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </section>
            <section className="space-y-6 rounded-lg border border-[#d7e6ea] bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0fa9b6]">
                    Mobile Site Controls
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-[#053c5e]">
                    Edit the phone experience
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm text-slate-600">
                    Control the mobile homepage, booking buttons, account copy,
                    chat bubble, phone navigation, and mobile-only logo sizing
                    from one place.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettings((current) => ({
                      ...current,
                      ...defaultMobileSiteControls,
                    }))
                  }
                  className="rounded-xl border border-[#d7e6ea] bg-white px-4 py-2 text-sm font-black text-[#053c5e]"
                >
                  Restore mobile defaults
                </button>
              </div>

              <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-[2rem] border border-[#0B3C5D]/10 bg-[#071F2F] p-4 text-white shadow-xl shadow-[#071F2F]/10">
                  <div className="rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="max-w-[70%]">
                        {sitePreviewBranding.logoUrl ? (
                          <div className="mb-5 origin-top-left scale-[0.72]">
                            <span style={logoFrameStyle(mobileLogoPreviewBranding)}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={mobileLogoPreviewBranding.logoUrl}
                                alt=""
                                style={logoImageStyle(mobileLogoPreviewBranding)}
                              />
                            </span>
                          </div>
                        ) : (
                          <div className="mb-5 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#053c5e]">
                            Logo preview
                          </div>
                        )}
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#D6B56D]">
                          {mobileControlsPreview.mobileHeroEyebrow}
                        </p>
                        <h3 className="mt-2 text-3xl font-black leading-none">
                          {mobileControlsPreview.mobileHeroHeadline}
                        </h3>
                        <p className="mt-3 text-sm leading-6 text-white/72">
                          {mobileControlsPreview.mobileHeroSubhead}
                        </p>
                      </div>
                      <div className="grid gap-2 text-[10px] font-black">
                        <span className="rounded-full bg-white/10 px-3 py-2">
                          {mobileControlsPreview.mobileNavMapLabel}
                        </span>
                        <span className="rounded-full bg-white px-3 py-2 text-[#071F2F]">
                          {mobileControlsPreview.mobileNavBusinessLabel}
                        </span>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-2">
                      <span className="rounded-xl bg-[#00A8A8] px-4 py-3 text-center text-sm font-black">
                        {mobileControlsPreview.mobilePrimaryCtaLabel}
                      </span>
                      <span className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-center text-sm font-black">
                        {mobileControlsPreview.mobileSecondaryCtaLabel}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid gap-3">
                  <h3 className="text-lg font-bold text-[#053c5e]">
                    Mobile visibility
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {mobileToggleFields.map(({ field, label, help }) => (
                      <label
                        key={field}
                        className="flex items-start gap-3 rounded-xl border border-[#d7e6ea] bg-[#f6fbfc] p-3"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(settings[field])}
                          onChange={(e) => updateSetting(field, e.target.checked)}
                          className="mt-1 h-4 w-4 accent-[#0fa9b6]"
                        />
                        <span>
                          <span className="block text-sm font-black text-[#053c5e]">
                            {label}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {help}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 rounded-2xl border border-[#d7e6ea] bg-[#f6fbfc] p-4">
                <div>
                  <h3 className="text-lg font-bold text-[#053c5e]">
                    Mobile logo editor
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    These controls only apply on phone-sized screens when the
                    separate mobile logo toggle is on.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <label>
                    <span className="text-sm font-semibold text-[#053c5e]">
                      Mobile logo fit
                    </span>
                    <select
                      value={settings.mobileLogoFit}
                      onChange={(e) =>
                        updateSetting("mobileLogoFit", e.target.value as LogoFit)
                      }
                      className="mt-2 w-full rounded-lg border border-[#d7e6ea] bg-white px-4 py-3 text-[#082f49]"
                    >
                      {logoFits.map((fit) => (
                        <option key={fit} value={fit}>
                          {fit}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="text-sm font-semibold text-[#053c5e]">
                      Mobile logo position
                    </span>
                    <select
                      value={settings.mobileLogoPosition}
                      onChange={(e) =>
                        updateSetting(
                          "mobileLogoPosition",
                          e.target.value as LogoPosition,
                        )
                      }
                      className="mt-2 w-full rounded-lg border border-[#d7e6ea] bg-white px-4 py-3 text-[#082f49]"
                    >
                      {logoPositions.map((position) => (
                        <option key={position} value={position}>
                          {position}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="text-sm font-semibold text-[#053c5e]">
                      Mobile logo shadow
                    </span>
                    <select
                      value={settings.mobileLogoShadow}
                      onChange={(e) =>
                        updateSetting(
                          "mobileLogoShadow",
                          e.target.value as LogoShadow,
                        )
                      }
                      className="mt-2 w-full rounded-lg border border-[#d7e6ea] bg-white px-4 py-3 text-[#082f49]"
                    >
                      {logoShadows.map((shadow) => (
                        <option key={shadow} value={shadow}>
                          {shadow}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {mobileLogoNumberControls.map(
                    ({ field, label, min, max, step }) => (
                      <label key={field}>
                        <span className="text-sm font-semibold text-[#053c5e]">
                          {label}
                        </span>
                        <input
                          type="number"
                          min={min}
                          max={max}
                          step={step}
                          value={settings[field]}
                          onChange={(e) =>
                            updateNumericMobileLogoSetting(field, e.target.value)
                          }
                          className="mt-2 w-full rounded-lg border border-[#d7e6ea] bg-white px-4 py-3 text-[#082f49]"
                        />
                      </label>
                    ),
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="text-sm font-semibold text-[#053c5e]">
                      Mobile logo background
                    </span>
                    <input
                      value={settings.mobileLogoBackgroundColor}
                      onChange={(e) =>
                        updateSetting("mobileLogoBackgroundColor", e.target.value)
                      }
                      placeholder="#ffffff or transparent"
                      className="mt-2 w-full rounded-lg border border-[#d7e6ea] bg-white px-4 py-3 text-[#082f49]"
                    />
                  </label>
                  <label>
                    <span className="text-sm font-semibold text-[#053c5e]">
                      Mobile logo border color
                    </span>
                    <input
                      value={settings.mobileLogoBorderColor}
                      onChange={(e) =>
                        updateSetting("mobileLogoBorderColor", e.target.value)
                      }
                      placeholder="#ffffff"
                      className="mt-2 w-full rounded-lg border border-[#d7e6ea] bg-white px-4 py-3 text-[#082f49]"
                    />
                  </label>
                </div>
              </div>

              {mobileControlGroups.map((group) => (
                <div
                  key={group}
                  className="grid gap-4 rounded-2xl border border-[#d7e6ea] bg-white p-4"
                >
                  <h3 className="text-lg font-bold text-[#053c5e]">
                    {group} mobile copy
                  </h3>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {mobileTextFields
                      .filter((field) => field.group === group)
                      .map(({ field, label, rows }) => (
                        <label
                          key={field}
                          className={rows > 1 ? "lg:col-span-2" : ""}
                        >
                          <span className="text-sm font-semibold text-[#053c5e]">
                            {label}
                          </span>
                          <textarea
                            value={String(settings[field])}
                            rows={rows}
                            onChange={(e) => updateSetting(field, e.target.value)}
                            className="mt-2 w-full resize-y rounded-lg border border-[#d7e6ea] px-4 py-3 text-[#082f49] outline-none transition focus:border-[#0fa9b6] focus:ring-2 focus:ring-[#0fa9b6]/20"
                          />
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            </section>
            {businessSettingFields.map(({ field, label, rows }) => (
              <div key={field}>
                <label className="mb-2 block font-medium">{label}</label>
                <textarea
                  value={settings[field]}
                  onChange={(e) => updateSetting(field, e.target.value)}
                  rows={rows}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#00A8A8] px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Publish Live"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
