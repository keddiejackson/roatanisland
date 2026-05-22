"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import BrandAbout from "@/app/BrandAbout";
import EmptyState from "@/app/EmptyState";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
import TripPlannerDock from "@/app/TripPlannerDock";
import {
  filterHomeListings,
  homeListingFilterDefaults,
  selectHomeSpotlightListings,
  type HomeListing,
} from "@/lib/home-listings";
import {
  defaultHomepageControls,
  normalizeHomepageControls,
  type HomepageControls,
} from "@/lib/homepage-settings";
import {
  buildDateAwareMapUrl,
  getListingTrustBadges,
  listingMatchesAvailability,
} from "@/lib/marketplace-upgrade";
import { supabase } from "@/lib/supabase";

type Listing = HomeListing & {
  image_url: string | null;
  reviews_count: number | null;
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

const categoryHighlights = [
  {
    title: "Tours",
    category: "Tours",
    text: "Guided island days, wildlife stops, beach time, and water experiences.",
    href: "/tours",
  },
  {
    title: "Hotels",
    category: "Hotels",
    text: "Places to stay by area, from beach zones to quieter island bases.",
    href: "/hotels",
  },
  {
    title: "Transport",
    category: "Transport",
    text: "Airport rides, port transfers, private drivers, and easy pickup planning.",
    href: "/transport",
  },
  {
    title: "Food",
    category: "Food",
    text: "Restaurants, beach bars, and local stops to add around your plans.",
    href: "/map?category=Food",
  },
  {
    title: "Beaches",
    category: "Beaches",
    text: "Beach areas and coastal stops to anchor an easy Roatan day.",
    href: "/map?category=Beaches",
  },
  {
    title: "Private Charters",
    category: "Private Charters",
    text: "Custom boats, private days, and flexible high-touch island plans.",
    href: "/map?category=Private%20Charters",
  },
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

function listingBadge(listing: Listing, homepageControls: HomepageControls) {
  if (listing.is_featured) return homepageControls.featuredBadgeLabel;
  if ((listing.rating || 0) >= 4.8) return homepageControls.topRatedBadgeLabel;
  return listing.category || "Listing";
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [homepageControls, setHomepageControls] = useState(
    defaultHomepageControls,
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [maxPrice, setMaxPrice] = useState("");
  const [locationFilter, setLocationFilter] = useState("All");
  const [minimumRating, setMinimumRating] = useState("All");
  const [sortBy, setSortBy] = useState("Featured");
  const [travelDate, setTravelDate] = useState("");
  const [travelTime, setTravelTime] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
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
        setHomepageControls(normalizeHomepageControls(settingsData.value));
      }
    }

    fetchListings();
  }, []);

  const filteredListings = useMemo(
    () =>
      filterHomeListings(listings, {
        search,
        category,
        location: locationFilter,
        maxPrice,
        minimumRating,
        sortBy,
      }).filter((listing) =>
        listingMatchesAvailability(listing, {
          date: travelDate,
          time: travelTime,
          guests: guestCount,
          availableOnly,
        }),
      ),
    [
      availableOnly,
      category,
      guestCount,
      listings,
      locationFilter,
      maxPrice,
      minimumRating,
      search,
      sortBy,
      travelDate,
      travelTime,
    ],
  );

  const spotlightListings = useMemo(
    () => selectHomeSpotlightListings(listings, filteredListings),
    [filteredListings, listings],
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
  const mapUrl = buildDateAwareMapUrl({
    category,
    location: locationFilter,
    date: travelDate,
    time: travelTime,
    guests: guestCount,
    availableOnly,
  });
  const categoryCards = useMemo(
    () =>
      categoryHighlights.map((item) => ({
        ...item,
        count: listings.filter((listing) => listing.category === item.category).length,
      })),
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
    <main className="min-h-screen overflow-x-hidden bg-[#F7F3EA] text-[#102A43]">
      <section className="relative min-h-[720px] overflow-hidden bg-[#071F2F] text-white">
        <Image
          src="/images/roatan.jpeg"
          alt="Roatan coastline"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#071F2F]/65" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,31,47,0.06)_0%,rgba(7,31,47,0.82)_76%,#F7F3EA_100%)]" />

        <div className="relative mx-auto flex min-h-[720px] max-w-7xl flex-col px-5 py-5 sm:px-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <SiteLogo variant="light" priority />
            <nav className="flex flex-wrap items-center justify-end gap-2 text-sm font-semibold text-white/90">
              <a href="#marketplace" className="rounded-lg px-3 py-2 hover:bg-white/10">
                Listings
              </a>
              <Link href="/map" className="rounded-lg px-3 py-2 hover:bg-white/10">
                Map
              </Link>
              <Link href="/concierge" className="rounded-lg px-3 py-2 hover:bg-white/10">
                Concierge
              </Link>
              <Link href="/tours" className="rounded-lg px-3 py-2 hover:bg-white/10">
                Tours
              </Link>
              <Link href="/vendors" className="rounded-lg px-3 py-2 hover:bg-white/10">
                Vendors
              </Link>
              <Link href="/signin" className="rounded-lg px-3 py-2 hover:bg-white/10">
                Sign in
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
            <p className="text-sm font-bold uppercase text-[#9EE8E3]">
              {homepageControls.heroEyebrow}
            </p>
            <h1 className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] sm:text-7xl">
              {homepageControls.homepageHeadline}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-white/84 sm:text-xl">
              {homepageControls.homepageSubhead}
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href="#marketplace"
                className="rounded-lg bg-[#00A8A8] px-6 py-3 font-bold text-white shadow-2xl shadow-[#00A8A8]/25 transition hover:-translate-y-0.5 hover:bg-[#078F8F]"
              >
                {homepageControls.primaryCtaLabel}
              </a>
              <Link
                href="/concierge"
                className="rounded-lg border border-white/25 bg-white/10 px-6 py-3 font-bold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                Build a trip plan
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="marketplace" className="relative z-10 -mt-14 bg-white px-5 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-bold uppercase text-[#00A8A8]">
                {homepageControls.listingsEyebrow}
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#0B3C5D] sm:text-5xl">
                {homepageControls.listingsTitle}
              </h2>
              <p className="mt-3 max-w-2xl leading-7 text-gray-600">
                {homepageControls.listingsIntro}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <p className="rounded-lg bg-[#EEF7F6] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
                {filteredListings.length} result
                {filteredListings.length === 1 ? "" : "s"}
              </p>
              <Link
                href={mapUrl}
                className="rounded-lg bg-[#0B3C5D] px-4 py-3 text-sm font-bold text-white"
              >
                Open matched map
              </Link>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((current) => !current)}
                className="rounded-lg border border-[#D6B56D]/30 bg-white px-4 py-3 text-sm font-bold text-[#0B3C5D] transition hover:bg-[#FFF8E8]"
              >
                {showAdvancedFilters ? "Hide filters" : "More filters"}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-[#D6B56D]/20 bg-[#F7F3EA] p-4">
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

            <div className="mt-3 grid gap-3 border-t border-[#D6B56D]/20 pt-3 md:grid-cols-[1fr_1fr_120px_auto]">
              <input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="min-h-12 rounded-lg border border-gray-200 bg-white px-4 text-[#17324D] outline-none focus:border-[#00A8A8]"
              />
              <input
                value={travelTime}
                onChange={(e) => setTravelTime(e.target.value)}
                placeholder="Preferred time"
                className="min-h-12 rounded-lg border border-gray-200 bg-white px-4 text-[#17324D] outline-none focus:border-[#00A8A8]"
              />
              <input
                type="number"
                min="1"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="Guests"
                className="min-h-12 rounded-lg border border-gray-200 bg-white px-4 text-[#17324D] outline-none focus:border-[#00A8A8]"
              />
              <label className="flex min-h-12 items-center gap-3 rounded-lg border border-[#00A8A8]/20 bg-white px-4 text-sm font-bold text-[#0B3C5D]">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                />
                Available only
              </label>
            </div>

            {showAdvancedFilters ? (
              <div className="mt-3 grid gap-3 border-t border-[#D6B56D]/20 pt-3 md:grid-cols-4">
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
            ) : null}
          </div>

          <div className="mt-5">
            <TripPlannerDock />
          </div>

          {homepageControls.showFeaturedListings && spotlightListings.length > 0 ? (
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {spotlightListings.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  homepageControls={homepageControls}
                  featured
                />
              ))}
            </div>
          ) : null}

          <div className="mt-10">
            {visibleListings.length === 0 ? (
              <div className="rounded-lg bg-[#F7F3EA] p-4">
                <EmptyState
                  title="No matches yet."
                  text="Clear the filters or send a planning request and we will point you toward the closest fit."
                  primaryHref="/map"
                  primaryLabel="Explore the map"
                  secondaryHref="/vendor/signup"
                  secondaryLabel="Add a business"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSearch(homeListingFilterDefaults.search);
                    setCategory(homeListingFilterDefaults.category);
                    setLocationFilter(homeListingFilterDefaults.location);
                    setMaxPrice(homeListingFilterDefaults.maxPrice);
                    setMinimumRating(homeListingFilterDefaults.minimumRating);
                    setSortBy(homeListingFilterDefaults.sortBy);
                    setTravelDate("");
                    setTravelTime("");
                    setGuestCount("");
                    setAvailableOnly(false);
                    setShowAdvancedFilters(false);
                  }}
                  className="mx-auto mt-5 block rounded-lg bg-[#071F2F] px-5 py-3 font-bold text-white"
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    homepageControls={homepageControls}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-[#F7F3EA] px-5 py-16 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase text-[#00A8A8]">
                Explore by category
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#0B3C5D] sm:text-5xl">
                Choose the kind of trip first.
              </h2>
            </div>
            <Link href="/map" className="text-sm font-black text-[#007B7B]">
              Open full map
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categoryCards.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group rounded-lg border border-[#D6B56D]/20 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase text-[#D6B56D]">
                      {item.count} live
                    </p>
                    <h3 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                      {item.title}
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-sm font-black text-[#007B7B]">
                    View
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {item.text}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {homepageControls.showExploreRoutes ? (
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
        <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase text-[#00A8A8]">
              Explore your way
            </p>
            <h2 className="mt-2 text-3xl font-black text-[#0B3C5D] sm:text-5xl">
              Start with the day you want.
            </h2>
          </div>
        <Link href="/map" className="text-sm font-black text-[#007B7B]">
          See every area
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
              <p className="text-xs font-black uppercase text-[#D6B56D]">
                Route
              </p>
              <h3 className="mt-3 text-xl font-black text-[#0B3C5D]">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-gray-600">{item.text}</p>
              <span className="mt-5 inline-flex text-sm font-black text-[#007B7B]">
                Explore
              </span>
            </Link>
          ))}
        </div>
      </section>
      ) : null}

      {homepageControls.showMapCallout ? (
      <section className="px-5 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-lg bg-[#071F2F] text-white shadow-2xl shadow-[#071F2F]/15 lg:grid-cols-[1fr_0.9fr]">
          <div className="p-6 sm:p-10">
            <p className="text-sm font-bold uppercase text-[#D6B56D]">
              {homepageControls.mapEyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-5xl">
              {homepageControls.mapTitle}
            </h2>
            <p className="mt-4 max-w-xl leading-8 text-white/75">
              {homepageControls.mapBody}
            </p>
            {homepageControls.mapChips.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-2 text-sm font-semibold text-white/85">
              {homepageControls.mapChips.map((item) => (
                <span
                  key={item}
                  className="rounded-lg border border-white/15 bg-white/10 px-3 py-2"
                >
                  {item}
                </span>
              ))}
            </div>
            ) : null}
            <Link
              href="/map"
              className="mt-7 inline-flex rounded-lg bg-[#D6B56D] px-5 py-3 font-black text-[#071F2F] transition hover:-translate-y-0.5"
            >
              {homepageControls.mapCtaLabel}
            </Link>
          </div>
          <div className="relative min-h-72">
            <Image
              src="/images/roatan.jpeg"
              alt="Roatan island water and coast"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>
      ) : null}

      {homepageControls.showTrustSection ? (
        <BrandAbout
          eyebrow={homepageControls.trustEyebrow}
          title={homepageControls.trustTitle}
          body={homepageControls.trustBody}
          trustPoints={homepageControls.trustPoints}
        />
      ) : null}

      {homepageControls.showPlanningHelp ? (
      <section className="px-5 pb-16 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.82fr_1fr] lg:items-start">
          <div>
            <p className="text-sm font-bold uppercase text-[#00A8A8]">
              {homepageControls.planningEyebrow}
            </p>
            <h2 className="mt-3 text-3xl font-black text-[#0B3C5D] sm:text-4xl">
              {homepageControls.planningTitle}
            </h2>
            <p className="mt-4 max-w-lg leading-7 text-gray-600">
              {homepageControls.planningBody}
            </p>
            {homepageControls.planningChips.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-[#0B3C5D]">
              {homepageControls.planningChips.map((item) => (
                <span
                  key={item}
                  className="rounded-lg border border-[#D6B56D]/25 bg-white px-3 py-2"
                >
                  {item}
                </span>
              ))}
            </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-[#D6B56D]/20 bg-white p-5 shadow-sm sm:p-6">
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
      ) : null}
      <SiteFooter />
    </main>
  );
}

function ListingCard({
  listing,
  homepageControls,
  featured = false,
}: {
  listing: Listing;
  homepageControls: HomepageControls;
  featured?: boolean;
}) {
  const trustBadges = getListingTrustBadges(listing);

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
        <span className="absolute left-4 top-4 rounded-lg bg-white px-3 py-1 text-xs font-black uppercase text-[#0B3C5D] shadow">
          {listingBadge(listing, homepageControls)}
        </span>
        <span className="absolute bottom-4 right-4 rounded-lg bg-[#071F2F] px-3 py-1 text-sm font-black text-white shadow">
          {formatPrice(listing.price)}
        </span>
      </div>

      <div className="p-5">
        <p className="text-xs font-black uppercase text-[#00A8A8]">
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
        {trustBadges.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {trustBadges.slice(0, 3).map((badge) => (
              <span
                key={badge}
                className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-bold text-[#0B3C5D]"
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
