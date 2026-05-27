export type PaymentScheduleType =
  | "request_later"
  | "deposit_only"
  | "full_payment"
  | "split_payment"
  | "manual"
  | "waived";

export type RefundStatus = "none" | "pending" | "partial" | "full" | "declined";

export type BookingMoneyInput = {
  id: string;
  created_at?: string | null;
  full_name?: string | null;
  email?: string | null;
  status?: string | null;
  tour_date?: string | null;
  deposit_status?: string | null;
  deposit_amount_cents?: number | null;
  booking_value_cents?: number | null;
  amount_paid_cents?: number | null;
  balance_due_cents?: number | null;
  payment_schedule_type?: PaymentScheduleType | string | null;
  payment_due_date?: string | null;
  balance_due_date?: string | null;
  payment_method?: string | null;
  manual_payment_note?: string | null;
  refund_status?: RefundStatus | string | null;
  refund_amount_cents?: number | null;
  refund_note?: string | null;
  payment_issue_flag?: boolean | null;
  payment_issue_note?: string | null;
  invoice_number?: string | null;
  receipt_number?: string | null;
  commission_rate?: number | null;
  commission_amount_cents?: number | null;
  commission_override_cents?: number | null;
  commission_status?: string | null;
  payout_scheduled_for?: string | null;
  payout_paid_at?: string | null;
};

export type BookingMoneyAlertType =
  | "overdue_balance"
  | "refund_pending"
  | "payment_issue"
  | "payout_ready";

export type BookingMoneyAlert = {
  type: BookingMoneyAlertType;
  bookingId: string;
  label: string;
  amountCents: number;
  tone: "danger" | "warning" | "good";
};

const PAYMENT_PRESETS: { id: PaymentScheduleType; label: string }[] = [
  { id: "request_later", label: "Request later" },
  { id: "deposit_only", label: "Deposit only" },
  { id: "split_payment", label: "Deposit plus balance" },
  { id: "full_payment", label: "Full payment" },
  { id: "manual", label: "Manual payment" },
  { id: "waived", label: "Waived / comped" },
];

function cents(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalize(value?: string | null) {
  return (value || "").toLowerCase();
}

function activeBooking(booking: BookingMoneyInput) {
  return normalize(booking.status) !== "cancelled";
}

function isPaidStatus(status?: string | null) {
  return ["paid", "full_paid", "manual_paid", "waived"].includes(normalize(status));
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
  const dueDate = parseDateOnly(date);
  if (!dueDate) return null;

  const diff = dueDate.getTime() - dateOnly(now).getTime();
  return Math.round(diff / 86_400_000);
}

function documentSuffix(booking: BookingMoneyInput) {
  const compact = booking.id.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return compact.slice(-8) || "BOOKING";
}

export function formatMoneyCents(valueCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: valueCents % 100 === 0 ? 0 : 2,
  }).format(valueCents / 100);
}

export function getPaidCents(booking: BookingMoneyInput) {
  if (cents(booking.amount_paid_cents) > 0) {
    return cents(booking.amount_paid_cents);
  }

  if (isPaidStatus(booking.deposit_status)) {
    return cents(booking.deposit_amount_cents);
  }

  return 0;
}

export function getBalanceDueCents(booking: BookingMoneyInput) {
  if (typeof booking.balance_due_cents === "number") {
    return Math.max(0, booking.balance_due_cents);
  }

  if (normalize(booking.payment_schedule_type) === "waived") {
    return 0;
  }

  return Math.max(0, cents(booking.booking_value_cents) - getPaidCents(booking));
}

export function getBookingMoneySnapshot(
  booking: BookingMoneyInput,
  now = new Date(),
) {
  const paidCents = getPaidCents(booking);
  const balanceDueCents = getBalanceDueCents(booking);
  const dueInDays = daysUntil(
    booking.balance_due_date || booking.payment_due_date,
    now,
  );
  const depositStatus = normalize(booking.deposit_status);
  const schedule = normalize(booking.payment_schedule_type);
  let paymentLabel = "Payment not requested";
  let statusTone: "paid" | "due" | "overdue" | "pending" | "issue" = "pending";

  if (booking.payment_issue_flag) {
    paymentLabel = "Payment issue";
    statusTone = "issue";
  } else if (schedule === "waived" || depositStatus === "waived") {
    paymentLabel = "Payment waived";
    statusTone = "paid";
  } else if (balanceDueCents <= 0 && paidCents > 0) {
    paymentLabel = "Paid in full";
    statusTone = "paid";
  } else if (["paid", "manual_paid"].includes(depositStatus) && balanceDueCents > 0) {
    paymentLabel = "Deposit paid, balance due";
    statusTone = dueInDays !== null && dueInDays < 0 ? "overdue" : "due";
  } else if (["checkout_started", "full_checkout_started"].includes(depositStatus)) {
    paymentLabel = "Payment link sent";
    statusTone = "pending";
  }

  let dueLabel = "No due date";
  if (balanceDueCents <= 0) {
    dueLabel = "Paid";
  } else if (dueInDays !== null) {
    if (dueInDays < 0) {
      dueLabel = `Overdue by ${Math.abs(dueInDays)} day${Math.abs(dueInDays) === 1 ? "" : "s"}`;
    } else if (dueInDays === 0) {
      dueLabel = "Due today";
    } else {
      dueLabel = `Due in ${dueInDays} day${dueInDays === 1 ? "" : "s"}`;
    }
  }

  return {
    totalCents: cents(booking.booking_value_cents),
    paidCents,
    balanceDueCents,
    paymentLabel,
    dueLabel,
    invoiceNumber: booking.invoice_number || `INV-${documentSuffix(booking)}`,
    receiptNumber: booking.receipt_number || `RCT-${documentSuffix(booking)}`,
    statusTone,
  };
}

export function getVendorPayoutForecast(booking: BookingMoneyInput) {
  const grossCents = cents(booking.booking_value_cents);
  const commissionCents =
    cents(booking.commission_override_cents) ||
    cents(booking.commission_amount_cents) ||
    Math.round(grossCents * (booking.commission_rate || 0.1));
  const payoutCents = Math.max(0, grossCents - commissionCents);
  const payoutStatus = normalize(booking.commission_status);
  let status: "ready" | "scheduled" | "paid" | "waived" | "pending" = "pending";

  if (payoutStatus === "paid") {
    status = "paid";
  } else if (payoutStatus === "scheduled") {
    status = "scheduled";
  } else if (payoutStatus === "waived") {
    status = "waived";
  } else if (normalize(booking.status) === "completed") {
    status = "ready";
  }

  return {
    grossCents,
    commissionCents,
    payoutCents,
    label: `${formatMoneyCents(payoutCents)} vendor payout`,
    status,
  };
}

export function getBookingMoneyAlerts({
  bookings,
  now = new Date(),
}: {
  bookings: BookingMoneyInput[];
  now?: Date;
}) {
  const alerts: BookingMoneyAlert[] = [];

  for (const booking of bookings) {
    if (!activeBooking(booking)) continue;

    const snapshot = getBookingMoneySnapshot(booking, now);
    const dueInDays = daysUntil(
      booking.balance_due_date || booking.payment_due_date,
      now,
    );

    if (snapshot.balanceDueCents > 0 && dueInDays !== null && dueInDays < 0) {
      alerts.push({
        type: "overdue_balance",
        bookingId: booking.id,
        label: "Balance overdue",
        amountCents: snapshot.balanceDueCents,
        tone: "danger",
      });
    }

    if (normalize(booking.refund_status) === "pending") {
      alerts.push({
        type: "refund_pending",
        bookingId: booking.id,
        label: "Refund pending",
        amountCents: cents(booking.refund_amount_cents),
        tone: "warning",
      });
    }

    if (booking.payment_issue_flag) {
      alerts.push({
        type: "payment_issue",
        bookingId: booking.id,
        label: "Payment issue",
        amountCents: snapshot.balanceDueCents,
        tone: "danger",
      });
    }

    const payout = getVendorPayoutForecast(booking);
    if (payout.status === "ready") {
      alerts.push({
        type: "payout_ready",
        bookingId: booking.id,
        label: "Payout ready",
        amountCents: payout.payoutCents,
        tone: "good",
      });
    }
  }

  const priority: Record<BookingMoneyAlertType, number> = {
    overdue_balance: 0,
    refund_pending: 1,
    payment_issue: 2,
    payout_ready: 3,
  };

  return alerts.sort((a, b) => priority[a.type] - priority[b.type]);
}

export function getCashflowForecast({
  bookings,
  now = new Date(),
}: {
  bookings: BookingMoneyInput[];
  now?: Date;
}) {
  let next7BalanceCents = 0;
  let next30BalanceCents = 0;
  let next90BalanceCents = 0;
  let paidCents = 0;
  let refundPendingCents = 0;
  let payoutDueCents = 0;
  let commissionCents = 0;

  for (const booking of bookings) {
    if (!activeBooking(booking)) continue;

    const snapshot = getBookingMoneySnapshot(booking, now);
    const dueInDays = daysUntil(
      booking.balance_due_date || booking.payment_due_date,
      now,
    );
    paidCents += snapshot.paidCents;
    commissionCents += getVendorPayoutForecast(booking).commissionCents;

    if (normalize(booking.refund_status) === "pending") {
      refundPendingCents += cents(booking.refund_amount_cents);
    }

    const payout = getVendorPayoutForecast(booking);
    if (payout.status === "ready") {
      payoutDueCents += payout.payoutCents;
    }

    if (snapshot.balanceDueCents > 0 && dueInDays !== null && dueInDays >= 0) {
      if (dueInDays <= 7) next7BalanceCents += snapshot.balanceDueCents;
      if (dueInDays <= 30) next30BalanceCents += snapshot.balanceDueCents;
      if (dueInDays <= 90) next90BalanceCents += snapshot.balanceDueCents;
    }
  }

  return {
    next7BalanceCents,
    next30BalanceCents,
    next90BalanceCents,
    paidCents,
    refundPendingCents,
    payoutDueCents,
    commissionCents,
    label: `${formatMoneyCents(next30BalanceCents)} due in 30 days`,
  };
}

export function getGuestBalanceSummary(bookings: BookingMoneyInput[]) {
  let paidCents = 0;
  let balanceDueCents = 0;
  let refundPendingCents = 0;
  let nextDueDate: string | null = null;

  for (const booking of bookings) {
    const snapshot = getBookingMoneySnapshot(booking);
    paidCents += snapshot.paidCents;
    balanceDueCents += snapshot.balanceDueCents;

    if (normalize(booking.refund_status) === "pending") {
      refundPendingCents += cents(booking.refund_amount_cents);
    }

    const dueDate = booking.balance_due_date || booking.payment_due_date;
    if (snapshot.balanceDueCents > 0 && dueDate) {
      if (nextDueDate === null || dueDate.localeCompare(nextDueDate) < 0) {
        nextDueDate = dueDate;
      }
    }
  }

  return {
    bookingCount: bookings.length,
    paidCents,
    balanceDueCents,
    refundPendingCents,
    nextDueDate,
    label: `${formatMoneyCents(balanceDueCents)} balance due`,
  };
}

export function getPaymentPresets() {
  return PAYMENT_PRESETS;
}

function parseCentsInput(value: unknown) {
  if (value === "" || value === null || value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function buildBookingMoneyUpdate(input: Record<string, unknown>) {
  const update: Record<string, unknown> = {};
  const schedule = stringOrNull(input.paymentScheduleType);

  if (schedule) update.payment_schedule_type = schedule;

  const moneyFields = [
    ["bookingValueCents", "booking_value_cents"],
    ["depositAmountCents", "deposit_amount_cents"],
    ["amountPaidCents", "amount_paid_cents"],
    ["balanceDueCents", "balance_due_cents"],
    ["refundAmountCents", "refund_amount_cents"],
    ["commissionOverrideCents", "commission_override_cents"],
  ] as const;

  for (const [inputKey, outputKey] of moneyFields) {
    if (inputKey in input) {
      const parsed = parseCentsInput(input[inputKey]);
      if (parsed !== undefined) update[outputKey] = parsed;
    }
  }

  const stringFields = [
    ["depositStatus", "deposit_status"],
    ["paymentDueDate", "payment_due_date"],
    ["balanceDueDate", "balance_due_date"],
    ["paymentMethod", "payment_method"],
    ["manualPaymentNote", "manual_payment_note"],
    ["paymentRequestedAt", "payment_requested_at"],
    ["paymentLastSentAt", "payment_last_sent_at"],
    ["paymentLinkUrl", "payment_link_url"],
    ["refundStatus", "refund_status"],
    ["refundNote", "refund_note"],
    ["paymentIssueNote", "payment_issue_note"],
    ["invoiceNumber", "invoice_number"],
    ["receiptNumber", "receipt_number"],
    ["vendorPrivatePayoutNote", "vendor_private_payout_note"],
  ] as const;

  for (const [inputKey, outputKey] of stringFields) {
    if (inputKey in input) update[outputKey] = stringOrNull(input[inputKey]);
  }

  if ("paymentIssueFlag" in input) {
    update.payment_issue_flag = Boolean(input.paymentIssueFlag);
  }

  return update;
}
