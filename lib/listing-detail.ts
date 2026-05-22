export type ListingHighlight = {
  label: string;
  value: string;
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
