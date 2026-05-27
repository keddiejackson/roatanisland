export type BookingReminderType =
  | "guest_payment_due_soon"
  | "guest_payment_overdue"
  | "guest_trip_tomorrow"
  | "guest_review_request"
  | "vendor_booking_needs_response"
  | "vendor_guest_message"
  | "vendor_trip_tomorrow"
  | "vendor_payout_paid";

export type BookingReminderRecipientRole = "guest" | "vendor";

export type BookingReminderBooking = {
  id: string;
  full_name: string | null;
  email: string | null;
  tour_date: string | null;
  tour_time: string | null;
  status: string | null;
  created_at: string | null;
  listing_id: string | null;
  listing_title?: string | null;
  vendor_email?: string | null;
  vendor_name?: string | null;
  deposit_status?: string | null;
  deposit_amount_cents?: number | null;
  booking_value_cents?: number | null;
  amount_paid_cents?: number | null;
  balance_due_cents?: number | null;
  balance_due_date?: string | null;
  payment_due_date?: string | null;
  payment_link_url?: string | null;
  invoice_number?: string | null;
  receipt_number?: string | null;
  payout_paid_at?: string | null;
};

export type BookingReminderMessage = {
  booking_id: string;
  sender_role: string | null;
  sender_email?: string | null;
  message: string | null;
  is_internal?: boolean | null;
  created_at: string | null;
};

export type BookingReminderSetting = {
  reminder_type: BookingReminderType | string;
  enabled: boolean;
  subject_template: string | null;
  body_template: string | null;
};

export type BookingReminderLog = {
  booking_id: string;
  reminder_type: BookingReminderType | string;
  recipient_role: BookingReminderRecipientRole | string;
  recipient_email: string | null;
  trigger_key: string | null;
  status: string | null;
  sent_at?: string | null;
  created_at?: string | null;
};

export type BookingReminderCandidate = {
  id: string;
  bookingId: string;
  reminderType: BookingReminderType;
  label: string;
  recipientRole: BookingReminderRecipientRole;
  recipientEmail: string;
  guestName: string;
  listingTitle: string;
  vendorName: string;
  dateLabel: string;
  timeLabel: string;
  dueLabel: string;
  amountLabel: string;
  subjectTemplate: string;
  bodyTemplate: string;
  preview: string;
  actionUrl: string;
  tripPacketUrl: string;
  bookingStatusUrl: string;
  triggerKey: string;
};

const REMINDER_DEFAULTS: BookingReminderSetting[] = [
  {
    reminder_type: "guest_payment_due_soon",
    enabled: true,
    subject_template: "Payment due soon for {listingTitle}",
    body_template:
      "Hi {guestName}, your {amountDue} balance for {listingTitle} is {dueLabel}.",
  },
  {
    reminder_type: "guest_payment_overdue",
    enabled: true,
    subject_template: "Payment reminder for {listingTitle}",
    body_template:
      "Hi {guestName}, your {amountDue} balance for {listingTitle} is {dueLabel}.",
  },
  {
    reminder_type: "guest_trip_tomorrow",
    enabled: true,
    subject_template: "Your Roatan trip is tomorrow",
    body_template:
      "Hi {guestName}, your {listingTitle} booking is tomorrow at {time}. Review your trip packet before you go.",
  },
  {
    reminder_type: "guest_review_request",
    enabled: true,
    subject_template: "How was your Roatan experience?",
    body_template:
      "Hi {guestName}, thank you for booking {listingTitle}. We'd love your review when you have a minute.",
  },
  {
    reminder_type: "vendor_booking_needs_response",
    enabled: true,
    subject_template: "Booking needs your response",
    body_template:
      "{vendorName}, {guestName}'s {listingTitle} request still needs a response.",
  },
  {
    reminder_type: "vendor_guest_message",
    enabled: true,
    subject_template: "Guest message needs a reply",
    body_template:
      "{vendorName}, {guestName} sent a message about {listingTitle}. Please reply from your dashboard.",
  },
  {
    reminder_type: "vendor_trip_tomorrow",
    enabled: true,
    subject_template: "Tomorrow's booking reminder",
    body_template:
      "{vendorName}, {guestName}'s {listingTitle} booking is tomorrow at {time}. Confirm pickup and final details.",
  },
  {
    reminder_type: "vendor_payout_paid",
    enabled: true,
    subject_template: "Payout marked paid",
    body_template:
      "{vendorName}, a payout for {listingTitle} has been marked paid by RoatanIsland.life.",
  },
];

const REMINDER_LABELS: Record<BookingReminderType, string> = {
  guest_payment_due_soon: "Guest payment due soon",
  guest_payment_overdue: "Guest payment overdue",
  guest_trip_tomorrow: "Guest trip tomorrow",
  guest_review_request: "Guest review request",
  vendor_booking_needs_response: "Vendor response needed",
  vendor_guest_message: "Vendor guest message",
  vendor_trip_tomorrow: "Vendor trip tomorrow",
  vendor_payout_paid: "Vendor payout paid",
};

function normalize(value?: string | null) {
  return (value || "").toLowerCase();
}

function cents(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatMoneyCents(valueCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: valueCents % 100 === 0 ? 0 : 2,
  }).format(valueCents / 100);
}

function dateOnly(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

function parseDateOnly(value?: string | null) {
  if (!value) return null;
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function daysUntil(date: string | null | undefined, now: Date) {
  const parsed = parseDateOnly(date);
  if (!parsed) return null;
  return Math.round((parsed.getTime() - dateOnly(now).getTime()) / 86_400_000);
}

function moneySnapshot(booking: BookingReminderBooking, now: Date) {
  const paidCents =
    cents(booking.amount_paid_cents) > 0
      ? cents(booking.amount_paid_cents)
      : normalize(booking.deposit_status) === "paid"
        ? cents(booking.deposit_amount_cents)
        : 0;
  const balanceDueCents =
    typeof booking.balance_due_cents === "number"
      ? Math.max(0, booking.balance_due_cents)
      : Math.max(0, cents(booking.booking_value_cents) - paidCents);
  const dueInDays = daysUntil(
    booking.balance_due_date || booking.payment_due_date,
    now,
  );
  let dueLabel = "No due date";

  if (balanceDueCents <= 0) {
    dueLabel = "Paid";
  } else if (dueInDays !== null) {
    if (dueInDays < 0) {
      dueLabel = `Overdue by ${Math.abs(dueInDays)} day${
        Math.abs(dueInDays) === 1 ? "" : "s"
      }`;
    } else if (dueInDays === 0) {
      dueLabel = "Due today";
    } else {
      dueLabel = `Due in ${dueInDays} day${dueInDays === 1 ? "" : "s"}`;
    }
  }

  return { balanceDueCents, dueLabel };
}

function settingMap(settings: BookingReminderSetting[]) {
  const merged = new Map<BookingReminderType, BookingReminderSetting>();

  for (const setting of REMINDER_DEFAULTS) {
    merged.set(setting.reminder_type as BookingReminderType, setting);
  }

  for (const setting of settings) {
    if (isReminderType(setting.reminder_type)) {
      const defaults = merged.get(setting.reminder_type);
      merged.set(setting.reminder_type, {
        reminder_type: setting.reminder_type,
        enabled: setting.enabled,
        subject_template:
          setting.subject_template || defaults?.subject_template || "",
        body_template: setting.body_template || defaults?.body_template || "",
      });
    }
  }

  return merged;
}

function isReminderType(value: string): value is BookingReminderType {
  return REMINDER_DEFAULTS.some((setting) => setting.reminder_type === value);
}

function wasSent({
  logs,
  booking,
  reminderType,
  recipientRole,
  recipientEmail,
  triggerKey,
}: {
  logs: BookingReminderLog[];
  booking: BookingReminderBooking;
  reminderType: BookingReminderType;
  recipientRole: BookingReminderRecipientRole;
  recipientEmail: string;
  triggerKey: string;
}) {
  return logs.some(
    (log) =>
      log.booking_id === booking.id &&
      log.reminder_type === reminderType &&
      log.recipient_role === recipientRole &&
      normalize(log.recipient_email) === normalize(recipientEmail) &&
      (log.trigger_key || "") === triggerKey &&
      ["sent", "manual"].includes(normalize(log.status)),
  );
}

function replacements(candidate: BookingReminderCandidate) {
  return {
    guestName: candidate.guestName,
    listingTitle: candidate.listingTitle,
    vendorName: candidate.vendorName,
    date: candidate.dateLabel,
    time: candidate.timeLabel,
    dueLabel: candidate.dueLabel,
    amountDue: candidate.amountLabel,
    tripPacketUrl: candidate.tripPacketUrl,
    bookingStatusUrl: candidate.bookingStatusUrl,
  };
}

function renderTemplate(template: string, candidate: BookingReminderCandidate) {
  const values = replacements(candidate);
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, value || ""),
    template,
  );
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function candidate({
  booking,
  reminderType,
  recipientRole,
  recipientEmail,
  triggerKey,
  settings,
  now,
  siteUrl,
  preview,
}: {
  booking: BookingReminderBooking;
  reminderType: BookingReminderType;
  recipientRole: BookingReminderRecipientRole;
  recipientEmail: string | null | undefined;
  triggerKey: string;
  settings: Map<BookingReminderType, BookingReminderSetting>;
  now: Date;
  siteUrl: string;
  preview?: string;
}) {
  if (!recipientEmail) return null;

  const setting = settings.get(reminderType);
  if (!setting?.enabled) return null;

  const snapshot = moneySnapshot(booking, now);
  const amountLabel =
    reminderType === "guest_payment_due_soon" ||
    reminderType === "guest_payment_overdue"
      ? formatMoneyCents(snapshot.balanceDueCents)
      : "$0";
  const tripPacketUrl = `${siteUrl}/book/trip/${booking.id}`;
  const bookingStatusUrl =
    booking.payment_link_url || `${siteUrl}/book/status/${booking.id}`;

  const result: BookingReminderCandidate = {
    id: `${booking.id}:${reminderType}:${recipientRole}:${triggerKey}`,
    bookingId: booking.id,
    reminderType,
    label: REMINDER_LABELS[reminderType],
    recipientRole,
    recipientEmail,
    guestName: booking.full_name || "Guest",
    listingTitle: booking.listing_title || "Roatan booking",
    vendorName: booking.vendor_name || "Vendor",
    dateLabel: booking.tour_date || "To confirm",
    timeLabel: booking.tour_time || "To confirm",
    dueLabel: snapshot.dueLabel,
    amountLabel,
    subjectTemplate: setting.subject_template || "",
    bodyTemplate: setting.body_template || "",
    preview: preview || setting.body_template || "",
    actionUrl: recipientRole === "vendor" ? `${siteUrl}/vendor/dashboard` : tripPacketUrl,
    tripPacketUrl,
    bookingStatusUrl,
    triggerKey,
  };

  return {
    ...result,
    preview: renderTemplate(result.preview, result),
  };
}

function addIfDue(
  output: BookingReminderCandidate[],
  possible: BookingReminderCandidate | null,
  params: {
    logs: BookingReminderLog[];
    booking: BookingReminderBooking;
    includeSent: boolean;
  },
) {
  if (!possible) return;

  if (
    !params.includeSent &&
    wasSent({
      logs: params.logs,
      booking: params.booking,
      reminderType: possible.reminderType,
      recipientRole: possible.recipientRole,
      recipientEmail: possible.recipientEmail,
      triggerKey: possible.triggerKey,
    })
  ) {
    return;
  }

  output.push(possible);
}

export function getDefaultReminderSettings() {
  return REMINDER_DEFAULTS.map((setting) => ({ ...setting }));
}

export function getBookingReminderCandidates({
  bookings,
  messages = [],
  logs = [],
  settings = [],
  now = new Date(),
  siteUrl = "https://www.roatanisland.life",
  includeSent = false,
}: {
  bookings: BookingReminderBooking[];
  messages?: BookingReminderMessage[];
  logs?: BookingReminderLog[];
  settings?: BookingReminderSetting[];
  now?: Date;
  siteUrl?: string;
  includeSent?: boolean;
}) {
  const candidates: BookingReminderCandidate[] = [];
  const settingsByType = settingMap(settings);
  const activeBookings = bookings.filter(
    (booking) => normalize(booking.status) !== "cancelled",
  );
  const latestGuestMessageByBooking = new Map<string, BookingReminderMessage>();

  for (const message of messages) {
    if (message.is_internal || normalize(message.sender_role) !== "guest") {
      continue;
    }

    const current = latestGuestMessageByBooking.get(message.booking_id);
    if (!current || (message.created_at || "") > (current.created_at || "")) {
      latestGuestMessageByBooking.set(message.booking_id, message);
    }
  }

  for (const booking of activeBookings) {
    const snapshot = moneySnapshot(booking, now);
    const dueInDays = daysUntil(
      booking.balance_due_date || booking.payment_due_date,
      now,
    );

    if (snapshot.balanceDueCents > 0 && dueInDays !== null && dueInDays < 0) {
      addIfDue(
        candidates,
        candidate({
          booking,
          reminderType: "guest_payment_overdue",
          recipientRole: "guest",
          recipientEmail: booking.email,
          triggerKey: booking.balance_due_date || booking.payment_due_date || "overdue",
          settings: settingsByType,
          now,
          siteUrl,
        }),
        { logs, booking, includeSent },
      );
    }
  }

  for (const booking of activeBookings) {
    const snapshot = moneySnapshot(booking, now);
    const dueInDays = daysUntil(
      booking.balance_due_date || booking.payment_due_date,
      now,
    );
    const tripInDays = daysUntil(booking.tour_date, now);
    const latestGuestMessage = latestGuestMessageByBooking.get(booking.id);

    if (
      snapshot.balanceDueCents > 0 &&
      dueInDays !== null &&
      dueInDays >= 0 &&
      dueInDays <= 3
    ) {
      addIfDue(
        candidates,
        candidate({
          booking,
          reminderType: "guest_payment_due_soon",
          recipientRole: "guest",
          recipientEmail: booking.email,
          triggerKey: booking.balance_due_date || booking.payment_due_date || "due-soon",
          settings: settingsByType,
          now,
          siteUrl,
        }),
        { logs, booking, includeSent },
      );
    }

    if (tripInDays === 1 && normalize(booking.status) === "confirmed") {
      addIfDue(
        candidates,
        candidate({
          booking,
          reminderType: "guest_trip_tomorrow",
          recipientRole: "guest",
          recipientEmail: booking.email,
          triggerKey: booking.tour_date || "tomorrow",
          settings: settingsByType,
          now,
          siteUrl,
        }),
        { logs, booking, includeSent },
      );
    }

    if (latestGuestMessage) {
      addIfDue(
        candidates,
        candidate({
          booking,
          reminderType: "vendor_guest_message",
          recipientRole: "vendor",
          recipientEmail: booking.vendor_email,
          triggerKey: latestGuestMessage.created_at || "guest-message",
          settings: settingsByType,
          now,
          siteUrl,
          preview: `${booking.full_name || "Guest"} sent: ${latestGuestMessage.message || ""}`,
        }),
        { logs, booking, includeSent },
      );
    }

    if (tripInDays === 1 && normalize(booking.status) === "confirmed") {
      addIfDue(
        candidates,
        candidate({
          booking,
          reminderType: "vendor_trip_tomorrow",
          recipientRole: "vendor",
          recipientEmail: booking.vendor_email,
          triggerKey: booking.tour_date || "tomorrow",
          settings: settingsByType,
          now,
          siteUrl,
        }),
        { logs, booking, includeSent },
      );
    }

    if (normalize(booking.status || "new") === "new") {
      addIfDue(
        candidates,
        candidate({
          booking,
          reminderType: "vendor_booking_needs_response",
          recipientRole: "vendor",
          recipientEmail: booking.vendor_email,
          triggerKey: booking.created_at?.slice(0, 10) || "new-booking",
          settings: settingsByType,
          now,
          siteUrl,
        }),
        { logs, booking, includeSent },
      );
    }

    if (normalize(booking.status) === "completed" && tripInDays !== null && tripInDays < 0) {
      addIfDue(
        candidates,
        candidate({
          booking,
          reminderType: "guest_review_request",
          recipientRole: "guest",
          recipientEmail: booking.email,
          triggerKey: booking.tour_date || "review",
          settings: settingsByType,
          now,
          siteUrl,
        }),
        { logs, booking, includeSent },
      );
    }

    if (booking.payout_paid_at) {
      addIfDue(
        candidates,
        candidate({
          booking,
          reminderType: "vendor_payout_paid",
          recipientRole: "vendor",
          recipientEmail: booking.vendor_email,
          triggerKey: booking.payout_paid_at.slice(0, 10),
          settings: settingsByType,
          now,
          siteUrl,
        }),
        { logs, booking, includeSent },
      );
    }
  }

  return candidates;
}

export function buildReminderEmail(candidate: BookingReminderCandidate) {
  const subject = renderTemplate(candidate.subjectTemplate, candidate);
  const body = renderTemplate(candidate.bodyTemplate, candidate);
  const actionLabel =
    candidate.recipientRole === "vendor" ? "Open vendor dashboard" : "Open trip packet";
  const html = `
    <p>${escapeHtml(body)}</p>
    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      <tr><td style="padding:8px 0;color:#64748b">Guest</td><td style="padding:8px 0;text-align:right;font-weight:700">${escapeHtml(candidate.guestName)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">Listing</td><td style="padding:8px 0;text-align:right;font-weight:700">${escapeHtml(candidate.listingTitle)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">Date</td><td style="padding:8px 0;text-align:right;font-weight:700">${escapeHtml(candidate.dateLabel)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">Time</td><td style="padding:8px 0;text-align:right;font-weight:700">${escapeHtml(candidate.timeLabel)}</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">Amount</td><td style="padding:8px 0;text-align:right;font-weight:900;color:#0b3c5d">${escapeHtml(candidate.amountLabel)}</td></tr>
    </table>
    <p><a href="${escapeHtml(candidate.actionUrl)}" style="display:inline-block;background:#00a8a8;color:#ffffff;text-decoration:none;border-radius:12px;padding:12px 18px;font-weight:800">${actionLabel}</a></p>
    <p style="font-size:13px;color:#64748b">Trip packet: ${escapeHtml(candidate.tripPacketUrl)}</p>
  `;
  const text = [
    subject,
    body,
    `Guest: ${candidate.guestName}`,
    `Listing: ${candidate.listingTitle}`,
    `Date: ${candidate.dateLabel}`,
    `Time: ${candidate.timeLabel}`,
    `Amount: ${candidate.amountLabel}`,
    `${actionLabel}: ${candidate.actionUrl}`,
    `Trip packet: ${candidate.tripPacketUrl}`,
  ].join("\n");

  return { subject, html, text };
}
