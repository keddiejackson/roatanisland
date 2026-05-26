export type BookingSenderRole = "guest" | "vendor" | "admin" | "system";

export type BookingMessageLike = {
  sender_role: BookingSenderRole;
  sender_email?: string | null;
  message: string;
  is_internal?: boolean | null;
  created_at?: string | null;
};

export type BookingEventLike = {
  event_type: string;
  actor_role?: BookingSenderRole | null;
  from_status?: string | null;
  to_status?: string | null;
  note?: string | null;
  created_at?: string | null;
};

export type BookingTimelineInput = {
  booking: {
    created_at?: string | null;
    status?: string | null;
    deposit_status?: string | null;
  };
  events?: BookingEventLike[];
  messages?: BookingMessageLike[];
};

export type BookingTimelineItem = {
  kind: "created" | "status" | "payment" | "message";
  title: string;
  text: string;
  actorLabel: string;
  createdAt: string | null;
  tone: "info" | "success" | "warning" | "danger";
};

export type BookingThreadViewerRole = "guest" | "vendor" | "admin";

export type BookingThreadSummary = {
  messageCount: number;
  internalCount: number;
  lastMessagePreview: string;
  lastSenderRole: BookingSenderRole | null;
  badgeLabel: string;
  needsResponse: boolean;
};

export const vendorResponseActions = [
  {
    value: "confirmed",
    label: "Confirm",
    text: "Accept the booking and send the guest next steps.",
  },
  {
    value: "suggest_time",
    label: "Suggest another time",
    text: "Keep the request open and ask the guest to adjust timing.",
  },
  {
    value: "cancelled",
    label: "Decline",
    text: "Let the guest know this booking cannot be handled.",
  },
] as const;

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeBookingMessage(value: unknown, maxLength = 1200) {
  if (typeof value !== "string") return "";

  return value.trim().replace(/\n{3,}/g, "\n\n").slice(0, maxLength);
}

export function bookingRoleLabel(role: BookingSenderRole | null | undefined) {
  if (role === "vendor") return "Vendor";
  if (role === "admin") return "Admin";
  if (role === "system") return "System";
  return "Guest";
}

export function bookingMessagePreview(message: BookingMessageLike) {
  const prefix = message.is_internal
    ? "Internal admin note"
    : `${bookingRoleLabel(message.sender_role)}${message.sender_email ? "" : ""}`;

  return `${prefix}: ${normalizeBookingMessage(message.message, 140)}`;
}

function shouldThreadNeedResponse(
  lastSenderRole: BookingSenderRole | null,
  viewerRole: BookingThreadViewerRole,
) {
  if (!lastSenderRole) return false;

  if (viewerRole === "guest") {
    return lastSenderRole === "vendor" || lastSenderRole === "admin";
  }

  return lastSenderRole === "guest";
}

function threadBadgeLabel({
  lastSenderRole,
  viewerRole,
  needsResponse,
  messageCount,
}: {
  lastSenderRole: BookingSenderRole | null;
  viewerRole: BookingThreadViewerRole;
  needsResponse: boolean;
  messageCount: number;
}) {
  if (messageCount === 0) return "No messages";
  if (needsResponse) {
    return viewerRole === "guest" ? "New reply" : "Needs response";
  }
  if (lastSenderRole === viewerRole) return "Sent";
  return "Updated";
}

export function bookingThreadSummary(
  messages: BookingMessageLike[],
  viewerRole: BookingThreadViewerRole,
): BookingThreadSummary {
  const visibleMessages =
    viewerRole === "admin"
      ? messages
      : messages.filter((message) => !message.is_internal);
  const publicMessages = visibleMessages.filter((message) => !message.is_internal);
  const internalCount =
    viewerRole === "admin"
      ? messages.filter((message) => message.is_internal).length
      : 0;
  const lastMessage = [...publicMessages].sort((first, second) => {
    const firstTime = first.created_at
      ? new Date(first.created_at).getTime()
      : 0;
    const secondTime = second.created_at
      ? new Date(second.created_at).getTime()
      : 0;
    return firstTime - secondTime;
  }).at(-1);
  const lastSenderRole = lastMessage?.sender_role || null;
  const needsResponse = shouldThreadNeedResponse(lastSenderRole, viewerRole);

  return {
    messageCount: publicMessages.length,
    internalCount,
    lastMessagePreview: lastMessage ? bookingMessagePreview(lastMessage) : "",
    lastSenderRole,
    badgeLabel: threadBadgeLabel({
      lastSenderRole,
      viewerRole,
      needsResponse,
      messageCount: publicMessages.length,
    }),
    needsResponse,
  };
}

function paymentTimelineItem(
  depositStatus: string | null | undefined,
): BookingTimelineItem | null {
  const status = (depositStatus || "").toLowerCase();

  if (status === "paid" || status === "full_paid") {
    return {
      kind: "payment",
      title: "Deposit paid",
      text: "The booking payment is marked paid.",
      actorLabel: "Payment",
      createdAt: null,
      tone: "success",
    };
  }

  if (status.includes("checkout") || status === "processing") {
    return {
      kind: "payment",
      title: "Payment started",
      text: "A payment checkout has been started.",
      actorLabel: "Payment",
      createdAt: null,
      tone: "warning",
    };
  }

  return null;
}

function statusTone(status: string | null | undefined) {
  const normalized = (status || "").toLowerCase();

  if (normalized === "confirmed" || normalized === "completed") {
    return "success" as const;
  }

  if (normalized === "cancelled") {
    return "danger" as const;
  }

  return "info" as const;
}

export function bookingTimeline({
  booking,
  events = [],
  messages = [],
}: BookingTimelineInput): BookingTimelineItem[] {
  const timeline: BookingTimelineItem[] = [
    {
      kind: "created",
      title: "Request received",
      text: "The booking request was submitted.",
      actorLabel: "Guest",
      createdAt: booking.created_at || null,
      tone: "info",
    },
  ];

  for (const event of events) {
    if (event.event_type === "time_suggestion") {
      timeline.push({
        kind: "status",
        title: "New time suggested",
        text:
          normalizeBookingMessage(event.note, 240) ||
          "The operator suggested a different tour time.",
        actorLabel: bookingRoleLabel(event.actor_role),
        createdAt: event.created_at || null,
        tone: "warning",
      });
      continue;
    }

    if (event.event_type !== "status_change") continue;

    const status = event.to_status || booking.status || "updated";
    timeline.push({
      kind: "status",
      title: titleCase(status),
      text:
        normalizeBookingMessage(event.note, 240) ||
        `Booking status changed from ${titleCase(
          event.from_status || "new",
        )} to ${titleCase(status)}.`,
      actorLabel: bookingRoleLabel(event.actor_role),
      createdAt: event.created_at || null,
      tone: statusTone(status),
    });
  }

  const paymentItem = paymentTimelineItem(booking.deposit_status);
  if (paymentItem) {
    timeline.push(paymentItem);
  }

  for (const message of messages) {
    timeline.push({
      kind: "message",
      title: message.is_internal
        ? "Internal admin note"
        : `${bookingRoleLabel(message.sender_role)} message`,
      text: normalizeBookingMessage(message.message, 320),
      actorLabel: message.is_internal
        ? "Admin"
        : bookingRoleLabel(message.sender_role),
      createdAt: message.created_at || null,
      tone: message.is_internal ? "warning" : "info",
    });
  }

  return timeline
    .map((item, index) => ({ item, index }))
    .sort((first, second) => {
      if (!first.item.createdAt || !second.item.createdAt) {
        return first.index - second.index;
      }

      return (
        new Date(first.item.createdAt).getTime() -
        new Date(second.item.createdAt).getTime()
      );
    })
    .map(({ item }) => item);
}
