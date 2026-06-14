import Link from "next/link";
import { connection } from "next/server";
import SiteLogo from "@/app/SiteLogo";
import SiteFooter from "@/app/SiteFooter";
import MapBrowser from "@/app/map/MapBrowser";
import { supabaseServer } from "@/lib/supabase-server";

export type MapListing = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: string | null;
  price: number | null;
  image_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  latitude: number | null;
  longitude: number | null;
  tour_times: string[] | null;
  blocked_dates: string[] | null;
  max_guests: number | null;
};

export default async function MapPage() {
  await connection();

  const { data } = await supabaseServer
    .from("listings")
    .select(
      "id, title, description, location, category, price, image_url, rating, reviews_count, latitude, longitude, tour_times, blocked_dates, max_guests",
    )
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <main className="brand-page min-h-screen overflow-x-hidden px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-7xl min-w-0">
        <header className="mb-6 grid gap-4 sm:mb-8 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <SiteLogo />
          <div className="mobile-scroll-row flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
            <Link
              href="/"
              className="brand-button-secondary shrink-0"
            >
              Home
            </Link>
            <Link
              href="/tours"
              className="brand-button-secondary shrink-0"
            >
              Tours
            </Link>
            <Link
              href="/vendor/signup"
              className="brand-button-primary shrink-0"
            >
              <span className="sm:hidden">List</span>
              <span className="hidden sm:inline">List your business</span>
            </Link>
          </div>
        </header>

        <section className="mb-5">
          <p className="brand-eyebrow">
            Plan by place
          </p>
          <h1 className="brand-display mt-2 text-4xl sm:text-5xl">
            Roatan Day Map
          </h1>
          <p className="brand-subtitle mt-3 max-w-2xl">
            Choose a start point, pick a day style, then save the stops that fit.
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-[#D6B56D]/25 bg-white/80 p-2 text-center shadow-sm sm:hidden">
            <span className="brand-badge brand-badge-teal justify-center px-2 py-2">
              Airport
            </span>
            <span className="brand-badge justify-center px-2 py-2">Cruise</span>
            <span className="brand-badge brand-badge-teal justify-center px-2 py-2">
              Beach
            </span>
          </div>
        </section>

        <MapBrowser listings={(data as MapListing[]) || []} />
      </div>
      <SiteFooter />
    </main>
  );
}
