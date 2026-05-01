"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type VendorAccount = {
  vendor_id: string;
  vendors: {
    business_name: string;
  } | null;
};

type ListingRow = {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  price: number | null;
  is_active: boolean | null;
  tour_times: string[] | null;
  availability_note: string | null;
};

type BookingRow = {
  id: string;
  listing_name: string;
  full_name: string;
  email: string;
  tour_date: string;
  tour_time: string;
  guests: number;
  status: string | null;
  deposit_status: string | null;
};

export default function VendorDashboardPage() {
  const router = useRouter();
  const [vendorAccount, setVendorAccount] = useState<VendorAccount | null>(null);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [listingTimes, setListingTimes] = useState<Record<string, string>>({});
  const [availabilityNotes, setAvailabilityNotes] = useState<Record<string, string>>({});
  const [savingListingId, setSavingListingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVendorDashboard() {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.replace("/vendor/login");
        return;
      }

      const { data: accountData, error: accountError } = await supabase
        .from("vendor_users")
        .select("vendor_id, vendors(business_name)")
        .eq("user_id", userData.user.id)
        .single();

      if (accountError || !accountData) {
        router.replace("/vendor/signup");
        return;
      }

      const account = accountData as unknown as VendorAccount;
      setVendorAccount(account);

      const listingSelect =
        "id, title, category, location, price, is_active, tour_times, availability_note";
      const listingResult = await supabase
        .from("listings")
        .select(listingSelect)
        .eq("vendor_id", account.vendor_id)
        .order("created_at", { ascending: false });
      let listingData: unknown[] | null = listingResult.data;
      let listingError = listingResult.error;

      if (listingError?.code === "42703") {
        const fallback = await supabase
          .from("listings")
          .select("id, title, category, location, price, is_active")
          .eq("vendor_id", account.vendor_id)
          .order("created_at", { ascending: false });

        listingData = fallback.data as unknown[] | null;
        listingError = fallback.error;
      }

      const rows = ((listingData as Partial<ListingRow>[]) || []).map((listing) => ({
        ...listing,
        tour_times: listing.tour_times || [
          "10:30 AM",
          "4:30 PM Sunset Cruise",
        ],
        availability_note: listing.availability_note || null,
      })) as ListingRow[];

      setListings(rows);
      setListingTimes(
        Object.fromEntries(
          rows.map((listing) => [
            listing.id,
            (listing.tour_times || []).join("\n"),
          ]),
        ),
      );
      setAvailabilityNotes(
        Object.fromEntries(
          rows.map((listing) => [
            listing.id,
            listing.availability_note || "",
          ]),
        ),
      );

      const { data: sessionData } = await supabase.auth.getSession();
      const bookingsResponse = await fetch("/api/vendor/bookings", {
        headers: {
          ...(sessionData.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
      });

      if (bookingsResponse.ok) {
        const bookingsResult = await bookingsResponse.json();
        setBookings((bookingsResult.bookings as BookingRow[]) || []);
      }

      setLoading(false);
    }

    loadVendorDashboard();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function updateListingTimes(listingId: string, value: string) {
    setListingTimes((currentTimes) => ({
      ...currentTimes,
      [listingId]: value,
    }));
  }

  function updateAvailabilityNote(listingId: string, value: string) {
    setAvailabilityNotes((currentNotes) => ({
      ...currentNotes,
      [listingId]: value,
    }));
  }

  async function saveListingTimes(listingId: string) {
    const times = (listingTimes[listingId] || "")
      .split("\n")
      .map((time) => time.trim())
      .filter(Boolean);

    if (times.length === 0) {
      alert("Add at least one tour time.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    setSavingListingId(listingId);

    const response = await fetch("/api/vendor/listing-times", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        listingId,
        tourTimes: times,
        availabilityNote: availabilityNotes[listingId] || "",
      }),
    });

    const result = await response.json();
    setSavingListingId(null);

    if (!response.ok) {
      alert(result.error || "Unable to save tour times.");
      return;
    }

    setListings((currentListings) =>
      currentListings.map((listing) =>
        listing.id === listingId
          ? {
              ...listing,
              tour_times: result.tourTimes,
              availability_note: result.availabilityNote || null,
            }
          : listing,
      ),
    );
    setAvailabilityNotes((currentNotes) => ({
      ...currentNotes,
      [listingId]: result.availabilityNote || "",
    }));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F3EA] px-6 py-10 text-[#17324D]">
        <div className="mx-auto max-w-5xl">Loading vendor dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-10 text-[#17324D]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold text-[#0B3C5D]">
            RoatanIsland.life
          </Link>
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href="/"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow"
            >
              Home
            </Link>
            <Link
              href="/vendor/add-listing"
              className="rounded-xl bg-[#00A8A8] px-4 py-2 text-sm font-semibold text-white"
            >
              Add Listing
            </Link>
            <button
              onClick={logout}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow"
            >
              Logout
            </button>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
            Vendor dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
            {vendorAccount?.vendors?.business_name || "Your Business"}
          </h1>
          <p className="mt-2 text-gray-600">
            Track submitted listings and add new experiences for admin review.
          </p>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-8 shadow">
          <div>
            <h2 className="text-2xl font-bold text-[#0B3C5D]">
              Booking Requests
            </h2>
            <p className="mt-2 text-gray-600">
              Recent requests for your active listings.
            </p>
          </div>

          {bookings.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-[#00A8A8]/40 bg-[#F7F3EA] p-6 text-sm text-gray-600">
              No booking requests yet.
            </div>
          ) : (
            <div className="mt-8 overflow-x-auto">
              <table className="min-w-[900px] border-collapse">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3">Listing</th>
                    <th className="px-4 py-3">Guest</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Guests</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b">
                      <td className="px-4 py-3 font-medium">
                        {booking.listing_name}
                      </td>
                      <td className="px-4 py-3">{booking.full_name}</td>
                      <td className="px-4 py-3">{booking.email}</td>
                      <td className="px-4 py-3">{booking.tour_date}</td>
                      <td className="px-4 py-3">{booking.tour_time}</td>
                      <td className="px-4 py-3">{booking.guests}</td>
                      <td className="px-4 py-3 capitalize">
                        {booking.status || "new"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-8 rounded-2xl bg-white p-8 shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#0B3C5D]">
                Your Listings
              </h2>
              <p className="mt-2 text-gray-600">
                Approved listings appear on the public site.
              </p>
            </div>
          </div>

          {listings.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-[#00A8A8]/40 bg-[#F7F3EA] p-6">
              <p className="font-semibold text-[#0B3C5D]">
                No listings submitted yet.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Add your first tour, stay, or transport listing for admin
                review.
              </p>
              <Link
                href="/vendor/add-listing"
                className="mt-4 inline-block rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
              >
                Add a listing
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-4">
              {listings.map((listing) => (
                <article
                  key={listing.id}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="text-lg font-bold text-[#0B3C5D]">
                        {listing.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600">
                        {listing.category || "Listing"} in{" "}
                        {listing.location || "Roatan"}
                        {listing.price ? ` - $${listing.price}` : ""}
                      </p>
                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                          Available tour times
                        </label>
                        <textarea
                          value={listingTimes[listing.id] || ""}
                          onChange={(e) =>
                            updateListingTimes(listing.id, e.target.value)
                          }
                          rows={3}
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                        />
                      <p className="mt-2 text-sm text-gray-500">
                          One time per line. These options show on the booking
                          form.
                        </p>
                      </div>
                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                          Availability note
                        </label>
                        <input
                          value={availabilityNotes[listing.id] || ""}
                          onChange={(e) =>
                            updateAvailabilityNote(listing.id, e.target.value)
                          }
                          placeholder="Runs Monday-Friday, weather permitting"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:items-end">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          listing.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {listing.is_active ? "Live" : "Waiting for review"}
                      </span>
                      <button
                        onClick={() => saveListingTimes(listing.id)}
                        disabled={savingListingId === listing.id}
                        className="rounded-xl bg-[#00A8A8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {savingListingId === listing.id
                          ? "Saving..."
                          : "Save times"}
                      </button>
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
