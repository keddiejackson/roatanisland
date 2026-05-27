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

function normalizeTime(value: string) {
  return value.trim().toLowerCase();
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
