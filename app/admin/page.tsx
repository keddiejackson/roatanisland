"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import ExportCsvButton from "@/app/admin/ExportCsvButton";
import PlatformProCommandCenter from "@/app/admin/PlatformProCommandCenter";
import { isAdminUser } from "@/lib/admin";
import {
  getAdminRevenueSummary,
  getBookingMoneyRows,
  getVendorRevenueLeaderboard,
} from "@/lib/admin-revenue";
import { conciergeLeadSummary } from "@/lib/concierge-leads";
import {
  getAdminCommandDigest,
  getMarketplaceCommandCenter,
} from "@/lib/marketplace-upgrade";
import {
  getGuestTripPlanAdminSummary,
  type GuestTripPlanRow,
} from "@/lib/guest-trip-plans";
import { getPlatformV2OperatingSignals } from "@/lib/platform-v2";
import { supabase } from "@/lib/supabase";

type Booking = {
  id: string;
  full_name: string;
  tour_date: string;
  tour_time: string;
  guests: number;
  status: string | null;
  listing_id: string | null;
  deposit_status: string | null;
  deposit_amount_cents: number | null;
  booking_value_cents: number | null;
  commission_amount_cents: number | null;
  commission_status: string | null;
  selected_addons: { name?: string; price_cents?: number }[] | null;
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
  tour_times: string[] | null;
  is_featured: boolean | null;
  rating: number | null;
  reviews_count: number | null;
};

type Vendor = {
  id: string;
  business_name: string | null;
  is_active: boolean | null;
};

type Review = {
  id: string;
  is_approved: boolean;
};

type ConciergeLead = {
  id: string;
  status: string | null;
  priority: string | null;
  created_at: string;
};

type SupportTicket = {
  id: string;
  status: string | null;
  priority: string | null;
  intent: string | null;
  created_at: string;
};

type AdminGuestTripPlan = GuestTripPlanRow;

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatMoney(valueCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(valueCents / 100);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [conciergeLeads, setConciergeLeads] = useState<ConciergeLead[]>([]);
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [guestTripPlans, setGuestTripPlans] = useState<AdminGuestTripPlan[]>([]);
  const [guestTripPlanMessage, setGuestTripPlanMessage] = useState("");
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
      const [
        bookingsResult,
        listingsResult,
        vendorsResult,
        reviewsResult,
        conciergeResult,
        supportResult,
        guestTripPlansResult,
      ] = await Promise.all([
          supabase
            .from("bookings")
            .select("id, full_name, tour_date, tour_time, guests, status, listing_id, deposit_status, deposit_amount_cents, booking_value_cents, commission_amount_cents, commission_status, selected_addons, created_at")
            .order("tour_date", { ascending: true })
            .limit(200),
          supabase
            .from("listings")
            .select("id, title, is_active, approval_status, vendor_id, image_url, latitude, longitude, tour_times, is_featured, rating, reviews_count"),
          supabase.from("vendors").select("id, business_name, is_active"),
          supabase.from("listing_reviews").select("id, is_approved"),
          supabase
            .from("concierge_leads")
            .select("id, status, priority, created_at")
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("support_tickets")
            .select("id, status, priority, intent, created_at")
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("guest_trip_plans")
            .select(
              "id, user_id, email, name, pickup_area, arrival_type, trip_date, trip_time, guest_count, source, status, concierge_lead_id, stops, created_at, updated_at",
            )
            .order("updated_at", { ascending: false })
            .limit(50),
        ]);

      setBookings((bookingsResult.data as Booking[]) || []);
      setListings((listingsResult.data as Listing[]) || []);
      setVendors((vendorsResult.data as Vendor[]) || []);
      setReviews((reviewsResult.data as Review[]) || []);
      setConciergeLeads((conciergeResult.data as ConciergeLead[]) || []);
      setSupportTickets((supportResult.data as SupportTicket[]) || []);
      if (guestTripPlansResult.error) {
        setGuestTripPlans([]);
        setGuestTripPlanMessage(
          "Run the guest trip plans SQL setup to show saved map plans here.",
        );
      } else {
        setGuestTripPlans((guestTripPlansResult.data as AdminGuestTripPlan[]) || []);
        setGuestTripPlanMessage("");
      }
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

    const commandCenter = getMarketplaceCommandCenter({
      listings,
      bookings,
      vendors,
      reviews,
    });
    const revenue = getAdminRevenueSummary({ bookings });
    const vendorRevenue = getVendorRevenueLeaderboard({
      bookings,
      listings,
      vendors,
    });
    const bookingMoneyRows = getBookingMoneyRows({
      bookings,
      listings,
      vendors,
    });
    const concierge = conciergeLeadSummary(conciergeLeads);
    const commandDigest = getAdminCommandDigest({
      listings,
      bookings,
      vendors,
      reviews,
      conciergeLeadCount: concierge.activeCount,
    });
    const platformV2 = getPlatformV2OperatingSignals({
      listings,
      bookings,
      vendors,
      reviews,
      conciergeLeads,
    });
    const guestTripPlanSummary = getGuestTripPlanAdminSummary(
      guestTripPlans.map((plan) => ({
        status: plan.status || undefined,
        stops: Array.isArray(plan.stops) ? plan.stops : [],
      })),
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
      concierge,
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
      commandCenter,
      commandDigest,
      platformV2,
      revenue,
      vendorRevenue,
      highValueBookings: bookingMoneyRows
        .filter((booking) => booking.highValue)
        .slice(0, 5),
      supportTickets,
      guestTripPlanSummary,
      recentGuestTripPlans: guestTripPlans.slice(0, 5),
    };
  }, [
    bookings,
    conciergeLeads,
    guestTripPlans,
    listings,
    reviews,
    supportTickets,
    vendors,
  ]);

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
              <PlatformProCommandCenter
                bookings={bookings}
                listings={listings}
                vendors={vendors}
                reviews={reviews}
                supportTickets={supportTickets}
                conciergeLeads={conciergeLeads}
              />

              <div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {[
                  ["New bookings", summary.newBookings],
                  ["Upcoming", summary.upcomingBookings.length],
                  ["Pending listings", summary.pendingListings],
                  ["Concierge leads", summary.concierge.activeCount],
                  ["Saved trip plans", summary.guestTripPlanSummary.total],
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
                <div className="grid gap-4 lg:grid-cols-[1fr_220px] lg:items-center">
                  <div>
                    <p className="text-sm text-gray-600">Unpaid commission</p>
                    <p className="mt-2 text-3xl font-bold text-[#0B3C5D]">
                      {new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(summary.unpaidCommissionCents / 100)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm text-gray-600">Marketplace score</p>
                    <p className="mt-2 text-3xl font-black text-[#0B3C5D]">
                      {summary.commandCenter.marketplaceScore}%
                    </p>
                  </div>
                </div>
              </div>

              <section className="mt-6 rounded-2xl border border-[#D6B56D]/30 bg-[#FFF8E8] p-6">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.16em] text-[#9C7A2F]">
                      Guest trip plans
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                      Saved map plans ready for concierge follow-up.
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {summary.guestTripPlanSummary.label} with{" "}
                      {summary.guestTripPlanSummary.stopCount} saved stop
                      {summary.guestTripPlanSummary.stopCount === 1 ? "" : "s"}.
                    </p>
                  </div>
                  <Link
                    href="/admin/concierge"
                    className="rounded-xl bg-[#0B3C5D] px-4 py-3 text-center text-sm font-black text-white"
                  >
                    Open concierge
                  </Link>
                </div>

                {guestTripPlanMessage ? (
                  <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#7A5A00]">
                    {guestTripPlanMessage}
                  </p>
                ) : summary.recentGuestTripPlans.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-dashed border-[#D6B56D]/50 bg-white/60 px-4 py-3 text-sm text-gray-600">
                    No guests have saved map plans yet.
                  </p>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {summary.recentGuestTripPlans.map((plan) => (
                      <article
                        key={plan.id}
                        className="rounded-2xl bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                          <div>
                            <p className="font-black text-[#0B3C5D]">{plan.name}</p>
                            <p className="mt-1 text-sm text-gray-600">
                              {plan.email} / {plan.pickup_area || "Flexible pickup"}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-black capitalize text-[#007B7B]">
                              {(plan.status || "saved").replaceAll("_", " ")}
                            </span>
                            {plan.concierge_lead_id ? (
                              <Link
                                href="/admin/concierge"
                                className="rounded-full bg-[#0B3C5D] px-3 py-1 text-xs font-black text-white"
                              >
                                Concierge lead ready
                              </Link>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                              Stops
                            </p>
                            <p className="font-black text-[#0B3C5D]">
                              {Array.isArray(plan.stops) ? plan.stops.length : 0}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                              Date
                            </p>
                            <p className="font-black text-[#0B3C5D]">
                              {plan.trip_date || "Flexible"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                              Guests
                            </p>
                            <p className="font-black text-[#0B3C5D]">
                              {plan.guest_count || "Unknown"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                              Updated
                            </p>
                            <p className="font-black text-[#0B3C5D]">
                              {new Date(plan.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="mt-6 rounded-2xl bg-[#071F2F] p-6 text-white shadow-xl shadow-[#071F2F]/10">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#D6B56D]">
                      Admin Revenue Command Center
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      Marketplace money, payouts, and high-value trips.
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
                      Track booking value, deposits, commission, vendor payout
                      estimates, and the vendors driving the most revenue.
                    </p>
                  </div>
                  <ExportCsvButton type="revenue" />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      label: "Marketplace value",
                      value: formatMoney(summary.revenue.grossBookingValueCents),
                      text: summary.revenue.label,
                    },
                    {
                      label: "Confirmed value",
                      value: formatMoney(summary.revenue.confirmedValueCents),
                      text: "Confirmed and completed trips",
                    },
                    {
                      label: "Pending value",
                      value: formatMoney(summary.revenue.pendingValueCents),
                      text: "New or waiting requests",
                    },
                    {
                      label: "Platform commission",
                      value: formatMoney(summary.revenue.platformCommissionCents),
                      text: "Estimated website earnings",
                    },
                    {
                      label: "Vendor payout estimate",
                      value: formatMoney(summary.revenue.vendorPayoutCents),
                      text: "Gross value after commission",
                    },
                    {
                      label: "Paid deposits",
                      value: formatMoney(summary.revenue.paidDepositCents),
                      text: "Collected through checkout",
                    },
                    {
                      label: "Open deposits",
                      value: formatMoney(summary.revenue.unpaidDepositCents),
                      text: "Started or still due",
                    },
                    {
                      label: "Add-on value",
                      value: formatMoney(summary.revenue.addonRevenueCents),
                      text: `Top: ${summary.revenue.topAddonLabel}`,
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-white/10 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9EE8E3]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-2xl font-black text-white">
                        {item.value}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-white/65">
                        {item.text}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <div className="rounded-2xl bg-white p-5 text-[#17324D]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#00A8A8]">
                          Vendor leaderboard
                        </p>
                        <h3 className="mt-1 text-xl font-black text-[#0B3C5D]">
                          Top earning vendors
                        </h3>
                      </div>
                      <Link
                        href="/admin/vendors"
                        className="rounded-xl bg-[#F7F3EA] px-3 py-2 text-sm font-bold text-[#0B3C5D]"
                      >
                        Vendors
                      </Link>
                    </div>
                    {summary.vendorRevenue.length === 0 ? (
                      <p className="mt-4 rounded-xl bg-[#F7F3EA] p-4 text-sm text-gray-600">
                        No revenue-bearing bookings yet.
                      </p>
                    ) : (
                      <div className="mt-4 grid gap-3">
                        {summary.vendorRevenue.slice(0, 5).map((vendor) => (
                          <div
                            key={vendor.vendorId}
                            className="rounded-xl border border-gray-100 bg-[#F7F3EA] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-black text-[#0B3C5D]">
                                  {vendor.vendorName}
                                </p>
                                <p className="mt-1 text-sm text-gray-600">
                                  {vendor.bookingCount} booking
                                  {vendor.bookingCount === 1 ? "" : "s"} /{" "}
                                  {vendor.confirmedCount} confirmed
                                </p>
                              </div>
                              {vendor.needsAttention ? (
                                <span className="rounded-full bg-[#FFF8E8] px-3 py-1 text-xs font-black text-[#9C7A2F]">
                                  Needs follow-up
                                </span>
                              ) : null}
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                              <div>
                                <p className="text-gray-500">Value</p>
                                <p className="font-black text-[#0B3C5D]">
                                  {formatMoney(vendor.grossBookingValueCents)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Commission</p>
                                <p className="font-black text-[#0B3C5D]">
                                  {formatMoney(vendor.commissionCents)}
                                </p>
                              </div>
                              <div>
                                <p className="text-gray-500">Payout</p>
                                <p className="font-black text-[#0B3C5D]">
                                  {formatMoney(vendor.payoutCents)}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl bg-white p-5 text-[#17324D]">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#D6B56D]">
                          High-value trips
                        </p>
                        <h3 className="mt-1 text-xl font-black text-[#0B3C5D]">
                          Watch the biggest requests
                        </h3>
                      </div>
                      <span className="rounded-xl bg-[#F7F3EA] px-3 py-2 text-sm font-bold text-[#0B3C5D]">
                        {summary.revenue.highValueBookingCount} total
                      </span>
                    </div>
                    {summary.highValueBookings.length === 0 ? (
                      <p className="mt-4 rounded-xl bg-[#F7F3EA] p-4 text-sm text-gray-600">
                        No high-value active bookings yet.
                      </p>
                    ) : (
                      <div className="mt-4 grid gap-3">
                        {summary.highValueBookings.map((booking) => (
                          <div
                            key={booking.bookingId}
                            className="rounded-xl border border-gray-100 bg-[#F7F3EA] p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-black text-[#0B3C5D]">
                                  {booking.guestName}
                                </p>
                                <p className="mt-1 text-sm text-gray-600">
                                  {booking.listingTitle} - {booking.vendorName}
                                </p>
                              </div>
                              <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[#0B3C5D]">
                                {formatMoney(booking.bookingValueCents)}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-gray-600">
                              {booking.depositLabel} / payout{" "}
                              {formatMoney(booking.vendorPayoutCents)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="mt-4 rounded-2xl border border-[#00A8A8]/20 bg-white p-5">
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#00A8A8]">
                      Operating digest
                    </p>
                    <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                      {summary.commandDigest.headline}
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      Start with {summary.commandDigest.topAction.label.toLowerCase()}.
                    </p>
                  </div>
                  <Link
                    href={summary.commandDigest.topAction.href}
                    className="rounded-xl bg-[#00A8A8] px-4 py-3 text-center text-sm font-black text-white"
                  >
                    Open top action
                  </Link>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  {summary.commandDigest.items.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`rounded-xl border p-4 transition hover:-translate-y-0.5 ${
                        item.tone === "urgent"
                          ? "border-[#D6B56D]/35 bg-[#FFF8E8]"
                          : item.tone === "quality"
                            ? "border-[#00A8A8]/20 bg-[#EEF7F6]"
                            : "border-gray-200 bg-white"
                      }`}
                    >
                      <p className="text-sm font-bold text-[#0B3C5D]">
                        {item.label}
                      </p>
                      <p className="mt-2 text-3xl font-black text-[#0B3C5D]">
                        {item.value}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-600">
                        {item.text}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>

              <section className="mt-6 rounded-2xl bg-[#071F2F] p-6 text-white shadow-xl shadow-[#071F2F]/10">
                <div className="grid gap-5 lg:grid-cols-[1fr_220px] lg:items-center">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-[#D6B56D]">
                      Platform V2 operations
                    </p>
                    <h2 className="mt-2 text-2xl font-black">
                      Support, quality control, notifications, and growth.
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-white/70">
                      Use this release dashboard to keep the public site useful,
                      support-ready, and easier to trust before guests book.
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9EE8E3]">
                      Platform readiness
                    </p>
                    <p className="mt-2 text-4xl font-black">
                      {summary.platformV2.platformReadinessScore}%
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.82fr]">
                  <div className="rounded-2xl bg-white p-5 text-[#17324D]">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                      <div>
                        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#00A8A8]">
                          Quality control queue
                        </p>
                        <h3 className="mt-1 text-xl font-black text-[#0B3C5D]">
                          Fix these first for better conversion.
                        </h3>
                      </div>
                      <Link
                        href="/support"
                        className="rounded-xl bg-[#EEF7F6] px-4 py-3 text-sm font-black text-[#0B3C5D]"
                      >
                        View support center
                      </Link>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {summary.platformV2.qualityQueue.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="rounded-xl border border-gray-100 bg-[#F7F3EA] p-4 transition hover:-translate-y-0.5 hover:shadow"
                        >
                          <p className="text-sm font-bold text-[#0B3C5D]">
                            {item.label}
                          </p>
                          <p className="mt-2 text-3xl font-black text-[#0B3C5D]">
                            {item.value}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-600">
                            {item.text}
                          </p>
                        </Link>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="rounded-2xl bg-white p-5 text-[#17324D]">
                      <p className="text-sm font-black uppercase tracking-[0.14em] text-[#D6B56D]">
                        Notification center
                      </p>
                      <h3 className="mt-1 text-xl font-black text-[#0B3C5D]">
                        {summary.platformV2.notificationDigest.headline}
                      </h3>
                      <div className="mt-4 grid gap-3">
                        {summary.platformV2.notificationDigest.items.map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="rounded-xl bg-[#F7F3EA] p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="font-black text-[#0B3C5D]">
                                {item.label}
                              </p>
                              <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[#0B3C5D]">
                                {item.value}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-gray-600">
                              {item.text}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-5 text-[#17324D]">
                      <p className="text-sm font-black uppercase tracking-[0.14em] text-[#00A8A8]">
                        Growth layer
                      </p>
                      <div className="mt-4 grid gap-3">
                        {summary.platformV2.growthOpportunities.map((item) => (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="rounded-xl bg-[#EEF7F6] p-4"
                          >
                            <p className="font-black text-[#0B3C5D]">
                              {item.label}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-gray-600">
                              {item.text}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mt-8 rounded-2xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#9C7A2F]">
                      Marketplace command center
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-[#0B3C5D]">
                      Work the highest-impact queue first.
                    </h2>
                  </div>
                  <Link
                    href="/admin/analytics"
                    className="rounded-xl bg-[#0B3C5D] px-4 py-3 text-sm font-semibold text-white"
                  >
                    View analytics
                  </Link>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-4">
                  {summary.commandCenter.priorityCards.map((card) => (
                    <Link
                      key={card.label}
                      href={card.href}
                      className="rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow"
                    >
                      <p className="text-sm text-gray-600">{card.label}</p>
                      <p className="mt-2 text-3xl font-black text-[#0B3C5D]">
                        {card.value}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>

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
                      href="/admin/concierge"
                      className="rounded-xl bg-[#F7F3EA] px-4 py-3 font-semibold text-[#0B3C5D]"
                    >
                      Work concierge leads
                    </Link>
                    <Link
                      href="/admin/listings"
                      className="rounded-xl bg-[#F7F3EA] px-4 py-3 font-semibold text-[#0B3C5D]"
                    >
                      Review pending listings
                    </Link>
                    <Link
                      href="/admin/map-cleanup"
                      className="rounded-xl bg-[#F7F3EA] px-4 py-3 font-semibold text-[#0B3C5D]"
                    >
                      Improve map quality
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
                  <ExportCsvButton type="concierge_leads" />
                  <ExportCsvButton type="concierge_assignments" />
                  <ExportCsvButton type="concierge_quotes" />
                  <ExportCsvButton type="revenue" />
                  <ExportCsvButton type="vendor_payouts" />
                  <ExportCsvButton type="vendor_payout_statements" />
                </div>
              </section>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
