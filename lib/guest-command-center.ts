export type GuestCommandBooking = {
  id: string;
  status?: string | null;
  tour_date?: string | null;
  deposit_status?: string | null;
};

export type GuestCommandPlan = {
  id?: string;
  name: string;
  date?: string;
  pickupArea?: string;
  stops: { listingId: string; title?: string; timeBlock?: string }[];
};

export type GuestTravelProfile = {
  name: string;
  phone: string;
  pickupArea: string;
  guests: string;
  budget: string;
  style: string;
  notes: string;
  arrivalType: string;
  arrivalName: string;
  arrivalTime: string;
  departureTime: string;
  lodging: string;
  adults: string;
  kids: string;
  mobility: string;
  dietary: string;
};

export type GuestSavedListingSummary = {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  price: number | null;
};

export type GuestSavedListingCard = {
  id: string;
  title: string;
  category: string;
  location: string;
  price: number | null;
  isLoaded: boolean;
};

export type GuestChecklistItem = {
  id: string;
  label: string;
  text: string;
  done: boolean;
};

export type GuestNotification = {
  title: string;
  text: string;
  tone: "info" | "warning" | "success";
};

export type GuestNextBestAction = {
  label: string;
  text: string;
  href: string;
  tone: "info" | "warning" | "success";
};

const paidStatuses = new Set(["paid", "full_paid"]);
const checkoutStatuses = new Set([
  "checkout_started",
  "full_checkout_started",
  "processing",
]);

function hasValue(value: string | null | undefined) {
  return Boolean((value || "").trim());
}

function normalizeStatus(value: string | null | undefined) {
  return (value || "").toLowerCase();
}

export function normalizeSavedListingIds(raw: unknown, limit = 12) {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  return raw
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .slice(0, limit);
}

export function getSavedListingCards(
  savedListingIds: string[],
  listings: GuestSavedListingSummary[],
): GuestSavedListingCard[] {
  const listingsById = new Map(listings.map((listing) => [listing.id, listing]));

  return savedListingIds.map((id, index) => {
    const listing = listingsById.get(id);

    return {
      id,
      title: listing?.title || `Saved stop ${index + 1}`,
      category: listing?.category || "Saved",
      location: listing?.location || "Open map for details",
      price: listing?.price ?? null,
      isLoaded: Boolean(listing),
    };
  });
}

function detailLines(
  profile: GuestTravelProfile,
  options: { includePickup: boolean },
) {
  return [
    options.includePickup && hasValue(profile.pickupArea)
      ? `Pickup area: ${profile.pickupArea}`
      : "",
    hasValue(profile.arrivalType) ||
    hasValue(profile.arrivalName) ||
    hasValue(profile.arrivalTime)
      ? `Arrival: ${[profile.arrivalType, profile.arrivalName]
          .filter(hasValue)
          .join(" - ")}${hasValue(profile.arrivalTime) ? ` at ${profile.arrivalTime}` : ""}`
      : "",
    hasValue(profile.departureTime) ? `Departure: ${profile.departureTime}` : "",
    hasValue(profile.lodging) ? `Lodging: ${profile.lodging}` : "",
    hasValue(profile.adults) || hasValue(profile.kids)
      ? `Travel party: ${profile.adults || "0"} adults, ${profile.kids || "0"} kids`
      : "",
    hasValue(profile.mobility)
      ? `Mobility/accessibility: ${profile.mobility}`
      : "",
    hasValue(profile.dietary)
      ? `Dietary/allergy notes: ${profile.dietary}`
      : "",
    hasValue(profile.notes) ? `Notes: ${profile.notes}` : "",
  ].filter(Boolean);
}

export function buildGuestProfileBookingPrefill(profile: GuestTravelProfile) {
  const pickupPreference =
    profile.arrivalType === "Cruise"
      ? "Cruise port pickup"
      : profile.arrivalType === "Airport"
        ? "Airport pickup"
        : profile.pickupArea
          ? "Hotel pickup"
          : "";

  return {
    fullName: profile.name,
    guests: profile.guests,
    pickupPreference,
    guestMessage: detailLines(profile, { includePickup: true }).join("\n"),
  };
}

export function buildGuestProfileConciergePrefill(profile: GuestTravelProfile) {
  return {
    guests: profile.guests,
    arrivalType: profile.arrivalType,
    pickupArea: profile.pickupArea,
    tripStyle: profile.style,
    budget: profile.budget,
    guestName: profile.name,
    guestPhone: profile.phone,
    notes: detailLines(profile, { includePickup: false }).join("\n"),
  };
}

export function getGuestProfileCompletion(profile: GuestTravelProfile) {
  const fields: (keyof GuestTravelProfile)[] = [
    "name",
    "phone",
    "pickupArea",
    "guests",
    "budget",
    "style",
    "notes",
    "arrivalType",
    "arrivalName",
    "arrivalTime",
    "departureTime",
    "lodging",
    "adults",
    "kids",
    "mobility",
    "dietary",
  ];
  const completed = fields.filter((field) => hasValue(profile[field])).length;
  const total = fields.length;
  const percent = Math.round((completed / total) * 100);

  return {
    completed,
    total,
    percent,
    label:
      percent >= 100
        ? "Ready"
        : percent >= 75
          ? "Almost ready"
          : percent >= 45
            ? "Needs details"
            : "Just started",
  };
}

export function getGuestWalletSummary(bookings: GuestCommandBooking[]) {
  const paidCount = bookings.filter((booking) =>
    paidStatuses.has(normalizeStatus(booking.deposit_status)),
  ).length;
  const checkoutStartedCount = bookings.filter((booking) =>
    checkoutStatuses.has(normalizeStatus(booking.deposit_status)),
  ).length;
  const dueCount = bookings.filter((booking) => {
    const depositStatus = normalizeStatus(booking.deposit_status);
    return (
      checkoutStatuses.has(depositStatus) ||
      (normalizeStatus(booking.status) === "confirmed" &&
        !paidStatuses.has(depositStatus))
    );
  }).length;

  return {
    paidCount,
    dueCount,
    checkoutStartedCount,
    label:
      paidCount > 0
        ? `${paidCount} deposit${paidCount === 1 ? "" : "s"} paid`
        : dueCount > 0
          ? `${dueCount} deposit${dueCount === 1 ? "" : "s"} due`
          : "No deposits due",
  };
}

export function getGuestCommandSummary({
  bookings,
  plans,
  savedListingIds,
  profile,
}: {
  bookings: GuestCommandBooking[];
  plans: GuestCommandPlan[];
  savedListingIds: string[];
  profile: GuestTravelProfile;
}) {
  const profileCompletion = getGuestProfileCompletion(profile);
  const wallet = getGuestWalletSummary(bookings);
  const checklist = buildGuestChecklist({
    bookings,
    plans,
    savedListingIds,
    profile,
  });
  const tripScore = Math.round(
    (checklist.filter((item) => item.done).length / checklist.length) * 100,
  );

  return {
    bookingCount: bookings.length,
    confirmedCount: bookings.filter(
      (booking) => normalizeStatus(booking.status) === "confirmed",
    ).length,
    savedListingCount: savedListingIds.length,
    planCount: plans.length,
    profilePercent: profileCompletion.percent,
    walletLabel: wallet.label,
    nextDate:
      [...bookings]
        .map((booking) => booking.tour_date || "")
        .filter(Boolean)
        .sort()[0] || "Flexible",
    tripScore,
  };
}

export function getGuestNextBestAction({
  bookings,
  plans,
  savedListingIds,
  profile,
}: {
  bookings: GuestCommandBooking[];
  plans: GuestCommandPlan[];
  savedListingIds: string[];
  profile: GuestTravelProfile;
}): GuestNextBestAction {
  if (savedListingIds.length === 0) {
    return {
      label: "Start with the map",
      text: "Save a few tours, beaches, hotels, or transport options before requesting help.",
      href: "/map",
      tone: "info",
    };
  }

  if (plans.length === 0) {
    return {
      label: "Save this as a plan",
      text: "Turn your saved stops into a named itinerary so you can return to it later.",
      href: "/account",
      tone: "warning",
    };
  }

  if (
    bookings.some((booking) =>
      ["confirmed", "completed"].includes(normalizeStatus(booking.status)),
    )
  ) {
    return {
      label: "Review confirmed trips",
      text: "Open trip details for pickup notes, payments, chat, and next steps.",
      href: "/account",
      tone: "success",
    };
  }

  if (getGuestProfileCompletion(profile).percent < 75) {
    return {
      label: "Finish travel details",
      text: "Add arrival, pickup, and travel party details so requests move faster.",
      href: "/account",
      tone: "warning",
    };
  }

  return {
    label: "Request concierge help",
    text: "Send your saved route and profile so the team can shape a custom plan.",
    href: "/concierge",
    tone: "info",
  };
}

export function buildGuestChecklist({
  bookings,
  plans,
  savedListingIds,
  profile,
}: {
  bookings: GuestCommandBooking[];
  plans: GuestCommandPlan[];
  savedListingIds: string[];
  profile: GuestTravelProfile;
}): GuestChecklistItem[] {
  const profileComplete = ["name", "phone", "guests"].every((field) =>
    hasValue(profile[field as keyof GuestTravelProfile]),
  );
  const arrivalComplete = ["arrivalType", "arrivalName", "arrivalTime"].every(
    (field) => hasValue(profile[field as keyof GuestTravelProfile]),
  );
  const partyComplete = ["adults", "kids", "mobility", "dietary"].every((field) =>
    hasValue(profile[field as keyof GuestTravelProfile]),
  );
  const hasConfirmedBooking = bookings.some(
    (booking) => normalizeStatus(booking.status) === "confirmed",
  );
  const walletSettled = getGuestWalletSummary(bookings).dueCount === 0;

  return [
    {
      id: "profile",
      label: "Profile",
      text: "Name, phone, and group size saved",
      done: profileComplete,
    },
    {
      id: "arrival",
      label: "Arrival",
      text: "Cruise, flight, lodging, or pickup timing added",
      done: arrivalComplete,
    },
    {
      id: "party",
      label: "Travel party",
      text: "Adults, kids, mobility, and food notes saved",
      done: partyComplete,
    },
    {
      id: "saved",
      label: "Saved listings",
      text: "At least one favorite stop saved from the map",
      done: savedListingIds.length > 0,
    },
    {
      id: "itinerary",
      label: "Itinerary",
      text: "A trip plan is saved to the dashboard",
      done: plans.length > 0,
    },
    {
      id: "booking",
      label: "Booking",
      text: "At least one booking is confirmed",
      done: hasConfirmedBooking,
    },
    {
      id: "wallet",
      label: "Wallet",
      text: "Deposits are paid or not currently due",
      done: walletSettled,
    },
  ];
}

export function buildGuestNotifications({
  bookings,
  plans,
  savedListingIds,
  profile,
}: {
  bookings: GuestCommandBooking[];
  plans: GuestCommandPlan[];
  savedListingIds: string[];
  profile: GuestTravelProfile;
}): GuestNotification[] {
  const notifications: GuestNotification[] = [];
  const wallet = getGuestWalletSummary(bookings);
  const profileCompletion = getGuestProfileCompletion(profile);

  if (wallet.dueCount > 0 || wallet.checkoutStartedCount > 0) {
    notifications.push({
      title: "Review deposit status",
      text:
        wallet.dueCount > 0
          ? `${wallet.dueCount} confirmed booking needs payment attention.`
          : "A checkout was started. Confirm whether payment completed.",
      tone: "warning",
    });
  }

  if (savedListingIds.length === 0) {
    notifications.push({
      title: "Save map favorites",
      text: "Save tours, beaches, transport, or hotels to build a trip board.",
      tone: "info",
    });
  }

  if (plans.length === 0) {
    notifications.push({
      title: "Build an itinerary",
      text: "Use the map or concierge planner to save a route for your trip.",
      tone: "info",
    });
  }

  if (profileCompletion.percent < 75) {
    notifications.push({
      title: "Finish travel details",
      text: "Add arrival and travel party details so requests can be faster.",
      tone: "warning",
    });
  }

  if (notifications.length === 0) {
    notifications.push({
      title: "Trip board is in good shape",
      text: "Your profile, saved plans, and payment status are ready.",
      tone: "success",
    });
  }

  return notifications.slice(0, 5);
}

export function getBookingTimeline(booking: GuestCommandBooking) {
  const status = normalizeStatus(booking.status);
  const depositStatus = normalizeStatus(booking.deposit_status);

  return [
    { label: "Request sent", done: true },
    {
      label: "Operator reviewing",
      done: ["confirmed", "completed", "cancelled"].includes(status),
    },
    {
      label: "Confirmed",
      done: ["confirmed", "completed"].includes(status),
    },
    {
      label: "Deposit paid",
      done: paidStatuses.has(depositStatus),
    },
  ];
}
