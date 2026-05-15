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
  tour_times: string[] | null;
};

const categories = [
  "All",
  "Tours",
  "Hotels",
  "Transport",
  "Food",
  "Beaches",
  "Private Charters",
];

const metrics = [
  ["Real operators", "Local vendors manage profiles, times, and availability."],
  ["Live map", "Airport, cruise ports, beach areas, and nearby stops in one view."],
  ["Request-first", "Guests send trip details before operators confirm."],
];

const tripTypes = [
  {
    title: "Cruise day",
    text: "Port-friendly tours, transfer timing, and short island routes.",
    href: "/map",
  },
  {
    title: "Beach day",
    text: "West Bay, West End, Sandy Bay, food stops, and sunset plans.",
    href: "/map",
  },
  {
    title: "Family day",
    text: "Easy pickups, clear capacity, gentle routes, and flexible timing.",
    href: "/tours",
  },
  {
    title: "Private day",
    text: "Charters, custom drivers, private add-ons, and VIP pacing.",
    href: "/map",
  },
];

const productHighlights = [
  ["Map-first discovery", "Pins, areas, pickup points, and trip stops stay connected."],
  ["Vendor workspace", "Operators can update listings, photos, times, and profiles."],
  ["Booking requests", "Guests submit dates, guests, notes, add-ons, and promo codes."],
  ["Admin review", "Listings, vendors, reviews, reports, and content stay controlled."],
];

const workflow = [
  ["01", "Discover", "Search active island listings by category, area, rating, and price."],
  ["02", "Plan", "Compare places on the map around the airport, cruise ports, and beaches."],
  ["03", "Request", "Send date, time, guests, notes, add-ons, and contact details."],
  ["04", "Confirm", "The operator reviews availability before plans are final."],
];

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

function listingBadge(listing: Listing) {
  if (listing.is_featured) return "Featured";
  if ((listing.rating || 0) >= 4.8) return "Top rated";
  return listing.category || "Listing";
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [siteSettings, setSiteSettings] = useState({
    siteName: "RoatanIsland.life",
    homepageHeadline: "The operating system for a better Roatan day.",
    homepageSubhead:
      "A polished island marketplace where travelers discover local experiences, plan around the map, and request bookings from trusted Roatan operators.",
  });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [maxPrice, setMaxPrice] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [minimumRating, setMinimumRating] = useState("All");
  const [sortBy, setSortBy] = useState("Featured");
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

      const { data: settingsData } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "site")
        .maybeSingle();

      if (settingsData?.value && typeof settingsData.value === "object") {
        setSiteSettings((current) => ({
          ...current,
          ...(settingsData.value as Partial<typeof current>),
        }));
      }
    }

    fetchListings();
  }, []);

  const filteredListings = useMemo(
    () => {
      const priceLimit = maxPrice ? Number(maxPrice) : null;

      return listings
        .filter((listing) => {
          const listingRating = listing.rating ?? 5;
          const searchBlob =
            `${listing.title} ${listing.location} ${listing.description} ${(listing.tour_times || []).join(" ")}`.toLowerCase();

          const matchesSearch = searchBlob.includes(search.toLowerCase());
          const matchesCategory =
            category === "All" || listing.category === category;
          const matchesLocation =
            locationFilter === "All" || listing.location === locationFilter;
          const matchesPrice =
            !priceLimit || !listing.price || listing.price <= priceLimit;
          const matchesRating =
            minimumRating === "All" || listingRating >= Number(minimumRating);

          return (
            matchesSearch &&
            matchesCategory &&
            matchesLocation &&
            matchesPrice &&
            matchesRating
          );
        })
        .sort((a, b) => {
          if (sortBy === "Price low") return (a.price || 0) - (b.price || 0);
          if (sortBy === "Price high") return (b.price || 0) - (a.price || 0);
          if (sortBy === "Rating") return (b.rating || 5) - (a.rating || 5);
          if (Boolean(a.is_featured) === Boolean(b.is_featured)) {
            return (b.rating || 5) - (a.rating || 5);
          }
          return a.is_featured ? -1 : 1;
        });
    },
    [category, listings, locationFilter, maxPrice, minimumRating, search, sortBy],
  );

  const featuredListings = useMemo(
    () =>
      listings
        .filter((listing) => listing.is_featured)
        .slice(0, 3),
    [listings],
  );

  const locations = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          listings
            .map((listing) => listing.location)
            .filter((location): location is string => Boolean(location)),
        ),
      ).sort(),
    ],
    [listings],
  );

  const visibleListings = filteredListings.slice(0, 9);

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
    <main className="min-h-screen overflow-x-hidden bg-[#F7F3EA] text-[#102A43]">
      <section className="relative min-h-[760px] overflow-hidden bg-[#071F2F] text-white">
        <Image
          src="/images/roatan.jpeg"
          alt="Roatan coastline"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#071F2F]/70" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,31,47,0.1)_0%,rgba(7,31,47,0.85)_72%,#F7F3EA_100%)]" />

        <div className="relative mx-auto flex min-h-[760px] max-w-7xl flex-col px-5 py-5 sm:px-6">
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/15 bg-white/10 p-2 shadow-2xl shadow-black/20 backdrop-blur-md">
            <Link href="/" className="px-3 py-2 text-lg font-black tracking-tight">
              {siteSettings.siteName}
            </Link>
            <nav className="flex flex-wrap items-center justify-end gap-2 text-sm font-semibold text-white/85">
              <a href="#marketplace" className="rounded-lg px-3 py-2 hover:bg-white/10">
                Marketplace
              </a>
              <Link href="/map" className="rounded-lg px-3 py-2 hover:bg-white/10">
                Map
              </Link>
              <Link href="/vendors" className="rounded-lg px-3 py-2 hover:bg-white/10">
                Vendors
              </Link>
              <Link href="/vendor/login" className="rounded-lg px-3 py-2 hover:bg-white/10">
                Login
              </Link>
              <Link
                href="/vendor/signup"
                className="rounded-lg bg-white px-4 py-2 text-[#071F2F] shadow-lg shadow-black/10"
              >
                List your business
              </Link>
            </nav>
          </header>

          <div className="motion-rise flex flex-1 flex-col justify-center py-20">
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#9EE8E3]">
              Island marketplace platform
            </p>
            <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] tracking-tight sm:text-7xl">
              {siteSettings.homepageHeadline}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/84 sm:text-xl">
              {siteSettings.homepageSubhead}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#marketplace"
                className="rounded-lg bg-[#00A8A8] px-6 py-3 font-bold text-white shadow-2xl shadow-[#00A8A8]/25 transition hover:-translate-y-0.5 hover:bg-[#078F8F]"
              >
                Explore listings
              </a>
              <Link
                href="/map"
                className="rounded-lg border border-white/25 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                Open island map
              </Link>
            </div>
          </div>

          <div className="grid gap-3 pb-10 md:grid-cols-3">
            {metrics.map(([title, text], index) => (
              <div
                key={title}
                className="motion-rise rounded-lg border border-white/15 bg-white/10 p-5 backdrop-blur"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <p className="text-lg font-black">{title}</p>
                <p className="mt-2 text-sm leading-6 text-white/75">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto -mt-16 max-w-7xl px-5 sm:px-6">
        <div className="motion-rise grid gap-4 rounded-lg border border-[#D6B56D]/25 bg-white p-4 shadow-2xl shadow-[#071F2F]/10 lg:grid-cols-[1fr_380px]">
          <div className="rounded-lg bg-[#071F2F] p-5 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6B56D]">
                  Live planning dashboard
                </p>
                <h2 className="mt-2 text-2xl font-black">Roatan Command Center</h2>
              </div>
              <Link
                href="/map"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-bold"
              >
                View map
              </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ["Listings", listings.length || 0],
                ["Areas", Math.max(locations.length - 1, 0)],
                ["Visible now", filteredListings.length],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg bg-white/10 p-4">
                  <p className="text-sm text-white/60">{label}</p>
                  <p className="mt-1 text-3xl font-black text-[#FFF3D2]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              {productHighlights.map(([title, text], index) => (
                <div
                  key={title}
                  className="flex gap-3 rounded-lg bg-white/10 p-4 ring-1 ring-white/10"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D6B56D] text-sm font-black text-[#071F2F]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-bold">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/70">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-[#F7F3EA] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#00A8A8]">
              Quick launch
            </p>
            <div className="mt-4 grid gap-3">
              {[
                ["Traveler", "Find tours, stays, transport, food, and charters.", "/#marketplace"],
                ["Vendor", "Create an account and submit your listings.", "/vendor/signup"],
                ["Operator", "Manage bookings, photos, times, and profile privacy.", "/vendor/login"],
                ["Admin", "Review vendors, listings, bookings, and reports.", "/admin/login"],
              ].map(([title, text, href]) => (
                <Link
                  key={title}
                  href={href}
                  className="rounded-lg bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <p className="font-black text-[#0B3C5D]">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-gray-600">{text}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
        <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#00A8A8]">
              Plan by trip type
            </p>
            <h2 className="mt-2 text-3xl font-black text-[#0B3C5D] sm:text-5xl">
              Start with the day you want.
            </h2>
          </div>
          <Link href="/map" className="text-sm font-black text-[#007B7B]">
            Explore all areas
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {tripTypes.map((item, index) => (
            <Link
              key={item.title}
              href={item.href}
              className="motion-rise group rounded-lg border border-[#D6B56D]/20 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D6B56D]">
                Route
              </p>
              <h3 className="mt-3 text-xl font-black text-[#0B3C5D]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{item.text}</p>
              <span className="mt-5 inline-flex text-sm font-black text-[#007B7B]">
                Build plan
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="marketplace" className="bg-white px-5 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#00A8A8]">
                Live marketplace
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#0B3C5D] sm:text-5xl">
                Search Roatan like a product.
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-gray-600">
                Browse active listings with filters for category, area, rating, and
                budget.
              </p>
            </div>
            <p className="rounded-lg bg-[#EEF7F6] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
              {filteredListings.length} result
              {filteredListings.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-[#F7F3EA] p-4">
            <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
              <input
                type="text"
                placeholder="Search by tour, stay, transport, or location"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="min-h-12 rounded-lg border border-gray-200 bg-white px-4 text-[#17324D] outline-none focus:border-[#00A8A8]"
              />

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                      category === cat
                        ? "bg-[#071F2F] text-white shadow-lg"
                        : "bg-white text-[#0B3C5D] hover:bg-[#EEF7F6]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="min-h-12 rounded-lg border border-gray-200 bg-white px-4 text-[#17324D] outline-none focus:border-[#00A8A8]"
              >
                {locations.map((location) => (
                  <option key={location} value={location}>
                    {location === "All" ? "All locations" : location}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max price"
                className="min-h-12 rounded-lg border border-gray-200 bg-white px-4 text-[#17324D] outline-none focus:border-[#00A8A8]"
              />
              <select
                value={minimumRating}
                onChange={(e) => setMinimumRating(e.target.value)}
                className="min-h-12 rounded-lg border border-gray-200 bg-white px-4 text-[#17324D] outline-none focus:border-[#00A8A8]"
              >
                <option value="All">Any rating</option>
                <option value="5">5 stars</option>
                <option value="4">4+ stars</option>
                <option value="3">3+ stars</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="min-h-12 rounded-lg border border-gray-200 bg-white px-4 text-[#17324D] outline-none focus:border-[#00A8A8]"
              >
                <option value="Featured">Featured first</option>
                <option value="Rating">Highest rated</option>
                <option value="Price low">Price low to high</option>
                <option value="Price high">Price high to low</option>
              </select>
            </div>
          </div>

          {featuredListings.length > 0 ? (
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {featuredListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} featured />
              ))}
            </div>
          ) : null}

          <div className="mt-10">
            {visibleListings.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#00A8A8]/40 bg-[#F7F3EA] p-10 text-center">
                <h3 className="text-2xl font-black text-[#0B3C5D]">
                  No matches yet.
                </h3>
                <p className="mx-auto mt-2 max-w-xl leading-7 text-gray-600">
                  Clear the filters or send a planning request and we will point
                  you toward the closest fit.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                    setLocationFilter("All");
                    setMaxPrice("");
                    setMinimumRating("All");
                    setSortBy("Featured");
                  }}
                  className="mt-5 rounded-lg bg-[#00A8A8] px-5 py-3 font-bold text-white"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#071F2F] px-5 py-16 text-white sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#D6B56D]">
              Platform workflow
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">
              Built for travelers, vendors, and admins.
            </h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {workflow.map(([number, title, text]) => (
              <div key={number} className="rounded-lg bg-white/10 p-5 ring-1 ring-white/10">
                <p className="text-sm font-black text-[#D6B56D]">{number}</p>
                <h3 className="mt-3 text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/70">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#00A8A8]">
              Concierge layer
            </p>
            <h2 className="mt-3 text-3xl font-black text-[#0B3C5D] sm:text-5xl">
              Need help choosing?
            </h2>
            <p className="mt-4 max-w-xl leading-8 text-gray-600">
              Send your dates, group size, and style of trip. RoatanIsland.life
              can route you toward the right listing or operator.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Cruise timing", "Airport pickup", "Private tours", "Family days"].map(
                (item) => (
                  <div key={item} className="rounded-lg bg-white p-4 font-bold text-[#0B3C5D] shadow-sm">
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-2xl shadow-[#071F2F]/10">
            {leadSubmitted ? (
              <div className="rounded-lg bg-green-100 p-5 text-green-800">
                <h3 className="text-xl font-black">Message sent</h3>
                <p className="mt-2">
                  Thanks. We received your note and will follow up soon.
                </p>
                <button
                  type="button"
                  onClick={() => setLeadSubmitted(false)}
                  className="mt-4 rounded-lg bg-[#00A8A8] px-5 py-3 font-bold text-white"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block font-bold">Name</label>
                  <input
                    value={leadName}
                    onChange={(e) => setLeadName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block font-bold">Email</label>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block font-bold">Phone</label>
                  <input
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-bold">Interest</label>
                  <select
                    value={leadInterest}
                    onChange={(e) => setLeadInterest(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
                  >
                    <option value="Tours">Tours</option>
                    <option value="Hotels">Hotels</option>
                    <option value="Transport">Transport</option>
                    <option value="Private Charters">Private Charters</option>
                    <option value="Not sure yet">Not sure yet</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block font-bold">Message</label>
                  <textarea
                    value={leadMessage}
                    onChange={(e) => setLeadMessage(e.target.value)}
                    rows={4}
                    placeholder="Dates, group size, pickup area, and what kind of day you want."
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={leadLoading}
                  className="rounded-lg bg-[#00A8A8] px-6 py-3 font-bold text-white disabled:opacity-50 md:col-span-2"
                >
                  {leadLoading ? "Sending..." : "Send planning request"}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ListingCard({
  listing,
  featured = false,
}: {
  listing: Listing;
  featured?: boolean;
}) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-[#00A8A8]/25"
    >
      <div className={featured ? "relative h-64 bg-[#D8EFEC]" : "relative h-56 bg-[#D8EFEC]"}>
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
        <span className="absolute left-4 top-4 rounded-lg bg-white px-3 py-1 text-xs font-black uppercase tracking-wide text-[#0B3C5D] shadow">
          {listingBadge(listing)}
        </span>
        <span className="absolute bottom-4 right-4 rounded-lg bg-[#071F2F] px-3 py-1 text-sm font-black text-white shadow">
          {formatPrice(listing.price)}
        </span>
      </div>

      <div className="p-5">
        <p className="text-xs font-black uppercase tracking-wide text-[#00A8A8]">
          {listing.location || "Roatan"}
        </p>
        <h3 className="mt-2 text-lg font-black text-[#0B3C5D]">
          {listing.title}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
          {listing.description || "Details coming soon."}
        </p>
        <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
          <span className="font-bold text-gray-500">
            {listing.category || "Listing"}
          </span>
          <span className="font-black text-[#0B3C5D]">
            {listing.rating ?? 5}/5
          </span>
        </div>
      </div>
    </Link>
  );
}
