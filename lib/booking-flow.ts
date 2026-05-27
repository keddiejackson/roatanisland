export type BookingAddon = {
  id: string;
  name: string;
  price_cents: number;
};

export type BookingStepState = "complete" | "current" | "upcoming";

export type BookingStatusStep = {
  key: string;
  label: string;
  text: string;
  state: BookingStepState;
};

export type BookingNextAction = {
  label: string;
  text: string;
  tone: "review" | "confirmed" | "paid" | "cancelled" | "complete";
};

const bookingStatusLabels: Record<string, string> = {
  new: "Request received",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const depositStatusLabels: Record<string, string> = {
  not_requested: "Not requested",
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

const statusOrder = ["new", "reviewing", "confirmed", "completed"];

function titleCaseStatus(status: string) {
  const words = status
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean);
  const label = words.join(" ");
  return `${label[0]?.toUpperCase() || ""}${label.slice(1)}`;
}

export function formatBookingCents(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Pending";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 100 === 0 ? 0 : 2,
  }).format(value / 100);
}

export function calculateAddonTotalCents(addons: BookingAddon[]) {
  return addons.reduce((total, addon) => total + addon.price_cents, 0);
}

export function estimateBookingTotalCents({
  price,
  guests,
  selectedAddons,
}: {
  price: number | null | undefined;
  guests: number;
  selectedAddons: BookingAddon[];
}) {
  const baseTotal = price && Number.isFinite(price) ? Math.round(price * guests * 100) : 0;
  return baseTotal + calculateAddonTotalCents(selectedAddons);
}

export function formatBookingStatus(status: string | null | undefined) {
  const normalized = status || "new";
  return bookingStatusLabels[normalized] || titleCaseStatus(normalized);
}

export function formatDepositStatus(status: string | null | undefined) {
  const normalized = status || "not_requested";
  return depositStatusLabels[normalized] || titleCaseStatus(normalized);
}

export function bookingStatusSteps(status: string | null | undefined): BookingStatusStep[] {
  const normalized = status === "cancelled" ? "new" : status || "new";
  const currentIndex = Math.max(statusOrder.indexOf(normalized), 0);

  return [
    {
      key: "new",
      label: "Request received",
      text: "Your request has been sent.",
    },
    {
      key: "reviewing",
      label: "Operator reviewing",
      text: "The local operator checks availability.",
    },
    {
      key: "confirmed",
      label: "Confirmed",
      text: "Your plans are confirmed.",
    },
    {
      key: "completed",
      label: "Completed",
      text: "Your experience is complete.",
    },
  ].map((step, index) => ({
    ...step,
    state:
      index < currentIndex
        ? "complete"
        : index === currentIndex
          ? "current"
          : "upcoming",
  }));
}

export function composeBookingGuestMessage({
  pickupPreference,
  guestMessage,
}: {
  pickupPreference?: string;
  guestMessage?: string;
}) {
  const pickup = pickupPreference?.trim();
  const message = guestMessage?.trim();

  if (pickup && message) {
    return `Pickup preference: ${pickup}\n\nGuest message: ${message}`;
  }

  if (pickup) {
    return `Pickup preference: ${pickup}`;
  }

  return message || "";
}

export function bookingNextAction({
  status,
  depositStatus,
  canReview = false,
}: {
  status: string | null | undefined;
  depositStatus: string | null | undefined;
  canReview?: boolean;
}): BookingNextAction {
  if (status === "cancelled") {
    return {
      label: "Request cancelled",
      text: "This booking is not moving forward. Contact support if this looks wrong.",
      tone: "cancelled",
    };
  }

  if (status === "completed") {
    if (canReview) {
      return {
        label: "Share your review",
        text: "Your trip is complete. Leave a review to help the next traveler choose with confidence.",
        tone: "complete",
      };
    }

    return {
      label: "Trip complete",
      text: "Thanks for booking. You can keep this page for your records.",
      tone: "complete",
    };
  }

  if (status === "confirmed" && depositStatus === "paid") {
    return {
      label: "Confirmed and paid",
      text: "Your place is confirmed. Watch for pickup details or final instructions.",
      tone: "paid",
    };
  }

  if (status === "confirmed") {
    return {
      label: "Confirmed, payment next",
      text: "Your date is confirmed. Follow any payment or pickup instructions from the operator.",
      tone: "confirmed",
    };
  }

  return {
    label: "Waiting on operator review",
    text: "The operator checks availability and will confirm or follow up.",
    tone: "review",
  };
}
