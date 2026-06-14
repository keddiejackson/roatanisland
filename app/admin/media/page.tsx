"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import { defaultSiteBranding } from "@/lib/site-branding";
import { supabase } from "@/lib/supabase";

type BrandingMediaItem = {
  name: string;
  path: string;
  url: string;
  createdAt: string | null;
  updatedAt: string | null;
  size: number | null;
};

type LogoTarget = {
  field:
    | "logoUrl"
    | "siteLogoUrl"
    | "chatLogoUrl"
    | "emailLogoUrl"
    | "faviconLogoUrl";
  label: string;
  helper: string;
};

const logoTargets: LogoTarget[] = [
  {
    field: "logoUrl",
    label: "Main logo",
    helper: "Default logo used when a location does not have its own logo.",
  },
  {
    field: "siteLogoUrl",
    label: "Website pages",
    helper: "Header, footer, listings, map, and public pages.",
  },
  {
    field: "chatLogoUrl",
    label: "Booking chat",
    helper: "Admin identity image in guest and vendor chats.",
  },
  {
    field: "emailLogoUrl",
    label: "Emails",
    helper: "Booking, concierge, message, and confirmation emails.",
  },
  {
    field: "faviconLogoUrl",
    label: "Browser tab",
    helper: "Small icon for browser tabs and bookmarks.",
  },
];

function formatBytes(value: number | null) {
  if (!value) return "Size unknown";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function AdminMediaPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [media, setMedia] = useState<BrandingMediaItem[]>([]);
  const [settings, setSettings] = useState<Record<string, unknown>>({
    ...defaultSiteBranding,
  });
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [targetByPath, setTargetByPath] = useState<Record<string, LogoTarget["field"]>>({});

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

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }, []);

  const loadMediaAndSettings = useCallback(async () => {
    const token = await getToken();

    const [mediaResponse, settingsResponse] = await Promise.all([
      fetch("/api/admin/branding-logo", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
      supabase
        .from("site_settings")
        .select("value")
        .eq("key", "site")
        .maybeSingle(),
    ]);

    if (mediaResponse.ok) {
      const result = (await mediaResponse.json()) as {
        media?: BrandingMediaItem[];
      };
      setMedia(result.media || []);
    }

    if (
      settingsResponse.data?.value &&
      typeof settingsResponse.data.value === "object"
    ) {
      setSettings({
        ...defaultSiteBranding,
        ...(settingsResponse.data.value as Record<string, unknown>),
      });
    }
  }, [getToken]);

  useEffect(() => {
    if (!authorized) return;
    void Promise.resolve().then(loadMediaAndSettings);
  }, [authorized, loadMediaAndSettings]);

  async function uploadLogo(file: File) {
    const token = await getToken();
    const formData = new FormData();
    formData.append("logo", file);
    setUploading(true);
    setMessage("");

    const response = await fetch("/api/admin/branding-logo", {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const result = await response.json();
    setUploading(false);

    if (!response.ok) {
      setMessage(result.error || "Unable to upload logo.");
      return;
    }

    setMessage("Logo uploaded.");
    await loadMediaAndSettings();
  }

  async function applyLogo(url: string, field: LogoTarget["field"]) {
    const token = await getToken();
    const nextSettings = {
      ...settings,
      [field]: url,
    };
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(nextSettings),
    });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Unable to apply logo.");
      return;
    }

    setSettings(nextSettings);
    setMessage("Logo applied.");
  }

  async function deleteLogo(item: BrandingMediaItem) {
    if (!window.confirm(`Delete ${item.name}?`)) return;

    const token = await getToken();
    const response = await fetch("/api/admin/branding-logo", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ path: item.path }),
    });
    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error || "Unable to delete logo.");
      return;
    }

    setMessage("Logo deleted.");
    await loadMediaAndSettings();
  }

  if (checkingAuth || !authorized) return null;

  return (
    <main className="brand-workspace min-h-screen px-4 py-6 text-[#1F2937] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <AdminNav />
        <section className="brand-auth-card p-5 shadow sm:p-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                Brand kit
              </p>
              <h1 className="mt-2 text-3xl font-black text-[#0B3C5D]">
                Brand media library
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-gray-600">
                Upload once, preview every logo, and assign the right image to
                the website, chat, emails, or browser tab.
              </p>
            </div>
            <Link
              href="/admin/settings"
              className="rounded-xl bg-[#0B3C5D] px-5 py-3 text-center text-sm font-black text-white"
            >
              Open full logo editor
            </Link>
          </div>

          <div className="mt-8 grid gap-4 rounded-2xl border border-[#D6B56D]/25 bg-[#FFF9EC] p-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
              Upload brand logo or icon
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadLogo(file);
                }}
                className="rounded-xl border border-gray-300 bg-white px-4 py-3 disabled:opacity-60"
              />
            </label>
            <p className="text-sm font-semibold text-[#0B3C5D]">
              {uploading ? "Uploading..." : `${media.length} saved logo${media.length === 1 ? "" : "s"}`}
            </p>
          </div>

          {message ? (
            <p className="mt-4 rounded-xl bg-[#EEF7F6] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
              {message}
            </p>
          ) : null}

          <section className="mt-8 grid gap-4 lg:grid-cols-5">
            {logoTargets.map((target) => (
              <div
                key={target.field}
                className="rounded-2xl border border-[#D6B56D]/25 bg-[#FFF9EC] p-4"
              >
                <p className="text-sm font-black text-[#0B3C5D]">
                  {target.label}
                </p>
                <p className="mt-2 min-h-12 text-xs leading-5 text-gray-600">
                  {target.helper}
                </p>
                <div className="mt-4 grid min-h-24 place-items-center overflow-hidden rounded-xl bg-white p-3">
                  {typeof settings[target.field] === "string" &&
                  settings[target.field] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={String(settings[target.field])}
                      alt=""
                      className="max-h-20 max-w-full object-contain"
                    />
                  ) : (
                    <span className="text-xs font-bold text-gray-400">
                      Uses main/default
                    </span>
                  )}
                </div>
              </div>
            ))}
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {media.map((item) => {
              const selectedTarget = targetByPath[item.path] || "logoUrl";

              return (
                <article
                  key={item.path}
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                >
                  <div className="grid h-52 place-items-center bg-[#EEF7F6] p-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="grid gap-4 p-5">
                    <div>
                      <h2 className="truncate font-black text-[#0B3C5D]">
                        {item.name}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatBytes(item.size)}
                      </p>
                    </div>
                    <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
                      Apply to
                      <select
                        value={selectedTarget}
                        onChange={(e) =>
                          setTargetByPath((current) => ({
                            ...current,
                            [item.path]: e.target.value as LogoTarget["field"],
                          }))
                        }
                        className="rounded-xl border border-gray-300 px-4 py-3"
                      >
                        {logoTargets.map((target) => (
                          <option key={target.field} value={target.field}>
                            {target.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => applyLogo(item.url, selectedTarget)}
                        className="rounded-xl bg-[#00A8A8] px-4 py-3 text-sm font-black text-white"
                      >
                        Apply logo
                      </button>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(item.url)}
                        className="rounded-xl border border-[#00A8A8]/35 px-4 py-3 text-sm font-black text-[#007B7B]"
                      >
                        Copy URL
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteLogo(item)}
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700"
                    >
                      Delete from library
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {media.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-[#D6B56D]/45 bg-[#FFF9EC] p-8 text-center">
              <h2 className="text-xl font-black text-[#0B3C5D]">
                No brand media uploaded yet.
              </h2>
              <p className="mt-2 text-gray-600">
                Upload your first logo and it will appear here for reuse.
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
