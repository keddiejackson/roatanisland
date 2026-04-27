"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type AnalyticsEvent = {
  id: string;
  event_type: string;
  path: string | null;
  listing_id: string | null;
  vendor_id: string | null;
  created_at: string;
};

function countBy(items: AnalyticsEvent[], key: keyof AnalyticsEvent) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const value = item[key];

    if (typeof value === "string" && value) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  });

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupMessage, setSetupMessage] = useState("");

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
    async function fetchAnalytics() {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data, error } = await supabase
        .from("analytics_events")
        .select("id, event_type, path, listing_id, vendor_id, created_at")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        setSetupMessage(
          "Run the updated Supabase SQL setup to enable analytics.",
        );
        setLoading(false);
        return;
      }

      setEvents((data as AnalyticsEvent[]) || []);
      setLoading(false);
    }

    if (authorized) {
      fetchAnalytics();
    }
  }, [authorized]);

  const summary = useMemo(() => {
    const pageViews = events.filter((event) => event.event_type === "page_view");
    const listingViews = pageViews.filter((event) => event.listing_id);
    const vendorViews = pageViews.filter((event) => event.vendor_id);
    const bookingRequests = events.filter(
      (event) => event.event_type === "booking_request",
    );
    const planningLeads = events.filter(
      (event) => event.event_type === "planning_lead",
    );
    const listingSubmissions = events.filter(
      (event) => event.event_type === "vendor_listing_submission",
    );

    return {
      pageViews,
      listingViews,
      vendorViews,
      bookingRequests,
      planningLeads,
      listingSubmissions,
      topPaths: countBy(pageViews, "path"),
      topListings: countBy(listingViews, "listing_id"),
      topVendors: countBy(vendorViews, "vendor_id"),
    };
  }, [events]);

  if (checkingAuth || !authorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <section className="rounded-2xl bg-white p-8 shadow">
          <div>
            <h1 className="text-3xl font-bold text-[#0B3C5D]">Analytics</h1>
            <p className="mt-2 text-gray-600">
              See traffic and important actions from the last 30 days.
            </p>
          </div>

          {setupMessage ? (
            <div className="mt-6 rounded-xl bg-yellow-100 p-4 text-sm text-yellow-900">
              {setupMessage}
            </div>
          ) : null}

          {loading ? (
            <p className="mt-8">Loading analytics...</p>
          ) : (
            <>
              <div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {[
                  ["Page views", summary.pageViews.length],
                  ["Listing views", summary.listingViews.length],
                  ["Vendor views", summary.vendorViews.length],
                  ["Bookings", summary.bookingRequests.length],
                  ["Planning leads", summary.planningLeads.length],
                  ["Vendor listings", summary.listingSubmissions.length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-[#F7F3EA] p-5">
                    <p className="text-sm text-gray-600">{label}</p>
                    <p className="mt-2 text-3xl font-bold text-[#0B3C5D]">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-3">
                {[
                  ["Top pages", summary.topPaths],
                  ["Top listing IDs", summary.topListings],
                  ["Top vendor IDs", summary.topVendors],
                ].map(([title, rows]) => (
                  <div key={title as string} className="rounded-2xl border border-gray-200 p-5">
                    <h2 className="text-xl font-bold text-[#0B3C5D]">
                      {title as string}
                    </h2>
                    {(rows as { label: string; count: number }[]).length ===
                    0 ? (
                      <p className="mt-4 text-sm text-gray-600">
                        No data yet.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {(rows as { label: string; count: number }[]).map(
                          (row) => (
                            <div
                              key={row.label}
                              className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 text-sm"
                            >
                              <span className="truncate text-gray-700">
                                {row.label}
                              </span>
                              <span className="font-bold text-[#0B3C5D]">
                                {row.count}
                              </span>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
