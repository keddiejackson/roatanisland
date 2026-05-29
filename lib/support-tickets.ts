export const supportTicketStatuses = [
  "new",
  "in_progress",
  "waiting_on_guest",
  "resolved",
] as const;

export const supportTicketPriorities = ["urgent", "normal", "low"] as const;

export type SupportTicketStatus = (typeof supportTicketStatuses)[number];
export type SupportTicketPriority = (typeof supportTicketPriorities)[number];

export type SupportTicketInput = {
  name?: string;
  email?: string;
  phone?: string;
  interest?: string;
  message?: string;
  sourcePath?: string;
};

export type SupportTicketLike = {
  id: string;
  status?: string | null;
  priority?: string | null;
  created_at?: string | null;
};

type SupportTicketUpdateInput = {
  status?: string;
  priority?: string;
  admin_notes?: string | null;
};

function cleanText(value?: string | null) {
  return (value || "").trim();
}

function normalizeEmail(email?: string | null) {
  return cleanText(email).toLowerCase();
}

function normalizeStatus(status?: string | null): SupportTicketStatus {
  return supportTicketStatuses.includes(status as SupportTicketStatus)
    ? (status as SupportTicketStatus)
    : "new";
}

function normalizePriority(priority?: string | null): SupportTicketPriority {
  return supportTicketPriorities.includes(priority as SupportTicketPriority)
    ? (priority as SupportTicketPriority)
    : "normal";
}

function inferPriority(input: SupportTicketInput): SupportTicketPriority {
  const combined = `${input.interest || ""} ${input.message || ""}`.toLowerCase();

  if (
    combined.includes("urgent") ||
    combined.includes("today") ||
    combined.includes("asap") ||
    combined.includes("emergency")
  ) {
    return "urgent";
  }

  return "normal";
}

function extractBookingReference(message?: string | null) {
  const match = (message || "").match(/booking reference:\s*([^\n]+)/i);
  const value = cleanText(match?.[1]);

  if (!value || value.toLowerCase() === "not provided") {
    return null;
  }

  return value;
}

export function buildSupportTicketInsert(input: SupportTicketInput) {
  const message = cleanText(input.message);

  return {
    name: cleanText(input.name),
    email: normalizeEmail(input.email),
    phone: cleanText(input.phone) || null,
    intent: cleanText(input.interest) || "Support request",
    booking_reference: extractBookingReference(message),
    message,
    status: "new" as SupportTicketStatus,
    priority: inferPriority(input),
    source_path: cleanText(input.sourcePath) || "/support",
  };
}

export function buildSupportTicketUpdate(input: SupportTicketUpdateInput) {
  return {
    status: normalizeStatus(input.status),
    priority: normalizePriority(input.priority),
    admin_notes:
      typeof input.admin_notes === "string" ? input.admin_notes.trim() : null,
    updated_at: new Date().toISOString(),
  };
}

function createdAt(ticket: SupportTicketLike) {
  return ticket.created_at ? Date.parse(ticket.created_at) || 0 : 0;
}

function isOpen(ticket: SupportTicketLike) {
  return normalizeStatus(ticket.status) !== "resolved";
}

function supportTicketSortScore(ticket: SupportTicketLike) {
  const priority = normalizePriority(ticket.priority);
  const status = normalizeStatus(ticket.status);
  const priorityScore = priority === "urgent" ? 3 : priority === "normal" ? 2 : 1;
  const statusScore =
    status === "new" ? 3 : status === "in_progress" ? 2 : status === "waiting_on_guest" ? 1 : 0;

  return priorityScore * 10000000000000 + statusScore * 1000000000000 + createdAt(ticket);
}

export function getSupportTicketAdminDigest({
  tickets,
}: {
  tickets: SupportTicketLike[];
}) {
  const openTickets = tickets.filter(isOpen);
  const sortedOpenTickets = [...openTickets].sort(
    (a, b) => supportTicketSortScore(b) - supportTicketSortScore(a),
  );
  const openCount = openTickets.length;

  return {
    headline:
      openCount === 0
        ? "No open support tickets"
        : `${openCount} open support ticket${openCount === 1 ? "" : "s"}`,
    openCount,
    urgentCount: openTickets.filter(
      (ticket) => normalizePriority(ticket.priority) === "urgent",
    ).length,
    waitingOnGuestCount: openTickets.filter(
      (ticket) => normalizeStatus(ticket.status) === "waiting_on_guest",
    ).length,
    resolvedCount: tickets.filter(
      (ticket) => normalizeStatus(ticket.status) === "resolved",
    ).length,
    nextTicket: sortedOpenTickets[0] || null,
  };
}

export function getGuestSupportTicketSummary({
  tickets,
}: {
  tickets: SupportTicketLike[];
}) {
  const sortedTickets = [...tickets].sort((a, b) => createdAt(b) - createdAt(a));
  const openCount = tickets.filter(isOpen).length;

  return {
    openCount,
    resolvedCount: tickets.filter(
      (ticket) => normalizeStatus(ticket.status) === "resolved",
    ).length,
    latestTicket: sortedTickets[0] || null,
    label:
      openCount === 0
        ? "No open requests"
        : `${openCount} open request${openCount === 1 ? "" : "s"}`,
  };
}
