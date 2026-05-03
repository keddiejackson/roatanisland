"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import ExportCsvButton from "@/app/admin/ExportCsvButton";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type Booking = {
  id: string;
  full_name: string;
  tour_date: string;
  tour_time: string;
  guests: number;
  status: string | null;
  listing_id: string | null;
  commission_amount_cents: number | null;
  commission_status: string | null;
  created_at: string;
};

type Listing = {
  id: string;
  title: string;
  is_active: boolean | null;
  approval_status: string | null;
  vendor_id: string | null;
  image_url: string | null;
  latitude: number | null;
  longitude: number | null;
};

type Vendor = {
  id: string;
  is_active: boolean | null;
};

type Review = {
  id: string;
  is_approved: boolean;
};

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
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
    async function fetchDashboard() {
      const [bookingsResult, listingsResult, vendorsResult, reviewsResult] =
        await Promise.all([
          supabase
            .from("bookings")
            .select("id, full_name, tour_date, tour_time, guests, status, listing_id, commission_amount_cents, commission_status, created_at")
            .order("tour_date", { ascending: true })
            .limit(200),
          supabase
            .from("listings")
            .select("id, title, is_active, approval_status, vendor_id, image_url, latitude, longitude"),
          supabase.from("vendors").select("id, is_active"),
          supabase.from("listing_reviews").select("id, is_approved"),
        ]);

      setBookings((bookingsResult.data as Booking[]) || []);
      setListings((listingsResult.data as Listing[]) || []);
      setVendors((vendorsResult.data as Vendor[]) || []);
      setReviews((reviewsResult.data as Review[]) || []);
      setLoading(false);
    }

    if (authorized) {
      fetchDashboard();
    }
  }, [authorized]);

  const summary = useMemo(() => {
    const today = todayValue();
    const upcomingBookings = bookings.filter(
      (booking) =>
        booking.tour_date >= today &&
        booking.status !== "cancelled" &&
        booking.status !== "completed",
    );

    return {
      newBookings: bookings.filter((booking) => (booking.status || "new") === "new")
        .length,
      upcomingBookings,
      pendingListings: listings.filter((listing) => listing.is_active === false)
        .length,
      reviewQueue: listings.filter(
        (listing) => (listing.approval_status || "approved") === "pending",
      ).length,
      activeListings: listings.filter((listing) => listing.is_active !== false)
        .length,
      activeVendors: vendors.filter((vendor) => vendor.is_active !== false).length,
      pendingReviews: reviews.filter((review) => !review.is_approved).length,
      exactPins: listings.filter(
        (listing) => listing.latitude !== null && listing.longitude !== null,
      ).length,
      areaPins: listings.filter(
        (listing) => listing.latitude === null || listing.longitude === null,
      ).length,
      missingPhotos: listings.filter((listing) => !listing.image_url).length,
      missingVendors: listings.filter((listing) => !listing.vendor_id).length,
      unpaidCommissionCents: bookings
        .filter((booking) => (booking.commission_status || "unpaid") === "unpaid")
        .reduce(
          (total, booking) => total + (booking.commission_amount_cents || 0),
          0,
        ),
      nextBookings: upcomingBookings.slice(0, 8),
    };
  }, [bookings, listings, reviews, vendors]);

  if (checkingAuth || !authorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <section className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold text-[#0B3C5D]">
                Admin Dashboard
              </h1>
              <p className="mt-2 text-gray-600">
                Quick view of what needs attention.
              </p>
            </div>
            <Link
              href="/admin/bookings"
              className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
            >
              Manage bookings
            </Link>
          </div>

          {loading ? (
            <p className="mt-8">Loading dashboard...</p>
          ) : (
            <>
              <div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {[
                  ["New bookings", summary.newBookings],
                  ["Upcoming", summary.upcomingBookings.length],
                  ["Pending listings", summary.pendingListings],
                  ["Review queue", summary.reviewQueue],
                  ["Active listings", summary.activeListings],
                  ["Active vendors", summary.activeVendors],
                  ["Pending reviews", summary.pendingReviews],
                  ["Exact map pins", summary.exactPins],
                  ["Area-only pins", summary.areaPins],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-[#F7F3EA] p-5">
                    <p className="text-sm text-gray-600">{label}</p>
                    <p className="mt-2 text-3xl font-bold text-[#0B3C5D]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl bg-[#EEF7F6] p-5">
                <p className="text-sm text-gray-600">Unpaid commission</p>
                <p className="mt-2 text-3xl font-bold text-[#0B3C5D]">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(summary.unpaidCommissionCents / 100)}
                </p>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-xl font-bold text-[#0B3C5D]">
                    Next bookings
                  </h2>
                  {summary.nextBookings.length === 0 ? (
                    <p className="mt-4 text-sm text-gray-600">
                      No upcoming bookings yet.
                    </p>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      {summary.nextBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-xl bg-[#F7F3EA] p-4"
                        >
                          <div className="flex flex-wrap justify-between gap-3">
                            <p className="font-bold text-[#0B3C5D]">
                              {booking.full_name}
                            </p>
                            <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold capitalize text-[#0B3C5D]">
                              {booking.status || "new"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-600">
                            {booking.tour_date} at {booking.tour_time} -{" "}
                            {booking.guests} guest
                            {booking.guests === 1 ? "" : "s"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-2xl border border-gray-200 p-5">
                  <h2 className="text-xl font-bold text-[#0B3C5D]">
                    Quick actions
                  </h2>
                  <div className="mt-4 grid gap-3">
                    <Link
                      href="/admin/listings"
                      className="rounded-xl bg-[#F7F3EA] px-4 py-3 font-semibold text-[#0B3C5D]"
                    >
                      Review pending listings
                    </Link>
                    <Link
                      href="/admin/listings"
                      className="rounded-xl bg-[#F7F3EA] px-4 py-3 font-semibold text-[#0B3C5D]"
                    >
                      Clean up map pins
                    </Link>
                    <Link
                      href="/admin/reviews"
                      className="rounded-xl bg-[#F7F3EA] px-4 py-3 font-semibold text-[#0B3C5D]"
                    >
                      Approve reviews
                    </Link>
                    <Link
                      href="/admin/activity"
                      className="rounded-xl bg-[#F7F3EA] px-4 py-3 font-semibold text-[#0B3C5D]"
                    >
                      View activity
                    </Link>
                    <Link
                      href="/"
                      className="rounded-xl bg-[#F7F3EA] px-4 py-3 font-semibold text-[#0B3C5D]"
                    >
                      Visit public site
                    </Link>
                  </div>
                </section>
              </div>

              <section className="mt-8 rounded-2xl border border-gray-200 p-5">
                <h2 className="text-xl font-bold text-[#0B3C5D]">
                  Map and listing health
                </h2>
                <div className="mt-4 grid gap-4 md:grid-cols-4">
                  {[
                    ["Exact pins", summary.exactPins],
                    ["Area-only pins", summary.areaPins],
                    ["Missing photos", summary.missingPhotos],
                    ["Missing vendors", summary.missingVendors],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-[#F7F3EA] p-5">
                      <p className="text-sm text-gray-600">{label}</p>
                      <p className="mt-2 text-3xl font-bold text-[#0B3C5D]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="mt-8 rounded-2xl border border-gray-200 p-5">
                <h2 className="text-xl font-bold text-[#0B3C5D]">
                  Backup exports
                </h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  <ExportCsvButton type="bookings" />
                  <ExportCsvButton type="listings" />
                  <ExportCsvButton type="vendors" />
                  <ExportCsvButton type="reviews" />
                  <ExportCsvButton type="activity" />
                  <ExportCsvButton type="vendor_invites" />
                </div>
              </section>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
