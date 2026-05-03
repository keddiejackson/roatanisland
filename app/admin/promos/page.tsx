"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type Promo = {
  id: string;
  code: string;
  description: string | null;
  discount_percent: number | null;
  discount_amount_cents: number | null;
  is_active: boolean;
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
      setPromos((data as Promo[]) || []);
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
    setForm({ code: "", description: "", discountPercent: "", discountAmountCents: "" });
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-6xl">
        <AdminNav />
        <section className="rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold text-[#0B3C5D]">Promo Codes</h1>
          <form onSubmit={addPromo} className="mt-8 grid gap-4 md:grid-cols-4">
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="CODE" className="rounded-xl border border-gray-300 px-4 py-3" required />
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" className="rounded-xl border border-gray-300 px-4 py-3" />
            <input type="number" value={form.discountPercent} onChange={(e) => setForm({ ...form, discountPercent: e.target.value, discountAmountCents: "" })} placeholder="% off" className="rounded-xl border border-gray-300 px-4 py-3" />
            <input type="number" value={form.discountAmountCents} onChange={(e) => setForm({ ...form, discountAmountCents: e.target.value, discountPercent: "" })} placeholder="Cents off" className="rounded-xl border border-gray-300 px-4 py-3" />
            <button className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white md:col-span-4">Add Promo</button>
          </form>
          <div className="mt-8 grid gap-3">
            {promos.map((promo) => (
              <div key={promo.id} className="rounded-xl border border-gray-200 p-4">
                <p className="font-bold text-[#0B3C5D]">{promo.code}</p>
                <p className="text-sm text-gray-600">
                  {promo.description || "No description"} -{" "}
                  {promo.discount_percent
                    ? `${promo.discount_percent}% off`
                    : `${(promo.discount_amount_cents || 0) / 100} off`}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
