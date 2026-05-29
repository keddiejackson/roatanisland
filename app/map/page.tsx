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
    <main className="brand-page min-h-screen overflow-x-hidden px-5 py-10 sm:px-6">
      <div className="mx-auto max-w-7xl min-w-0">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <SiteLogo />
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="brand-button-secondary"
            >
              Home
            </Link>
            <Link
              href="/tours"
              className="brand-button-secondary"
            >
              Tours
            </Link>
            <Link
              href="/vendor/signup"
              className="brand-button-primary"
            >
              List your business
            </Link>
          </div>
        </header>

        <section className="mb-6">
          <p className="brand-eyebrow">
            Explore by area
          </p>
          <h1 className="brand-display mt-2 text-4xl sm:text-5xl">
            Roatan trip map
          </h1>
          <p className="brand-subtitle mt-3 max-w-2xl">
            Plan around the airport, cruise ports, beaches, and private island
            days. Exact coordinates show as precise pins; area-only listings are
            grouped near their listed town or beach.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
            {["Airport pickup", "Cruise ports", "Beach areas", "Trip planner"].map(
              (item) => (
                <span
                  key={item}
                  className="brand-badge"
                >
                  {item}
                </span>
              ),
            )}
          </div>
        </section>

        <MapBrowser listings={(data as MapListing[]) || []} />
      </div>
      <SiteFooter />
    </main>
  );
}
