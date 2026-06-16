export type ConciergeListing = {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  description: string | null;
  price: number | null;
  rating: number | null;
  reviews_count: number | null;
  tour_times: string[] | null;
  max_guests: number | null;
};

export type ConciergePreferences = {
  arrivalType: string;
  pickupArea: string;
  tripStyle: string;
  budget: string;
  guests: string;
  interests: string[];
};

export type ConciergeTripTemplate = {
  id: string;
  label: string;
  description: string;
  name: string;
  arrivalType: string;
  pickupArea: string;
  tripStyle: string;
  budget: string;
  interests: string[];
  notes: string;
};

export type ConciergeTemplateDraft = Pick<
  ConciergeTripTemplate,
  | "name"
  | "arrivalType"
  | "pickupArea"
  | "tripStyle"
  | "budget"
  | "interests"
  | "notes"
>;

export type ConciergeMatch = {
  listing: ConciergeListing;
  score: number;
  reasons: string[];
};

export type ConciergePlanStop = {
  listingId: string;
  title: string;
  timeBlock: string;
  note?: string;
};

export type ConciergePlan = {
  id?: string;
  name: string;
  date?: string;
  guests?: string;
  pickupArea?: string;
  arrivalType?: string;
  notes?: string;
  stops: ConciergePlanStop[];
};

export type ConciergePlanMetrics = {
  stopCount: number;
  estimatedTripValue: number;
  estimatedTripValueLabel: string;
  confidenceLabel: "Strong fit" | "Good start" | "Needs concierge review";
  highlights: string[];
};

export type ConciergeLeadReadiness = {
  label: "Ready for concierge" | "Almost ready" | "Needs contact details";
  score: number;
  missingItems: string[];
};

const timeBlocks = ["Morning", "Midday", "Afternoon", "Sunset"];

const tripTemplates: ConciergeTripTemplate[] = [
  {
    id: "cruise-perfect-day",
    label: "Cruise guest perfect day",
    description: "Port timing, easy pickup, beach time, and reliable return.",
    name: "Cruise guest Roatan day",
    arrivalType: "Cruise",
    pickupArea: "Coxen Hole or Isla Tropicale",
    tripStyle: "Family",
    budget: "Moderate",
    interests: ["cruise", "beach", "food"],
    notes: "Cruise timing matters. Keep the route polished, punctual, and easy.",
  },
  {
    id: "luxury-private-day",
    label: "Luxury private day",
    description:
      "Private operators, flexible timing, premium water or sunset experiences.",
    name: "Luxury private Roatan day",
    arrivalType: "Staying on island",
    pickupArea: "West End",
    tripStyle: "Luxury",
    budget: "Luxury",
    interests: ["private", "snorkel", "sunset"],
    notes: "Private, polished, flexible timing, premium operators preferred.",
  },
  {
    id: "family-beach-day",
    label: "Family beach day",
    description: "Gentle pace, safe stops, food nearby, and simple pickup.",
    name: "Family beach day",
    arrivalType: "Staying on island",
    pickupArea: "West Bay",
    tripStyle: "Family",
    budget: "Moderate",
    interests: ["beach", "food", "wildlife"],
    notes: "Kid-friendly, easy walking, food and shade nearby.",
  },
  {
    id: "airport-arrival-day",
    label: "Airport arrival day",
    description: "Arrival pickup, luggage-aware timing, and a light first-day plan.",
    name: "Airport arrival soft landing",
    arrivalType: "Airport",
    pickupArea: "Roatan Airport",
    tripStyle: "Easy beach day",
    budget: "Moderate",
    interests: ["airport", "food", "beach"],
    notes: "Airport pickup, luggage-friendly, light first-day pacing.",
  },
  {
    id: "adventure-day",
    label: "Adventure day",
    description: "Snorkel, wildlife, water time, and active island stops.",
    name: "Roatan adventure day",
    arrivalType: "Staying on island",
    pickupArea: "Sandy Bay",
    tripStyle: "Adventure",
    budget: "Moderate",
    interests: ["snorkel", "wildlife", "beach"],
    notes: "Active day with water time, wildlife, and flexible backup stops.",
  },
];

function lower(value: string | null | undefined) {
  return (value || "").toLowerCase();
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function listingText(listing: ConciergeListing) {
  return [
    listing.title,
    listing.category || "",
    listing.location || "",
    listing.description || "",
    ...(listing.tour_times || []),
  ]
    .join(" ")
    .toLowerCase();
}

export function getConciergeTripTemplates() {
  return tripTemplates;
}

export function applyConciergeTripTemplate(
  templateId: string,
  current: ConciergeTemplateDraft,
): ConciergeTemplateDraft {
  const template = tripTemplates.find((item) => item.id === templateId);

  if (!template) return current;

  return {
    name: template.name,
    arrivalType: template.arrivalType,
    pickupArea: template.pickupArea,
    tripStyle: template.tripStyle,
    budget: template.budget,
    interests: [...template.interests],
    notes: template.notes,
  };
}

function budgetScore(price: number | null, budget: string) {
  if (!price || !budget) return 0;
  if (budget === "Budget") return price <= 75 ? 12 : price <= 150 ? 4 : -8;
  if (budget === "Moderate") return price <= 175 ? 10 : price <= 300 ? 4 : -4;
  if (budget === "Luxury") return price >= 150 ? 12 : 2;
  return 0;
}

function capacityScore(maxGuests: number | null, guests: string) {
  const guestCount = Number(guests);
  if (!Number.isFinite(guestCount) || guestCount < 1 || !maxGuests) return 0;
  return guestCount <= maxGuests ? 8 : -30;
}

function arrivalScore(text: string, arrivalType: string) {
  if (arrivalType === "Cruise") {
    return text.includes("cruise") ||
      text.includes("port") ||
      text.includes("coxen") ||
      text.includes("isla tropicale") ||
      text.includes("tropicale") ||
      text.includes("dixon")
      ? 18
      : 0;
  }

  if (arrivalType === "Airport") {
    return text.includes("airport") || text.includes("transfer") ? 18 : 0;
  }

  if (arrivalType === "Staying on island") {
    return text.includes("hotel") || text.includes("beach") || text.includes("west")
      ? 8
      : 0;
  }

  return 0;
}

function styleScore(text: string, style: string) {
  if (style === "Family") {
    return text.includes("family") || text.includes("beach") || text.includes("easy")
      ? 12
      : 0;
  }

  if (style === "Luxury") {
    return text.includes("private") || text.includes("luxury") || text.includes("charter")
      ? 14
      : 0;
  }

  if (style === "Adventure") {
    return text.includes("adventure") || text.includes("snorkel") || text.includes("wildlife")
      ? 12
      : 0;
  }

  return 0;
}

export function getConciergeMatches(
  listings: ConciergeListing[],
  preferences: ConciergePreferences,
): ConciergeMatch[] {
  return listings
    .map((listing) => {
      const text = listingText(listing);
      const reasons: string[] = [];
      let score = 0;

      if (preferences.pickupArea && lower(listing.location).includes(lower(preferences.pickupArea))) {
        score += 14;
        reasons.push(`Near ${preferences.pickupArea}`);
      }

      const arrival = arrivalScore(text, preferences.arrivalType);
      if (arrival > 0) {
        score += arrival;
        reasons.push(`${preferences.arrivalType} friendly`);
      }

      const style = styleScore(text, preferences.tripStyle);
      if (style > 0) {
        score += style;
        reasons.push(`${preferences.tripStyle} fit`);
      }

      preferences.interests.forEach((interest) => {
        if (interest && text.includes(lower(interest))) {
          score += 8;
          reasons.push(`Matches ${interest}`);
        }
      });

      score += budgetScore(listing.price, preferences.budget);
      score += capacityScore(listing.max_guests, preferences.guests);
      score += Math.min(10, Math.round((listing.rating || 0) * 2));
      score += Math.min(8, listing.reviews_count || 0);

      if (reasons.length === 0) {
        reasons.push(listing.category || "Useful stop");
      }

      return { listing, score, reasons };
    })
    .filter((match) => match.score > -20)
    .sort((first, second) => second.score - first.score)
    .slice(0, 8);
}

export function buildConciergePlan({
  name,
  date,
  guests,
  pickupArea,
  arrivalType,
  matches,
}: {
  name: string;
  date: string;
  guests: string;
  pickupArea: string;
  arrivalType: string;
  matches: ConciergeMatch[];
}): ConciergePlan {
  return {
    id: `plan-${Date.now()}`,
    name,
    date,
    guests,
    pickupArea,
    arrivalType,
    stops: matches.slice(0, 4).map((match, index) => ({
      listingId: match.listing.id,
      title: match.listing.title,
      timeBlock: timeBlocks[index] || "Flexible",
      note: match.reasons.slice(0, 2).join(", "),
    })),
  };
}

export function getConciergePlanMetrics({
  plan,
  matches,
}: {
  plan: ConciergePlan;
  matches: ConciergeMatch[];
}): ConciergePlanMetrics {
  const matchesById = new Map(
    matches.map((match) => [match.listing.id, match]),
  );
  const planMatches = plan.stops
    .map((stop) => matchesById.get(stop.listingId))
    .filter((match): match is ConciergeMatch => Boolean(match));
  const estimatedTripValue = planMatches.reduce(
    (total, match) => total + (match.listing.price || 0),
    0,
  );
  const averageScore =
    planMatches.length > 0
      ? planMatches.reduce((total, match) => total + match.score, 0) /
        planMatches.length
      : 0;

  return {
    stopCount: plan.stops.length,
    estimatedTripValue,
    estimatedTripValueLabel:
      estimatedTripValue > 0 ? formatMoney(estimatedTripValue) : "Pending",
    confidenceLabel:
      averageScore >= 35
        ? "Strong fit"
        : averageScore >= 18
          ? "Good start"
          : "Needs concierge review",
    highlights: planMatches.slice(0, 3).map((match) => match.listing.title),
  };
}

export function getConciergeLeadReadiness({
  guestName,
  guestEmail,
  guestPhone,
  plan,
}: {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  plan: ConciergePlan;
}): ConciergeLeadReadiness {
  const hasName = Boolean(guestName.trim());
  const hasEmail = Boolean(
    guestEmail.trim() && guestEmail.includes("@") && guestEmail.includes("."),
  );
  const missingItems = [
    hasName ? "" : "Name",
    hasEmail ? "" : "Email",
  ].filter(Boolean);
  const completedSections = [
    hasName && hasEmail,
    plan.stops.length > 0,
    Boolean(plan.guests || plan.pickupArea || plan.arrivalType || guestPhone),
  ].filter(Boolean).length;
  const score = Math.round((completedSections / 3) * 100);
  const needsContact =
    missingItems.includes("Name") || missingItems.includes("Email");
  const label = needsContact
    ? "Needs contact details"
    : score === 100
      ? "Ready for concierge"
      : score >= 67
        ? "Almost ready"
        : "Needs contact details";

  return {
    label,
    score,
    missingItems,
  };
}

export function getGuestDashboardSummary({
  bookings,
  plans,
  profileComplete,
}: {
  bookings: { id: string; status?: string | null; tour_date?: string | null }[];
  plans: { id?: string; name: string; stops: { listingId: string }[] }[];
  profileComplete: boolean;
}) {
  return {
    bookingCount: bookings.length,
    confirmedCount: bookings.filter((booking) => booking.status === "confirmed")
      .length,
    planCount: plans.length,
    savedStopCount: plans.reduce((total, plan) => total + plan.stops.length, 0),
    profileLabel: profileComplete ? "Ready" : "Needs details",
    nextDate:
      [...bookings]
        .map((booking) => booking.tour_date || "")
        .filter(Boolean)
        .sort()[0] || "Ready",
  };
}

export function serializePlanForConciergeLead(plan: ConciergePlan) {
  return [
    `Trip plan: ${plan.name}`,
    `Date: ${plan.date || "Flexible"}`,
    `Guests: ${plan.guests || "Not set"}`,
    `Pickup: ${plan.pickupArea || "Not set"}`,
    `Arrival type: ${plan.arrivalType || "Not set"}`,
    plan.notes ? `Notes: ${plan.notes}` : "",
    "Stops:",
    ...plan.stops.map(
      (stop, index) =>
        `${index + 1}. ${stop.timeBlock}: ${stop.title}${
          stop.note ? ` - ${stop.note}` : ""
        }`,
    ),
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildPlanShareUrl({
  origin,
  stopIds,
}: {
  origin: string;
  stopIds: string[];
}) {
  const params = new URLSearchParams();
  if (stopIds.length > 0) params.set("trip", stopIds.join(","));
  return `${origin}/map${params.toString() ? `?${params.toString()}` : ""}`;
}
