export type SupportIntent = {
  id: string;
  label: string;
  title: string;
  description: string;
  responsePromise: string;
};

export type SupportRequestInput = {
  name: string;
  email: string;
  phone?: string;
  intent: string;
  bookingReference?: string;
  message: string;
};

export type PlatformV2Listing = {
  id: string;
  is_active?: boolean | null;
  image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  reviews_count?: number | null;
  tour_times?: string[] | null;
};

export type PlatformV2Booking = {
  id: string;
  status?: string | null;
  deposit_status?: string | null;
};

export type PlatformV2Vendor = {
  id: string;
  is_active?: boolean | null;
};

export type PlatformV2Review = {
  id: string;
  is_approved?: boolean | null;
};

export type PlatformV2ConciergeLead = {
  id: string;
  status?: string | null;
  priority?: string | null;
};

export type PlatformSignalCard = {
  label: string;
  value: number;
  text: string;
  href: string;
  tone: "urgent" | "quality" | "growth" | "support";
};

const supportIntents: SupportIntent[] = [
  {
    id: "urgent-help",
    label: "Urgent help",
    title: "I need help today",
    description: "Pickup, timing, vendor, weather, or trip-day support.",
    responsePromise: "Highest priority",
  },
  {
    id: "booking-issue",
    label: "Booking issue",
    title: "Question about a booking",
    description: "Confirmation, pickup, payment, message, or trip details.",
    responsePromise: "Booking context requested",
  },
  {
    id: "cancel-refund",
    label: "Cancellation or refund",
    title: "Cancel, change, or refund request",
    description: "Tell us what changed so the right person can follow up.",
    responsePromise: "Policy reviewed first",
  },
  {
    id: "safety-weather",
    label: "Safety or weather",
    title: "Weather, safety, or reliability concern",
    description: "Share the concern and any trip timing we should consider.",
    responsePromise: "Handled carefully",
  },
  {
    id: "vendor-help",
    label: "Vendor help",
    title: "Vendor account or listing support",
    description: "Help with listings, photos, availability, documents, or payouts.",
    responsePromise: "Operator support",
  },
];

export function getSupportCenterIntents() {
  return supportIntents;
}

export function getTrustSafetyChecklist() {
  return [
    {
      title: "Verified operator details",
      text: "Vendor profiles, photos, times, service areas, and reviews make each request clearer.",
    },
    {
      title: "Cruise and airport timing",
      text: "Guests can share arrival details so pickup and return windows are handled with care.",
    },
    {
      title: "Weather-aware planning",
      text: "Support requests can flag weather concerns, backup plans, and timing changes.",
    },
    {
      title: "Secure trip messages",
      text: "Booking conversations stay connected to the guest account instead of scattered across inboxes.",
    },
    {
      title: "Clear payment expectations",
      text: "Deposit, balance, receipt, and invoice links help guests understand what is due.",
    },
  ];
}

function findSupportIntent(intentId: string) {
  return (
    supportIntents.find((intent) => intent.id === intentId) || supportIntents[0]
  );
}

export function buildSupportRequestPayload(input: SupportRequestInput) {
  const intent = findSupportIntent(input.intent);
  const bookingReference = input.bookingReference?.trim() || "Not provided";

  return {
    name: input.name,
    email: input.email,
    phone: input.phone || "",
    interest: intent.label,
    leadType: "support_request",
    sourcePath: "/support",
    message: [
      `Support type: ${intent.label}`,
      `Booking reference: ${bookingReference}`,
      "",
      input.message,
    ].join("\n"),
  };
}

function activeListings(listings: PlatformV2Listing[]) {
  return listings.filter((listing) => listing.is_active !== false);
}

function countMissingPhotos(listings: PlatformV2Listing[]) {
  return activeListings(listings).filter((listing) => !listing.image_url).length;
}

function countMissingPins(listings: PlatformV2Listing[]) {
  return activeListings(listings).filter(
    (listing) => listing.latitude == null || listing.longitude == null,
  ).length;
}

function countMissingTimes(listings: PlatformV2Listing[]) {
  return activeListings(listings).filter(
    (listing) => (listing.tour_times || []).length === 0,
  ).length;
}

export function getPlatformV2OperatingSignals({
  listings,
  bookings,
  vendors,
  reviews,
  conciergeLeads,
}: {
  listings: PlatformV2Listing[];
  bookings: PlatformV2Booking[];
  vendors: PlatformV2Vendor[];
  reviews: PlatformV2Review[];
  conciergeLeads: PlatformV2ConciergeLead[];
}) {
  const activeListingRows = activeListings(listings);
  const missingPhotos = countMissingPhotos(listings);
  const missingPins = countMissingPins(listings);
  const missingTimes = countMissingTimes(listings);
  const pendingReviews = reviews.filter((review) => !review.is_approved).length;
  const newBookings = bookings.filter(
    (booking) => (booking.status || "new") === "new",
  ).length;
  const unpaidDeposits = bookings.filter(
    (booking) =>
      !["paid", "not_required"].includes(
        (booking.deposit_status || "not_requested").toLowerCase(),
      ),
  ).length;
  const activeVendors = vendors.filter((vendor) => vendor.is_active !== false)
    .length;
  const urgentConcierge = conciergeLeads.filter(
    (lead) =>
      (lead.status || "new") === "new" || (lead.priority || "") === "high",
  ).length;
  const qualityIssueCount =
    missingPhotos + missingPins + missingTimes + pendingReviews;
  const possibleQualitySignals = Math.max(activeListingRows.length * 4 + 1, 1);
  const completedQualitySignals = Math.max(
    activeListingRows.length * 4 - qualityIssueCount,
    0,
  ) + (activeVendors > 0 ? 1 : 0);
  const platformReadinessScore = Math.round(
    (completedQualitySignals / possibleQualitySignals) * 100,
  );
  const highPriorityItems =
    urgentConcierge + newBookings + unpaidDeposits + pendingReviews;

  const qualityQueue: PlatformSignalCard[] = [
    {
      label: "Missing photos",
      value: missingPhotos,
      text: "Add images so listings feel bookable and premium.",
      href: "/admin/listings",
      tone: "quality",
    },
    {
      label: "Missing map pins",
      value: missingPins,
      text: "Improve map confidence for guests planning by area.",
      href: "/admin/map-cleanup",
      tone: "quality",
    },
    {
      label: "Missing tour times",
      value: missingTimes,
      text: "Add times so guests can compare availability faster.",
      href: "/admin/listings",
      tone: "quality",
    },
    {
      label: "Pending reviews",
      value: pendingReviews,
      text: "Approve useful reviews to strengthen social proof.",
      href: "/admin/reviews",
      tone: "growth",
    },
  ];

  return {
    platformReadinessScore,
    notificationDigest: {
      headline:
        highPriorityItems > 0
          ? `${highPriorityItems} high-priority item${
              highPriorityItems === 1 ? "" : "s"
            }`
          : "No high-priority items",
      items: [
        {
          label: "Urgent concierge",
          value: urgentConcierge,
          text: "Planning leads that need a fast reply.",
          href: "/admin/concierge",
          tone: "urgent" as const,
        },
        {
          label: "New bookings",
          value: newBookings,
          text: "Requests waiting for confirmation.",
          href: "/admin/bookings",
          tone: "urgent" as const,
        },
        {
          label: "Open deposits",
          value: unpaidDeposits,
          text: "Deposits not paid or not requested yet.",
          href: "/admin/bookings",
          tone: "support" as const,
        },
        {
          label: "Pending reviews",
          value: pendingReviews,
          text: "Social proof waiting for moderation.",
          href: "/admin/reviews",
          tone: "growth" as const,
        },
      ],
    },
    qualityQueue,
    growthOpportunities: [
      {
        label: "Support center",
        value: 1,
        text: "Public support, safety, and urgent-help flow is live.",
        href: "/support",
        tone: "support" as const,
      },
      {
        label: "Active vendors",
        value: activeVendors,
        text: "Operators available to power more collections and offers.",
        href: "/admin/vendors",
        tone: "growth" as const,
      },
      {
        label: "Listing quality score",
        value: platformReadinessScore,
        text: "Use quality fixes to improve traveler confidence.",
        href: "/admin/listings",
        tone: "quality" as const,
      },
    ],
  };
}
