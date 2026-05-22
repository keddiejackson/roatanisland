export const conciergeLeadStatuses = [
  "new",
  "reviewing",
  "contacted",
  "quoted",
  "booked",
  "closed",
] as const;

export type ConciergeLeadStatus = (typeof conciergeLeadStatuses)[number];

export const conciergeLeadPriorities = [
  "urgent",
  "cruise",
  "airport",
  "family",
  "luxury",
  "general",
] as const;

export type ConciergeLeadPriority = (typeof conciergeLeadPriorities)[number];

export type ConciergeLeadLike = {
  id: string;
  status?: string | null;
  priority?: string | null;
};

export const conciergeAssignmentStatuses = [
  "recommended",
  "contacted",
  "quoted",
  "confirmed",
  "declined",
] as const;

export type ConciergeAssignmentStatus =
  (typeof conciergeAssignmentStatuses)[number];

export type ConciergeAssignmentLike = {
  id: string;
  status?: string | null;
};

export type ConciergeAssignmentInput = {
  leadId?: string;
  listingId?: string | null;
  vendorId?: string | null;
  status?: string | null;
  contactMethod?: string | null;
  vendorNote?: string | null;
  guestQuoteCents?: string | number | null;
};

export type ConciergeContactRequest = {
  name?: string;
  email?: string;
  phone?: string;
  interest?: string;
  message?: string;
  leadType?: string;
  travelDate?: string;
  guests?: string | number;
  pickupArea?: string;
  arrivalType?: string;
  tripStyle?: string;
  budget?: string;
  plan?: unknown;
  sourcePath?: string;
};

function cleanText(value: unknown, maxLength = 1000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function normalizeConciergeLeadStatus(
  status: string | null | undefined,
): ConciergeLeadStatus {
  return conciergeLeadStatuses.includes(status as ConciergeLeadStatus)
    ? (status as ConciergeLeadStatus)
    : "new";
}

export function normalizeConciergeAssignmentStatus(
  status: string | null | undefined,
): ConciergeAssignmentStatus {
  return conciergeAssignmentStatuses.includes(status as ConciergeAssignmentStatus)
    ? (status as ConciergeAssignmentStatus)
    : "recommended";
}

export function priorityForConciergeLead({
  arrivalType,
  tripStyle,
  notes,
}: {
  arrivalType?: string | null;
  tripStyle?: string | null;
  notes?: string | null;
}): ConciergeLeadPriority {
  const text = [arrivalType, tripStyle, notes].join(" ").toLowerCase();

  if (/\btoday\b|\btomorrow\b|\burgent\b|\basap\b/.test(text)) return "urgent";
  if (/\bcruise\b|\bship\b|\bport\b/.test(text)) {
    return "cruise";
  }
  if (text.includes("airport") || text.includes("flight") || text.includes("luggage")) {
    return "airport";
  }
  if (text.includes("family") || text.includes("kids") || text.includes("children")) {
    return "family";
  }
  if (text.includes("luxury") || text.includes("private") || text.includes("vip")) {
    return "luxury";
  }

  return "general";
}

export function buildConciergeLeadInsert(body: ConciergeContactRequest) {
  const guests = Number(body.guests);
  const message = cleanText(body.message, 4000);
  const arrivalType = cleanText(body.arrivalType, 80);
  const tripStyle = cleanText(body.tripStyle, 80);

  return {
    guest_name: cleanText(body.name, 160),
    guest_email: cleanText(body.email, 200).toLowerCase(),
    guest_phone: cleanText(body.phone, 80) || null,
    lead_type: cleanText(body.leadType, 80) || "planning_lead",
    status: "new" as ConciergeLeadStatus,
    priority: priorityForConciergeLead({
      arrivalType,
      tripStyle,
      notes: message,
    }),
    interest: cleanText(body.interest, 160) || null,
    message,
    travel_date: cleanText(body.travelDate, 40) || null,
    guests: Number.isFinite(guests) && guests > 0 ? guests : null,
    pickup_area: cleanText(body.pickupArea, 160) || null,
    arrival_type: arrivalType || null,
    trip_style: tripStyle || null,
    budget: cleanText(body.budget, 80) || null,
    plan: body.plan ?? {},
    source_path: cleanText(body.sourcePath, 200) || "/concierge",
  };
}

export function buildConciergeAssignmentInsert(input: ConciergeAssignmentInput) {
  const quote = Number(input.guestQuoteCents);

  return {
    lead_id: cleanText(input.leadId, 80),
    listing_id: cleanText(input.listingId, 80) || null,
    vendor_id: cleanText(input.vendorId, 80) || null,
    status: normalizeConciergeAssignmentStatus(input.status),
    contact_method: cleanText(input.contactMethod, 80) || null,
    vendor_note: cleanText(input.vendorNote, 4000) || null,
    guest_quote_cents: Number.isFinite(quote) && quote >= 0 ? quote : null,
  };
}

export function conciergeLeadSummary(leads: ConciergeLeadLike[]) {
  return {
    total: leads.length,
    newCount: leads.filter((lead) => normalizeConciergeLeadStatus(lead.status) === "new")
      .length,
    activeCount: leads.filter((lead) =>
      ["new", "reviewing", "contacted", "quoted"].includes(
        normalizeConciergeLeadStatus(lead.status),
      ),
    ).length,
    bookedCount: leads.filter(
      (lead) => normalizeConciergeLeadStatus(lead.status) === "booked",
    ).length,
    closedCount: leads.filter(
      (lead) => normalizeConciergeLeadStatus(lead.status) === "closed",
    ).length,
    cruiseCount: leads.filter((lead) => lead.priority === "cruise").length,
    airportCount: leads.filter((lead) => lead.priority === "airport").length,
  };
}

export function conciergeFulfillmentSummary(
  assignments: ConciergeAssignmentLike[],
) {
  return {
    total: assignments.length,
    recommendedCount: assignments.filter(
      (assignment) =>
        normalizeConciergeAssignmentStatus(assignment.status) === "recommended",
    ).length,
    contactedCount: assignments.filter(
      (assignment) =>
        normalizeConciergeAssignmentStatus(assignment.status) === "contacted",
    ).length,
    quotedCount: assignments.filter(
      (assignment) =>
        normalizeConciergeAssignmentStatus(assignment.status) === "quoted",
    ).length,
    confirmedCount: assignments.filter(
      (assignment) =>
        normalizeConciergeAssignmentStatus(assignment.status) === "confirmed",
    ).length,
    declinedCount: assignments.filter(
      (assignment) =>
        normalizeConciergeAssignmentStatus(assignment.status) === "declined",
    ).length,
    activeCount: assignments.filter((assignment) =>
      ["recommended", "contacted", "quoted"].includes(
        normalizeConciergeAssignmentStatus(assignment.status),
      ),
    ).length,
  };
}
