"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import ExportCsvButton from "@/app/admin/ExportCsvButton";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type ListingRow = {
  id: string;
  vendor_id: string | null;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  image_url: string | null;
  category: string | null;
  tour_times: string[] | null;
  is_active: boolean | null;
  is_featured: boolean | null;
};

type VendorRow = {
  id: string;
  business_name: string;
  is_active: boolean | null;
};

type ListingDraft = {
  vendor_id: string;
  title: string;
  description: string;
  price: string;
  location: string;
  image_url: string;
  category: string;
  tour_times: string;
  is_active: boolean;
  is_featured: boolean;
};

function toDraft(listing: ListingRow): ListingDraft {
  return {
    vendor_id: listing.vendor_id || "",
    title: listing.title,
    description: listing.description || "",
    price: listing.price === null ? "" : String(listing.price),
    location: listing.location || "",
    image_url: listing.image_url || "",
    category: listing.category || "Tours",
    tour_times: (listing.tour_times || [
      "10:30 AM",
      "4:30 PM Sunset Cruise",
    ]).join("\n"),
    is_active: listing.is_active ?? true,
    is_featured: listing.is_featured ?? false,
  };
}

export default function AdminListingsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, ListingDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingListingId, setSavingListingId] = useState<string | null>(null);
  const [setupMessage, setSetupMessage] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [featuredFilter, setFeaturedFilter] = useState("All");

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
    async function fetchListings() {
      const { data, error } = await supabase
        .from("listings")
        .select("id, vendor_id, title, description, price, location, image_url, category, tour_times, is_active, is_featured")
        .order("created_at", { ascending: false });

      if (error) {
        const missingSetupColumn =
          error.message.includes("is_active") ||
          error.message.includes("vendor_id") ||
          error.message.includes("is_featured") ||
          error.message.includes("tour_times") ||
          error.code === "42703";

        if (!missingSetupColumn) {
          console.error("Error loading listings:", error.message);
          setSetupMessage(error.message);
          setLoading(false);
          return;
        }

        const { data: fallbackData, error: fallbackError } = await supabase
          .from("listings")
          .select("id, title, description, price, location, image_url, category")
          .order("created_at", { ascending: false });

        if (fallbackError) {
          console.error("Error loading listings:", fallbackError.message);
          setSetupMessage(fallbackError.message);
          setLoading(false);
          return;
        }

        const fallbackRows = ((fallbackData as Omit<
          ListingRow,
          "is_active" | "is_featured" | "vendor_id" | "tour_times"
        >[]) || []).map((listing) => ({
          ...listing,
          vendor_id: null,
          tour_times: ["10:30 AM", "4:30 PM Sunset Cruise"],
          is_active: true,
          is_featured: false,
        }));

        setSetupMessage(
          "Run the updated Supabase SQL setup to enable vendor assignment, active toggles, featured listings, and custom tour times.",
        );
        setListings(fallbackRows);
        setDrafts(
          Object.fromEntries(
            fallbackRows.map((listing) => [listing.id, toDraft(listing)]),
          ),
        );
        setLoading(false);
        return;
      }

      const rows = (data as ListingRow[]) || [];
      setListings(rows);
      setDrafts(
        Object.fromEntries(rows.map((listing) => [listing.id, toDraft(listing)])),
      );
      setLoading(false);
    }

    if (authorized) {
      fetchListings();
    }
  }, [authorized]);

  useEffect(() => {
    async function fetchVendors() {
      const { data, error } = await supabase
        .from("vendors")
        .select("id, business_name, is_active")
        .order("business_name", { ascending: true });

      if (error) {
        setSetupMessage(
          "Run the updated Supabase SQL setup to enable vendor assignment.",
        );
        return;
      }

      setVendors(
        ((data as VendorRow[]) || []).filter(
          (vendor) => vendor.is_active !== false,
        ),
      );
    }

    if (authorized) {
      fetchVendors();
    }
  }, [authorized]);

  const filteredListings = useMemo(
    () =>
      listings.filter((listing) => {
        const draft = drafts[listing.id] || toDraft(listing);
        const vendorName =
          vendors.find((vendor) => vendor.id === draft.vendor_id)
            ?.business_name || "";
        const isActive = draft.is_active;
        const isFeatured = draft.is_featured;
        const matchesSearch = [
          draft.title,
          draft.description,
          draft.location,
          draft.category,
          vendorName,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesCategory =
          categoryFilter === "All" || draft.category === categoryFilter;
        const matchesStatus =
          statusFilter === "All" ||
          (statusFilter === "Active" && isActive) ||
          (statusFilter === "Inactive" && !isActive);
        const matchesFeatured =
          featuredFilter === "All" ||
          (featuredFilter === "Featured" && isFeatured) ||
          (featuredFilter === "Not featured" && !isFeatured);

        return matchesSearch && matchesCategory && matchesStatus && matchesFeatured;
      }),
    [categoryFilter, drafts, featuredFilter, listings, search, statusFilter, vendors],
  );

  if (checkingAuth || !authorized) {
    return null;
  }

  function updateDraft(
    listingId: string,
    field: keyof ListingDraft,
    value: string | boolean,
  ) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [listingId]: {
        ...currentDrafts[listingId],
        [field]: value,
      },
    }));
  }

  async function saveListing(listingId: string) {
    const draft = drafts[listingId];

    if (!draft) {
      return;
    }

    setSavingListingId(listingId);
    const tourTimes = draft.tour_times
      .split("\n")
      .map((time) => time.trim())
      .filter(Boolean);

    const { error } = await supabase
      .from("listings")
      .update({
        ...(setupMessage ? {} : { vendor_id: draft.vendor_id || null }),
        title: draft.title,
        description: draft.description,
        price: draft.price ? Number(draft.price) : null,
        location: draft.location,
        image_url: draft.image_url || null,
        category: draft.category,
        ...(setupMessage ? {} : { tour_times: tourTimes }),
        ...(setupMessage
          ? {}
          : { is_active: draft.is_active, is_featured: draft.is_featured }),
      })
      .eq("id", listingId);

    if (error) {
      alert(`Unable to save listing: ${error.message}`);
      setSavingListingId(null);
      return;
    }

    setListings((currentListings) =>
      currentListings.map((listing) =>
        listing.id === listingId
          ? {
              ...listing,
              vendor_id: draft.vendor_id || null,
              title: draft.title,
              description: draft.description,
              price: draft.price ? Number(draft.price) : null,
              location: draft.location,
              image_url: draft.image_url || null,
              category: draft.category,
              tour_times: tourTimes,
              is_active: draft.is_active,
              is_featured: draft.is_featured,
            }
          : listing,
      ),
    );
    setSavingListingId(null);
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <div className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-3xl font-bold text-[#0B3C5D]">
                Admin Listings
              </h1>
              <p className="mt-2 text-gray-600">
                Edit listings and choose which ones appear on the public site.
              </p>
            </div>
            <ExportCsvButton type="listings" />
          </div>

          {setupMessage ? (
            <div className="mt-6 rounded-xl bg-yellow-100 p-4 text-sm text-yellow-900">
              {setupMessage}
            </div>
          ) : null}

          {loading ? (
            <p className="mt-8">Loading listings...</p>
          ) : listings.length === 0 ? (
            <p className="mt-8">No listings found.</p>
          ) : (
            <>
            <div className="mt-8 grid gap-4 rounded-2xl bg-[#F7F3EA] p-4 lg:grid-cols-[1fr_180px_180px_180px_auto] lg:items-center">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search listings, vendors, locations"
                className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
              />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
              >
                <option value="All">All categories</option>
                <option value="Tours">Tours</option>
                <option value="Hotels">Hotels</option>
                <option value="Transport">Transport</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
              >
                <option value="All">All statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <select
                value={featuredFilter}
                onChange={(e) => setFeaturedFilter(e.target.value)}
                className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
              >
                <option value="All">All featured</option>
                <option value="Featured">Featured</option>
                <option value="Not featured">Not featured</option>
              </select>
              <p className="text-sm font-semibold text-[#0B3C5D]">
                {filteredListings.length} shown
              </p>
            </div>

            {filteredListings.length === 0 ? (
              <p className="mt-8 rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                No listings match those filters.
              </p>
            ) : (
            <div className="mt-6 space-y-6">
              {filteredListings.map((listing) => {
                const draft = drafts[listing.id];

                if (!draft) {
                  return null;
                }

                return (
                  <section
                    key={listing.id}
                    className="rounded-xl border border-gray-200 p-5"
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_0.8fr_0.6fr_0.7fr]">
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Title
                        </label>
                        <input
                          value={draft.title}
                          onChange={(e) =>
                            updateDraft(listing.id, "title", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Vendor
                        </label>
                        <select
                          value={draft.vendor_id}
                          disabled={Boolean(setupMessage)}
                          onChange={(e) =>
                            updateDraft(listing.id, "vendor_id", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none"
                        >
                          <option value="">No vendor</option>
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>
                              {vendor.business_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Location
                        </label>
                        <input
                          value={draft.location}
                          onChange={(e) =>
                            updateDraft(listing.id, "location", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Price
                        </label>
                        <input
                          type="number"
                          value={draft.price}
                          onChange={(e) =>
                            updateDraft(listing.id, "price", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Category
                        </label>
                        <select
                          value={draft.category}
                          onChange={(e) =>
                            updateDraft(listing.id, "category", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none"
                        >
                          <option value="Tours">Tours</option>
                          <option value="Hotels">Hotels</option>
                          <option value="Transport">Transport</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Image URL
                        </label>
                        <input
                          value={draft.image_url}
                          onChange={(e) =>
                            updateDraft(listing.id, "image_url", e.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          Available Tour Times
                        </label>
                        <textarea
                          value={draft.tour_times}
                          disabled={Boolean(setupMessage)}
                          onChange={(e) =>
                            updateDraft(
                              listing.id,
                              "tour_times",
                              e.target.value,
                            )
                          }
                          rows={3}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none"
                        />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
                      <div className="flex items-end gap-4">
                        <label className="flex items-center gap-3 rounded-lg border border-gray-300 px-4 py-2">
                          <input
                            type="checkbox"
                            checked={draft.is_active}
                            disabled={Boolean(setupMessage)}
                            onChange={(e) =>
                              updateDraft(
                                listing.id,
                                "is_active",
                                e.target.checked,
                              )
                            }
                          />
                          Active on public site
                        </label>

                        <label className="flex items-center gap-3 rounded-lg border border-gray-300 px-4 py-2">
                          <input
                            type="checkbox"
                            checked={draft.is_featured}
                            disabled={Boolean(setupMessage)}
                            onChange={(e) =>
                              updateDraft(
                                listing.id,
                                "is_featured",
                                e.target.checked,
                              )
                            }
                          />
                          Featured
                        </label>

                        <button
                          onClick={() => saveListing(listing.id)}
                          disabled={savingListingId === listing.id}
                          className="rounded-xl bg-[#00A8A8] px-5 py-2 font-semibold text-white disabled:opacity-50"
                        >
                          {savingListingId === listing.id ? "Saving..." : "Save"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block text-sm font-medium">
                        Description
                      </label>
                      <textarea
                        value={draft.description}
                        onChange={(e) =>
                          updateDraft(listing.id, "description", e.target.value)
                        }
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none"
                      />
                    </div>
                  </section>
                );
              })}
            </div>
            )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
