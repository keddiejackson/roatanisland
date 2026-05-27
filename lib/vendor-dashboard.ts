type ListingLike = {
  id?: string | null;
  is_active?: boolean | null;
  approval_status?: string | null;
  tour_times?: string[] | null;
  gallery_image_urls?: string[] | null;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  max_guests?: number | null;
  availability_note?: string | null;
};

type BookingLike = {
  id: string;
  listing_id?: string | null;
  status?: string | null;
  tour_date?: string | null;
  tour_time?: string | null;
  booking_value_cents?: number | null;
  selected_addons?: { name?: string; price_cents?: number }[] | null;
};

type AddonLike = {
  id?: string;
  listing_id?: string | null;
  name?: string | null;
  price_cents?: number | null;
};

type ProfileLike = {
  businessName?: string | null;
  phone?: string | null;
  website?: string | null;
  profileImageUrl?: string | null;
};

type DocumentLike = {
  id?: string;
};

export type ListingStatusTone = "live" | "rejected" | "review";

type VendorDashboardStats = {
  newBookings: number;
  confirmedBookings: number;
  liveListings: number;
  reviewListings: number;
};

type ProfileCompletionItem = {
  label: string;
  complete: boolean;
  text: string;
};

export type VendorFocusItem = {
  label: string;
  value: string;
  text: string;
  href: string;
  tone: "urgent" | "setup" | "growth";
};

export type VendorRevenueSummary = {
  grossBookingValueCents: number;
  confirmedValueCents: number;
  pendingValueCents: number;
  averageBookingValueCents: number;
  addonRevenueCents: number;
  topAddonLabel: string;
  upcomingConfirmedCount: number;
  label: string;
};

export type ListingRevenueKit = {
  score: number;
  label: "Revenue-ready" | "Growth-ready" | "Needs polish";
  bookingValueCents: number;
  requestCount: number;
  addonCount: number;
  tips: string[];
};

function formatRevenueLabel(valueCents: number) {
  return `${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(valueCents / 100)} total request value`;
}

function isCancelled(booking: BookingLike) {
  return (booking.status || "").toLowerCase() === "cancelled";
}

function isConfirmedRevenue(booking: BookingLike) {
  return ["confirmed", "completed"].includes((booking.status || "").toLowerCase());
}

export function getListingStatusSummary(listing: ListingLike): {
  label: string;
  tone: ListingStatusTone;
  text: string;
} {
  if (listing.is_active) {
    return {
      label: "Live",
      tone: "live",
      text: "Guests can see and book this listing.",
    };
  }

  if (listing.approval_status === "rejected") {
    return {
      label: "Needs changes",
      tone: "rejected",
      text: "Review the admin note and save changes for another review.",
    };
  }

  return {
    label: "Waiting for review",
    tone: "review",
    text: "This listing is hidden until admin approves it.",
  };
}

export function getProfileCompletionItems({
  profile,
  listings,
  documents,
}: {
  profile: ProfileLike;
  listings: ListingLike[];
  documents: DocumentLike[];
}) {
  const hasListing = listings.length > 0;
  const hasTourTimes = listings.some((listing) => (listing.tour_times || []).length > 0);
  const hasMapPin = listings.some(
    (listing) => listing.latitude != null && listing.longitude != null,
  );
  const hasApprovedListing = listings.some((listing) => Boolean(listing.is_active));

  return [
    {
      label: "Profile picture",
      complete: Boolean(profile.profileImageUrl),
      text: "Add a recognizable brand or owner photo.",
    },
    {
      label: "Phone or website",
      complete: Boolean(profile.phone || profile.website),
      text: "Give travelers a clear way to recognize your business.",
    },
    {
      label: "At least one listing",
      complete: hasListing,
      text: "Create your first tour, stay, transfer, or charter.",
    },
    {
      label: "Tour times added",
      complete: hasTourTimes,
      text: "Add times so travelers can pick the right option.",
    },
    {
      label: "Map pin added",
      complete: hasMapPin,
      text: "Place your pickup, meeting point, or service area.",
    },
    {
      label: "Documents uploaded",
      complete: documents.length > 0,
      text: "Upload documents for admin review when needed.",
    },
    {
      label: "Listing approved",
      complete: hasApprovedListing,
      text: "Approved listings appear on the public site.",
    },
  ];
}

export function getVendorDashboardStats({
  bookings,
  listings,
}: {
  bookings: BookingLike[];
  listings: ListingLike[];
}) {
  return {
    newBookings: bookings.filter((booking) => (booking.status || "new") === "new")
      .length,
    confirmedBookings: bookings.filter((booking) => booking.status === "confirmed")
      .length,
    liveListings: listings.filter((listing) => Boolean(listing.is_active)).length,
    reviewListings: listings.filter((listing) => !listing.is_active).length,
  };
}

export function getListingReadinessSummary(listing: ListingLike): {
  score: number;
  label: "Guest-ready" | "Almost ready" | "Needs basics";
  missingItems: string[];
} {
  const checks = [
    {
      label: "Add photos",
      complete:
        Boolean(listing.image_url) ||
        Boolean((listing.gallery_image_urls || []).length),
    },
    {
      label: "Add tour times",
      complete: Boolean((listing.tour_times || []).length),
    },
    {
      label: "Set a map pin",
      complete: listing.latitude != null && listing.longitude != null,
    },
    {
      label: "Set max guests",
      complete: Boolean(listing.max_guests),
    },
    {
      label: "Add availability note",
      complete: Boolean((listing.availability_note || "").trim()),
    },
  ];
  const completed = checks.filter((check) => check.complete).length;
  const score = Math.round((completed / checks.length) * 100);

  return {
    score,
    label:
      score >= 90 ? "Guest-ready" : score >= 60 ? "Almost ready" : "Needs basics",
    missingItems: checks
      .filter((check) => !check.complete)
      .map((check) => check.label),
  };
}

export function getVendorRevenueSummary({
  bookings,
}: {
  bookings: BookingLike[];
}): VendorRevenueSummary {
  const activeBookings = bookings.filter((booking) => !isCancelled(booking));
  const bookingsWithValue = activeBookings.filter(
    (booking) => typeof booking.booking_value_cents === "number",
  );
  const grossBookingValueCents = activeBookings.reduce(
    (total, booking) => total + (booking.booking_value_cents || 0),
    0,
  );
  const confirmedValueCents = activeBookings
    .filter(isConfirmedRevenue)
    .reduce((total, booking) => total + (booking.booking_value_cents || 0), 0);
  const pendingValueCents = activeBookings
    .filter((booking) => !isConfirmedRevenue(booking))
    .reduce((total, booking) => total + (booking.booking_value_cents || 0), 0);
  const addonCounts = new Map<string, number>();
  const addonRevenueCents = activeBookings.reduce((total, booking) => {
    return (
      total +
      (booking.selected_addons || []).reduce((addonTotal, addon) => {
        if (addon.name) {
          addonCounts.set(addon.name, (addonCounts.get(addon.name) || 0) + 1);
        }

        return addonTotal + (addon.price_cents || 0);
      }, 0)
    );
  }, 0);
  const topAddonLabel =
    [...addonCounts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] ||
    "None yet";

  return {
    grossBookingValueCents,
    confirmedValueCents,
    pendingValueCents,
    averageBookingValueCents:
      bookingsWithValue.length > 0
        ? Math.round(grossBookingValueCents / bookingsWithValue.length)
        : 0,
    addonRevenueCents,
    topAddonLabel,
    upcomingConfirmedCount: activeBookings.filter(
      (booking) => (booking.status || "").toLowerCase() === "confirmed",
    ).length,
    label: formatRevenueLabel(grossBookingValueCents),
  };
}

export function getListingRevenueKit({
  listing,
  bookings,
  addons,
}: {
  listing: ListingLike;
  bookings: BookingLike[];
  addons: AddonLike[];
}): ListingRevenueKit {
  const readiness = getListingReadinessSummary(listing);
  const listingBookings = bookings.filter(
    (booking) => booking.listing_id && booking.listing_id === listing.id && !isCancelled(booking),
  );
  const listingAddons = addons.filter(
    (addon) => addon.listing_id && addon.listing_id === listing.id,
  );
  const bookingValueCents = listingBookings.reduce(
    (total, booking) => total + (booking.booking_value_cents || 0),
    0,
  );
  const hasBookings = listingBookings.length > 0;
  const hasAddons = listingAddons.length > 0;
  const score = Math.min(
    100,
    Math.round(readiness.score * 0.7 + (hasAddons ? 15 : 0) + (hasBookings ? 15 : 0)),
  );
  const priorityReadinessTips = ["Add photos", "Add tour times", "Set a map pin"];
  const tips = [
    ...readiness.missingItems.filter((item) =>
      priorityReadinessTips.includes(item),
    ),
    hasAddons ? "" : "Add at least one paid add-on",
    ...readiness.missingItems.filter(
      (item) => !priorityReadinessTips.includes(item),
    ),
    hasBookings ? "" : "Share this listing from the map or vendor profile",
  ].filter(Boolean);

  return {
    score,
    label:
      score >= 90 ? "Revenue-ready" : score >= 60 ? "Growth-ready" : "Needs polish",
    bookingValueCents,
    requestCount: listingBookings.length,
    addonCount: listingAddons.length,
    tips:
      tips.length > 0
        ? tips.slice(0, 5)
        : ["Keep response time fast to earn repeat requests."],
  };
}

export function getPublicVendorTrustBadges({
  isVerified,
  publicContactCount,
  listings,
}: {
  isVerified?: boolean | null;
  publicContactCount: number;
  listings: ListingLike[];
}) {
  const badges: string[] = [];

  if (isVerified) badges.push("Verified vendor");
  if (listings.some((listing) => getListingReadinessSummary(listing).score >= 90)) {
    badges.push("Guest-ready listing");
  }
  if (publicContactCount >= 2) badges.push("Clear contact");
  if (listings.some((listing) => listing.latitude != null && listing.longitude != null)) {
    badges.push("Map-ready");
  }
  if (listings.length > 1) badges.push("Multiple experiences");
  if (listings.some((listing) => (listing.tour_times || []).length > 0)) {
    badges.push("Times listed");
  }

  return badges.slice(0, 4);
}

export function getVendorFocusItems({
  stats,
  needsResponseCount,
  profileCompletionItems,
}: {
  stats: VendorDashboardStats;
  needsResponseCount: number;
  profileCompletionItems: ProfileCompletionItem[];
}): VendorFocusItem[] {
  const incompleteProfileItems = profileCompletionItems.filter(
    (item) => !item.complete,
  );
  const focusItems: VendorFocusItem[] = [];

  if (needsResponseCount > 0 || stats.newBookings > 0) {
    focusItems.push({
      label: "Reply to guests",
      value: String(needsResponseCount || stats.newBookings),
      text: "Open booking threads that need an answer first.",
      href: "#bookings",
      tone: "urgent",
    });
  }

  if (incompleteProfileItems.length > 0) {
    focusItems.push({
      label: "Finish setup",
      value: String(incompleteProfileItems.length),
      text: incompleteProfileItems[0]?.text || "Complete your public profile.",
      href: "#profile",
      tone: "setup",
    });
  }

  if (stats.liveListings === 0) {
    focusItems.push({
      label: "Get a listing live",
      value: "0",
      text: "Polish a listing and save it for admin review.",
      href: "#listings",
      tone: "growth",
    });
  }

  if (focusItems.length === 0) {
    focusItems.push({
      label: "Keep listings fresh",
      value: String(stats.liveListings),
      text: "Review photos, times, and availability before busy travel days.",
      href: "#listings",
      tone: "growth",
    });
  }

  return focusItems.slice(0, 3);
}

function bookingPriority(booking: BookingLike) {
  return (booking.status || "new") === "new" ? 0 : 1;
}

export function sortVendorBookings<Booking extends BookingLike>(
  bookings: Booking[],
): Booking[] {
  return [...bookings].sort((first, second) => {
    const priority = bookingPriority(first) - bookingPriority(second);
    if (priority !== 0) return priority;

    const date = (first.tour_date || "").localeCompare(second.tour_date || "");
    if (date !== 0) return date;

    return (first.tour_time || "").localeCompare(second.tour_time || "");
  });
}

export function countListingPhotos(listing: ListingLike) {
  return (listing.image_url ? 1 : 0) + (listing.gallery_image_urls || []).length;
}
