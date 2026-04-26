import Link from "next/link";
import Image from "next/image";
import { createClient } from "@supabase/supabase-js";

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  image_url: string | null;
  category: string | null;
  is_active: boolean | null;
  rating: number | null;
  reviews_count: number | null;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function getListing(id: string) {
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  const listing = data as Listing | null;

  if (listing?.is_active === false) {
    return null;
  }

  return listing;
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) {
    return (
      <main className="min-h-screen bg-[#F7F3EA] px-6 py-16 text-[#17324D]">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-[#0B3C5D]">
            Listing not found
          </h1>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
          >
            Back to listings
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F3EA] text-[#17324D]">
      <section className="relative min-h-[520px] overflow-hidden">
        {listing.image_url ? (
          <Image
            src={listing.image_url}
            alt={listing.title}
            fill
            priority
            sizes="100vw"
            unoptimized
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[#D8EFEC]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/25 to-[#F7F3EA]" />

        <div className="relative mx-auto flex min-h-[520px] max-w-7xl flex-col justify-between px-6 py-8">
          <header className="flex items-center justify-between text-white">
            <Link href="/" className="text-xl font-bold">
              RoatanIsland.life
            </Link>
            <Link
              href="/"
              className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
            >
              All listings
            </Link>
          </header>

          <div className="max-w-4xl pb-14 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9EE8E3]">
              {listing.category || "Roatan experience"}
            </p>
            <h1 className="mt-4 text-5xl font-bold leading-tight sm:text-6xl">
              {listing.title}
            </h1>
            <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
              <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur">
                {listing.location || "Roatan"}
              </span>
              <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur">
                {listing.rating ?? 5}/5 rating
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-12 lg:grid-cols-[1fr_380px]">
        <article className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
            About this listing
          </p>
          <p className="mt-4 text-lg leading-8 text-gray-700">
            {listing.description || "Details for this experience are coming soon."}
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-[#EEF7F6] p-4">
              <p className="text-sm text-gray-500">Category</p>
              <p className="mt-1 font-bold text-[#0B3C5D]">
                {listing.category || "Experience"}
              </p>
            </div>
            <div className="rounded-xl bg-[#EEF7F6] p-4">
              <p className="text-sm text-gray-500">Location</p>
              <p className="mt-1 font-bold text-[#0B3C5D]">
                {listing.location || "Roatan"}
              </p>
            </div>
            <div className="rounded-xl bg-[#EEF7F6] p-4">
              <p className="text-sm text-gray-500">Reviews</p>
              <p className="mt-1 font-bold text-[#0B3C5D]">
                {listing.reviews_count ?? 0}
              </p>
            </div>
          </div>
        </article>

        <aside className="h-fit rounded-2xl bg-white p-6 shadow lg:sticky lg:top-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
            Request booking
          </p>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Starting from</p>
              <p className="text-4xl font-bold text-[#0B3C5D]">
                {listing.price ? `$${listing.price}` : "Ask"}
              </p>
            </div>
            <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-sm font-semibold text-[#0B3C5D]">
              {listing.rating ?? 5}/5
            </span>
          </div>

          <Link href={`/book?listing=${listing.id}`}>
            <button className="mt-6 w-full rounded-xl bg-[#00A8A8] px-6 py-4 text-lg font-semibold text-white transition hover:bg-[#078F8F]">
              Book This Experience
            </button>
          </Link>

          <p className="mt-4 text-sm leading-6 text-gray-500">
            Submit your preferred date and group size. The local operator will
            confirm availability before your plans are final.
          </p>
        </aside>
      </section>
    </main>
  );
}
