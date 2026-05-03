"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

const defaultSettings = {
  siteName: "RoatanIsland.life",
  homepageHeadline: "Plan your best Roatan day in one place.",
  homepageSubhead:
    "Browse local experiences, compare prices, and request bookings from a simple island directory built for travelers.",
  adminEmails: "",
  depositAmountCents: "5000",
  commissionRate: "0.10",
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [settings, setSettings] = useState(defaultSettings);
  const [saving, setSaving] = useState(false);

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
        setSettings({ ...defaultSettings, ...(data.value as typeof defaultSettings) });
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
