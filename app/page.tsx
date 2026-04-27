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
  is_featured: boolean | null;
  rating: number | null;
  reviews_count: number | null;
};

const categories = ["All", "Tours", "Hotels", "Transport"];

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

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [leadInterest, setLeadInterest] = useState("Tours");
  const [leadMessage, setLeadMessage] = useState("");
  const [leadLoading, setLeadLoading] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);

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
      listings
        .filter((listing) => {
          const matchesSearch =
            `${listing.title} ${listing.location} ${listing.description}`
              .toLowerCase()
              .includes(search.toLowerCase());

          const matchesCategory =
            category === "All" || listing.category === category;

          return matchesSearch && matchesCategory;
        })
        .sort((a, b) => {
          if (Boolean(a.is_featured) === Boolean(b.is_featured)) {
            return 0;
          }

          return a.is_featured ? -1 : 1;
        }),
    [category, listings, search],
  );

  const featuredListings = useMemo(
    () => listings.filter((listing) => listing.is_featured).slice(0, 3),
    [listings],
  );

  async function handleLeadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLeadLoading(true);

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: leadName,
        email: leadEmail,
        phone: leadPhone,
        interest: leadInterest,
        message: leadMessage,
      }),
    });

    const result = await response.json();
    setLeadLoading(false);

    if (!response.ok) {
      alert(result.error || "Unable to send your message. Please try again.");
      return;
    }

    setLeadSubmitted(true);
    setLeadName("");
    setLeadEmail("");
    setLeadPhone("");
    setLeadInterest("Tours");
    setLeadMessage("");
  }

  return (
    <main className="min-h-screen bg-[#F7F3EA] text-[#17324D]">
      <section className="relative min-h-[620px] overflow-hidden sm:min-h-[640px]">
        <Image
          src="/images/roatan.jpeg"
          alt="Roatan coastline"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-[#F7F3EA]" />

        <div className="relative mx-auto flex min-h-[620px] max-w-7xl flex-col justify-between px-5 py-6 sm:min-h-[640px] sm:px-6 sm:py-8">
          <header className="flex flex-col items-start justify-between gap-4 text-white sm:flex-row sm:items-center">
            <Link href="/" className="text-xl font-bold">
              RoatanIsland.life
            </Link>
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              <a
                href="#listings"
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/25"
              >
                Browse
              </a>
              <Link
                href="/vendor/signup"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow-sm transition hover:bg-[#EEF7F6]"
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

          <div className="max-w-3xl pb-20 pt-20 text-white sm:pt-28">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#9EE8E3]">
              Tours, stays, and transport
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-6xl">
              Plan your best Roatan day in one place.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/90">
              Browse local experiences, compare prices, and request bookings
              from a simple island directory built for travelers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#listings"
                className="rounded-full bg-[#00A8A8] px-6 py-3 font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-[#078F8F]"
              >
                Find an experience
              </a>
              <Link
                href="/vendor/signup"
                className="rounded-full bg-white px-6 py-3 font-semibold text-[#0B3C5D] shadow-lg shadow-black/10 transition hover:bg-[#EEF7F6]"
              >
                Add your business
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id="listings"
        className="relative z-10 mx-auto -mt-20 max-w-7xl px-5 sm:px-6"
      >
        <div className="rounded-2xl bg-white p-4 shadow-xl shadow-black/10 ring-1 ring-black/5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <input
              type="text"
              placeholder="Search by tour, stay, transport, or location"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-12 rounded-xl border border-gray-200 px-4 text-[#17324D] outline-none focus:border-[#00A8A8]"
            />

            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-16">
        {featuredListings.length > 0 ? (
          <div className="mb-14">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
                  Featured picks
                </p>
                <h2 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
                  Start with these island favorites
                </h2>
              </div>
              <a
                href="#all-listings"
                className="text-sm font-semibold text-[#007B7B]"
              >
                View all listings
              </a>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {featuredListings.map((listing) => (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="group overflow-hidden rounded-2xl bg-white shadow transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#00A8A8]/25"
                >
                  <div className="relative h-64 bg-[#D8EFEC]">
                    {listing.image_url ? (
                      <Image
                        src={listing.image_url}
                        alt={listing.title}
                        fill
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        unoptimized
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[#0B3C5D]/60">
                        No image yet
                      </div>
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-[#00A8A8] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                      Featured
                    </span>
                    <span className="absolute bottom-4 right-4 rounded-full bg-[#0B3C5D] px-3 py-1 text-sm font-bold text-white shadow">
                      {formatPrice(listing.price)}
                    </span>
                  </div>

                  <div className="p-5">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#00A8A8]">
                      {listing.category || "Experience"}
                    </p>
                    <h3 className="mt-2 text-xl font-bold text-[#0B3C5D]">
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
          </div>
        ) : null}

        <div id="all-listings" />
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
            <p>No listings match that search yet.</p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("All");
              }}
              className="mt-4 rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredListings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="group overflow-hidden rounded-2xl bg-white shadow transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#00A8A8]/25"
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
                  {listing.is_featured ? (
                    <span className="absolute right-4 top-4 rounded-full bg-[#00A8A8] px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                      Featured
                    </span>
                  ) : null}
                  <span className="absolute bottom-4 right-4 rounded-full bg-[#0B3C5D] px-3 py-1 text-sm font-bold text-white shadow">
                    {formatPrice(listing.price)}
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-bold text-[#0B3C5D]">
                      {listing.title}
                    </h3>
                  </div>

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

      <section className="bg-white px-6 py-12">
        <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
          {[
            ["Browse", "Search active island listings by type and location."],
            ["Request", "Send your preferred date, time, and group size."],
            ["Confirm", "The operator reviews availability before it is final."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-2xl bg-[#F7F3EA] p-6">
              <p className="text-lg font-bold text-[#0B3C5D]">{title}</p>
              <p className="mt-2 text-sm leading-6 text-gray-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#0B3C5D] px-5 py-14 text-white sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9EE8E3]">
              Need help planning?
            </p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Tell us what kind of Roatan trip you want.
            </h2>
            <p className="mt-4 max-w-xl leading-8 text-white/80">
              If you are not sure what to book yet, send a quick note. We will
              point you toward the right tours, stays, or transport options.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 text-[#17324D] shadow-xl">
            {leadSubmitted ? (
              <div className="rounded-xl bg-green-100 p-5 text-green-800">
                <h3 className="text-xl font-bold">Message Sent</h3>
                <p className="mt-2">
                  Thanks. We received your note and will follow up soon.
                </p>
                <button
                  type="button"
                  onClick={() => setLeadSubmitted(false)}
                  className="mt-4 rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block font-medium">Name</label>
                  <input
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium">Email</label>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium">Phone</label>
                  <input
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium">Interest</label>
                  <select
                    value={leadInterest}
                    onChange={(e) => setLeadInterest(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
                  >
                    <option value="Tours">Tours</option>
                    <option value="Hotels">Hotels</option>
                    <option value="Transport">Transport</option>
                    <option value="Not sure yet">Not sure yet</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block font-medium">Message</label>
                  <textarea
                    value={leadMessage}
                    onChange={(e) => setLeadMessage(e.target.value)}
                    rows={4}
                    placeholder="Tell us your dates, group size, and what you want to do."
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={leadLoading}
                  className="rounded-xl bg-[#00A8A8] px-6 py-3 font-semibold text-white disabled:opacity-50 md:col-span-2"
                >
                  {leadLoading ? "Sending..." : "Send Planning Request"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
