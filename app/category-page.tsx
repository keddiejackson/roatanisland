import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import EmptyState from "@/app/EmptyState";
import SiteLogo from "@/app/SiteLogo";
import SiteFooter from "@/app/SiteFooter";
import { getPremiumListingCardPolish } from "@/lib/marketplace-upgrade";
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

export default async function CategoryPage({
  category,
  title,
  description,
}: {
  category: string;
  title: string;
  description: string;
}) {
  await connection();

  const { data } = await supabaseServer
    .from("listings")
    .select("id, title, description, price, location, image_url, rating")
    .eq("category", category)
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });
  const listings = (data as Listing[]) || [];

  return (
    <main className="brand-page min-h-screen">
      <section className="px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <SiteLogo variant="light" />
            <div className="flex flex-wrap gap-2">
              <Link
                href="/"
                className="brand-button-secondary"
              >
                Home
              </Link>
              <Link
                href="/map"
                className="brand-button-ghost"
              >
                Map
              </Link>
            </div>
          </header>
          <div className="brand-hero-panel mt-8 px-6 py-14 sm:px-10 sm:py-16">
            <p className="brand-eyebrow-gold">
              {category}
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">
              {title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
              {description}
            </p>
            <div className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-3">
              {[
                "Locally listed",
                "Map-friendly planning",
                "Request before confirm",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl bg-white/10 p-4 text-sm font-semibold ring-1 ring-white/15"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="brand-eyebrow">
              Browse
            </p>
            <h2 className="brand-display mt-2 text-3xl">
              {category} listings
            </h2>
          </div>
          <p className="brand-badge">
            {listings.length} result{listings.length === 1 ? "" : "s"}
          </p>
        </div>

        {listings.length === 0 ? (
          <EmptyState
            title={`No active ${category.toLowerCase()} listings yet.`}
            text="This section is ready for local operators. Explore the map for nearby options or add your business to help grow the marketplace."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => {
              const cardPolish = getPremiumListingCardPolish({
                ...listing,
                category,
              });

              return (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="brand-card-lift group overflow-hidden"
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
                      <div className="brand-skeleton flex h-full items-center justify-center text-center text-sm font-black uppercase tracking-[0.12em] text-[#0B3C5D]/65">
                        Premium photo pending
                      </div>
                    )}
                    <span className="absolute bottom-4 right-4 rounded-full bg-[#0B3C5D] px-3 py-1 text-sm font-bold text-white shadow">
                      {cardPolish.priceLabel}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-lg font-bold text-[#0B3C5D]">
                        {listing.title}
                      </h3>
                      <span className="brand-badge brand-badge-teal shrink-0">
                        {cardPolish.primaryBadge}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                      {cardPolish.benefitLine}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
                      <span className="text-gray-500">
                        {listing.location || "Roatan"}
                      </span>
                      <span className="font-black text-[#007B7B]">
                        View details
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
