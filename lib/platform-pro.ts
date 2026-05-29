type BookingLike = {
  id?: string;
  status?: string | null;
  tour_date?: string | null;
  deposit_status?: string | null;
  balance_due_cents?: number | null;
  booking_value_cents?: number | null;
};

type ListingLike = {
  id?: string;
  title?: string | null;
  category?: string | null;
  is_active?: boolean | null;
  approval_status?: string | null;
  image_url?: string | null;
  tour_times?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  vendor_id?: string | null;
};

type VendorLike = {
  id?: string;
  is_active?: boolean | null;
};

type ReviewLike = {
  id?: string;
  is_approved?: boolean | null;
};

type SupportTicketLike = {
  id?: string;
  status?: string | null;
  priority?: string | null;
  intent?: string | null;
};

type ConciergeLeadLike = {
  id?: string;
  status?: string | null;
  priority?: string | null;
};

type DocumentLike = {
  id?: string;
  status?: string | null;
};

type Action = {
  label: string;
  href: string;
  text: string;
  tone: "teal" | "gold" | "navy" | "light";
  count?: number;
};

function cleanStatus(value?: string | null) {
  return (value || "new").toLowerCase();
}

function isOpenStatus(value?: string | null) {
  const status = cleanStatus(value);
  return status !== "resolved" && status !== "completed" && status !== "cancelled";
}

function isActiveBooking(booking: BookingLike) {
  const status = cleanStatus(booking.status);
  return status !== "cancelled" && status !== "completed";
}

function needsPaymentAttention(booking: BookingLike) {
  const depositStatus = cleanStatus(booking.deposit_status);
  return (
    ["unpaid", "pending", "due", "not_paid", "payment_due"].includes(
      depositStatus,
    ) || (booking.balance_due_cents || 0) > 0
  );
}

function scoreFromCompleted(completed: number, total: number) {
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}

function dateValue(value?: string | null) {
  return value ? Date.parse(`${value}T12:00:00`) || 0 : 0;
}

export function getGuestMasterpiecePlan({
  bookings,
  supportTickets,
  unreadMessageCount = 0,
  today = new Date().toISOString().slice(0, 10),
}: {
  bookings: BookingLike[];
  supportTickets: SupportTicketLike[];
  unreadMessageCount?: number;
  today?: string;
}) {
  const activeBookings = bookings.filter(isActiveBooking);
  const confirmedBookings = bookings.filter(
    (booking) => cleanStatus(booking.status) === "confirmed",
  );
  const openSupportTickets = supportTickets.filter((ticket) =>
    isOpenStatus(ticket.status),
  );
  const urgentSupportCount = openSupportTickets.filter(
    (ticket) => cleanStatus(ticket.priority) === "urgent",
  ).length;
  const unpaidBookings = activeBookings.filter(
    (booking) => needsPaymentAttention(booking),
  );
  const nextBooking =
    [...activeBookings]
      .filter((booking) => !booking.tour_date || booking.tour_date >= today)
      .sort((a, b) => dateValue(a.tour_date) - dateValue(b.tour_date))[0] ||
    activeBookings[0] ||
    null;

  const readinessSteps = [
    {
      label: "Trip request",
      text: "At least one booking or concierge request is connected.",
      complete: bookings.length > 0,
    },
    {
      label: "Confirmation",
      text: "One trip is confirmed with an operator.",
      complete: confirmedBookings.length > 0,
    },
    {
      label: "Messages",
      text: "Messages have a clear home beside the trip.",
      complete: bookings.length > 0,
    },
    {
      label: "Payments",
      text: "Deposits and balances are clear.",
      complete: unpaidBookings.length === 0,
    },
    {
      label: "Support",
      text: "No open support request is waiting on the trip.",
      complete: openSupportTickets.length === 0,
    },
  ];
  const score = scoreFromCompleted(
    bookings.length === 0
      ? 1
      : readinessSteps.filter((step) => step.complete).length,
    readinessSteps.length,
  );

  let headline = "Start your Roatan plan with confidence.";
  let subhead = "Browse the map, choose the kind of day you want, and keep every next step in your account.";
  let nextAction: Action = {
    label: "Explore the map",
    href: "/map",
    text: "Start with beaches, pickup zones, and nearby experiences.",
    tone: "teal",
  };

  if (openSupportTickets.length > 0) {
    headline = "We are watching your Roatan day closely.";
    subhead =
      urgentSupportCount > 0
        ? "An urgent support request is open, so your next step is visible and easy to find."
        : "Your support request is saved beside your bookings so nothing gets lost.";
    nextAction = {
      label: "Reply to support",
      href: "/support",
      text: "Open support if you need to add timing, pickup, or booking details.",
      tone: "gold",
      count: openSupportTickets.length,
    };
  } else if (unreadMessageCount > 0) {
    headline = "You have a fresh trip message.";
    subhead = "Open your booking chat so the operator has what they need before trip day.";
    nextAction = {
      label: "Open messages",
      href: "/account",
      text: "Keep the conversation moving from your trip dashboard.",
      tone: "teal",
      count: unreadMessageCount,
    };
  } else if (unpaidBookings.length > 0) {
    headline = "Your trip is almost ready.";
    subhead = "A payment, deposit, or balance item is still open.";
    nextAction = {
      label: "Review payments",
      href: "/account",
      text: "Check invoices, receipts, deposits, and balances.",
      tone: "gold",
      count: unpaidBookings.length,
    };
  } else if (nextBooking?.tour_date) {
    headline = `Your next Roatan day is ${nextBooking.tour_date}.`;
    subhead = "Your trip details, messages, support, and payment status are organized here.";
    nextAction = {
      label: "Open trip packet",
      href: `/book/trip/${nextBooking.id}`,
      text: "Review pickup details, timing, and trip-day notes.",
      tone: "navy",
    };
  }

  return {
    headline,
    subhead,
    score,
    nextBooking,
    nextAction,
    readinessSteps,
    metrics: {
      bookingCount: bookings.length,
      confirmedCount: confirmedBookings.length,
      openSupportCount: openSupportTickets.length,
      unpaidCount: unpaidBookings.length,
      unreadMessageCount,
    },
  };
}

export function getPlatformProAdminCommand({
  bookings,
  listings,
  vendors,
  reviews,
  supportTickets,
  conciergeLeads,
}: {
  bookings: BookingLike[];
  listings: ListingLike[];
  vendors: VendorLike[];
  reviews: ReviewLike[];
  supportTickets: SupportTicketLike[];
  conciergeLeads: ConciergeLeadLike[];
}) {
  const urgentSupport = supportTickets.filter(
    (ticket) => isOpenStatus(ticket.status) && cleanStatus(ticket.priority) === "urgent",
  ).length;
  const openSupport = supportTickets.filter((ticket) => isOpenStatus(ticket.status)).length;
  const newBookings = bookings.filter((booking) => cleanStatus(booking.status) === "new").length;
  const unpaidDeposits = bookings.filter(
    (booking) => isActiveBooking(booking) && needsPaymentAttention(booking),
  ).length;
  const pendingListings = listings.filter(
    (listing) => cleanStatus(listing.approval_status) === "pending" || listing.is_active === false,
  ).length;
  const pendingReviews = reviews.filter((review) => !review.is_approved).length;
  const activeConcierge = conciergeLeads.filter((lead) => isOpenStatus(lead.status)).length;
  const missingListingEssentials = listings.filter(
    (listing) =>
      !listing.image_url ||
      !listing.tour_times ||
      listing.tour_times.length === 0 ||
      listing.latitude === null ||
      listing.latitude === undefined ||
      listing.longitude === null ||
      listing.longitude === undefined,
  ).length;
  const issueCount =
    urgentSupport * 3 +
    newBookings * 2 +
    unpaidDeposits +
    pendingListings +
    pendingReviews +
    activeConcierge +
    missingListingEssentials;
  const healthScore = Math.max(35, Math.min(100, 100 - issueCount * 4));

  const priorityActions = ([
    {
      label: "Reply to urgent support",
      href: "/admin/support",
      text: "Guest problems should feel handled before anything else.",
      tone: "gold",
      count: urgentSupport,
    },
    {
      label: "Confirm new bookings",
      href: "/admin/bookings",
      text: "Move fresh requests toward a clear yes, no, or next question.",
      tone: "teal",
      count: newBookings,
    },
    {
      label: "Collect open deposits",
      href: "/admin/bookings",
      text: "Keep money status clean before guests arrive.",
      tone: "navy",
      count: unpaidDeposits,
    },
    {
      label: "Review listing quality",
      href: "/admin/listing-review",
      text: "Photos, times, map confidence, and approval status shape guest trust.",
      tone: "light",
      count: pendingListings + missingListingEssentials,
    },
    {
      label: "Work concierge leads",
      href: "/admin/concierge",
      text: "Turn planning requests into polished trip options.",
      tone: "light",
      count: activeConcierge,
    },
  ] satisfies Action[]).sort((a, b) => {
    const actionWeight = (action: Action) => {
      if (action.label.includes("urgent support")) return 1000;
      if (action.label.includes("bookings")) return 80;
      if (action.label.includes("deposits")) return 60;
      return 20;
    };

    return (b.count || 0) * actionWeight(b) - (a.count || 0) * actionWeight(a);
  });

  return {
    headline:
      urgentSupport > 0 || newBookings > 0
        ? "Guests need attention now."
        : "Marketplace is ready for guests.",
    subhead:
      "A guest-first command center for support, bookings, payments, quality, and concierge follow-up.",
    healthScore,
    priorityActions,
    trustFocus: [
      {
        label: "Guest confidence",
        value: `${openSupport} open support`,
        href: "/admin/support",
      },
      {
        label: "Booking clarity",
        value: `${newBookings} new requests`,
        href: "/admin/bookings",
      },
      {
        label: "Marketplace polish",
        value: `${missingListingEssentials} listings need details`,
        href: "/admin/listing-review",
      },
    ],
    metrics: {
      urgentSupport,
      openSupport,
      newBookings,
      unpaidDeposits,
      pendingListings,
      pendingReviews,
      activeConcierge,
      activeVendors: vendors.filter((vendor) => vendor.is_active !== false).length,
      missingListingEssentials,
    },
  };
}

export function getVendorProCommand({
  listings,
  bookings,
  documents,
}: {
  listings: ListingLike[];
  bookings: BookingLike[];
  documents: DocumentLike[];
}) {
  const activeListings = listings.filter((listing) => listing.is_active !== false);
  const missingPhotos = listings.filter((listing) => !listing.image_url).length;
  const missingTimes = listings.filter(
    (listing) => !listing.tour_times || listing.tour_times.length === 0,
  ).length;
  const missingPins = listings.filter(
    (listing) =>
      listing.latitude === null ||
      listing.latitude === undefined ||
      listing.longitude === null ||
      listing.longitude === undefined,
  ).length;
  const newBookings = bookings.filter((booking) => cleanStatus(booking.status) === "new").length;
  const upcomingBookings = bookings.filter(isActiveBooking).length;
  const pendingDocuments = documents.filter((document) =>
    ["pending", "requested", "needs_update"].includes(cleanStatus(document.status)),
  ).length;
  const completedSignals =
    activeListings.length +
    Math.max(0, listings.length - missingPhotos) +
    Math.max(0, listings.length - missingTimes) +
    Math.max(0, listings.length - missingPins);
  const totalSignals = Math.max(1, listings.length * 4);
  const score = scoreFromCompleted(completedSignals, totalSignals);
  const issueCount = newBookings + missingPhotos + missingTimes + missingPins;

  const focusItems = ([
    {
      label: "Respond to booking requests",
      href: "#vendor-bookings",
      text: "Fast replies make guests feel like the trip is already being cared for.",
      tone: "teal",
      count: newBookings,
    },
    {
      label: "Add premium photos",
      href: "#vendor-listings",
      text: "Beautiful listing photos are the fastest way to build trust.",
      tone: "gold",
      count: missingPhotos,
    },
    {
      label: "Confirm times and availability",
      href: "#vendor-listings",
      text: "Guests book faster when times, limits, and availability are obvious.",
      tone: "navy",
      count: missingTimes,
    },
    {
      label: "Place listings on the map",
      href: "#vendor-listings",
      text: "Accurate pins help guests plan pickup zones and nearby stops.",
      tone: "light",
      count: missingPins,
    },
    {
      label: "Finish vendor documents",
      href: "#vendor-documents",
      text: "Verified operators feel safer and more premium.",
      tone: "light",
      count: pendingDocuments,
    },
  ] satisfies Action[]).sort((a, b) => (b.count || 0) - (a.count || 0));

  return {
    headline:
      issueCount === 0
        ? "Your operator profile is guest-ready."
        : `${issueCount} operator move${issueCount === 1 ? "" : "s"} for today.`,
    subhead:
      "A cleaner checklist for bookings, listing quality, availability, verification, and guest confidence.",
    score,
    focusItems,
    metrics: {
      activeListings: activeListings.length,
      upcomingBookings,
      newBookings,
      missingPhotos,
      missingTimes,
      missingPins,
      pendingDocuments,
    },
  };
}

export function getPublicMasterpieceMoments({
  listings,
}: {
  listings: ListingLike[];
}) {
  const activeListings = listings.filter((listing) => listing.is_active !== false);
  const categories = new Set(
    activeListings.map((listing) => listing.category || "Experiences"),
  );

  return {
    heroPromise: "A calmer way to plan a Roatan day.",
    activeListingCount: activeListings.length,
    categoryCount: categories.size,
    moments: [
      {
        title: "Choose the feeling",
        text: "Beach, boat, family route, airport pickup, cruise day, or a private island pace.",
      },
      {
        title: "See the geography",
        text: "Plan around areas, ports, pickup zones, beaches, and nearby stops before you request.",
      },
      {
        title: "Request with clarity",
        text: "Send dates, guests, timing, and preferences so operators can answer faster.",
      },
      {
        title: "Keep it together",
        text: "Bookings, chat, support, payments, and trip packets stay connected in one account.",
      },
    ],
  };
}
