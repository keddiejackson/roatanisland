import Link from "next/link";
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
};

export default async function MapPage() {
  const { data } = await supabaseServer
    .from("listings")
    .select(
      "id, title, description, location, category, price, image_url, rating, reviews_count, latitude, longitude",
    )
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-5 py-10 text-[#17324D] sm:px-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold text-[#0B3C5D]">
            RoatanIsland.life
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow"
            >
              Home
            </Link>
            <Link
              href="/vendor/signup"
              className="rounded-xl bg-[#00A8A8] px-4 py-2 text-sm font-semibold text-white shadow"
            >
              List your business
            </Link>
          </div>
        </header>

        <section className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
            Explore by area
          </p>
          <h1 className="mt-2 text-4xl font-bold text-[#0B3C5D] sm:text-5xl">
            Roatan map
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-gray-600">
            Browse tours, stays, and transport by island area. Exact coordinates
            show as precise pins; area-only listings are grouped near their
            listed town or beach.
          </p>
        </section>

        <MapBrowser listings={(data as MapListing[]) || []} />
      </div>
    </main>
  );
}
