import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import ReviewForm from "@/app/listings/[id]/ReviewForm";
import { supabaseServer } from "@/lib/supabase-server";

type Listing = {
  id: string;
  vendor_id: string | null;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  image_url: string | null;
  category: string | null;
  tour_times: string[] | null;
  availability_note: string | null;
  max_guests: number | null;
  minimum_notice_hours: number | null;
  is_active: boolean | null;
  rating: number | null;
  reviews_count: number | null;
};

type Vendor = {
  id: string;
  business_name: string;
  website: string | null;
};

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
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

async function getListing(id: string) {
  const { data } = await supabaseServer
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

function getTourTimes(listing: Listing) {
  return listing.tour_times && listing.tour_times.length > 0
    ? listing.tour_times
    : ["10:30 AM", "4:30 PM Sunset Cruise"];
}

function seoDescription(listing: Listing) {
  return (
    listing.description ||
    `${listing.category || "Experience"} in ${listing.location || "Roatan"} on RoatanIsland.life.`
  ).slice(0, 160);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) {
    return {
      title: "Listing not found | RoatanIsland.life",
    };
  }

  const description = seoDescription(listing);

  return {
    title: `${listing.title} | RoatanIsland.life`,
    description,
    openGraph: {
      title: listing.title,
      description,
      type: "website",
      images: listing.image_url
        ? [{ url: listing.image_url, alt: listing.title }]
        : undefined,
    },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  let vendor: Vendor | null = null;
  let reviews: Review[] = [];

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

  if (listing.vendor_id) {
    const { data } = await supabaseServer
      .from("vendors")
      .select("id, business_name, website")
      .eq("id", listing.vendor_id)
      .eq("is_active", true)
      .maybeSingle();

    vendor = data as Vendor | null;
  }

  const { data: reviewData } = await supabaseServer
    .from("listing_reviews")
    .select("id, reviewer_name, rating, comment, created_at")
    .eq("listing_id", listing.id)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(12);

  reviews = (reviewData as Review[]) || [];

  return (
    <main className="min-h-screen bg-[#F7F3EA] text-[#17324D]">
      <section className="relative min-h-[560px] overflow-hidden">
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

        <div className="relative mx-auto flex min-h-[560px] max-w-7xl flex-col justify-between px-6 py-8">
          <header className="flex items-center justify-between gap-4 text-white">
            <Link href="/" className="text-xl font-bold">
              RoatanIsland.life
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
              >
                All listings
              </Link>
              <Link
                href={`/book?listing=${listing.id}`}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] transition hover:bg-[#EEF7F6]"
              >
                Book
              </Link>
            </div>
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
              <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur">
                {formatPrice(listing.price)} starting price
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

          {listing.max_guests || listing.minimum_notice_hours ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {listing.max_guests ? (
                <div className="rounded-xl bg-[#EEF7F6] p-4">
                  <p className="text-sm text-gray-500">Capacity</p>
                  <p className="mt-1 font-bold text-[#0B3C5D]">
                    Up to {listing.max_guests} guests
                  </p>
                </div>
              ) : null}
              {listing.minimum_notice_hours ? (
                <div className="rounded-xl bg-[#EEF7F6] p-4">
                  <p className="text-sm text-gray-500">Minimum notice</p>
                  <p className="mt-1 font-bold text-[#0B3C5D]">
                    {listing.minimum_notice_hours} hours
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {vendor ? (
            <div className="mt-8 rounded-2xl border border-[#00A8A8]/20 bg-white p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
                Local operator
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#0B3C5D]">
                {vendor.business_name}
              </h2>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href={`/vendors/${vendor.id}`}
                  className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
                >
                  View Profile
                </Link>
                {vendor.website ? (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-[#00A8A8] px-5 py-3 font-semibold text-[#007B7B]"
                  >
                    Website
                  </a>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-8 rounded-2xl bg-[#F7F3EA] p-6">
            <h2 className="text-xl font-bold text-[#0B3C5D]">
              Before you book
            </h2>
            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <div>
                <p className="font-semibold text-[#0B3C5D]">Request</p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Send your preferred date, time, and group size.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#0B3C5D]">Review</p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  The operator checks availability and details.
                </p>
              </div>
              <div>
                <p className="font-semibold text-[#0B3C5D]">Confirm</p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Your plans are confirmed after the operator follows up.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-gray-200">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
                  Guest reviews
                </p>
                <h2 className="mt-2 text-2xl font-bold text-[#0B3C5D]">
                  What travelers say
                </h2>
              </div>
              <p className="text-sm font-semibold text-[#0B3C5D]">
                {listing.rating ?? 5}/5 from {listing.reviews_count ?? 0} review
                {(listing.reviews_count ?? 0) === 1 ? "" : "s"}
              </p>
            </div>

            {reviews.length === 0 ? (
              <p className="mt-5 rounded-xl bg-[#F7F3EA] p-4 text-sm text-gray-600">
                No approved reviews yet.
              </p>
            ) : (
              <div className="mt-5 grid gap-4">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-xl bg-[#F7F3EA] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-bold text-[#0B3C5D]">
                        {review.reviewer_name}
                      </h3>
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#0B3C5D]">
                        {review.rating}/5
                      </span>
                    </div>
                    <p className="mt-3 leading-7 text-gray-700">
                      {review.comment}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-gray-200">
            <h2 className="text-2xl font-bold text-[#0B3C5D]">
              Leave a review
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Reviews are checked before they appear publicly.
            </p>
            <div className="mt-5">
              <ReviewForm listingId={listing.id} />
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
                {formatPrice(listing.price)}
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

          <div className="mt-6 rounded-xl bg-[#F7F3EA] p-4">
            <p className="text-sm font-semibold text-[#0B3C5D]">
              Available times
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {getTourTimes(listing).map((time) => (
                <span
                  key={time}
                  className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#0B3C5D]"
                >
                  {time}
                </span>
              ))}
            </div>
            {listing.availability_note ? (
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {listing.availability_note}
              </p>
            ) : null}
            {listing.max_guests || listing.minimum_notice_hours ? (
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {[
                  listing.max_guests
                    ? `Up to ${listing.max_guests} guests`
                    : "",
                  listing.minimum_notice_hours
                    ? `${listing.minimum_notice_hours} hours notice`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" - ")}
              </p>
            ) : null}
          </div>

          <p className="mt-4 text-sm leading-6 text-gray-500">
            Submit your preferred date and group size. The local operator will
            confirm availability before your plans are final.
          </p>
        </aside>
      </section>
    </main>
  );
}
