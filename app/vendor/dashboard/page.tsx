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

      const { data: listingData } = await supabase
        .from("listings")
        .select("id, title, category, location, price, is_active")
        .eq("vendor_id", account.vendor_id)
        .order("created_at", { ascending: false });

      setListings((listingData as ListingRow[]) || []);

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
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        listing.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {listing.is_active ? "Live" : "Waiting for review"}
                    </span>
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
