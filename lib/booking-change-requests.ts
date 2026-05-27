export type BookingChangeRequestStatus =
  | "pending"
  | "approved"
  | "declined"
  | "countered"
  | "cancelled";

export type BookingChangeActorRole = "guest" | "vendor" | "admin";

export type BookingChangeRequest = {
  id: string;
  booking_id: string;
  requested_by_role: BookingChangeActorRole | string | null;
  requested_by_email: string | null;
  status: BookingChangeRequestStatus | string | null;
  requested_tour_date: string | null;
  requested_tour_time: string | null;
  requested_guests: number | null;
  requested_pickup_note: string | null;
  reason: string | null;
  response_note: string | null;
  resolved_by_role: BookingChangeActorRole | string | null;
  resolved_by_email: string | null;
  resolved_at: string | null;
  created_at: string | null;
};

export type BookingChangeRequestSummary = {
  totalCount: number;
  pendingCount: number;
  approvedCount: number;
  declinedCount: number;
  counteredCount: number;
  cancelledCount: number;
  needsAction: boolean;
  latestStatus: BookingChangeRequestStatus | null;
  latestLabel: string;
};

export type BookingChangeRequestAction =
  | "requested"
  | "approved"
  | "declined"
  | "countered"
  | "cancelled";

export type BookingChangeBookingSnapshot = {
  tour_date: string;
  tour_time: string;
  guests: number;
  vendor_note?: string | null;
};

const statuses: BookingChangeRequestStatus[] = [
  "pending",
  "approved",
  "declined",
  "countered",
  "cancelled",
];

export function normalizeChangeRequestStatus(
  status: string | null | undefined,
): BookingChangeRequestStatus {
  const normalized = (status || "").toLowerCase();

  if (statuses.includes(normalized as BookingChangeRequestStatus)) {
    return normalized as BookingChangeRequestStatus;
  }

  return "pending";
}

function latestRequest(requests: BookingChangeRequest[]) {
  return [...requests].sort((first, second) =>
    (second.created_at || "").localeCompare(first.created_at || ""),
  )[0];
}

function statusLabel(status: BookingChangeRequestStatus | null) {
  if (status === "approved") return "Change approved";
  if (status === "declined") return "Change declined";
  if (status === "countered") return "New time suggested";
  if (status === "cancelled") return "Change cancelled";
  if (status === "pending") return "Change requested";

  return "No change requests";
}

export function getBookingChangeRequestSummary(
  requests: BookingChangeRequest[],
): BookingChangeRequestSummary {
  const counts = {
    pending: 0,
    approved: 0,
    declined: 0,
    countered: 0,
    cancelled: 0,
  };

  for (const request of requests) {
    counts[normalizeChangeRequestStatus(request.status)] += 1;
  }

  const latestStatus = latestRequest(requests)
    ? normalizeChangeRequestStatus(latestRequest(requests)?.status)
    : null;

  return {
    totalCount: requests.length,
    pendingCount: counts.pending,
    approvedCount: counts.approved,
    declinedCount: counts.declined,
    counteredCount: counts.countered,
    cancelledCount: counts.cancelled,
    needsAction: counts.pending > 0,
    latestStatus,
    latestLabel: statusLabel(latestStatus),
  };
}

function requestDetails(request: BookingChangeRequest) {
  const parts = [
    request.requested_tour_date || null,
    request.requested_tour_time ? `at ${request.requested_tour_time}` : null,
    request.requested_guests
      ? `for ${request.requested_guests} guest${
          request.requested_guests === 1 ? "" : "s"
        }`
      : null,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : "the requested booking details";
}

export function applyApprovedChangeRequest(
  booking: BookingChangeBookingSnapshot,
  request: BookingChangeRequest,
): BookingChangeBookingSnapshot {
  const nextNote = request.requested_pickup_note
    ? [
        booking.vendor_note || "",
        `Change request pickup: ${request.requested_pickup_note}`,
      ]
        .filter(Boolean)
        .join("\n")
    : booking.vendor_note || null;

  return {
    tour_date: request.requested_tour_date || booking.tour_date,
    tour_time: request.requested_tour_time || booking.tour_time,
    guests: request.requested_guests || booking.guests,
    vendor_note: nextNote,
  };
}

export function buildChangeRequestMessage({
  request,
  action,
  actorRole,
  responseNote,
}: {
  request: BookingChangeRequest;
  action: BookingChangeRequestAction;
  actorRole: BookingChangeActorRole;
  responseNote?: string | null;
}) {
  const actor =
    actorRole === "admin" ? "Admin" : actorRole === "vendor" ? "Vendor" : "Guest";
  const details = requestDetails(request);
  const pickup = request.requested_pickup_note
    ? ` Pickup/details: ${request.requested_pickup_note}.`
    : "";
  const reason = request.reason ? ` Reason: ${request.reason}` : "";
  const note = responseNote ? ` Note: ${responseNote}` : "";

  if (action === "requested") {
    return `${actor} requested a booking change: ${details}.${pickup}${reason}`.trim();
  }

  if (action === "approved") {
    return `${actor} approved this booking change. New request: ${details}.${note}`.trim();
  }

  if (action === "declined") {
    return `${actor} declined this booking change.${note}`.trim();
  }

  if (action === "countered") {
    return `${actor} suggested a different booking change: ${details}.${note}`.trim();
  }

  return `${actor} cancelled this booking change.${note}`.trim();
}

