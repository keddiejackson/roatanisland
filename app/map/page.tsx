import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

type Listing = {
  id: string;
  title: string;
  location: string | null;
  category: string | null;
  price: number | null;
};

export default async function MapPage() {
  const { data } = await supabaseServer
    .from("listings")
    .select("id, title, location, category, price")
    .eq("is_active", true)
    .order("location", { ascending: true });
  const listings = (data as Listing[]) || [];
  const locations = new Map<string, Listing[]>();
  listings.forEach((listing) => {
    const location = listing.location || "Roatan";
    locations.set(location, [...(locations.get(location) || []), listing]);
  });

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-12 text-[#17324D]">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#0B3C5D]">RoatanIsland.life</Link>
          <Link href="/" className="rounded-xl bg-white px-4 py-2 font-semibold shadow">Home</Link>
        </header>
        <section className="rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold text-[#0B3C5D]">Map View</h1>
          <p className="mt-2 text-gray-600">
            Browse listings grouped by area. A full interactive map can be connected later with map coordinates.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {[...locations.entries()].map(([location, rows]) => (
              <div key={location} className="rounded-2xl bg-[#F7F3EA] p-5">
                <h2 className="text-xl font-bold text-[#0B3C5D]">{location}</h2>
                <div className="mt-4 grid gap-3">
                  {rows.map((listing) => (
                    <Link key={listing.id} href={`/listings/${listing.id}`} className="rounded-xl bg-white p-4">
                      <p className="font-semibold text-[#0B3C5D]">{listing.title}</p>
                      <p className="mt-1 text-sm text-gray-600">{listing.category || "Listing"} {listing.price ? `- $${listing.price}` : ""}</p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
