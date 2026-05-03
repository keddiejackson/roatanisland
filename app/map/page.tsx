import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

type Listing = {
  id: string;
  title: string;
  location: string | null;
  category: string | null;
  price: number | null;
  latitude: number | null;
  longitude: number | null;
};

const bounds = {
  north: 16.48,
  south: 16.22,
  west: -86.65,
  east: -86.25,
};

function pinPosition(listing: Listing) {
  if (listing.latitude === null || listing.longitude === null) {
    return null;
  }

  const left =
    ((listing.longitude - bounds.west) / (bounds.east - bounds.west)) * 100;
  const top =
    ((bounds.north - listing.latitude) / (bounds.north - bounds.south)) * 100;

  return {
    left: `${Math.min(Math.max(left, 4), 96)}%`,
    top: `${Math.min(Math.max(top, 6), 94)}%`,
  };
}

export default async function MapPage() {
  const { data } = await supabaseServer
    .from("listings")
    .select("id, title, location, category, price, latitude, longitude")
    .eq("is_active", true)
    .order("location", { ascending: true });
  const listings = (data as Listing[]) || [];
  const pinnedListings = listings.filter((listing) => pinPosition(listing));
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
            Browse Roatan listings by location. Listings with coordinates appear as pins.
          </p>
          <div className="relative mt-8 min-h-[440px] overflow-hidden rounded-2xl bg-[#A9D8D3] shadow-inner">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,#63B8AE_0%,#63B8AE_28%,#EAD59A_28%,#EAD59A_40%,#1A7F76_40%,#1A7F76_100%)]" />
            <div className="absolute inset-x-8 top-1/2 h-16 -translate-y-1/2 rounded-full bg-[#F7E7B1]/90 blur-sm" />
            <div className="absolute left-[8%] top-[18%] rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-[#0B3C5D]">
              West Bay
            </div>
            <div className="absolute right-[18%] top-[34%] rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-[#0B3C5D]">
              Coxen Hole
            </div>
            <div className="absolute right-[8%] bottom-[24%] rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-[#0B3C5D]">
              Oak Ridge
            </div>
            {pinnedListings.map((listing) => {
              const position = pinPosition(listing);
              if (!position) return null;

              return (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  style={position}
                  className="absolute -translate-x-1/2 -translate-y-full rounded-full bg-[#0B3C5D] px-3 py-2 text-xs font-bold text-white shadow-lg ring-4 ring-white/80 transition hover:bg-[#00A8A8]"
                >
                  {listing.title}
                </Link>
              );
            })}
          </div>
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
