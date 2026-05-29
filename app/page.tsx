"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
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
  getListingConversionTags,
  getListingTrustBadges,
  listingMatchesAvailability,
} from "@/lib/marketplace-upgrade";
import { supabase } from "@/lib/supabase";
import { displayNameFromProfile, profileInitials } from "@/lib/user-profile";

type Listing = HomeListing & {
  image_url: string | null;
  reviews_count: number | null;
};

type HomeAccountProfile = {
  email: string;
  displayName: string;
  profileImageUrl: string | null;
  href: string;
  label: string;
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
    imagePosition: "center 44%",
  },
  {
    title: "Hotels",
    category: "Hotels",
    text: "Places to stay by area, from beach zones to quieter island bases.",
    href: "/hotels",
    imagePosition: "center 52%",
  },
  {
    title: "Transport",
    category: "Transport",
    text: "Airport rides, port transfers, private drivers, and easy pickup planning.",
    href: "/transport",
    imagePosition: "42% center",
  },
  {
    title: "Food",
    category: "Food",
    text: "Restaurants, beach bars, and local stops to add around your plans.",
    href: "/map?category=Food",
    imagePosition: "center 60%",
  },
  {
    title: "Beaches",
    category: "Beaches",
    text: "Beach areas and coastal stops to anchor an easy Roatan day.",
    href: "/map?category=Beaches",
    imagePosition: "center 65%",
  },
  {
    title: "Private Charters",
    category: "Private Charters",
    text: "Custom boats, private days, and flexible high-touch island plans.",
    href: "/map?category=Private%20Charters",
    imagePosition: "62% center",
  },
];

const audiencePaths = [
  {
    eyebrow: "For travelers",
    title: "Find and plan your Roatan day.",
    text: "Search listings, compare by area, save a plan, and message from your trip dashboard.",
    href: "#marketplace",
    cta: "Explore listings",
  },
  {
    eyebrow: "For vendors",
    title: "List your local business.",
    text: "Create a vendor account, add tours or services, manage requests, and keep details current.",
    href: "/vendor/signup",
    cta: "List your business",
  },
  {
    eyebrow: "For admins",
    title: "Run the marketplace.",
    text: "Review bookings, vendors, listings, concierge leads, messages, payments, and reports.",
    href: "/admin",
    cta: "Admin dashboard",
  },
];

const premiumTripStats = [
  { label: "Live marketplace", value: "Local operators" },
  { label: "Trip planning", value: "Map-first" },
  { label: "Guest support", value: "Concierge-ready" },
];

const homepageAssurancePoints = [
  {
    title: "Curated Roatan marketplace",
    text: "Browse active local listings with clearer photos, times, prices, and booking paths.",
  },
  {
    title: "Plan by area first",
    text: "Use map context before booking so pickups, beaches, ports, and stops make sense together.",
  },
  {
    title: "One account, one trip thread",
    text: "Guests can keep bookings, saved plans, and messages connected across the site.",
  },
];

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

const listingCardVariants: Variants = {
  hidden: { opacity: 0, y: 34 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: smoothEase },
  },
};

const categoryCardVariants: Variants = {
  hidden: { opacity: 0, y: 26 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: smoothEase },
  },
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

function listingBadge(listing: Listing, homepageControls: HomepageControls) {
  if (listing.is_featured) return homepageControls.featuredBadgeLabel;
  if ((listing.rating || 0) >= 4.8) return homepageControls.topRatedBadgeLabel;
  return listing.category || "Listing";
}

export default function Home() {
  const reduceMotion = useReducedMotion();
  const viewportOnce = {
    once: true,
    amount: reduceMotion ? 0.05 : 0.18,
  };
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
  const [homeAccount, setHomeAccount] = useState<HomeAccountProfile | null>(
    null,
  );
  const [homeAccountLoading, setHomeAccountLoading] = useState(true);
  const [homeSignOutLoading, setHomeSignOutLoading] = useState(false);

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

  const visibleListings = filteredListings.slice(0, 6);
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
    showAdvancedFilters;
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
    setShowAdvancedFilters(false);
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
              {homeAccountLoading ? null : homeAccount ? (
                <div className="flex max-w-[300px] items-center gap-1 rounded-lg border border-white/15 bg-white/10 p-1 text-white shadow-lg shadow-black/10 backdrop-blur">
                  <Link
                    href={homeAccount.href}
                    className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/15"
                  >
                    <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[10px] font-black text-[#0B3C5D]">
                      {homeAccount.profileImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={homeAccount.profileImageUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        profileInitials(
                          homeAccount.displayName,
                          homeAccount.email,
                        )
                      )}
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-xs font-black">
                        {homeAccount.displayName}
                      </span>
                      <span className="block truncate text-[10px] font-bold uppercase tracking-[0.08em] text-white/70">
                        {homeAccount.label}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={signOutHomeAccount}
                    disabled={homeSignOutLoading}
                    className="rounded-md bg-white px-3 py-2 text-xs font-black text-[#071F2F] disabled:opacity-60"
                  >
                    {homeSignOutLoading ? "Signing out..." : "Sign out"}
                  </button>
                </div>
              ) : (
                <Link href="/signin" className="rounded-lg px-3 py-2 hover:bg-white/10">
                  Sign in
                </Link>
              )}
              <Link
                href="/vendor/signup"
                className="rounded-lg bg-white px-4 py-2 text-[#071F2F] shadow-lg shadow-black/10"
              >
                List your business
              </Link>
            </nav>
          </header>

          <motion.div
            variants={reduceMotion ? reducedMotionVariants : heroContainerVariants}
            className="grid flex-1 items-center gap-10 py-14 lg:grid-cols-[1fr_380px] lg:py-20"
          >
            <div>
              <motion.p
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="text-sm font-bold uppercase tracking-[0.18em] text-[#9EE8E3]"
              >
                {homepageControls.heroEyebrow}
              </motion.p>
              <motion.h1
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="mt-5 max-w-5xl text-5xl font-black leading-[1.02] sm:text-7xl"
              >
                {homepageControls.homepageHeadline}
              </motion.h1>
              <motion.p
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="mt-6 max-w-2xl text-lg leading-8 text-white/84 sm:text-xl"
              >
                {homepageControls.homepageSubhead}
              </motion.p>
              <motion.div
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="mt-9 flex flex-wrap gap-3"
              >
                <a
                  href="#marketplace"
                  className="brand-button-primary"
                >
                  {homepageControls.primaryCtaLabel}
                </a>
                <Link
                  href="/concierge"
                  className="brand-button-ghost"
                >
                  Build a trip plan
                </Link>
              </motion.div>

              <motion.div
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="mt-12 grid max-w-5xl gap-3 md:grid-cols-3"
              >
                {audiencePaths.map((path) => (
                  <Link
                    key={path.eyebrow}
                    href={path.href}
                    className="group rounded-lg border border-white/15 bg-white/[0.08] p-4 text-white shadow-xl shadow-black/10 backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.14] focus:outline-none focus:ring-4 focus:ring-white/20"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D6B56D]">
                      {path.eyebrow}
                    </p>
                    <h2 className="mt-2 text-lg font-black leading-snug">
                      {path.title}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/72">
                      {path.text}
                    </p>
                    <span className="mt-4 inline-flex text-sm font-black text-[#9EE8E3]">
                      {path.cta}
                    </span>
                  </Link>
                ))}
              </motion.div>
            </div>

            <motion.div
              variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
              className="rounded-[1.5rem] border border-white/15 bg-white/[0.11] p-5 text-white shadow-2xl shadow-black/20 backdrop-blur-xl"
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D6B56D]">
                Hero trip planner
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight">
                Start with the island day, not another tab.
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/74">
                Search by area, compare local operators, save a plan, and keep
                booking messages connected to your account.
              </p>
              <div className="mt-6 grid gap-3">
                {premiumTripStats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/12 bg-[#071F2F]/42 p-4"
                  >
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-white/48">
                      {item.label}
                    </p>
                    <p className="mt-1 text-lg font-black text-white">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
              <Link
                href="/map"
                className="mt-5 inline-flex w-full justify-center rounded-lg bg-white px-5 py-3 text-sm font-black text-[#071F2F] shadow-lg shadow-black/10"
              >
                Open the trip map
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reduceMotion ? reducedMotionVariants : sectionRevealVariants}
        className="relative z-20 -mt-12 px-5 sm:px-6"
      >
        <div className="brand-card mx-auto grid max-w-6xl gap-3 p-4 md:grid-cols-3">
          {homepageAssurancePoints.map((point) => (
            <div key={point.title} className="brand-card-lift p-5">
              <p className="brand-eyebrow-gold">
                Marketplace confidence
              </p>
              <h2 className="mt-2 text-lg font-black text-[#0B3C5D]">
                {point.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {point.text}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      <section id="marketplace" className="relative z-10 bg-white/92 px-5 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={reduceMotion ? reducedMotionVariants : sectionRevealVariants}
            className="mb-10 flex flex-col justify-between gap-5 lg:flex-row lg:items-end"
          >
            <div>
              <p className="brand-eyebrow">
                {homepageControls.listingsEyebrow}
              </p>
              <h2 className="brand-display mt-2 text-3xl sm:text-5xl">
                {homepageControls.listingsTitle}
              </h2>
              <p className="brand-subtitle mt-3 max-w-2xl">
                {homepageControls.listingsIntro}
              </p>
              <p className="mt-4 text-sm font-black uppercase tracking-[0.18em] text-[#D6B56D]">
                Search, compare, then plan
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="brand-badge brand-badge-teal">
                {filteredListings.length} result
                {filteredListings.length === 1 ? "" : "s"}
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
            <div className="mb-4 flex flex-col justify-between gap-3 border-b border-[#D6B56D]/15 pb-4 sm:flex-row sm:items-center">
              <div>
                <p className="brand-eyebrow-gold">
                  Find your fit
                </p>
                <h3 className="mt-1 text-xl font-black text-[#0B3C5D]">
                  Keep it simple, then refine only if needed.
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={clearMarketplaceFilters}
                    className="brand-button-secondary min-h-10 px-4 py-2 text-sm"
                  >
                    Clear filters
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setShowAdvancedFilters((current) => !current)}
                  className="brand-button-secondary min-h-10 px-4 py-2 text-sm"
                >
                  {showAdvancedFilters ? "Hide filters" : "More filters"}
                </button>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
              <input
                type="text"
                placeholder="Search by tour, stay, transport, or location"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="brand-input min-h-12"
              />

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {categories.map((cat) => (
                  <button
                    type="button"
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
                className="brand-input min-h-12"
              />
              <input
                value={travelTime}
                onChange={(e) => setTravelTime(e.target.value)}
                placeholder="Preferred time"
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
                  className="brand-input min-h-12"
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
                  <option value="Rating">Highest rated</option>
                  <option value="Price low">Price low to high</option>
                  <option value="Price high">Price high to low</option>
                </select>
              </div>
            ) : null}
          </motion.form>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={reduceMotion ? reducedMotionVariants : sectionRevealVariants}
            className="brand-card mt-4 px-4 py-3"
          >
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#00A8A8]">
                  Trip match brief
                </p>
                <p className="mt-1 text-base font-black text-[#0B3C5D]">
                  {filteredListings.length} match
                  {filteredListings.length === 1 ? "" : "es"} for{" "}
                  {category === "All" ? "all experiences" : category.toLowerCase()}
                  {locationFilter === "All" ? "" : ` near ${locationFilter}`}
                  {travelDate ? ` on ${travelDate}` : ""}
                  {guestCount ? ` for ${guestCount} guests` : ""}.
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  Open the matched map to compare stops by area, or save options
                  into your trip board before requesting help.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={mapUrl}
                  className="brand-button-primary"
                >
                  Compare on map
                </Link>
                <Link
                  href="/account"
                  className="brand-button-secondary"
                >
                  Open trip board
                </Link>
              </div>
            </div>
          </motion.div>

          {homepageControls.showFeaturedListings && spotlightListings.length > 0 ? (
            <div className="mt-12">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D6B56D]">
                    Featured island picks
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                    A shorter list worth opening first.
                  </h3>
                </div>
                <p className="max-w-md text-sm leading-6 text-gray-600">
                  Curated highlights are kept scan-friendly so guests can compare
                  area, price, rating, and next step without hunting.
                </p>
              </div>
              <div className="grid gap-5 lg:grid-cols-3">
                {spotlightListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    homepageControls={homepageControls}
                    travelDate={travelDate}
                    guestCount={guestCount}
                    featured
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-10">
            {visibleListings.length === 0 ? (
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
                {visibleListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    homepageControls={homepageControls}
                    travelDate={travelDate}
                    guestCount={guestCount}
                  />
                ))}
              </div>
            )}
            {filteredListings.length > visibleListings.length ? (
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

          <div className="mt-8">
            <TripPlannerDock />
          </div>
        </div>
      </section>

      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reduceMotion ? reducedMotionVariants : sectionRevealVariants}
        className="bg-[#F7F3EA] px-5 py-16 sm:px-6"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
            <p className="brand-eyebrow">
              Explore by category
            </p>
              <h2 className="brand-display mt-2 text-3xl sm:text-5xl">
                Choose the kind of trip first.
              </h2>
            </div>
            <Link href="/map" className="text-sm font-black text-[#007B7B]">
              Open full map
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {categoryCards.map((item, index) => (
              <motion.div
                key={item.title}
                custom={index}
                variants={reduceMotion ? reducedMotionVariants : categoryCardVariants}
                whileHover={reduceMotion ? undefined : { y: -8 }}
                transition={{ duration: 0.28, ease: smoothEase }}
                className="h-full"
              >
                <Link
                  href={item.href}
                  className="brand-card-lift group block h-full overflow-hidden focus:outline-none focus:ring-4 focus:ring-[#00A8A8]/20"
                >
                  <div className="relative h-36 overflow-hidden bg-[#D8EFEC]">
                    <motion.div
                      className="absolute inset-0"
                      whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                      transition={{ duration: 0.55, ease: smoothEase }}
                    >
                      <Image
                        src="/images/roatan.jpeg"
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover"
                        style={{ objectPosition: item.imagePosition }}
                      />
                    </motion.div>
                    <div className="absolute inset-0 bg-[#071F2F]/25" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="brand-eyebrow-gold">
                          {item.count} live
                        </p>
                        <h3 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                          {item.title}
                        </h3>
                      </div>
                      <span className="brand-badge brand-badge-teal">
                        View
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-gray-600">
                      {item.text}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {homepageControls.showExploreRoutes ? (
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reduceMotion ? reducedMotionVariants : sectionRevealVariants}
        className="mx-auto max-w-7xl px-5 py-16 sm:px-6"
      >
        <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="brand-eyebrow">
              Explore your way
            </p>
            <h2 className="brand-display mt-2 text-3xl sm:text-5xl">
              Start with the day you want.
            </h2>
          </div>
        <Link href="/map" className="text-sm font-black text-[#007B7B]">
          See every area
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {tripTypes.map((item, index) => (
            <motion.div
              key={item.title}
              variants={reduceMotion ? reducedMotionVariants : listingCardVariants}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              transition={{ duration: 0.28, ease: smoothEase }}
              className="h-full"
            >
              <Link
                href={item.href}
                className="brand-card-lift group block h-full p-5 focus:outline-none focus:ring-4 focus:ring-[#00A8A8]/20"
              >
                <p className="brand-eyebrow-gold">
                  Route {index + 1}
                </p>
                <h3 className="mt-3 text-xl font-black text-[#0B3C5D]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-600">{item.text}</p>
                <span className="mt-5 inline-flex text-sm font-black text-[#007B7B]">
                  Explore
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.section>
      ) : null}

      {homepageControls.showMapCallout ? (
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reduceMotion ? reducedMotionVariants : sectionRevealVariants}
        className="px-5 pb-16 sm:px-6"
      >
        <div className="brand-hero-panel mx-auto grid max-w-7xl overflow-hidden text-white lg:grid-cols-[1fr_0.9fr]">
          <div className="p-6 sm:p-10">
            <p className="brand-eyebrow-gold">
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
              className="brand-button-secondary mt-7"
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
      </motion.section>
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
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reduceMotion ? reducedMotionVariants : sectionRevealVariants}
        className="px-5 pb-16 sm:px-6"
      >
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.82fr_1fr] lg:items-start">
          <div>
            <p className="brand-eyebrow">
              {homepageControls.planningEyebrow}
            </p>
            <h2 className="brand-display mt-3 text-3xl sm:text-4xl">
              {homepageControls.planningTitle}
            </h2>
            <p className="brand-subtitle mt-4 max-w-lg">
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

          <div className="brand-card p-5 sm:p-6">
            {leadSubmitted ? (
              <div className="rounded-lg bg-green-100 p-5 text-green-800">
                <h3 className="text-xl font-black">Message sent</h3>
                <p className="mt-2">
                  Thanks. We received your note and will follow up soon.
                </p>
                <button
                  type="button"
                  onClick={() => setLeadSubmitted(false)}
                  className="brand-button-primary mt-4"
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
                    className="brand-input"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block font-bold">Email</label>
                  <input
                    type="email"
                    value={leadEmail}
                    onChange={(e) => setLeadEmail(e.target.value)}
                    className="brand-input"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block font-bold">Phone</label>
                  <input
                    value={leadPhone}
                    onChange={(e) => setLeadPhone(e.target.value)}
                    className="brand-input"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-bold">Interest</label>
                  <select
                    value={leadInterest}
                    onChange={(e) => setLeadInterest(e.target.value)}
                    className="brand-input"
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
                    className="brand-input"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={leadLoading}
                  className="brand-button-primary disabled:opacity-50 md:col-span-2"
                >
                  {leadLoading ? "Sending..." : "Send planning request"}
                </button>
              </form>
            )}
          </div>
        </div>
      </motion.section>
      ) : null}
      <SiteFooter />
    </motion.main>
  );
}

function ListingCard({
  listing,
  homepageControls,
  travelDate,
  guestCount,
  featured = false,
}: {
  listing: Listing;
  homepageControls: HomepageControls;
  travelDate: string;
  guestCount: string;
  featured?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const trustBadges = getListingTrustBadges(listing);
  const conversionTags = getListingConversionTags(listing, {
    date: travelDate,
    guests: guestCount,
  });

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: reduceMotion ? 0.05 : 0.22 }}
      variants={reduceMotion ? reducedMotionVariants : listingCardVariants}
      whileHover={reduceMotion ? undefined : { y: -7 }}
      transition={{ duration: 0.28, ease: smoothEase }}
      className="h-full"
    >
      <Link
        href={`/listings/${listing.id}`}
        className="brand-card-lift group block h-full overflow-hidden focus:outline-none focus:ring-4 focus:ring-[#00A8A8]/25"
      >
        <div className={featured ? "relative h-60 bg-[#D8EFEC]" : "relative h-52 bg-[#D8EFEC]"}>
          {listing.image_url ? (
            <Image
              src={listing.image_url}
              alt={listing.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              unoptimized
              className="object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="brand-skeleton flex h-full items-center justify-center text-sm text-[#0B3C5D]/60">
              No image yet
            </div>
          )}
          <span className="brand-badge absolute left-4 top-4 rounded-lg bg-white px-3 py-1 text-xs uppercase shadow">
            {listingBadge(listing, homepageControls)}
          </span>
          <span className="absolute bottom-4 right-4 rounded-lg bg-[#071F2F] px-3 py-1 text-sm font-black text-white shadow">
            {formatPrice(listing.price)}
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="brand-eyebrow">
                {listing.location || "Roatan"}
              </p>
              <h3 className="mt-2 text-lg font-black leading-snug text-[#0B3C5D]">
                {listing.title}
              </h3>
            </div>
            <span className="brand-badge brand-badge-teal shrink-0">
              {listing.rating ?? 5}/5
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
            {listing.description || "Details coming soon."}
          </p>
          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
            <span className="font-bold text-gray-500">
              {listing.category || "Listing"}
            </span>
            <span className="font-black text-[#007B7B]">
              Quick view
            </span>
          </div>
          {trustBadges.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {trustBadges.slice(0, 2).map((badge) => (
                <span
                  key={badge}
                  className="brand-badge brand-badge-teal"
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : null}
          {conversionTags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {conversionTags.slice(0, 1).map((tag) => (
                <span
                  key={tag}
                  className="brand-badge"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
}
