export type TripPacketBooking = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  tour_date?: string | null;
  tour_time?: string | null;
  guests?: number | null;
  status?: string | null;
  guest_message?: string | null;
  vendor_note?: string | null;
  listing_id?: string | null;
  deposit_status?: string | null;
  deposit_amount_cents?: number | null;
  booking_value_cents?: number | null;
  amount_paid_cents?: number | null;
  balance_due_cents?: number | null;
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

function formatBookingStatus(status?: string | null) {
  const normalized = normalize(status || "new");
  if (normalized === "new") return "New";
  return normalized
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function moneySnapshot(booking: TripPacketBooking) {
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
  const paymentLabel =
    balanceDueCents <= 0 && paidCents > 0
      ? "Paid in full"
      : paidCents > 0
        ? "Deposit paid, balance due"
        : "Payment not requested";

  return { balanceDueCents, paymentLabel };
}

export function buildTripPacket({
  booking,
  listingTitle = "Roatan booking",
  statusUrl,
  chatUrl,
}: {
  booking: TripPacketBooking;
  listingTitle?: string;
  statusUrl: string;
  chatUrl: string;
}) {
  const money = moneySnapshot(booking);
  const listingId = booking.listing_id || "";

  return {
    title: `${listingTitle} trip packet`,
    guestName: booking.full_name || "Guest",
    summary: [
      { label: "Date", value: booking.tour_date || "To confirm" },
      { label: "Time", value: booking.tour_time || "To confirm" },
      { label: "Guests", value: String(booking.guests || 1) },
      { label: "Status", value: formatBookingStatus(booking.status || "new") },
      { label: "Payment", value: money.paymentLabel },
      { label: "Balance", value: formatMoneyCents(money.balanceDueCents) },
    ],
    actions: [
      { label: "Open chat", href: chatUrl },
      { label: "Booking status", href: statusUrl },
      { label: "Invoice", href: `/book/invoice/${booking.id}` },
      { label: "Receipt", href: `/book/receipt/${booking.id}` },
      ...(listingId ? [{ label: "View listing", href: `/listings/${listingId}` }] : []),
    ],
    notes: [
      {
        label: "Guest notes",
        value: booking.guest_message || "No guest notes yet.",
      },
      {
        label: "Operator notes",
        value: booking.vendor_note || "Pickup and final details will appear here.",
      },
    ],
    whatToBring: [
      "Booking confirmation",
      "Sun protection",
      "Water",
      "Comfortable shoes or sandals",
      "Towel or dry bag if water is involved",
      "Cash for tips or extras",
    ],
    nextSteps: [
      money.balanceDueCents > 0
        ? `Pay remaining balance: ${formatMoneyCents(money.balanceDueCents)}`
        : "Payment is recorded",
      "Watch chat for pickup or timing notes",
      "Confirm exact meeting point before departure",
      "Save this trip packet for the day of travel",
    ],
  };
}
