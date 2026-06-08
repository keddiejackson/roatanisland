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
import { homepageCategories } from "@/lib/homepage-content";
import {
  defaultHomepageControls,
  getHomepageSettingsKey,
  getVisibleHomepageSections,
  normalizeHomepageControls,
  type HomepageSectionKey,
} from "@/lib/homepage-settings";
import {
  defaultMobileSiteControls,
  normalizeMobileSiteControls,
} from "@/lib/mobile-site-controls";
import {
  applyTravelerPersonaToFilters,
  buildDateAwareMapUrl,
  getTravelerPersonaPresets,
  listingMatchesAvailability,
  sortListingsForLuxuryMatch,
} from "@/lib/marketplace-upgrade";
import { isShowcaseReadyListing } from "@/lib/listing-quality";
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
  const [mobileControls, setMobileControls] = useState(
    defaultMobileSiteControls,
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
  const [homepagePreviewingDraft, setHomepagePreviewingDraft] = useState(false);

  useEffect(() => {
    async function fetchListings() {
      const isDraftPreview =
        new URLSearchParams(window.location.search).get("homepagePreview") ===
        "draft";
      const homepageSettingsKey = getHomepageSettingsKey(isDraftPreview);
      setHomepagePreviewingDraft(isDraftPreview);

      const { data } = await supabase.from("listings").select("*");
      const rows = ((data as HomePageListing[]) || []).filter(
        (listing) => listing.is_active !== false,
      );

      setListings(rows);

      let { data: settingsData } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", homepageSettingsKey)
        .maybeSingle();

      if (isDraftPreview && !settingsData?.value) {
        const { data: publishedSettings } = await supabase
          .from("site_settings")
          .select("value")
          .eq("key", getHomepageSettingsKey(false))
          .maybeSingle();

        settingsData = publishedSettings;
      }

      if (settingsData?.value && typeof settingsData.value === "object") {
        setHomepageControls(normalizeHomepageControls(settingsData.value));
        setMobileControls(normalizeMobileSiteControls(settingsData.value));
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

  const showcaseListings = useMemo(
    () => listings.filter((listing) => isShowcaseReadyListing(listing)),
    [listings],
  );

  const filteredListings = useMemo(
    () => {
      const filtered = filterHomeListings(showcaseListings, {
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
      locationFilter,
      maxPrice,
      minimumRating,
      search,
      selectedPersonaId,
      showcaseListings,
      sortBy,
      travelDate,
      travelTime,
    ],
  );

  const spotlightListings = useMemo(
    () => {
      const selectedListings = homepageControls.homepageFeaturedListingIds
        .map((listingId) =>
          showcaseListings.find((listing) => listing.id === listingId),
        )
        .filter((listing): listing is HomePageListing => Boolean(listing));

      return selectedListings.length > 0
        ? selectedListings
        : selectHomeSpotlightListings(showcaseListings, filteredListings);
    },
    [
      filteredListings,
      homepageControls.homepageFeaturedListingIds,
      showcaseListings,
    ],
  );

  const locations = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          showcaseListings
            .map((listing) => listing.location)
            .filter((location): location is string => Boolean(location)),
        ),
      ).sort(),
    ],
    [showcaseListings],
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
  const visibleHomepageSections = getVisibleHomepageSections(homepageControls);
  const featuredHomeListings = (
    hasActiveFilters ? filteredListings : spotlightListings
  ).slice(0, 3);
  const activeTripStyle =
    travelerPersonaPresets.find((preset) => preset.id === selectedPersonaId) ||
    travelerPersonaPresets[0];

  const navListingCount = Math.max(
    filteredListings.length,
    featuredHomeListings.length,
    showcaseListings.length,
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

  function renderHomepageSection(section: HomepageSectionKey) {
    return visibleHomepageSections.includes(section);
  }

  function homepageSectionStyle(section: HomepageSectionKey) {
    return { order: visibleHomepageSections.indexOf(section) };
  }

  return (
    <motion.main
      initial="hidden"
      animate="visible"
      variants={reduceMotion ? reducedMotionVariants : pageTransitionVariants}
      className="brand-page min-h-screen overflow-x-hidden"
    >
      {homepagePreviewingDraft ? (
        <div className="fixed inset-x-0 top-0 z-50 bg-[#D6B56D] px-4 py-2 text-center text-xs font-black uppercase tracking-[0.18em] text-[#061D2C] shadow">
          Draft preview - not live yet
        </div>
      ) : null}
      <section className="relative min-h-[680px] overflow-hidden bg-[#061D2C] text-white sm:min-h-[760px]">
        <Image
          src={homepageControls.heroImageUrl}
          alt="Roatan coastline"
          fill
          priority
          sizes="100vw"
          unoptimized
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#061D2C]/56" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_28%,rgba(8,170,168,0.28),transparent_30%),linear-gradient(90deg,rgba(6,29,44,0.92)_0%,rgba(6,29,44,0.55)_48%,rgba(6,29,44,0.2)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-72 bg-[linear-gradient(180deg,rgba(247,243,234,0)_0%,#F7F3EA_88%)]" />

        <div className="relative mx-auto flex min-h-[680px] max-w-7xl flex-col px-4 py-5 sm:min-h-[760px] sm:px-6 sm:py-6">
          <HomeHeroHeader
            account={homeAccount}
            accountLoading={homeAccountLoading}
            signOutLoading={homeSignOutLoading}
            onSignOut={signOutHomeAccount}
            mobileControls={mobileControls}
          />

          <motion.div
            variants={reduceMotion ? reducedMotionVariants : heroContainerVariants}
            className="flex flex-1 items-center py-10 sm:py-14 lg:py-20"
          >
            <div className="max-w-6xl">
              <motion.p
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="text-sm font-black uppercase tracking-[0.26em] text-[#D6B56D]"
              >
                <span className="sm:hidden">{mobileControls.mobileHeroEyebrow}</span>
                <span className="hidden sm:inline">{homepageControls.heroEyebrow}</span>
              </motion.p>
              <motion.h1
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="mt-5 max-w-5xl text-[clamp(3.25rem,17vw,6rem)] font-black leading-[0.9] tracking-normal sm:text-8xl lg:text-[7.8rem]"
              >
                <span className="sm:hidden">{mobileControls.mobileHeroHeadline}</span>
                <span className="hidden sm:inline">
                  {homepageControls.homepageHeadline}
                </span>
              </motion.h1>
              <motion.p
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="mt-6 max-w-3xl text-base leading-7 text-white/84 sm:mt-7 sm:text-2xl sm:leading-10"
              >
                <span className="sm:hidden">{mobileControls.mobileHeroSubhead}</span>
                <span className="hidden sm:inline">
                  {homepageControls.homepageSubhead}
                </span>
              </motion.p>
              <motion.div
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap"
              >
                <a href={homepageControls.primaryCtaHref} className="brand-button-primary">
                  <span className="sm:hidden">
                    {mobileControls.mobilePrimaryCtaLabel}
                  </span>
                  <span className="hidden sm:inline">
                    {homepageControls.primaryCtaLabel}
                  </span>
                </a>
                <a href={homepageControls.secondaryCtaHref} className="brand-button-ghost">
                  <span className="sm:hidden">
                    {mobileControls.mobileSecondaryCtaLabel}
                  </span>
                  <span className="hidden sm:inline">
                    {homepageControls.secondaryCtaLabel}
                  </span>
                </a>
              </motion.div>

              <motion.div
                variants={reduceMotion ? reducedMotionVariants : heroTextVariants}
                className={`mobile-scroll-row mt-9 text-sm font-bold text-white/85 sm:mt-12 sm:flex-wrap ${
                  mobileControls.showMobileHeroPills ? "" : "hidden sm:flex"
                }`}
              >
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  {navListingCount} {homepageControls.heroCountLabel}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  {homepageControls.heroMapLabel}
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2">
                  {homepageControls.heroSupportLabel}
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="flex flex-col">
      {renderHomepageSection("trustBar") ? (
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reduceMotion ? reducedMotionVariants : sectionRevealVariants}
        style={homepageSectionStyle("trustBar")}
        className={`relative z-20 -mt-10 px-5 pb-12 sm:px-6 ${
          mobileControls.showMobileTrustBar ? "" : "hidden sm:block"
        }`}
      >
        <div className="mx-auto grid max-w-5xl gap-2 rounded-[1.25rem] border border-[#D6B56D]/20 bg-white p-3 shadow-xl shadow-[#071F2F]/8 md:grid-cols-3">
          {homepageControls.trustPoints.slice(0, 3).map((signal) => (
            <div key={signal.title} className="flex items-center gap-3 p-3">
              <span className="size-2 shrink-0 rounded-full bg-[#D6B56D]" />
              <h2 className="text-sm font-black text-[#0B3C5D]">
                {signal.title}
              </h2>
            </div>
          ))}
        </div>
      </motion.section>
      ) : null}

      {renderHomepageSection("marketplace") ? (
      <section
        id="marketplace"
        style={homepageSectionStyle("marketplace")}
        className="relative z-10 bg-[#FBF8F1] px-5 py-20 sm:px-6"
      >
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
                {homepageControls.listingsEyebrow}
              </p>
              <h2 className="brand-display mt-2 max-w-4xl text-4xl sm:text-6xl">
                <span className="sm:hidden">
                  {mobileControls.mobileListingsTitle}
                </span>
                <span className="hidden sm:inline">
                  {homepageControls.listingsTitle}
                </span>
              </h2>
              <p className="brand-subtitle mt-3 max-w-2xl">
                <span className="sm:hidden">
                  {mobileControls.mobileListingsIntro}
                </span>
                <span className="hidden sm:inline">
                  {homepageControls.listingsIntro}
                </span>
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
            className={`brand-card p-4 sm:p-5 ${
              mobileControls.showMobileHomepageSearch ? "" : "hidden sm:block"
            }`}
          >
            <div className="grid gap-3 lg:grid-cols-[1.5fr_0.85fr_0.95fr_0.8fr_0.65fr]">
              <input
                type="text"
                placeholder="Search by experience, stay, transport, or location"
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
              <label className="grid min-w-0 gap-1">
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-[#007B7B]">
                  Trip date
                </span>
                <input
                  type="date"
                  aria-label="Trip date"
                  value={travelDate}
                  onChange={(e) => setTravelDate(e.target.value)}
                  className="brand-input min-h-12 min-w-0 max-w-full appearance-none py-3"
                />
              </label>
              <input
                type="number"
                min="1"
                value={guestCount}
                onChange={(e) => setGuestCount(e.target.value)}
                placeholder="Guests"
                className="brand-input min-h-12"
              />
            </div>

            <div className="mt-4 rounded-[1rem] border border-[#D6B56D]/25 bg-[#FFFDF7] p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9C7A2F]">
                    Private trip quiz
                  </p>
                  <p className="mt-1 text-sm font-bold text-[#0B3C5D]">
                    Choose the kind of Roatan day you want and we will narrow
                    the marketplace to the best fit.
                  </p>
                </div>
                <Link
                  href="/guides"
                  className="brand-button-secondary shrink-0 justify-center px-4 py-2 text-sm"
                >
                  Read Roatan guides
                </Link>
              </div>
              <div className="mobile-scroll-row mt-3 flex gap-2 overflow-x-auto pb-1">
                {travelerPersonaPresets.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyTravelerPersona(preset.id)}
                    className={`min-w-44 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      selectedPersonaId === preset.id
                        ? "border-[#00A8A8] bg-[#071F2F] text-white"
                        : "border-[#D6B56D]/25 bg-white text-[#0B3C5D] hover:border-[#00A8A8]"
                    }`}
                  >
                    <span className="block font-black">{preset.label}</span>
                    <span className="mt-1 block text-xs leading-5 opacity-75">
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
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

          {!mobileControls.showMobileHomepageSearch ? (
            <div className="brand-card p-4 sm:hidden">
              <p className="text-sm font-black text-[#0B3C5D]">
                {featuredHomeListings.length} curated matches ready.
              </p>
              <div className="mt-3 grid gap-2">
                <Link href={mapUrl} className="brand-button-primary justify-center">
                  Open matched map
                </Link>
                <Link
                  href="/concierge"
                  className="brand-button-secondary justify-center"
                >
                  Plan with concierge
                </Link>
              </div>
            </div>
          ) : null}

          <div className="mt-10">
            {featuredHomeListings.length === 0 ? (
              <div className="rounded-[1.35rem] border border-[#D6B56D]/20 bg-[#F7F3EA] p-5 shadow-inner shadow-white">
                <EmptyState
                  title="No curated matches yet."
                  text="The homepage only shows polished, guest-ready experiences. Open the map for every active option or ask the concierge to point you to the closest fit."
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
      ) : null}

      {renderHomepageSection("finalCta") ? (
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={viewportOnce}
        variants={reduceMotion ? reducedMotionVariants : sectionRevealVariants}
        style={homepageSectionStyle("finalCta")}
        className={`px-5 pb-20 sm:px-6 ${
          mobileControls.showMobileFinalCta ? "" : "hidden sm:block"
        }`}
      >
        <div className="brand-hero-panel relative mx-auto max-w-7xl overflow-hidden p-6 text-white sm:p-10">
          {homepageControls.finalCtaImageUrl ? (
            <>
              <Image
                src={homepageControls.finalCtaImageUrl}
                alt=""
                fill
                sizes="100vw"
                unoptimized
                className="object-cover opacity-30"
              />
              <div className="absolute inset-0 bg-[#061D2C]/72" />
            </>
          ) : null}
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="brand-eyebrow-gold">
                {homepageControls.finalCtaEyebrow}
              </p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
                <span className="sm:hidden">
                  {mobileControls.mobileFinalCtaTitle}
                </span>
                <span className="hidden sm:inline">
                  {homepageControls.finalCtaTitle}
                </span>
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/72">
                <span className="sm:hidden">
                  {mobileControls.mobileFinalCtaBody}
                </span>
                <span className="hidden sm:inline">
                  {homepageControls.finalCtaBody}
                </span>
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:min-w-72">
              <a
                href={homepageControls.finalCtaPrimaryHref}
                className="brand-button-primary justify-center px-8 py-4"
              >
                <span className="sm:hidden">
                  {mobileControls.mobileFinalCtaPrimaryLabel}
                </span>
                <span className="hidden sm:inline">
                  {homepageControls.finalCtaPrimaryLabel}
                </span>
              </a>
              <div className="flex justify-center gap-4 text-sm font-black text-white/72">
                <a
                  href={homepageControls.finalCtaSecondaryHref}
                  className="hover:text-white"
                >
                  {homepageControls.finalCtaSecondaryLabel}
                </a>
                <a
                  href={homepageControls.finalCtaTertiaryHref}
                  className="hover:text-white"
                >
                  {homepageControls.finalCtaTertiaryLabel}
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.section>
      ) : null}
      </div>
      <SiteFooter />
    </motion.main>
  );
}
