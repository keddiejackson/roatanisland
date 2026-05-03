"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type ListingRow = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  category: string | null;
  approval_status: "pending" | "approved" | "rejected" | null;
  approval_note: string | null;
  vendor_id: string | null;
  vendors: { business_name: string } | null;
  created_at: string;
};

export default function AdminListingReviewPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingListingId, setSavingListingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("pending");
  const [loading, setLoading] = useState(true);

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
        .select("id, title, description, price, location, category, approval_status, approval_note, vendor_id, created_at, vendors(business_name)")
        .order("created_at", { ascending: false });

      if (error) {
        setLoading(false);
        return;
      }

      const rows = (data as unknown as ListingRow[]) || [];
      setListings(rows);
      setNotes(
        Object.fromEntries(rows.map((listing) => [listing.id, listing.approval_note || ""])),
      );
      setLoading(false);
    }

    if (authorized) {
      fetchListings();
    }
  }, [authorized]);

  const filteredListings = useMemo(
    () =>
      listings.filter((listing) =>
        filter === "all"
          ? true
          : (listing.approval_status || "approved") === filter,
      ),
    [filter, listings],
  );

  if (checkingAuth || !authorized) {
    return null;
  }

  async function decideListing(
    listing: ListingRow,
    decision: "approved" | "rejected",
  ) {
    const { data: sessionData } = await supabase.auth.getSession();
    setSavingListingId(listing.id);

    const response = await fetch(`/api/admin/listing-review/${listing.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        decision,
        note: notes[listing.id] || "",
      }),
    });
    const result = await response.json();
    setSavingListingId(null);

    if (!response.ok) {
      alert(result.error || "Unable to update listing.");
      return;
    }

    setListings((currentListings) =>
      currentListings.map((currentListing) =>
        currentListing.id === listing.id
          ? {
              ...currentListing,
              approval_status: decision,
              approval_note: notes[listing.id] || null,
            }
          : currentListing,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <section className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold text-[#0B3C5D]">
                Listing Review
              </h1>
              <p className="mt-2 text-gray-600">
                Approve vendor submissions or send them back with notes.
              </p>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
            >
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="approved">Approved</option>
              <option value="all">All</option>
            </select>
          </div>

          {loading ? (
            <p className="mt-8">Loading listings...</p>
          ) : filteredListings.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
              No listings in this queue.
            </p>
          ) : (
            <div className="mt-8 grid gap-4">
              {filteredListings.map((listing) => (
                <article key={listing.id} className="rounded-xl border border-gray-200 p-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold text-[#0B3C5D]">
                          {listing.title}
                        </h2>
                        <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-sm font-semibold capitalize text-[#0B3C5D]">
                          {listing.approval_status || "approved"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {listing.vendors?.business_name || "No vendor"} -{" "}
                        {listing.category || "Listing"} in{" "}
                        {listing.location || "Roatan"}
                        {listing.price ? ` - $${listing.price}` : ""}
                      </p>
                      <p className="mt-4 leading-7 text-gray-700">
                        {listing.description || "No description."}
                      </p>
                    </div>
                    <div className="flex min-w-72 flex-col gap-3">
                      <textarea
                        value={notes[listing.id] || ""}
                        onChange={(e) =>
                          setNotes((currentNotes) => ({
                            ...currentNotes,
                            [listing.id]: e.target.value,
                          }))
                        }
                        rows={4}
                        placeholder="Optional note to vendor"
                        className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => decideListing(listing, "approved")}
                          disabled={savingListingId === listing.id}
                          className="flex-1 rounded-xl bg-[#00A8A8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => decideListing(listing, "rejected")}
                          disabled={savingListingId === listing.id}
                          className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
