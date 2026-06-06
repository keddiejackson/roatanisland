import Link from "next/link";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
import RoaConcierge from "@/app/concierge/RoaConcierge";
import type { ConciergeListing } from "@/lib/guest-concierge";
import { supabaseServer } from "@/lib/supabase-server";

export const metadata = {
  title: "Roa AI Concierge | RoatanIsland.life",
  description:
    "Meet Roa, your personal Roatan concierge for trip planning, cruise timing, airport pickup, local recommendations, and concierge requests.",
};

export default async function ConciergePage() {
  const { data } = await supabaseServer
    .from("listings")
    .select(
      "id, title, category, location, description, price, rating, reviews_count, tour_times, max_guests",
    )
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("rating", { ascending: false })
    .limit(80);

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-5 py-8 text-[#17324D] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <SiteLogo />
          <nav className="flex flex-wrap gap-2 text-sm font-bold">
            <Link
              href="/"
              className="rounded-xl bg-white px-4 py-2 text-[#0B3C5D] shadow"
            >
              Home
            </Link>
            <Link
              href="/map"
              className="rounded-xl bg-white px-4 py-2 text-[#0B3C5D] shadow"
            >
              Map
            </Link>
            <Link
              href="/account"
              className="rounded-xl bg-[#00A8A8] px-4 py-2 text-white shadow"
            >
              My trips
            </Link>
          </nav>
        </header>

        <section className="mb-6 overflow-hidden rounded-[2rem] bg-[#071F2F] p-6 text-white shadow-2xl shadow-[#071F2F]/10 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#D6B56D]">
            Roa AI Concierge
          </p>
          <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
                Your Personal Roatan Concierge.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
                Ask Roa anything about your island day. It can plan around your
                ship time, flight arrival, hotel pickup, family needs, budget,
                beach style, private-charter dreams, and the real marketplace
                listings on RoatanIsland.life.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {["Ask anything", "Match local options", "Send to concierge"].map(
                (item, index) => (
                  <div
                    key={item}
                    className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold ring-1 ring-white/15"
                  >
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#00A8A8] text-xs text-white">
                      {index + 1}
                    </span>
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

        <RoaConcierge listings={(data || []) as ConciergeListing[]} />
      </div>
      <SiteFooter />
    </main>
  );
}
