import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import SiteLogo from "@/app/SiteLogo";
import SiteFooter from "@/app/SiteFooter";
import ListingGallery from "@/app/listings/[id]/ListingGallery";
import ReviewForm from "@/app/listings/[id]/ReviewForm";
import ReportListingForm from "@/app/listings/[id]/ReportListingForm";
import {
  appleMapsUrl,
  distanceMiles,
  findAreaPosition,
  googleMapsUrl,
} from "@/lib/map";
import {
  buildGoodToKnow,
  buildListingHighlights,
  getTourTimeLabels,
} from "@/lib/listing-detail";
import { supabaseServer } from "@/lib/supabase-server";

type Listing = {
  id: string;
  vendor_id: string | null;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  image_url: string | null;
  gallery_image_urls: string[] | null;
  category: string | null;
  tour_times: string[] | null;
  availability_note: string | null;
  max_guests: number | null;
  minimum_notice_hours: number | null;
  is_active: boolean | null;
  rating: number | null;
  reviews_count: number | null;
  latitude: number | null;
  longitude: number | null;
};

type Vendor = {
  id: string;
  business_name: string;
  contact_name: string | null;
  notes: string | null;
  profile_image_url: string | null;
  website: string | null;
  show_website: boolean | null;
  is_verified: boolean | null;
};

type Review = {
  id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  photo_urls: string[] | null;
  created_at: string;
};

type NearbyListing = Pick<
  Listing,
  | "id"
  | "title"
  | "price"
  | "location"
  | "image_url"
  | "category"
  | "latitude"
  | "longitude"
>;

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
  let nearbyListings: (NearbyListing & { distanceLabel: string })[] = [];
  const galleryImages = [
    listing?.image_url || "",
    ...((listing?.gallery_image_urls || []) as string[]),
  ].filter(Boolean);

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
      .select(
        "id, business_name, contact_name, notes, profile_image_url, website, show_website, is_verified",
      )
      .eq("id", listing.vendor_id)
      .eq("is_active", true)
      .maybeSingle();

    vendor = data as Vendor | null;
  }

  const { data: reviewData } = await supabaseServer
    .from("listing_reviews")
    .select("id, reviewer_name, rating, comment, photo_urls, created_at")
    .eq("listing_id", listing.id)
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(12);

  reviews = (reviewData as Review[]) || [];

  const { data: nearbyData } = await supabaseServer
    .from("listings")
    .select("id, title, price, location, image_url, category, latitude, longitude")
    .eq("is_active", true)
    .neq("id", listing.id)
    .limit(24);

  const listingPoint =
    listing.latitude !== null && listing.longitude !== null
      ? { latitude: listing.latitude, longitude: listing.longitude }
      : findAreaPosition(listing.location);

  nearbyListings = (((nearbyData as NearbyListing[]) || [])
    .map((nearby) => {
      const nearbyPoint =
        nearby.latitude !== null && nearby.longitude !== null
          ? { latitude: nearby.latitude, longitude: nearby.longitude }
          : findAreaPosition(nearby.location);
      const distance = distanceMiles(listingPoint, nearbyPoint);

      return {
        ...nearby,
        distance,
        distanceLabel:
          distance < 0.5 ? "Nearby" : `${distance.toFixed(1)} miles away`,
      };
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3)) as (NearbyListing & { distanceLabel: string })[];

  const priceLabel = formatPrice(listing.price);
  const tourTimeLabels = getTourTimeLabels(listing.tour_times);
  const highlights = buildListingHighlights({
    category: listing.category,
    location: listing.location,
    reviewsCount: listing.reviews_count,
    maxGuests: listing.max_guests,
    minimumNoticeHours: listing.minimum_notice_hours,
    priceLabel,
  });
  const goodToKnow = buildGoodToKnow({
    availabilityNote: listing.availability_note,
    maxGuests: listing.max_guests,
    minimumNoticeHours: listing.minimum_notice_hours,
  });

  return (
    <main className="min-h-screen bg-[#F7F3EA] text-[#17324D]">
      <section className="relative min-h-[620px] overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#F7F3EA]" />

        <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col justify-between px-5 py-6 sm:px-6 sm:py-8">
          <header className="flex flex-wrap items-center justify-between gap-4 text-white">
            <SiteLogo variant="light" />
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href="/"
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
              >
                All listings
              </Link>
              <Link
                href={`/map?selected=${listing.id}`}
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
              >
                Map
              </Link>
              <Link
                href={`/book?listing=${listing.id}`}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] transition hover:bg-[#EEF7F6]"
              >
                Book
              </Link>
            </div>
          </header>

          <div className="max-w-5xl pb-16 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9EE8E3]">
              {listing.category || "Roatan experience"}
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black leading-[1.02] sm:text-7xl">
              {listing.title}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/82">
              {listing.description ||
                "A local Roatan experience with booking requests reviewed before confirmation."}
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
              <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur">
                {listing.location || "Roatan"}
              </span>
              <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur">
                {listing.rating ?? 5}/5 rating
              </span>
              <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur">
                {priceLabel} starting price
              </span>
              {vendor ? (
                <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur">
                  By {vendor.business_name}
                </span>
              ) : null}
              <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur">
                Request reviewed before confirmation
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <article className="space-y-8">
          <section className="rounded-lg bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
                  Experience overview
                </p>
                <h2 className="mt-2 text-3xl font-black text-[#0B3C5D]">
                  What to expect
                </h2>
              </div>
              <Link
                href={`/book?listing=${listing.id}`}
                className="rounded-lg bg-[#00A8A8] px-5 py-3 text-center font-bold text-white transition hover:bg-[#078F8F]"
              >
                Request this listing
              </Link>
            </div>
            <p className="mt-5 text-lg leading-8 text-gray-700">
              {listing.description ||
                "Details for this experience are coming soon."}
            </p>

            <ListingGallery title={listing.title} images={galleryImages} />
          </section>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {highlights.map((highlight) => (
              <div
                key={highlight.label}
                className="rounded-lg border border-[#D6B56D]/20 bg-white p-5 shadow-sm"
              >
                <p className="text-sm text-gray-500">{highlight.label}</p>
                <p className="mt-2 text-lg font-black text-[#0B3C5D]">
                  {highlight.value}
                </p>
              </div>
            ))}
          </div>

          {vendor ? (
            <section className="rounded-lg border border-[#00A8A8]/20 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                {vendor.profile_image_url ? (
                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-[#D8EFEC]">
                    <Image
                      src={vendor.profile_image_url}
                      alt={vendor.business_name}
                      fill
                      sizes="96px"
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg bg-[#0B3C5D] text-3xl font-black text-white">
                    {vendor.business_name.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
                    Local operator
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black text-[#0B3C5D]">
                      {vendor.business_name}
                    </h2>
                    {vendor.is_verified ? (
                      <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#007B7B]">
                        Verified
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
                    {vendor.notes ||
                      "View this operator's public profile for more Roatan listings and contact options."}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/vendors/${vendor.id}`}
                  className="rounded-lg bg-[#00A8A8] px-5 py-3 font-semibold text-white"
                >
                  View vendor profile
                </Link>
                {vendor.show_website !== false && vendor.website ? (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-[#00A8A8] px-5 py-3 font-semibold text-[#007B7B]"
                  >
                    Visit website
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}

          <section className="rounded-lg bg-[#071F2F] p-6 text-white shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#D6B56D]">
                  Good to know
                </p>
                <h2 className="mt-2 text-3xl font-black">
                  Plan with the right details.
                </h2>
              </div>
              <Link
                href={`/map?selected=${listing.id}`}
                className="rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-center text-sm font-bold text-white"
              >
                See area map
              </Link>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {goodToKnow.map((note) => (
                <div
                  key={note}
                  className="rounded-lg border border-white/15 bg-white/10 p-4"
                >
                  <p className="text-sm leading-6 text-white/82">{note}</p>
                </div>
              ))}
            </div>
          </section>

          {nearbyListings.length > 0 ? (
            <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
                Nearby
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#0B3C5D]">
                More experiences in this area
              </h2>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {nearbyListings.map((nearby) => (
                  <Link
                    key={nearby.id}
                    href={`/listings/${nearby.id}`}
                    className="overflow-hidden rounded-lg bg-[#F7F3EA] transition hover:-translate-y-0.5 hover:shadow"
                  >
                    <div className="relative h-36 bg-[#D8EFEC]">
                      {nearby.image_url ? (
                        <Image
                          src={nearby.image_url}
                          alt={nearby.title}
                          fill
                          sizes="220px"
                          unoptimized
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-[#00A8A8]">
                        {nearby.category || "Listing"}
                      </p>
                      <h3 className="mt-1 font-bold text-[#0B3C5D]">
                        {nearby.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600">
                        {nearby.distanceLabel} - {formatPrice(nearby.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-[#D6B56D]/20">
            <h2 className="text-xl font-bold text-[#0B3C5D]">
              How booking works
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
          </section>

          <section
            id="review"
            className="scroll-mt-24 rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200"
          >
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
              <div className="mt-5 rounded-lg bg-[#F7F3EA] p-5">
                <p className="font-bold text-[#0B3C5D]">
                  Reviews are coming soon.
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Approved guest reviews will appear here after travelers share
                  their experience.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4">
                {reviews.map((review) => (
                  <article key={review.id} className="rounded-lg bg-[#F7F3EA] p-5">
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
                    {review.photo_urls && review.photo_urls.length > 0 ? (
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {review.photo_urls.slice(0, 6).map((photoUrl, index) => (
                          <div
                            key={`${photoUrl}-${index}`}
                            className="relative h-32 overflow-hidden rounded-lg bg-[#D8EFEC]"
                          >
                            <Image
                              src={photoUrl}
                              alt={`${review.reviewer_name} review photo ${index + 1}`}
                              fill
                              sizes="180px"
                              unoptimized
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <h2 className="text-2xl font-bold text-[#0B3C5D]">
              Leave a review
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Reviews are checked before they appear publicly.
            </p>
            <div className="mt-5">
              <ReviewForm listingId={listing.id} />
            </div>
          </section>
        </article>

        <aside className="h-fit rounded-lg bg-white p-5 shadow-xl shadow-[#071F2F]/10 lg:sticky lg:top-6">
          <div className="rounded-lg bg-[#071F2F] p-5 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9EE8E3]">
              Request booking
            </p>
            <div className="mt-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm text-white/65">Starting from</p>
                <p className="text-4xl font-black">{priceLabel}</p>
              </div>
              <span className="rounded-full bg-white/12 px-3 py-1 text-sm font-semibold">
                {listing.rating ?? 5}/5
              </span>
            </div>
            <Link
              href={`/book?listing=${listing.id}`}
              className="mt-6 block w-full rounded-lg bg-[#00A8A8] px-6 py-4 text-center text-lg font-bold text-white transition hover:bg-[#078F8F]"
            >
              Request booking
            </Link>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Submit your preferred date and group size. The operator confirms
              availability before your plans are final.
            </p>
          </div>

          <div className="mt-5 border-t border-gray-100 pt-5">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0B3C5D]">
              Available times
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {tourTimeLabels.map((time) => (
                <span
                  key={time}
                  className="rounded-full bg-[#EEF7F6] px-3 py-1 text-sm font-semibold text-[#0B3C5D]"
                >
                  {time}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-5 border-t border-gray-100 pt-5">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#0B3C5D]">
              Location planning
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Use the map for airport, cruise port, and beach-area timing before
              sending your request.
            </p>
            <Link
              href={`/map?selected=${listing.id}`}
              className="mt-4 block rounded-lg border border-[#00A8A8]/30 bg-[#EEF7F6] px-4 py-3 text-center text-sm font-bold text-[#0B3C5D]"
            >
              View on Roatan map
            </Link>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={googleMapsUrl({
                  latitude: listing.latitude,
                  longitude: listing.longitude,
                  location: listing.location,
                  title: listing.title,
                })}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-[#F7F3EA] px-4 py-3 text-center text-sm font-semibold text-[#0B3C5D]"
              >
                Google Maps
              </a>
              <a
                href={appleMapsUrl({
                  latitude: listing.latitude,
                  longitude: listing.longitude,
                  location: listing.location,
                  title: listing.title,
                })}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-[#F7F3EA] px-4 py-3 text-center text-sm font-semibold text-[#0B3C5D]"
              >
                Apple Maps
              </a>
            </div>
          </div>

          <div className="mt-5 border-t border-gray-100 pt-5">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#9C7A2F]">
              Booking confidence
            </p>
            <ul className="mt-3 grid gap-2 text-sm leading-6 text-gray-600">
              {goodToKnow.slice(0, 3).map((note) => (
                <li key={note} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#D6B56D]" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          <ReportListingForm listingId={listing.id} />
        </aside>
      </section>
      <SiteFooter />
    </main>
  );
}
