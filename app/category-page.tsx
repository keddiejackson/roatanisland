import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import EmptyState from "@/app/EmptyState";
import GuestDesktopNav from "@/app/GuestDesktopNav";
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

const categoryPageCopy: Record<
  string,
  {
    browseTitle: string;
    emptyTitle: string;
    heroImage: string;
  }
> = {
  Hotels: {
    browseTitle: "Hotels & stays",
    emptyTitle: "Hotels & stays are opening soon.",
    heroImage: "/images/hotels-hero.jpg",
  },
  Tours: {
    browseTitle: "Tours & experiences",
    emptyTitle: "Tours & experiences are opening soon.",
    heroImage: "/images/tours-hero.jpg",
  },
  Transport: {
    browseTitle: "Transportation options",
    emptyTitle: "Transportation options are opening soon.",
    heroImage: "/images/transport-hero.jpg",
  },
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
  const pageCopy = categoryPageCopy[category] || {
    browseTitle: `${category} options`,
    emptyTitle: `${category} options are opening soon.`,
    heroImage: "/images/roatan.jpeg",
  };

  return (
    <main className="brand-page min-h-screen">
      <section className="px-4 py-6 text-white sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <header className="grid gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
            <SiteLogo variant="light" />
            <GuestDesktopNav />
          </header>
          <div className="brand-hero-panel relative mt-6 overflow-hidden px-5 py-10 sm:mt-8 sm:px-10 sm:py-16">
            <Image
              src={pageCopy.heroImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[#061D2C]/72" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,29,44,0.96)_0%,rgba(6,29,44,0.7)_55%,rgba(6,29,44,0.32)_100%)]" />
            <div className="relative">
              <p className="motion-rise brand-eyebrow-gold">
                {category}
              </p>
              <h1
                className="motion-rise mt-3 text-3xl font-black leading-tight sm:text-6xl"
                style={{ animationDelay: "80ms" }}
              >
                {title}
              </h1>
              <p
                className="motion-rise mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg sm:leading-8"
                style={{ animationDelay: "160ms" }}
              >
                {description}
              </p>
              <div
                className="motion-rise mt-8 grid max-w-3xl gap-3 sm:grid-cols-3"
                style={{ animationDelay: "240ms" }}
              >
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
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="brand-eyebrow">
              Browse
            </p>
            <h2 className="brand-display mt-2 text-3xl">
              {pageCopy.browseTitle}
            </h2>
          </div>
          <p className="brand-badge">
            {listings.length > 0
              ? `${listings.length} result${listings.length === 1 ? "" : "s"}`
              : "Pre-launch"}
          </p>
        </div>

        {listings.length === 0 ? (
          <EmptyState
            title={pageCopy.emptyTitle}
            text="We're onboarding Roatan's first local operators in this category. Explore the map for context, ask Roa to shape a request now, or list your business to claim a founding spot."
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
