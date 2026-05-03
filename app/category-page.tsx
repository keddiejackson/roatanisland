import Image from "next/image";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase-server";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  image_url: string | null;
  rating: number | null;
};

function formatPrice(price: number | null) {
  if (!price) {
    return "Ask";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

export default async function CategoryPage({
  category,
  title,
  description,
}: {
  category: string;
  title: string;
  description: string;
}) {
  const { data } = await supabaseServer
    .from("listings")
    .select("id, title, description, price, location, image_url, rating")
    .eq("category", category)
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });
  const listings = (data as Listing[]) || [];

  return (
    <main className="min-h-screen bg-[#F7F3EA] text-[#17324D]">
      <section className="bg-[#0B3C5D] px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="text-xl font-bold">
              RoatanIsland.life
            </Link>
            <Link
              href="/"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D]"
            >
              Home
            </Link>
          </header>
          <div className="py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9EE8E3]">
              {category}
            </p>
            <h1 className="mt-3 text-4xl font-bold sm:text-6xl">{title}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
              {description}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
              Browse
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
              {category} listings
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            {listings.length} result{listings.length === 1 ? "" : "s"}
          </p>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#00A8A8]/40 bg-white p-10 text-center text-gray-600">
            No active listings yet.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="group overflow-hidden rounded-2xl bg-white shadow transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative h-56 bg-[#D8EFEC]">
                  {listing.image_url ? (
                    <Image
                      src={listing.image_url}
                      alt={listing.title}
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      unoptimized
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[#0B3C5D]/60">
                      No image yet
                    </div>
                  )}
                  <span className="absolute bottom-4 right-4 rounded-full bg-[#0B3C5D] px-3 py-1 text-sm font-bold text-white shadow">
                    {formatPrice(listing.price)}
                  </span>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold text-[#0B3C5D]">
                    {listing.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                    {listing.description || "Details coming soon."}
                  </p>
                  <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
                    <span className="text-gray-500">
                      {listing.location || "Roatan"}
                    </span>
                    <span className="font-semibold text-[#0B3C5D]">
                      {listing.rating ?? 5}/5
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
