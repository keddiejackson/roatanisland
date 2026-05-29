"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import {
  defaultHomepageControls,
  homepageSectionOptions,
  normalizeHomepageControls,
  type HomepageSectionKey,
  type HomepageTrustPoint,
} from "@/lib/homepage-settings";
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
        .select("value")
        .eq("key", "site")
        .maybeSingle();

      if (data?.value && typeof data.value === "object") {
        const savedSettings = data.value as Partial<typeof defaultSettings>;

        setSettings({
          ...defaultSettings,
          ...savedSettings,
          ...normalizeHomepageControls(savedSettings),
          ...normalizeSiteBranding(savedSettings),
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
    }

    if (authorized) fetchSettings();
  }, [authorized]);

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

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { data: sessionData } = await supabase.auth.getSession();
    setSaving(true);
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify(settings),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      alert(result.error || "Unable to save settings.");
      return;
    }
    alert("Settings saved.");
  }

  async function uploadLogo(file: File) {
    const { data: sessionData } = await supabase.auth.getSession();
    const formData = new FormData();
    formData.append("logo", file);

    setLogoUploading(true);
    setLogoUploadError("");

    const response = await fetch("/api/admin/branding-logo", {
      method: "POST",
      headers: sessionData.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : {},
      body: formData,
    });
    const result = await response.json();
    setLogoUploading(false);

    if (!response.ok) {
      setLogoUploadError(result.error || "Unable to upload logo.");
      return;
    }

    updateSetting(logoUploadTarget, result.logoUrl);
  }

  async function uploadHomepageImage(file: File) {
    const { data: sessionData } = await supabase.auth.getSession();
    const formData = new FormData();
    formData.append("logo", file);

    setHomepageImageUploading(true);
    setHomepageImageUploadError("");

    const response = await fetch("/api/admin/branding-logo", {
      method: "POST",
      headers: sessionData.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : {},
      body: formData,
    });
    const result = await response.json();
    setHomepageImageUploading(false);

    if (!response.ok) {
      setHomepageImageUploadError(result.error || "Unable to upload image.");
      return;
    }

    updateSetting(homepageImageUploadTarget, result.logoUrl);
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
  const previewBranding = normalizeSiteBranding(settings);
  const sitePreviewBranding = brandingForPlacement(previewBranding, "site");
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
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
