export type ListingHighlight = {
  label: string;
  value: string;
};

export type TripPreparationSection = {
  title: string;
  items: string[];
};

export function getTourTimeLabels(times: string[] | null | undefined) {
  const savedTimes = (times || [])
    .map((time) => time.trim())
    .filter(Boolean);

  return savedTimes.length > 0 ? savedTimes : ["Flexible time by request"];
}

export function buildListingHighlights(input: {
  category?: string | null;
  location?: string | null;
  reviewsCount?: number | null;
  maxGuests?: number | null;
  minimumNoticeHours?: number | null;
  priceLabel: string;
}) {
  const highlights: ListingHighlight[] = [
    { label: "Category", value: input.category || "Experience" },
    { label: "Area", value: input.location || "Roatan" },
    { label: "Starting price", value: input.priceLabel },
  ];

  if (input.reviewsCount !== null && input.reviewsCount !== undefined) {
    highlights.push({ label: "Reviews", value: String(input.reviewsCount) });
  }

  if (input.maxGuests) {
    highlights.push({
      label: "Capacity",
      value: `Up to ${input.maxGuests} guests`,
    });
  }

  if (input.minimumNoticeHours) {
    highlights.push({
      label: "Minimum notice",
      value: `${input.minimumNoticeHours} hours`,
    });
  }

  return highlights.filter((item) => item.value.trim());
}

export function buildGoodToKnow(input: {
  availabilityNote?: string | null;
  maxGuests?: number | null;
  minimumNoticeHours?: number | null;
}) {
  return [
    "Booking requests are reviewed before confirmation.",
    input.availabilityNote?.trim() || "",
    input.maxGuests ? `Best for groups up to ${input.maxGuests} guests.` : "",
    input.minimumNoticeHours
      ? `Please request at least ${input.minimumNoticeHours} hours ahead.`
      : "",
  ].filter(Boolean);
}

export function buildBookingConfidenceNotes(input: {
  priceLabel: string;
  autoConfirmBookings?: boolean | null;
  privateBookingMode?: boolean | null;
}) {
  return [
    `Starting price: ${input.priceLabel}.`,
    "Deposit and final payment details are shared before confirmation.",
    input.autoConfirmBookings
      ? "Eligible open slots may auto-confirm after request."
      : "The operator reviews availability before your plans are final.",
    input.privateBookingMode
      ? "Private booking mode helps protect the operator's calendar from overlapping requests."
      : "",
    "Messages stay connected to the guest trip dashboard after booking.",
  ].filter(Boolean);
}

export function buildTripPreparationSections(input: {
  location?: string | null;
  availabilityNote?: string | null;
  minimumNoticeHours?: number | null;
}): TripPreparationSection[] {
  return [
    {
      title: "What's included",
      items: [
        "Operator details are reviewed before confirmation.",
        "Trip timing is coordinated around the selected date and time.",
        "Guest messages stay connected to the booking request.",
      ],
    },
    {
      title: "What to bring",
      items: [
        "Sun protection, water, and a charged phone.",
        "Any IDs, tickets, or cruise/flight timing details needed for pickup.",
        "Comfortable clothing for the activity and island weather.",
      ],
    },
    {
      title: "Cancellation and pickup notes",
      items: [
        `Pickup planning is based around ${input.location || "Roatan"}.`,
        input.minimumNoticeHours
          ? `Please request at least ${input.minimumNoticeHours} hours ahead.`
          : "Ask the operator about final pickup timing before confirmation.",
        input.availabilityNote?.trim() || "Weather and operator availability may affect final timing.",
      ],
    },
  ];
}
