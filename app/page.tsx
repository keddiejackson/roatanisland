"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

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

const categories = ["All", "Tours", "Hotels", "Transport"];

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    async function fetchListings() {
      const { data } = await supabase.from("listings").select("*");
      const rows = ((data as Listing[]) || []).filter(
        (listing) => listing.is_active !== false,
      );

      setListings(rows);
    }

    fetchListings();
  }, []);

  const filteredListings = useMemo(
    () =>
      listings.filter((listing) => {
        const matchesSearch = `${listing.title} ${listing.location} ${listing.description}`
          .toLowerCase()
          .includes(search.toLowerCase());

        const matchesCategory =
          category === "All" || listing.category === category;

        return matchesSearch && matchesCategory;
      }),
    [category, listings, search],
  );

  return (
    <main className="min-h-screen bg-[#F7F3EA] text-[#17324D]">
      <section className="relative min-h-[620px] overflow-hidden">
        <Image
          src="/images/roatan.jpeg"
          alt="Roatan coastline"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-[#F7F3EA]" />

        <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col justify-between px-6 py-8">
          <header className="flex items-center justify-between gap-4 text-white">
            <Link href="/" className="text-xl font-bold">
              RoatanIsland.life
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/vendor/signup"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] transition hover:bg-[#EEF7F6]"
              >
                List your business
              </Link>
              <Link
                href="/vendor/login"
                className="hidden rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25 sm:inline-block"
              >
                Vendor Login
              </Link>
              <Link
                href="/admin/login"
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
              >
                Admin
              </Link>
            </div>
          </header>

          <div className="max-w-3xl pb-16 pt-28 text-white">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9EE8E3]">
              Tours, stays, and transport
            </p>
            <h1 className="mt-4 text-5xl font-bold leading-tight sm:text-6xl">
              Plan your best Roatan day in one place.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90">
              Browse local experiences, compare prices, and request bookings
              from a simple island directory built for travelers.
            </p>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-20 max-w-7xl px-6">
        <div className="rounded-2xl bg-white p-4 shadow-xl shadow-black/10">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <input
              type="text"
              placeholder="Search by tour, stay, transport, or location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-12 rounded-xl border border-gray-200 px-4 text-[#17324D] outline-none focus:border-[#00A8A8]"
            />

            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    category === cat
                      ? "bg-[#00A8A8] text-white"
                      : "bg-[#EEF7F6] text-[#0B3C5D] hover:bg-[#D8EFEC]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
              Available experiences
            </p>
            <h2 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
              Choose what fits your trip
            </h2>
          </div>
          <p className="text-sm text-gray-600">
            {filteredListings.length} result
            {filteredListings.length === 1 ? "" : "s"}
          </p>
        </div>

        {filteredListings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#00A8A8]/40 bg-white p-10 text-center text-gray-600">
            No listings match that search yet.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => (
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
                  {listing.category ? (
                    <span className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#0B3C5D]">
                      {listing.category}
                    </span>
                  ) : null}
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-bold text-[#0B3C5D]">
                      {listing.title}
                    </h3>
                    <span className="shrink-0 font-bold text-[#00A8A8]">
                      {listing.price ? `$${listing.price}` : "Ask"}
                    </span>
                  </div>

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
