"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import ExportCsvButton from "@/app/admin/ExportCsvButton";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import { normalizeWebsiteUrl } from "@/lib/url";

type VendorRow = {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  is_active: boolean | null;
};

type VendorForm = {
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  website: string;
  notes: string;
};

const emptyForm: VendorForm = {
  business_name: "",
  contact_name: "",
  email: "",
  phone: "",
  website: "",
  notes: "",
};

export default function AdminVendorsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingVendorId, setSavingVendorId] = useState<string | null>(null);
  const [deletingVendorId, setDeletingVendorId] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

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
    async function fetchVendors() {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, business_name, contact_name, email, phone, website, notes, is_active")
        .order("created_at", { ascending: false });

      if (error) {
        setSetupMessage(
          "Run the updated Supabase SQL setup to enable vendor onboarding.",
        );
        setLoading(false);
        return;
      }

      setVendors((data as VendorRow[]) || []);
      setLoading(false);
    }

    if (authorized) {
      fetchVendors();
    }
  }, [authorized]);

  const filteredVendors = useMemo(
    () =>
      vendors.filter((vendor) => {
        const isActive = vendor.is_active !== false;
        const matchesStatus =
          statusFilter === "All" ||
          (statusFilter === "Active" && isActive) ||
          (statusFilter === "Inactive" && !isActive);
        const matchesSearch = [
          vendor.business_name,
          vendor.contact_name || "",
          vendor.email || "",
          vendor.phone || "",
          vendor.website || "",
          vendor.notes || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());

        return matchesSearch && matchesStatus;
      }),
    [search, statusFilter, vendors],
  );

  if (checkingAuth || !authorized) {
    return null;
  }

  function updateForm(field: keyof VendorForm, value: string) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function addVendor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const { data, error } = await supabase
      .from("vendors")
      .insert([
        {
          id: crypto.randomUUID(),
          business_name: form.business_name,
          contact_name: form.contact_name || null,
          email: form.email || null,
          phone: form.phone || null,
          website: normalizeWebsiteUrl(form.website),
          notes: form.notes || null,
          is_active: true,
        },
      ])
      .select("id, business_name, contact_name, email, phone, website, notes, is_active")
      .single();

    setSaving(false);

    if (error) {
      alert(`Unable to add vendor: ${error.message}`);
      return;
    }

    setVendors((currentVendors) => [data as VendorRow, ...currentVendors]);
    setForm(emptyForm);
  }

  async function toggleVendor(vendor: VendorRow) {
    setSavingVendorId(vendor.id);

    const nextActive = !(vendor.is_active ?? true);
    const { error } = await supabase
      .from("vendors")
      .update({ is_active: nextActive })
      .eq("id", vendor.id);

    if (error) {
      alert(`Unable to update vendor: ${error.message}`);
      setSavingVendorId(null);
      return;
    }

    setVendors((currentVendors) =>
      currentVendors.map((currentVendor) =>
        currentVendor.id === vendor.id
          ? { ...currentVendor, is_active: nextActive }
          : currentVendor,
      ),
    );
    setSavingVendorId(null);
  }

  async function deleteVendor(vendor: VendorRow) {
    const confirmed = window.confirm(
      `Permanent delete "${vendor.business_name}"?\n\nThis removes the vendor and all of their listings completely. This cannot be undone. Use "Hide vendor" instead if you only want to remove them from public view.`,
    );

    if (!confirmed) {
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    setDeletingVendorId(vendor.id);

    const response = await fetch(`/api/admin/vendors/${vendor.id}`, {
      method: "DELETE",
      headers: {
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
    });

    const result = await response.json();
    setDeletingVendorId(null);

    if (!response.ok) {
      alert(result.error || "Unable to delete vendor.");
      return;
    }

    setVendors((currentVendors) =>
      currentVendors.filter((currentVendor) => currentVendor.id !== vendor.id),
    );
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
          <section className="rounded-2xl bg-white p-8 shadow">
            <h1 className="text-3xl font-bold text-[#0B3C5D]">
              Vendor Onboarding
            </h1>
            <p className="mt-2 text-gray-600">
              Add local operators, hide them from public view, or permanently delete old records.
            </p>

            {setupMessage ? (
              <div className="mt-6 rounded-xl bg-yellow-100 p-4 text-sm text-yellow-900">
                {setupMessage}
              </div>
            ) : null}

            <form onSubmit={addVendor} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block font-medium">Business Name</label>
                <input
                  value={form.business_name}
                  onChange={(e) => updateForm("business_name", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Contact Name</label>
                <input
                  value={form.contact_name}
                  onChange={(e) => updateForm("contact_name", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <label className="mb-2 block font-medium">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => updateForm("phone", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block font-medium">Website</label>
                <input
                  value={form.website}
                  onChange={(e) => updateForm("website", e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => updateForm("notes", e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving || Boolean(setupMessage)}
                className="w-full rounded-xl bg-[#00A8A8] px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Adding..." : "Add Vendor"}
              </button>
            </form>
          </section>

          <section className="rounded-2xl bg-white p-8 shadow">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h2 className="text-2xl font-bold text-[#0B3C5D]">Vendors</h2>
                <p className="mt-2 text-gray-600">
                  Use Hide for reversible removal. Use Permanent delete only when the record should be gone.
                </p>
              </div>
              <ExportCsvButton type="vendors" />
            </div>

            {loading ? (
              <p className="mt-8">Loading vendors...</p>
            ) : vendors.length === 0 ? (
              <p className="mt-8">No vendors found.</p>
            ) : (
              <>
              <div className="mt-8 grid gap-4 rounded-2xl bg-[#F7F3EA] p-4 md:grid-cols-[1fr_180px_auto] md:items-center">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search vendors, contacts, notes"
                  className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
                >
                  <option value="All">All statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
                <p className="text-sm font-semibold text-[#0B3C5D]">
                  {filteredVendors.length} shown
                </p>
              </div>

              {filteredVendors.length === 0 ? (
                <p className="mt-8 rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                  No vendors match those filters.
                </p>
              ) : (
              <div className="mt-6 grid gap-4">
                {filteredVendors.map((vendor) => (
                  <article
                    key={vendor.id}
                    className="rounded-xl border border-gray-200 p-5"
                  >
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-bold text-[#0B3C5D]">
                            {vendor.business_name}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              vendor.is_active === false
                                ? "bg-gray-100 text-gray-500"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {vendor.is_active === false ? "Inactive" : "Active"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          {vendor.contact_name || "No contact name"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => toggleVendor(vendor)}
                          disabled={savingVendorId === vendor.id}
                          className="rounded-xl border border-[#00A8A8] px-4 py-2 text-sm font-semibold text-[#007B7B] disabled:opacity-50"
                        >
                          {vendor.is_active === false
                            ? "Show vendor"
                            : "Hide vendor"}
                        </button>
                        <button
                          onClick={() => deleteVendor(vendor)}
                          disabled={deletingVendorId === vendor.id}
                          className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          {deletingVendorId === vendor.id
                            ? "Deleting..."
                            : "Permanent delete"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-gray-600 md:grid-cols-3">
                      <p>{vendor.email || "No email"}</p>
                      <p>{vendor.phone || "No phone"}</p>
                      <p>{vendor.website || "No website"}</p>
                    </div>

                    {vendor.notes ? (
                      <p className="mt-4 rounded-lg bg-[#F7F3EA] p-3 text-sm text-gray-700">
                        {vendor.notes}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
              )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
