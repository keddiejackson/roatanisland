"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import EmptyState from "@/app/EmptyState";
import HomeHeroHeader, {
  type HomeAccountProfile,
} from "@/app/HomeHeroHeader";
import HomeListingCard, {
  type HomePageListing,
} from "@/app/HomeListingCard";
import SiteFooter from "@/app/SiteFooter";
import {
  filterHomeListings,
  homeListingFilterDefaults,
  selectHomeSpotlightListings,
} from "@/lib/home-listings";
import { homepageCategories, homepageTrustSignals } from "@/lib/homepage-content";
import {
  defaultHomepageControls,
  normalizeHomepageControls,
} from "@/lib/homepage-settings";
import {
  applyTravelerPersonaToFilters,
  buildDateAwareMapUrl,
  getTravelerPersonaPresets,
  listingMatchesAvailability,
  sortListingsForLuxuryMatch,
} from "@/lib/marketplace-upgrade";
import { supabase } from "@/lib/supabase";
import { displayNameFromProfile } from "@/lib/user-profile";

const travelerPersonaPresets = getTravelerPersonaPresets();

const smoothEase = [0.22, 1, 0.36, 1] as const;

const reducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

const pageTransitionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.45, ease: smoothEase },
  },
};

const heroContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.12,
    },
  },
};

const heroTextVariants: Variants = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.78, ease: smoothEase },
  },
};

const marketplaceSearchVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.62, ease: smoothEase },
  },
};

const sectionRevealVariants: Variants = {
  hidden: { opacity: 0, y: 34 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.62, ease: smoothEase },
  },
};


export default function Home() {
  const reduceMotion = useReducedMotion();
  const viewportOnce = {
    once: true,
    amount: reduceMotion ? 0.05 : 0.18,
  };
  const [listings, setListings] = useState<HomePageListing[]>([]);
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
  const [selectedPersonaId, setSelectedPersonaId] = useState("luxury-private");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [homeAccount, setHomeAccount] = useState<HomeAccountProfile | null>(
    null,
  );
  const [homeAccountLoading, setHomeAccountLoading] = useState(true);
  const [homeSignOutLoading, setHomeSignOutLoading] = useState(false);

  useEffect(() => {
    async function fetchListings() {
      const { data } = await supabase.from("listings").select("*");
      const rows = ((data as HomePageListing[]) || []).filter(
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

  useEffect(() => {
    async function loadHomeAccount() {
      setHomeAccountLoading(true);
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const email = session?.user.email || "";

      if (!session?.access_token || !email) {
        setHomeAccount(null);
        setHomeAccountLoading(false);
        return;
      }

      let displayName = displayNameFromProfile({ email });
      let profileImageUrl: string | null = null;

      try {
        const profileResponse = await fetch("/api/account/profile", {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (profileResponse.ok) {
          const result = (await profileResponse.json()) as {
            profile?: {
              email?: string | null;
              display_name?: string | null;
              profile_image_url?: string | null;
            };
          };
          displayName = displayNameFromProfile({
            email,
            display_name: result.profile?.display_name,
          });
          profileImageUrl = result.profile?.profile_image_url || null;
        }
      } catch {
        profileImageUrl = null;
      }

      const [{ data: adminRecord }, { data: vendorRecord }] = await Promise.all([
        supabase
          .from("admin_users")
          .select("email")
          .eq("email", email.toLowerCase())
          .maybeSingle(),
        supabase
          .from("vendor_users")
          .select("vendor_id")
          .eq("user_id", session.user.id)
          .maybeSingle(),
      ]);

      setHomeAccount({
        email,
        displayName,
        profileImageUrl,
        href: adminRecord
          ? "/admin"
          : vendorRecord
            ? "/vendor/dashboard"
            : "/account",
        label: adminRecord
          ? "Admin signed in"
          : vendorRecord
            ? "Vendor signed in"
            : "Signed in",
      });
      setHomeAccountLoading(false);
    }

    loadHomeAccount();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadHomeAccount();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const filteredListings = useMemo(
    () => {
      const filtered = filterHomeListings(listings, {
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
      );

      return sortBy === "Smart match"
        ? sortListingsForLuxuryMatch(filtered, selectedPersonaId, {
            date: travelDate,
            guests: guestCount,
          })
        : filtered;
    },
    [
      availableOnly,
      category,
      guestCount,
      listings,
      locationFilter,
      maxPrice,
      minimumRating,
      search,
      selectedPersonaId,
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

  const hasActiveFilters =
    search !== homeListingFilterDefaults.search ||
    category !== homeListingFilterDefaults.category ||
    locationFilter !== homeListingFilterDefaults.location ||
    maxPrice !== homeListingFilterDefaults.maxPrice ||
    minimumRating !== homeListingFilterDefaults.minimumRating ||
    sortBy !== homeListingFilterDefaults.sortBy ||
    travelDate !== "" ||
    travelTime !== "" ||
    guestCount !== "" ||
    availableOnly ||
    selectedPersonaId !== "luxury-private";
  const mapUrl = buildDateAwareMapUrl({
    category,
    location: locationFilter,
    date: travelDate,
    time: travelTime,
    guests: guestCount,
    availableOnly,
  });
  const featuredHomeListings = (
    hasActiveFilters ? filteredListings : spotlightListings
  ).slice(0, 3);
  const activeTripStyle =
    travelerPersonaPresets.find((preset) => preset.id === selectedPersonaId) ||
    travelerPersonaPresets[0];

  const navListingCount = Math.max(
    filteredListings.length,
    featuredHomeListings.length,
  );

  function clearMarketplaceFilters() {
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
    setSelectedPersonaId("luxury-private");
    setShowAdvancedFilters(false);
  }

  function applyTravelerPersona(personaId: string) {
    const filters = applyTravelerPersonaToFilters(personaId);

    setSelectedPersonaId(personaId);
    setSearch(filters.search);
    setCategory(filters.category);
    setLocationFilter(filters.location);
    setMaxPrice(filters.maxPrice);
    setMinimumRating(filters.minimumRating);
    setSortBy(filters.sortBy);
    setGuestCount(filters.guestCount);
    setAvailableOnly(filters.availableOnly);
  }

  async function signOutHomeAccount() {
    setHomeSignOutLoading(true);
    await supabase.auth.signOut();
    setHomeAccount(null);
    setHomeSignOutLoading(false);
  }

  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={reduceMotion ? reducedMotionVariants : pageTransitionVariants}
      className="brand-page min-h-screen overflow-x-hidden"
    >
      <section className="relative min-h-[760px] overflow-hidden bg-[#061D2C] text-white">
        <Image
          src="/images/roatan.jpeg"
          alt="Roatan coastline"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#061D2C]/56" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_28%,rgba(8,170,168,0.28),transparent_30%),linear-gradient(90deg,rgba(6,29,44,0.92)_0%,rgba(6,29,44,0.55)_48%,rgba(6,29,44,0.2)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-72 bg-[linear-gradient(180deg,rgba(247,243,234,0)_0%,#F7F3EA_88%)]" />

        <div className="relative mx-auto flex min-h-[760px] max-w-7xl flex-col px-5 py-6 sm:px-6">
          <HomeHeroHeader
            account={homeAccount}
            accountLoading={homeAccountLoading}
            signOutLoading={homeSignOutLoading}
            onSignOut={signOutHomeAccount}
          />

          <motion.div
            variants={reduceMotion ? reducedMotionVariants : heroContainerVariants}
            className="flex flex-1 items-center py-14 lg:py-20"
          >
            <div className="max-w-6xl">
              <motion.p
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="text-sm font-black uppercase tracking-[0.26em] text-[#D6B56D]"
              >
                Private Roatan days
              </motion.p>
              <motion.h1
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="mt-5 max-w-5xl text-6xl font-black leading-[0.9] tracking-[-0.06em] sm:text-8xl lg:text-[7.8rem]"
              >
                The island, arranged beautifully.
              </motion.h1>
              <motion.p
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="mt-7 max-w-3xl text-lg leading-8 text-white/84 sm:text-2xl sm:leading-10"
              >
                Plan your Roatan day with vetted local experiences, map
                context, and concierge help in one calm place.
              </motion.p>
              <motion.div
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="mt-10 flex flex-wrap gap-3"
              >
                <a
                  href="#marketplace"
                  className="brand-button-primary"
                >
                  Plan your Roatan day
                </a>
                <Link
                  href="/map"
                  className="brand-button-ghost"
                >
                  Explore experiences
                </Link>
              </motion.div>

              <motion.div
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="mt-12 flex flex-wrap gap-2 text-sm font-bold text-white/85"
              >
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  {navListingCount} active options
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  Map-first planning
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  Concierge support
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reduceMotion ? reducedMotionVariants : sectionRevealVariants}
        className="relative z-20 -mt-10 px-5 pb-12 sm:px-6"
      >
        <div className="mx-auto grid max-w-5xl gap-2 rounded-[1.25rem] border border-[#D6B56D]/20 bg-white p-3 shadow-xl shadow-[#071F2F]/8 md:grid-cols-3">
          {homepageTrustSignals.map((signal) => (
            <div key={signal.label} className="flex items-center gap-3 p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#EEF7F6] text-xs font-black text-[#007B7B]">
                OK
              </span>
              <h2 className="text-sm font-black text-[#0B3C5D]">
                {signal.label}
              </h2>
            </div>
          ))}
        </div>
      </motion.section>

      <section id="marketplace" className="relative z-10 bg-[#FBF8F1] px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={reduceMotion ? reducedMotionVariants : sectionRevealVariants}
            className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"
          >
            <div>
              <p className="brand-eyebrow">
                Curated trip planner
              </p>
              <h2 className="brand-display mt-2 max-w-4xl text-4xl sm:text-6xl">
                Featured Roatan picks.
              </h2>
              <p className="brand-subtitle mt-3 max-w-2xl">
                Start with the basics. Search, choose a trip style, add your
                date and guest count, then open only the best matches.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="brand-badge brand-badge-teal">
                {featuredHomeListings.length} shown
              </p>
              <Link
                href={mapUrl}
                className="brand-button-secondary"
              >
                Open matched map
              </Link>
            </div>
          </motion.div>

          <motion.form
            onSubmit={(event) => event.preventDefault()}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={
              reduceMotion ? reducedMotionVariants : marketplaceSearchVariants
            }
            className="brand-card p-4 sm:p-5"
          >
            <div className="grid gap-3 lg:grid-cols-[1.5fr_0.85fr_0.95fr_0.8fr_0.65fr]">
              <input
                type="text"
                placeholder="Search by tour, stay, transport, or location"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="brand-input min-h-12"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="brand-input min-h-12"
              >
                {homepageCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "All" ? "All categories" : cat}
                  </option>
                ))}
              </select>
              <select
                value={selectedPersonaId}
                onChange={(e) => applyTravelerPersona(e.target.value)}
                className="brand-input min-h-12"
              >
                {travelerPersonaPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="brand-input min-h-12"
              />
              <input
                type="number"
                min="1"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="Guests"
                className="brand-input min-h-12"
              />
            </div>

            <div className="mt-3 flex flex-col justify-between gap-3 border-t border-[#D6B56D]/20 pt-3 sm:flex-row sm:items-center">
              <p className="text-sm leading-6 text-gray-700">
                <span className="font-black text-[#0B3C5D]">
                  {activeTripStyle.label}:
                </span>{" "}
                {activeTripStyle.description}
              </p>
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((current) => !current)}
                className="brand-button-secondary min-h-12 px-4 py-2 text-sm"
              >
                {showAdvancedFilters ? "Hide filters" : "More filters"}
              </button>
            </div>

            {showAdvancedFilters ? (
              <div className="mt-3 grid gap-3 border-t border-[#D6B56D]/20 pt-3 md:grid-cols-3">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="brand-input min-h-12"
                >
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location === "All" ? "All locations" : location}
                    </option>
                  ))}
                </select>
              <input
                value={travelTime}
                onChange={(e) => setTravelTime(e.target.value)}
                placeholder="Preferred time"
                className="brand-input min-h-12"
              />
              <label className="flex min-h-12 items-center gap-3 rounded-lg border border-[#00A8A8]/20 bg-white px-4 text-sm font-bold text-[#0B3C5D]">
                <input
                  type="checkbox"
                  checked={availableOnly}
                  onChange={(e) => setAvailableOnly(e.target.checked)}
                />
                Available only
              </label>
                <input
                  type="number"
                  min="0"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max price"
                  className="brand-input min-h-12"
                />
                <select
                  value={minimumRating}
                  onChange={(e) => setMinimumRating(e.target.value)}
                  className="brand-input min-h-12"
                >
                  <option value="All">Any rating</option>
                  <option value="5">5 stars</option>
                  <option value="4">4+ stars</option>
                  <option value="3">3+ stars</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="brand-input min-h-12"
                >
                  <option value="Featured">Featured first</option>
                  <option value="Smart match">Smart match</option>
                  <option value="Rating">Highest rated</option>
                  <option value="Price low">Price low to high</option>
                  <option value="Price high">Price high to low</option>
                </select>
              </div>
            ) : null}

            <div className="mt-4 flex flex-col justify-between gap-3 rounded-[1rem] bg-[#EEF7F6] p-4 sm:flex-row sm:items-center">
              <p className="text-sm font-bold text-[#0B3C5D]">
                {featuredHomeListings.length} curated matches ready.
              </p>
              <div className="flex flex-wrap gap-2">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearMarketplaceFilters}
                    className="brand-button-secondary px-4 py-2 text-sm"
                  >
                    Clear filters
                  </button>
                ) : null}
                <Link href={mapUrl} className="brand-button-primary px-4 py-2 text-sm">
                  Compare on map
                </Link>
              </div>
            </div>
          </motion.form>

          <div className="mt-10">
            {featuredHomeListings.length === 0 ? (
              <div className="rounded-[1.35rem] border border-[#D6B56D]/20 bg-[#F7F3EA] p-5 shadow-inner shadow-white">
                <EmptyState
                  title="No curated matches yet."
                  text="Adjust the trip search, open the map, or send a planning request and we will point you toward the closest fit."
                  primaryHref="/map"
                  primaryLabel="Explore the map"
                  secondaryHref="/concierge"
                  secondaryLabel="Plan with concierge"
                />
                <button
                  type="button"
                  onClick={clearMarketplaceFilters}
                  className="brand-button-primary mx-auto mt-5"
                >
                  Reset trip search
                </button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {featuredHomeListings.map((listing) => (
                  <HomeListingCard
                    key={listing.id}
                    listing={listing}
                    homepageControls={homepageControls}
                    featured={!hasActiveFilters}
                  />
                ))}
              </div>
            )}
            {filteredListings.length > featuredHomeListings.length ? (
              <div className="mt-8 flex justify-center">
                <Link
                  href={mapUrl}
                  className="rounded-lg bg-[#071F2F] px-5 py-3 text-sm font-black text-white"
                >
                  See all matches on the map
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reduceMotion ? reducedMotionVariants : sectionRevealVariants}
        className="px-5 pb-20 sm:px-6"
      >
        <div className="brand-hero-panel mx-auto max-w-7xl overflow-hidden p-6 text-white sm:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="brand-eyebrow-gold">
                Ready when you are
              </p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
                Ready to plan your Roatan day?
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
                Start with the map, let the concierge help, or open your trip
                dashboard to keep every saved plan and booking in one place.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:min-w-64">
              <Link href="/map" className="brand-button-primary justify-center">
                Browse the map
              </Link>
              <Link href="/concierge" className="brand-button-ghost justify-center">
                Build trip plan
              </Link>
              <Link href="/account" className="brand-button-secondary justify-center">
                Open my trips
              </Link>
            </div>
          </div>
        </div>
      </motion.section>
      <SiteFooter />
    </motion.main>
  );
}
