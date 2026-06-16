export type MarketplaceListing = {
  id: string;
  title?: string | null;
  description?: string | null;
  category?: string | null;
  location?: string | null;
  tour_times?: string[] | null;
  blocked_dates?: string[] | null;
  max_guests?: number | null;
  is_featured?: boolean | null;
  is_active?: boolean | null;
  approval_status?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  price?: number | null;
};

export type MarketplaceBooking = {
  id: string;
  status?: string | null;
  tour_date?: string | null;
  guests?: number | null;
};

export type MarketplaceVendor = {
  id: string;
  is_active?: boolean | null;
};

export type MarketplaceReview = {
  id: string;
  is_approved?: boolean | null;
};

export type AdminCommandDigestItem = {
  label: string;
  value: number;
  href: string;
  text: string;
  tone: "urgent" | "quality" | "growth";
};

export type DateAwareFilters = {
  date: string;
  time: string;
  guests: string;
  availableOnly: boolean;
};

export type TravelerPersonaPreset = {
  id: string;
  label: string;
  description: string;
  searchTerms: string[];
  filters: {
    search: string;
    category: string;
    location: string;
    maxPrice: string;
    minimumRating: string;
    sortBy: string;
    guestCount: string;
    availableOnly: boolean;
  };
};

export type LuxuryMarketplaceMatch = {
  label: "Excellent match" | "Strong match" | "Worth comparing";
  score: number;
  reasons: string[];
};

export type LuxuryListingDetailProfile = {
  label: string;
  summary: string;
  idealFor: string[];
  serviceSignals: string[];
  planningNotes: string[];
};

export type PremiumListingCardPolish = {
  imageLabel: "Premium photo ready" | "Premium photo pending";
  priceLabel: string;
  primaryBadge: "Guest-ready" | "Needs media" | "Needs trust";
  benefitLine: string;
  trustBadges: string[];
  adminFlags: string[];
};

const travelerPersonaPresets: TravelerPersonaPreset[] = [
  {
    id: "luxury-private",
    label: "Luxury private day",
    description: "Private boats, VIP pacing, sunset timing, and premium operators.",
    searchTerms: ["private", "charter", "luxury", "sunset"],
    filters: {
      search: "private sunset",
      category: "Private Charters",
      location: "All",
      maxPrice: "",
      minimumRating: "4.5",
      sortBy: "Smart match",
      guestCount: "4",
      availableOnly: false,
    },
  },
  {
    id: "cruise-day",
    label: "Cruise guest day",
    description: "Port-friendly timing, short routes, beaches, and easy return.",
    searchTerms: ["cruise", "port", "beach", "coxen", "isla tropicale"],
    filters: {
      search: "cruise beach",
      category: "Tours",
      location: "All",
      maxPrice: "",
      minimumRating: "4.5",
      sortBy: "Smart match",
      guestCount: "4",
      availableOnly: false,
    },
  },
  {
    id: "family-easy",
    label: "Family easy day",
    description: "Gentle pacing, easy pickup, food nearby, and flexible stops.",
    searchTerms: ["family", "beach", "easy", "food"],
    filters: {
      search: "family beach",
      category: "All",
      location: "All",
      maxPrice: "",
      minimumRating: "4.5",
      sortBy: "Smart match",
      guestCount: "4",
      availableOnly: false,
    },
  },
  {
    id: "arrival-transfer",
    label: "Airport arrival",
    description: "Airport pickup, luggage-friendly timing, and simple first steps.",
    searchTerms: ["airport", "transfer", "pickup", "transport"],
    filters: {
      search: "airport transfer",
      category: "Transport",
      location: "All",
      maxPrice: "",
      minimumRating: "4.5",
      sortBy: "Smart match",
      guestCount: "2",
      availableOnly: false,
    },
  },
];

function normalizeTime(value: string) {
  return value.trim().toLowerCase();
}

function listingSearchText(listing: MarketplaceListing) {
  return [
    listing.title,
    listing.description,
    listing.category,
    listing.location,
    ...(listing.tour_times || []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function scoreTrustSignals(listing: MarketplaceListing) {
  let score = 0;

  if (listing.is_featured) score += 8;
  if ((listing.rating || 0) >= 4.8) score += 10;
  if ((listing.reviews_count || 0) >= 3) score += 8;
  if (listing.latitude != null && listing.longitude != null) score += 4;
  if ((listing.tour_times || []).length > 0) score += 4;

  return score;
}

function getTravelerPersona(id: string) {
  return (
    travelerPersonaPresets.find((preset) => preset.id === id) ||
    travelerPersonaPresets[0]
  );
}

function getGuestFitReason(listing: MarketplaceListing, guests: string) {
  const guestCount = Number(guests);

  if (
    Number.isFinite(guestCount) &&
    guestCount > 0 &&
    (!listing.max_guests || guestCount <= listing.max_guests)
  ) {
    return `Fits ${guestCount} guest${guestCount === 1 ? "" : "s"}`;
  }

  return "";
}

function addPersonaReason({
  reasons,
  condition,
  reason,
}: {
  reasons: string[];
  condition: boolean;
  reason: string;
}) {
  if (condition) reasons.push(reason);
}

export function getTravelerPersonaPresets() {
  return travelerPersonaPresets;
}

export function applyTravelerPersonaToFilters(personaId: string) {
  return { ...getTravelerPersona(personaId).filters };
}

export function getLuxuryMarketplaceMatch(
  listing: MarketplaceListing,
  personaId: string,
  context: { date?: string; guests?: string } = {},
): LuxuryMarketplaceMatch {
  const persona = getTravelerPersona(personaId);
  const text = listingSearchText(listing);
  const category = (listing.category || "").toLowerCase();
  const reasons: string[] = [];
  let score = scoreTrustSignals(listing);

  if (persona.id === "luxury-private") {
    const privateFit =
      category.includes("private") ||
      text.includes("private") ||
      text.includes("charter") ||
      text.includes("vip");
    const sunsetFit = text.includes("sunset");
    const premiumTier = (listing.price || 0) >= 150;

    addPersonaReason({
      reasons,
      condition: privateFit,
      reason: "Private or VIP fit",
    });
    addPersonaReason({
      reasons,
      condition: sunsetFit,
      reason: "Sunset-friendly",
    });
    addPersonaReason({
      reasons,
      condition: premiumTier,
      reason: "Premium price tier",
    });
    if (privateFit) score += 24;
    if (sunsetFit) score += 14;
    if (premiumTier) score += 16;
  }

  if (persona.id === "cruise-day") {
    const cruiseFit =
      text.includes("cruise") ||
      text.includes("port") ||
      text.includes("coxen") ||
      text.includes("isla tropicale") ||
      text.includes("tropicale") ||
      text.includes("dixon");
    const beachFit = text.includes("beach");

    addPersonaReason({ reasons, condition: cruiseFit, reason: "Cruise-friendly" });
    addPersonaReason({ reasons, condition: beachFit, reason: "Beach time" });
    if (cruiseFit) score += 28;
    if (beachFit) score += 12;
  }

  if (persona.id === "family-easy") {
    const familyFit =
      text.includes("family") ||
      text.includes("beach") ||
      text.includes("easy") ||
      text.includes("food");

    addPersonaReason({
      reasons,
      condition: familyFit,
      reason: "Family-friendly",
    });
    if (familyFit) score += 28;
    if ((listing.max_guests || 0) >= 4) score += 8;
  }

  if (persona.id === "arrival-transfer") {
    const airportFit = text.includes("airport") || text.includes("transfer");
    const transportFit = category.includes("transport");

    addPersonaReason({
      reasons,
      condition: airportFit,
      reason: "Airport pickup",
    });
    addPersonaReason({
      reasons,
      condition: transportFit,
      reason: "Transport fit",
    });
    if (airportFit) score += 32;
    if (transportFit) score += 20;
  }

  if (
    context.date &&
    !(listing.blocked_dates || []).includes(context.date)
  ) {
    reasons.push("Open on your date");
    score += 8;
  }

  const guestReason = getGuestFitReason(listing, context.guests || "");
  if (guestReason) {
    reasons.push(guestReason);
    score += 8;
  }

  const finalScore = Math.min(100, Math.max(0, score));

  return {
    label:
      finalScore >= 82
        ? "Excellent match"
        : finalScore >= 58
          ? "Strong match"
          : "Worth comparing",
    score: finalScore,
    reasons: uniqueValues(
      reasons.length > 0 ? reasons : getListingConversionTags(listing, context),
    ).slice(0, 5),
  };
}

export function sortListingsForLuxuryMatch<Listing extends MarketplaceListing>(
  listings: Listing[],
  personaId: string,
  context: { date?: string; guests?: string } = {},
) {
  return [...listings].sort((first, second) => {
    const firstMatch = getLuxuryMarketplaceMatch(first, personaId, context);
    const secondMatch = getLuxuryMarketplaceMatch(second, personaId, context);

    if (firstMatch.score === secondMatch.score) {
      return (second.rating || 0) - (first.rating || 0);
    }

    return secondMatch.score - firstMatch.score;
  });
}

export function getMarketplaceMatchBrief({
  personaId,
  listings,
  date,
  guests,
}: {
  personaId: string;
  listings: MarketplaceListing[];
  date?: string;
  guests?: string;
}) {
  const persona = getTravelerPersona(personaId);
  const ranked = sortListingsForLuxuryMatch(listings, persona.id, {
    date,
    guests,
  });
  const topMatch = ranked[0]
    ? getLuxuryMarketplaceMatch(ranked[0], persona.id, { date, guests })
    : null;

  return {
    eyebrow: "Smart trip matching",
    title: `Best matches for ${persona.label}`,
    body: `We ranked ${listings.length} live option${
      listings.length === 1 ? "" : "s"
    } using your travel style, date, guest count, location fit, trust signals, and booking clarity.`,
    topReasons: (topMatch?.reasons || persona.searchTerms).slice(0, 3),
  };
}

export function getLuxuryListingDetailProfile(
  listing: MarketplaceListing,
): LuxuryListingDetailProfile {
  const text = listingSearchText(listing);
  const category = (listing.category || "").toLowerCase();
  const isPrivate =
    category.includes("private") ||
    text.includes("private") ||
    text.includes("charter");
  const hasSunset = text.includes("sunset");
  const hasAirport = text.includes("airport") || text.includes("transfer");
  const isFamily =
    text.includes("family") || text.includes("beach") || text.includes("easy");
  const idealFor = uniqueValues([
    isPrivate ? "Private day" : "",
    hasSunset ? "Sunset plan" : "",
    hasAirport ? "Arrival or transfer" : "",
    isFamily ? "Family-friendly" : "",
    (listing.price || 0) >= 150 ? "Premium experience" : "",
    !isPrivate && !hasAirport && !isFamily ? "Roatan discovery" : "",
  ]).slice(0, 3);
  const serviceSignals = uniqueValues([
    isPrivate ? "Private or charter-style experience" : "",
    (listing.tour_times || []).length > 0 ? "Tour times published" : "",
    (listing.reviews_count || 0) >= 3 ? "Verified review history" : "",
    listing.latitude != null && listing.longitude != null ? "Exact map context" : "",
    listing.max_guests ? "Guest capacity listed" : "",
  ]).slice(0, 4);

  return {
    label: isPrivate ? "Luxury private fit" : "Curated Roatan fit",
    summary: isPrivate
      ? "Best for travelers who want a polished private Roatan day with clear timing, operator trust, and map context before requesting."
      : "Best for travelers who want a clear Roatan plan with useful timing, area context, and operator details before requesting.",
    idealFor,
    serviceSignals,
    planningNotes: [
      "Use this as an anchor stop, then compare nearby listings before requesting.",
      "Ask for pickup timing, weather backup, and final payment details before confirmation.",
      "Save or book this listing so messages stay connected to your trip dashboard.",
    ],
  };
}

function listingHasTime(listing: MarketplaceListing, time: string) {
  if (!time.trim()) return true;
  const normalizedTime = normalizeTime(time);

  return (listing.tour_times || []).some((tourTime) =>
    normalizeTime(tourTime).includes(normalizedTime),
  );
}

function listingHasCapacity(listing: MarketplaceListing, guests: string) {
  const guestCount = Number(guests);

  if (!Number.isFinite(guestCount) || guestCount < 1 || !listing.max_guests) {
    return true;
  }

  return guestCount <= listing.max_guests;
}

export function listingMatchesAvailability(
  listing: MarketplaceListing,
  filters: DateAwareFilters,
) {
  if (!filters.availableOnly && !filters.date && !filters.time && !filters.guests) {
    return true;
  }

  if (
    filters.date &&
    (listing.blocked_dates || []).includes(filters.date)
  ) {
    return false;
  }

  if (!listingHasTime(listing, filters.time)) {
    return false;
  }

  return listingHasCapacity(listing, filters.guests);
}

export function buildDateAwareMapUrl({
  category,
  location,
  date,
  time,
  guests,
  availableOnly,
}: {
  category: string;
  location: string;
  date: string;
  time: string;
  guests: string;
  availableOnly: boolean;
}) {
  const params = new URLSearchParams();
  if (category && category !== "All") params.set("category", category);
  if (location && location !== "All") params.set("area", location);
  if (date) params.set("date", date);
  if (time) params.set("time", time);
  if (guests) params.set("guests", guests);
  if (availableOnly) params.set("available", "1");

  const query = params.toString();
  return query ? `/map?${query}` : "/map";
}

export function getListingTrustBadges(listing: MarketplaceListing) {
  const badges: string[] = [];

  if (listing.is_featured) badges.push("Featured");
  if ((listing.rating || 0) >= 4.8) badges.push("Top rated");
  if ((listing.reviews_count || 0) >= 3) badges.push("Verified reviews");
  if (listing.latitude != null && listing.longitude != null) {
    badges.push("Exact map pin");
  }
  if ((listing.tour_times || []).length > 0) badges.push("Times listed");
  if (listing.max_guests) badges.push("Capacity set");

  return badges.slice(0, 4);
}

function formatPremiumListingPrice(price?: number | null) {
  if (!price || price <= 0) return "Request quote";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function getPremiumListingBenefitLine(listing: MarketplaceListing) {
  const text = [
    listing.title,
    listing.description,
    listing.category,
    listing.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (text.includes("private") || text.includes("charter") || text.includes("vip")) {
    return "Private pacing, clearer pickup, and operator context before you request.";
  }

  if (text.includes("airport") || text.includes("transfer")) {
    return "Airport-aware timing with pickup expectations before you book.";
  }

  if (text.includes("family")) {
    return "Family-friendly pacing with key details confirmed before your day.";
  }

  const firstSentence = (listing.description || "")
    .split(".")
    .map((sentence) => sentence.trim())
    .find(Boolean);

  if (firstSentence && firstSentence.length >= 24) {
    return firstSentence.length > 120
      ? `${firstSentence.slice(0, 117).trim()}...`
      : firstSentence;
  }

  return "Concierge can confirm timing and pickup before you commit.";
}

export function getPremiumListingCardPolish(
  listing: MarketplaceListing,
): PremiumListingCardPolish {
  const hasImage = Boolean(listing.image_url);
  const hasPrice = Boolean(listing.price && listing.price > 0);
  const hasLocation = Boolean((listing.location || "").trim());
  const hasMapPin = listing.latitude != null && listing.longitude != null;
  const hasTimes = (listing.tour_times || []).length > 0;
  const hasCapacity = Boolean(listing.max_guests);
  const adminFlags: string[] = [];

  if (!hasImage) adminFlags.push("media");
  if (!hasPrice) adminFlags.push("pricing");
  if (!hasLocation) adminFlags.push("location");
  if (!hasMapPin) adminFlags.push("map");
  if (!hasTimes) adminFlags.push("times");

  const trustBadges = uniqueValues([
    listing.is_featured || (listing.rating || 0) >= 4.8
      ? "Guest favorite"
      : "",
    (listing.reviews_count || 0) >= 3 ? "Verified reviews" : "",
    hasMapPin ? "Exact map pin" : "",
    hasTimes ? "Times listed" : "",
    hasCapacity ? "Capacity clear" : "",
    hasLocation ? "Clear pickup" : "",
    hasImage ? "Premium media" : "Premium media needed",
    hasPrice ? "Price clear" : "Quote clarity needed",
    ...getListingTrustBadges(listing),
  ]).slice(0, 5);

  const primaryBadge = !hasImage
    ? "Needs media"
    : adminFlags.length > 0
      ? "Needs trust"
      : "Guest-ready";

  return {
    imageLabel: hasImage ? "Premium photo ready" : "Premium photo pending",
    priceLabel: formatPremiumListingPrice(listing.price),
    primaryBadge,
    benefitLine: getPremiumListingBenefitLine(listing),
    trustBadges,
    adminFlags,
  };
}

export function getListingConversionTags(
  listing: MarketplaceListing,
  filters: { date?: string; guests?: string } = {},
) {
  const tags: string[] = [];
  const text = [
    listing.title,
    listing.description,
    listing.category,
    listing.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const guests = Number(filters.guests);

  if (
    filters.date &&
    !(listing.blocked_dates || []).includes(filters.date)
  ) {
    tags.push("Open on your date");
  }

  if (
    Number.isFinite(guests) &&
    guests > 0 &&
    (!listing.max_guests || guests <= listing.max_guests)
  ) {
    tags.push(`Fits ${guests} guest${guests === 1 ? "" : "s"}`);
  }

  if (text.includes("airport")) {
    tags.push("Airport pickup");
  }

  if ((listing.category || "").toLowerCase().includes("private")) {
    tags.push("Private option");
  }

  if ((listing.tour_times || []).length > 0) {
    tags.push("Times listed");
  }

  if ((listing.rating || 0) >= 4.8) {
    tags.push("Top rated");
  }

  if ((listing.reviews_count || 0) >= 3) {
    tags.push("Verified reviews");
  }

  if (listing.latitude != null && listing.longitude != null) {
    tags.push("Exact map pin");
  }

  return tags.slice(0, 4);
}

export function getMarketplaceCommandCenter({
  listings,
  bookings,
  vendors,
  reviews,
}: {
  listings: MarketplaceListing[];
  bookings: MarketplaceBooking[];
  vendors: MarketplaceVendor[];
  reviews: MarketplaceReview[];
}) {
  const activeListings = listings.filter((listing) => listing.is_active !== false);
  const missingMapPins = listings.filter(
    (listing) => listing.latitude == null || listing.longitude == null,
  ).length;
  const missingReviews = listings.filter(
    (listing) => !listing.reviews_count,
  ).length;
  const unconfirmedBookings = bookings.filter(
    (booking) => (booking.status || "new") === "new",
  ).length;
  const needsReview = listings.filter(
    (listing) =>
      listing.is_active === false ||
      (listing.approval_status || "approved") === "pending",
  ).length;
  const activeVendors = vendors.filter((vendor) => vendor.is_active !== false).length;
  const pendingReviews = reviews.filter((review) => !review.is_approved).length;
  const qualitySignals = activeListings.reduce((total, listing) => {
    return total + getListingTrustBadges(listing).length;
  }, 0);
  const possibleSignals = Math.max(activeListings.length * 4, 1);

  return {
    marketplaceScore: Math.round((qualitySignals / possibleSignals) * 100),
    activeListings: activeListings.length,
    activeVendors,
    pendingReviews,
    priorityCards: [
      {
        label: "Needs review",
        value: needsReview,
        href: "/admin/listing-review",
      },
      {
        label: "Missing map pins",
        value: missingMapPins,
        href: "/admin/map-cleanup",
      },
      {
        label: "Missing reviews",
        value: missingReviews,
        href: "/admin/reviews",
      },
      {
        label: "Unconfirmed bookings",
        value: unconfirmedBookings,
        href: "/admin/bookings",
      },
    ],
  };
}

export function getAdminCommandDigest({
  listings,
  bookings,
  vendors,
  reviews,
  conciergeLeadCount = 0,
}: {
  listings: MarketplaceListing[];
  bookings: MarketplaceBooking[];
  vendors: MarketplaceVendor[];
  reviews: MarketplaceReview[];
  conciergeLeadCount?: number;
}) {
  const commandCenter = getMarketplaceCommandCenter({
    listings,
    bookings,
    vendors,
    reviews,
  });
  const itemCandidates: AdminCommandDigestItem[] = [
    {
      label: "Concierge leads",
      value: conciergeLeadCount,
      href: "/admin/concierge",
      text: "Reply to guests who asked for planning help.",
      tone: "urgent",
    },
    {
      label: "Missing map pins",
      value:
        commandCenter.priorityCards.find(
          (card) => card.label === "Missing map pins",
        )?.value || 0,
      href: "/admin/map-cleanup",
      text: "Place listings accurately so travelers can plan by area.",
      tone: "quality",
    },
    {
      label: "Pending reviews",
      value: reviews.filter((review) => !review.is_approved).length,
      href: "/admin/reviews",
      text: "Keep social proof fresh by approving useful reviews.",
      tone: "growth",
    },
    {
      label: "New bookings",
      value:
        commandCenter.priorityCards.find(
          (card) => card.label === "Unconfirmed bookings",
        )?.value || 0,
      href: "/admin/bookings",
      text: "Confirm or follow up on new traveler requests.",
      tone: "urgent",
    },
  ];
  const items = itemCandidates.filter((item) => item.value > 0);
  const attentionCount = items.reduce((total, item) => total + item.value, 0);

  return {
    headline:
      attentionCount > 0
        ? `${attentionCount} item${attentionCount === 1 ? "" : "s"} need attention`
        : "Everything important is clear",
    items,
    topAction:
      items[0] || {
        label: "Open analytics",
        value: 0,
        href: "/admin/analytics",
        text: "Review traffic, bookings, and marketplace quality.",
        tone: "growth" as const,
      },
  };
}

function dateValue(year: number, monthIndex: number, day: number) {
  const month = String(monthIndex + 1).padStart(2, "0");
  const dayValue = String(day).padStart(2, "0");
  return `${year}-${month}-${dayValue}`;
}

export function getMonthCalendarDays({
  month,
  blockedDates,
  bookings,
}: {
  month: string;
  blockedDates: string[];
  bookings: MarketplaceBooking[];
}) {
  const [yearValue, monthValue] = month.split("-").map(Number);
  const year = Number.isFinite(yearValue) ? yearValue : new Date().getFullYear();
  const monthIndex = Number.isFinite(monthValue) ? monthValue - 1 : new Date().getMonth();
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: totalDays }, (_, index) => {
    const date = dateValue(year, monthIndex, index + 1);
    const dayBookings = bookings.filter(
      (booking) => booking.tour_date === date && booking.status !== "cancelled",
    );

    return {
      date,
      day: index + 1,
      isBlocked: blockedDates.includes(date),
      bookingCount: dayBookings.length,
      guestCount: dayBookings.reduce(
        (total, booking) => total + (booking.guests || 0),
        0,
      ),
    };
  });
}
