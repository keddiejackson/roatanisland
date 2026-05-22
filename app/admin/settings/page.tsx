"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import {
  defaultHomepageControls,
  normalizeHomepageControls,
  type HomepageTrustPoint,
} from "@/lib/homepage-settings";
import {
  logoShapeClasses,
  logoShapes,
  logoSizeClasses,
  logoSizes,
  normalizeSiteBranding,
  type LogoShape,
  type LogoSize,
} from "@/lib/site-branding";
import { supabase } from "@/lib/supabase";

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

const businessSettingFields = [
  { field: "siteName", label: "Site Name", rows: 1 },
  { field: "adminEmails", label: "Admin Emails", rows: 2 },
  { field: "depositAmountCents", label: "Deposit Amount Cents", rows: 1 },
  { field: "commissionRate", label: "Commission Rate", rows: 1 },
] as const;

const homepageToggleFields = [
  { field: "showFeaturedListings", label: "Featured listings" },
  { field: "showExploreRoutes", label: "Explore routes" },
  { field: "showMapCallout", label: "Map callout" },
  { field: "showTrustSection", label: "Trust section" },
  { field: "showPlanningHelp", label: "Planning help" },
] as const;

const homepageTextFields = [
  { field: "heroEyebrow", label: "Hero Eyebrow", rows: 1 },
  { field: "homepageHeadline", label: "Hero Headline", rows: 2 },
  { field: "homepageSubhead", label: "Hero Subhead", rows: 3 },
  { field: "primaryCtaLabel", label: "Primary Button Label", rows: 1 },
  { field: "secondaryCtaLabel", label: "Secondary Button Label", rows: 1 },
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

    updateSetting("logoUrl", result.logoUrl);
  }

  const displayedTrustPoints = [
    ...settings.trustPoints,
    ...defaultHomepageControls.trustPoints.slice(settings.trustPoints.length),
  ].slice(0, 3);

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
            <section className="grid gap-5 rounded-2xl border border-[#D6B56D]/25 bg-[#FFF9EC] p-5">
              <div>
                <h2 className="text-xl font-bold text-[#0B3C5D]">Branding</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Upload the logo used across the website. A simple square icon
                  works best in browser tabs.
                </p>
              </div>
              <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
                <div className="grid gap-4">
                  <label className="grid gap-2 font-medium">
                    Logo Image
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
                  <label className="grid gap-2 font-medium">
                    Logo Size
                    <select
                      value={settings.logoSize}
                      onChange={(e) =>
                        updateSetting("logoSize", e.target.value as LogoSize)
                      }
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3"
                    >
                      {logoSizes.map((size) => (
                        <option key={size} value={size}>
                          {size[0].toUpperCase() + size.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 font-medium">
                    Logo Shape
                    <select
                      value={settings.logoShape}
                      onChange={(e) =>
                        updateSetting("logoShape", e.target.value as LogoShape)
                      }
                      className="rounded-xl border border-gray-300 bg-white px-4 py-3"
                    >
                      {logoShapes.map((shape) => (
                        <option key={shape} value={shape}>
                          {shape[0].toUpperCase() + shape.slice(1)}
                        </option>
                      ))}
                    </select>
                  </label>
                  {logoUploading && (
                    <p className="text-sm text-[#0B3C5D]">Uploading logo...</p>
                  )}
                  {logoUploadError && (
                    <p className="text-sm text-red-600">{logoUploadError}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-dashed border-[#00A8A8]/35 bg-white p-5">
                  <p className="text-sm font-semibold text-gray-500">
                    Logo preview
                  </p>
                  <div className="mt-4 flex min-h-36 items-center justify-center rounded-2xl bg-[#071F2F] p-5">
                    {settings.logoUrl ? (
                      // Admin uploads can come from any public Supabase asset URL.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={settings.logoUrl}
                        alt="Uploaded Roatan logo preview"
                        className={`${logoSizeClasses[settings.logoSize]} ${logoShapeClasses[settings.logoShape]}`}
                      />
                    ) : (
                      <p className="text-center text-sm text-white/75">
                        Upload a logo to preview it here.
                      </p>
                    )}
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
