import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase-server";

type Vendor = {
  id: string;
  business_name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  profile_image_url: string | null;
  show_contact_name: boolean | null;
  show_email: boolean | null;
  show_phone: boolean | null;
  show_website: boolean | null;
  is_active: boolean | null;
};

type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  location: string | null;
  image_url: string | null;
  category: string | null;
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

async function getVendor(id: string) {
  const { data } = await supabaseServer
    .from("vendors")
    .select(
      "id, business_name, contact_name, email, phone, website, notes, profile_image_url, show_contact_name, show_email, show_phone, show_website, is_active",
    )
    .eq("id", id)
    .maybeSingle();

  const vendor = data as Vendor | null;

  if (vendor?.is_active === false) {
    return null;
  }

  return vendor;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vendor = await getVendor(id);

  if (!vendor) {
    return {
      title: "Vendor not found | RoatanIsland.life",
    };
  }

  const description = (
    vendor.notes || `Browse active Roatan listings from ${vendor.business_name}.`
  ).slice(0, 160);

  return {
    title: `${vendor.business_name} | RoatanIsland.life`,
    description,
    openGraph: {
      title: vendor.business_name,
      description,
      type: "profile",
      images: vendor.profile_image_url
        ? [{ url: vendor.profile_image_url, alt: vendor.business_name }]
        : undefined,
    },
  };
}

export default async function VendorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const vendor = await getVendor(id);

  if (!vendor || vendor.is_active === false) {
    return (
      <main className="min-h-screen bg-[#F7F3EA] px-6 py-16 text-[#17324D]">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-[#0B3C5D]">
            Vendor profile not found
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

  const { data: listingsData } = await supabaseServer
    .from("listings")
    .select("id, title, description, price, location, image_url, category, rating")
    .eq("vendor_id", vendor.id)
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  const listings = (listingsData as Listing[]) || [];

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

          <div className="flex flex-col gap-8 py-16 lg:flex-row lg:items-center">
            {vendor.profile_image_url ? (
              <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/20">
                <Image
                  src={vendor.profile_image_url}
                  alt={vendor.business_name}
                  fill
                  sizes="160px"
                  unoptimized
                  className="object-cover"
                />
              </div>
            ) : null}
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9EE8E3]">
                Local operator
              </p>
              <h1 className="mt-3 text-4xl font-bold sm:text-6xl">
                {vendor.business_name}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
                {vendor.notes ||
                  "Browse active listings from this Roatan operator."}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
              {vendor.show_website !== false && vendor.website ? (
                <a
                  href={vendor.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded-xl bg-white px-5 py-3 font-semibold text-[#0B3C5D]"
                >
                  Visit Website
                </a>
              ) : null}
              {vendor.show_email !== false && vendor.email ? (
                <a
                  href={`mailto:${vendor.email}`}
                  className="inline-block rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
                >
                  Email Vendor
                </a>
              ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        {vendor.show_contact_name !== false && vendor.contact_name ? (
          <div className="mb-8 rounded-2xl bg-white p-6 shadow">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
              Contact
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Contact name</p>
                <p className="mt-1 font-bold text-[#0B3C5D]">
                  {vendor.contact_name}
                </p>
              </div>
              {vendor.show_phone !== false && vendor.phone ? (
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <a
                    href={`tel:${vendor.phone}`}
                    className="mt-1 block font-bold text-[#007B7B]"
                  >
                    {vendor.phone}
                  </a>
                </div>
              ) : null}
            </div>
          </div>
        ) : vendor.show_phone !== false && vendor.phone ? (
          <div className="mb-8 rounded-2xl bg-white p-6 shadow">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
              Contact
            </p>
            <div className="mt-4">
              <p className="text-sm text-gray-500">Phone</p>
              <a
                href={`tel:${vendor.phone}`}
                className="mt-1 block font-bold text-[#007B7B]"
              >
                {vendor.phone}
              </a>
            </div>
          </div>
        ) : null}

        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
              Active listings
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
              Experiences from {vendor.business_name}
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            {listings.length} listing{listings.length === 1 ? "" : "s"}
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
                  <p className="text-xs font-bold uppercase tracking-wide text-[#00A8A8]">
                    {listing.category || "Experience"}
                  </p>
                  <h3 className="mt-2 text-lg font-bold text-[#0B3C5D]">
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
                      {listing.rating ?? 5}/5 rating
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
