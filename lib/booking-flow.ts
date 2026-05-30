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

export type BookingCheckoutReadiness = {
  score: number;
  label: "Ready to send" | "Almost ready" | "Needs details";
  missingItems: string[];
};

export type BookingMobileCheckoutStepState =
  | "complete"
  | "current"
  | "upcoming"
  | "blocked";

export type BookingMobileCheckoutStep = {
  key: "guest" | "date" | "pickup" | "review";
  label: string;
  text: string;
  href: string;
  state: BookingMobileCheckoutStepState;
};

export type BookingMobileStickyCta = {
  label: string;
  text: string;
  actionLabel: string;
  href: string;
  canSubmit: boolean;
  priceLabel: string;
  tone: "missing" | "ready" | "blocked" | "loading" | "sent";
};

export type BookingConversionChecklistItem = {
  label: string;
  text: string;
  done: boolean;
};

export type BookingTrustStep = {
  label: string;
  text: string;
};

export type BookingRecoveryPrompt = {
  label: string;
  text: string;
  shouldShow: boolean;
};

export type LuxuryBookingFlowStep = {
  number: string;
  label: string;
  text: string;
};

export type BookingPaymentClarityCard = {
  label: string;
  value: string;
  text: string;
};

export type BookingConfidenceSignal = {
  label: string;
  text: string;
  tone: "good" | "watch" | "urgent";
};

export type BookingConfidenceCommandCenter = {
  score: number;
  label: "Guest-ready request" | "Almost ready" | "Needs a few details";
  headline: string;
  primaryAction: string;
  primaryText: string;
  guestPromise: string;
  operatorPrompt: string;
  missingItems: string[];
  signals: BookingConfidenceSignal[];
};

export type BookingSuccessNextStep = {
  label: string;
  text: string;
  href: string;
};

export type BookingOpsPriority = {
  label: string;
  text: string;
  tone: "urgent" | "money" | "review" | "ready";
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

function hasText(value: string | null | undefined) {
  return Boolean((value || "").trim());
}

function hasValidEmail(value: string | null | undefined) {
  const email = (value || "").trim();
  return Boolean(email && email.includes("@") && email.includes("."));
}

export function getBookingCheckoutReadiness({
  fullName,
  email,
  tourDate,
  tourTime,
  guests,
  pickupPreference,
}: {
  fullName: string;
  email: string;
  tourDate: string;
  tourTime: string;
  guests: string;
  pickupPreference: string;
}): BookingCheckoutReadiness {
  const checks = [
    { label: "Name", complete: hasText(fullName) },
    { label: "Email", complete: hasValidEmail(email) },
    { label: "Date", complete: hasText(tourDate) },
    { label: "Time", complete: hasText(tourTime) },
    {
      label: "Guest count",
      complete: Number.isFinite(Number(guests)) && Number(guests) > 0,
    },
    { label: "Pickup preference", complete: hasText(pickupPreference) },
  ];
  const completed = checks.filter((check) => check.complete).length;
  const score = Math.round((completed / checks.length) * 100);

  return {
    score,
    label:
      score === 100
        ? "Ready to send"
        : score >= 67
          ? "Almost ready"
          : "Needs details",
    missingItems: checks
      .filter((check) => !check.complete)
      .map((check) => check.label),
  };
}

export function getMobileBookingCheckoutSteps({
  fullName,
  email,
  tourDate,
  tourTime,
  guests,
  pickupPreference,
  availabilityBlocked,
}: {
  fullName: string;
  email: string;
  tourDate: string;
  tourTime: string;
  guests: string;
  pickupPreference: string;
  availabilityBlocked: boolean;
}): BookingMobileCheckoutStep[] {
  const stepChecks = [
    {
      key: "guest" as const,
      label: "Guest",
      text: "Name and email",
      href: "#booking-guest",
      complete: hasText(fullName) && hasValidEmail(email),
    },
    {
      key: "date" as const,
      label: "Date",
      text: "Time and group",
      href: "#booking-date",
      complete:
        hasText(tourDate) &&
        hasText(tourTime) &&
        Number.isFinite(Number(guests)) &&
        Number(guests) > 0,
    },
    {
      key: "pickup" as const,
      label: "Pickup",
      text: "Meetup details",
      href: "#booking-pickup",
      complete: hasText(pickupPreference),
    },
    {
      key: "review" as const,
      label: "Review",
      text: "Send request",
      href: "#booking-review",
      complete: false,
    },
  ];
  const firstIncompleteIndex = stepChecks.findIndex((step) => !step.complete);
  const currentIndex =
    firstIncompleteIndex === -1 ? stepChecks.length - 1 : firstIncompleteIndex;

  return stepChecks.map((step, index) => {
    let state: BookingMobileCheckoutStepState =
      index < currentIndex
        ? "complete"
        : index === currentIndex
          ? "current"
          : "upcoming";

    if (availabilityBlocked && step.key === "review") {
      state = "blocked";
    }

    return {
      key: step.key,
      label: step.label,
      text: step.text,
      href: step.href,
      state,
    };
  });
}

function getFirstMissingBookingHref(missingItems: string[]) {
  if (
    missingItems.some((item) => item === "Name" || item === "Email")
  ) {
    return {
      href: "#booking-guest",
      actionLabel: "Add guest details",
      label: "Guest details needed",
      text: "Add the traveler name and email so updates go to the right place.",
    };
  }

  if (
    missingItems.some((item) =>
      ["Date", "Time", "Guest count"].includes(item),
    )
  ) {
    return {
      href: "#booking-date",
      actionLabel: "Choose date",
      label: "Date and group needed",
      text: "Pick a date, time, and guest count before sending.",
    };
  }

  if (missingItems.includes("Pickup preference")) {
    return {
      href: "#booking-pickup",
      actionLabel: "Add pickup",
      label: "Pickup needed",
      text: "Choose how the operator should plan your pickup or meeting point.",
    };
  }

  return {
    href: "#booking-review",
    actionLabel: "Review details",
    label: "Review request",
    text: "Check the final request summary before sending.",
  };
}

export function getMobileBookingStickyCta({
  submitted,
  loading,
  availabilityBlocked,
  readinessScore,
  missingItems,
  estimatedTotalLabel,
}: {
  submitted: boolean;
  loading: boolean;
  availabilityBlocked: boolean;
  readinessScore: number;
  missingItems: string[];
  estimatedTotalLabel: string;
}): BookingMobileStickyCta {
  if (submitted) {
    return {
      label: "Request sent",
      text: "Open your status page for updates and messages.",
      actionLabel: "View status",
      href: "#booking-review",
      canSubmit: false,
      priceLabel: estimatedTotalLabel,
      tone: "sent",
    };
  }

  if (loading) {
    return {
      label: "Sending request",
      text: "Hold tight while the booking request is saved.",
      actionLabel: "Sending...",
      href: "#booking-review",
      canSubmit: false,
      priceLabel: estimatedTotalLabel,
      tone: "loading",
    };
  }

  if (availabilityBlocked) {
    return {
      label: "Choose another slot",
      text: "This date or time is not ready to send yet.",
      actionLabel: "Review availability",
      href: "#booking-date",
      canSubmit: false,
      priceLabel: estimatedTotalLabel,
      tone: "blocked",
    };
  }

  if (missingItems.length > 0 || readinessScore < 100) {
    const next = getFirstMissingBookingHref(missingItems);

    return {
      ...next,
      canSubmit: false,
      priceLabel: estimatedTotalLabel,
      tone: "missing",
    };
  }

  return {
    label: "Ready to send",
    text: "All basics are ready for the operator to review.",
    actionLabel: "Send request",
    href: "#booking-review",
    canSubmit: true,
    priceLabel: estimatedTotalLabel,
    tone: "ready",
  };
}

export function bookingConversionChecklist({
  hasListing,
  hasAvailability,
  hasAddons,
  hasEstimatedTotal,
}: {
  hasListing: boolean;
  hasAvailability: boolean;
  hasAddons: boolean;
  hasEstimatedTotal: boolean;
}): BookingConversionChecklistItem[] {
  return [
    {
      label: "Experience selected",
      text: "The request is tied to a specific Roatan listing.",
      done: hasListing,
    },
    {
      label: "Availability checked",
      text: "Date, time, and guest count have been checked against limits.",
      done: hasAvailability,
    },
    {
      label: "Add-ons reviewed",
      text: "Optional upgrades have been shown before sending.",
      done: hasAddons,
    },
    {
      label: "Total previewed",
      text: "The guest can see the estimated request value.",
      done: hasEstimatedTotal,
    },
  ];
}

export function getBookingTrustSteps(): BookingTrustStep[] {
  return [
    {
      label: "Send request",
      text: "Share your preferred date, time, pickup, and group details.",
    },
    {
      label: "Local operator confirms",
      text: "The vendor checks capacity and sends next steps.",
    },
    {
      label: "Pay only when ready",
      text: "Deposit or full payment is offered after the request is created.",
    },
    {
      label: "Track everything",
      text: "Use your status page and guest dashboard for updates.",
    },
  ];
}

export function getLuxuryBookingFlowSteps(): LuxuryBookingFlowStep[] {
  return [
    {
      number: "01",
      label: "Trip details",
      text: "Choose the experience, guest count, pickup style, and any special notes.",
    },
    {
      number: "02",
      label: "Date and time",
      text: "Pick an available day and request the time that works for your group.",
    },
    {
      number: "03",
      label: "Guest notes",
      text: "Share cruise timing, hotel pickup, kids, mobility needs, or food preferences.",
    },
    {
      number: "04",
      label: "Review request",
      text: "Check the trip summary, estimated total, and payment expectations before sending.",
    },
    {
      number: "05",
      label: "Send",
      text: "The local operator confirms availability, payment timing, and final pickup details.",
    },
  ];
}

export function getBookingPaymentClarityCards({
  estimatedTotalLabel,
  depositsEnabled,
}: {
  estimatedTotalLabel: string;
  depositsEnabled: boolean;
}): BookingPaymentClarityCard[] {
  return [
    {
      label: "Estimated total",
      value: estimatedTotalLabel,
      text: "Shown before you send the request so the group can plan with confidence.",
    },
    {
      label: "Deposit",
      value: depositsEnabled ? "Available after request" : "Not required now",
      text: depositsEnabled
        ? "Deposit or full payment checkout appears after the request is created."
        : "No card is charged on this screen. Payment timing is shared after review.",
    },
    {
      label: "Confirmation",
      value: "Operator reviewed",
      text: "Nothing is final until the operator confirms availability and next steps.",
    },
  ];
}

export function getBookingRecoveryPrompt({
  fullName,
  email,
  tourDate,
  tourTime,
  guests,
}: {
  fullName: string;
  email: string;
  tourDate: string;
  tourTime: string;
  guests: string;
}): BookingRecoveryPrompt {
  const savedCoreDetails = [fullName, tourDate, guests].filter(hasText).length;
  const hasAnyDetails = [fullName, email, tourDate, tourTime, guests].some(hasText);
  const isComplete =
    hasText(fullName) &&
    hasValidEmail(email) &&
    hasText(tourDate) &&
    hasText(tourTime) &&
    Number(guests) > 0;

  return {
    label: "Finish your request",
    text:
      savedCoreDetails >= 2
        ? "Your name, date, and guest count are saved on this device. Add the missing details when you are ready."
        : "Some booking details are saved on this device. Finish the request when you are ready.",
    shouldShow: hasAnyDetails && !isComplete,
  };
}

export function getBookingConfidenceCommandCenter({
  fullName,
  email,
  tourDate,
  tourTime,
  guests,
  pickupPreference,
  guestMessage,
  estimatedTotalLabel,
  availabilityTone,
  hasListing,
  depositsEnabled,
}: {
  fullName: string;
  email: string;
  tourDate: string;
  tourTime: string;
  guests: string;
  pickupPreference: string;
  guestMessage: string;
  estimatedTotalLabel: string;
  availabilityTone?: string | null;
  hasListing: boolean;
  depositsEnabled: boolean;
}): BookingConfidenceCommandCenter {
  const readiness = getBookingCheckoutReadiness({
    fullName,
    email,
    tourDate,
    tourTime,
    guests,
    pickupPreference,
  });
  const missingItems = [
    ...readiness.missingItems,
    ...(hasListing ? [] : ["Experience"]),
  ];
  const hasEstimate = estimatedTotalLabel !== "Pending";
  const score = Math.max(
    0,
    Math.min(
      100,
      readiness.score +
        (hasListing ? 8 : 0) +
        (hasEstimate ? 6 : 0) +
        (guestMessage.trim() ? 4 : 0) -
        (availabilityTone === "blocked" || availabilityTone === "full" ? 18 : 0),
    ),
  );
  const cruiseAware =
    [pickupPreference, guestMessage].join(" ").toLowerCase().includes("cruise") ||
    [pickupPreference, guestMessage].join(" ").toLowerCase().includes("ship");
  const label =
    score >= 92 && missingItems.length === 0
      ? "Guest-ready request"
      : score >= 67
        ? "Almost ready"
        : "Needs a few details";

  return {
    score,
    label,
    headline:
      label === "Guest-ready request"
        ? "This request has the details operators answer fastest."
        : label === "Almost ready"
          ? "A few details will make this easier to confirm."
          : "Add the trip basics before sending.",
    primaryAction:
      label === "Guest-ready request"
        ? "Send request"
        : label === "Almost ready"
          ? "Review missing details"
          : "Add trip basics",
    primaryText:
      label === "Guest-ready request"
        ? "Date, time, pickup, guest count, and payment expectations are clear."
        : "Complete the highlighted fields so the operator can reply with confidence.",
    guestPromise:
      depositsEnabled
        ? "No surprise checkout: deposit or full payment appears after your request is created."
        : "No card is charged here. Payment timing is shared after operator review.",
    operatorPrompt:
      label === "Guest-ready request"
        ? "Confirm availability, pickup timing, and payment next steps."
        : "Ask for the missing details before confirming.",
    missingItems,
    signals: [
      {
        label: "Pickup clarity",
        text: pickupPreference
          ? pickupPreference
          : "Add hotel, cruise port, airport, or meeting point.",
        tone: pickupPreference ? "good" : "watch",
      },
      {
        label: "Payment clarity",
        text: hasEstimate
          ? `${estimatedTotalLabel} estimate shown before sending.`
          : "Quote or final total is confirmed after review.",
        tone: "good",
      },
      {
        label: cruiseAware ? "Cruise timing" : "Timing fit",
        text: cruiseAware
          ? "Cruise timing is noted so return time can be reviewed."
          : tourDate && tourTime
            ? "Date and time are ready for availability review."
            : "Choose date and time for a stronger request.",
        tone: cruiseAware || (tourDate && tourTime) ? "good" : "watch",
      },
      {
        label: "Operator response",
        text:
          availabilityTone === "blocked" || availabilityTone === "full"
            ? "This slot may not be available. Choose another time."
            : "The operator can confirm, ask a question, or send payment next steps.",
        tone:
          availabilityTone === "blocked" || availabilityTone === "full"
            ? "urgent"
            : "good",
      },
    ],
  };
}

export function getBookingSuccessNextSteps({
  bookingId,
  depositsEnabled,
  hasEmail,
}: {
  bookingId?: string | null;
  depositsEnabled: boolean;
  hasEmail: boolean;
}): BookingSuccessNextStep[] {
  const statusHref = bookingId ? `/book/status/${bookingId}` : "/account";

  return [
    {
      label: "Open booking status",
      text: "Track confirmation, pickup notes, payment, and messages in one place.",
      href: statusHref,
    },
    {
      label: "Watch for operator reply",
      text: "The local operator confirms availability or asks for anything missing.",
      href: "/account",
    },
    {
      label: "Review payment options",
      text: depositsEnabled
        ? "Deposit or full payment checkout appears when the booking is ready."
        : "Payment timing is shared after review; no card was charged here.",
      href: statusHref,
    },
    {
      label: hasEmail ? "Create guest account" : "Add guest email",
      text: "Use the same email to keep bookings, chat, and map plans together.",
      href: "/account?mode=signup",
    },
  ];
}

export function getBookingOpsPriority({
  status,
  depositStatus,
  threadNeedsResponse,
  paymentIssue,
  tourDate,
}: {
  status: string | null | undefined;
  depositStatus: string | null | undefined;
  threadNeedsResponse?: boolean;
  paymentIssue?: boolean | null;
  tourDate?: string | null;
}): BookingOpsPriority {
  if (threadNeedsResponse) {
    return {
      label: "Reply first",
      text: "Guest is waiting for an answer. Open the booking thread before changing anything else.",
      tone: "urgent",
    };
  }

  if (paymentIssue) {
    return {
      label: "Fix payment issue",
      text: "Review the payment note, invoice, or checkout link before confirming next steps.",
      tone: "money",
    };
  }

  if (status === "confirmed" && depositStatus !== "paid") {
    return {
      label: "Payment next",
      text: "Booking is confirmed. Send payment instructions or mark payment status clearly.",
      tone: "money",
    };
  }

  if ((status || "new") === "new") {
    return {
      label: "Review request",
      text: "Check availability, pickup details, and guest count before confirming.",
      tone: "review",
    };
  }

  if (tourDate) {
    return {
      label: "Travel-ready",
      text: "Keep pickup notes and any final instructions attached to the booking.",
      tone: "ready",
    };
  }

  return {
    label: "Ready",
    text: "No urgent booking action is waiting.",
    tone: "ready",
  };
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
