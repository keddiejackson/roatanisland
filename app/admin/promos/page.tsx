"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import ExportCsvButton from "@/app/admin/ExportCsvButton";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type Promo = {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number | null;
  discount_amount_cents: number | null;
  is_active: boolean;
  expires_at: string | null;
  usage_count?: number;
};

export default function AdminPromosPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [form, setForm] = useState({
    code: "",
    description: "",
    discountPercent: "",
    discountAmountCents: "",
    expiresAt: "",
  });

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !(await isAdminUser(userData.user.email))) {
        router.replace("/admin/login");
        return;
      }
      setAuthorized(true);
      const { data } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });
      const { data: bookingData } = await supabase
        .from("bookings")
        .select("promo_code")
        .not("promo_code", "is", null);
      const usage = new Map<string, number>();
      ((bookingData as { promo_code: string | null }[]) || []).forEach((booking) => {
        if (booking.promo_code) {
          usage.set(booking.promo_code, (usage.get(booking.promo_code) || 0) + 1);
        }
      });
      setPromos(
        ((data as Promo[]) || []).map((promo) => ({
          ...promo,
          usage_count: usage.get(promo.code) || 0,
        })),
      );
    }
    load();
  }, [router]);

  if (!authorized) return null;

  async function addPromo(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/admin/promo-codes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || "Unable to add promo.");
      return;
    }
    setPromos((current) => [result.promo as Promo, ...current]);
    setForm({ code: "", description: "", discountPercent: "", discountAmountCents: "", expiresAt: "" });
  }

  async function updatePromo(promo: Promo, changes: Partial<Promo>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/promo-codes/${promo.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        isActive: changes.is_active,
        expiresAt: changes.expires_at,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || "Unable to update promo.");
      return;
    }
    setPromos((current) =>
      current.map((currentPromo) =>
        currentPromo.id === promo.id
          ? { ...currentPromo, ...(result.promo as Promo) }
          : currentPromo,
      ),
    );
  }

  async function deletePromo(promo: Promo) {
    if (!window.confirm(`Delete promo code "${promo.code}"?`)) {
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/promo-codes/${promo.id}`, {
      method: "DELETE",
      headers: {
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || "Unable to delete promo.");
      return;
    }
    setPromos((current) => current.filter((currentPromo) => currentPromo.id !== promo.id));
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-6xl">
        <AdminNav />
        <section className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-3xl font-bold text-[#0B3C5D]">Promo Codes</h1>
              <p className="mt-2 text-gray-600">
                Create, expire, pause, and track booking promo codes.
              </p>
            </div>
            <ExportCsvButton type="promo_codes" />
          </div>
          <form onSubmit={addPromo} className="mt-8 grid gap-4 md:grid-cols-5">
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CODE" className="rounded-xl border border-gray-300 px-4 py-3" required />
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="rounded-xl border border-gray-300 px-4 py-3" />
            <input type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value, discountAmountCents: "" })} placeholder="% off" className="rounded-xl border border-gray-300 px-4 py-3" />
            <input type="number" value={form.discountAmountCents} onChange={(e) => setForm({ ...form, discountAmountCents: e.target.value, discountPercent: "" })} placeholder="Cents off" className="rounded-xl border border-gray-300 px-4 py-3" />
            <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="rounded-xl border border-gray-300 px-4 py-3" />
            <button className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white md:col-span-5">Add Promo</button>
          </form>
          <div className="mt-8 grid gap-3">
            {promos.map((promo) => (
              <div key={promo.id} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="font-bold text-[#0B3C5D]">{promo.code}</p>
                <p className="text-sm text-gray-600">
                  {promo.description || "No description"} -{" "}
                  {promo.discount_percent
                    ? `${promo.discount_percent}% off`
                    : `${(promo.discount_amount_cents || 0) / 100} off`}
                </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Used {promo.usage_count || 0} time
                      {(promo.usage_count || 0) === 1 ? "" : "s"}
                      {promo.expires_at
                        ? ` - Expires ${new Date(promo.expires_at).toLocaleDateString()}`
                        : " - No expiration"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updatePromo(promo, { is_active: !promo.is_active })}
                      className="rounded-xl border border-[#00A8A8] px-4 py-2 text-sm font-semibold text-[#007B7B]"
                    >
                      {promo.is_active ? "Pause" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePromo(promo)}
                      className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
