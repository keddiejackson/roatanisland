"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
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
  homepageHeadline: "Plan your best Roatan day in one place.",
  homepageSubhead:
    "Browse local experiences, compare prices, and request bookings from a simple island directory built for travelers.",
  adminEmails: "",
  depositAmountCents: "5000",
  commissionRate: "0.10",
  logoUrl: "",
  logoSize: "medium" as LogoSize,
  logoShape: "original" as LogoShape,
};

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
          ...normalizeSiteBranding(savedSettings),
        });
      }
    }

    if (authorized) fetchSettings();
  }, [authorized]);

  if (checkingAuth || !authorized) return null;

  function updateSetting(field: keyof typeof settings, value: string) {
    setSettings((current) => ({ ...current, [field]: value }));
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
                      onChange={(e) => updateSetting("logoSize", e.target.value)}
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
                      onChange={(e) => updateSetting("logoShape", e.target.value)}
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
            {[
              ["siteName", "Site Name"],
              ["homepageHeadline", "Homepage Headline"],
              ["homepageSubhead", "Homepage Subhead"],
              ["adminEmails", "Admin Emails"],
              ["depositAmountCents", "Deposit Amount Cents"],
              ["commissionRate", "Commission Rate"],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="mb-2 block font-medium">{label}</label>
                <textarea
                  value={settings[field as keyof typeof settings]}
                  onChange={(e) =>
                    updateSetting(field as keyof typeof settings, e.target.value)
                  }
                  rows={field === "homepageSubhead" ? 3 : 1}
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
