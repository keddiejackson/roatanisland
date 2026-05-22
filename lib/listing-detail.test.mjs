import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGoodToKnow,
  buildListingHighlights,
  getTourTimeLabels,
} from "./listing-detail.ts";

test("uses saved tour times and falls back to an honest flexible-time label", () => {
  assert.deepEqual(getTourTimeLabels([" 9:00 AM ", "", "2:30 PM"]), [
    "9:00 AM",
    "2:30 PM",
  ]);

  assert.deepEqual(getTourTimeLabels(null), ["Flexible time by request"]);
});

test("builds listing highlights without empty rows", () => {
  const highlights = buildListingHighlights({
    category: "Private Charters",
    location: "West Bay",
    reviewsCount: 12,
    maxGuests: 8,
    minimumNoticeHours: 24,
    priceLabel: "$250",
  });

  assert.deepEqual(highlights, [
    { label: "Category", value: "Private Charters" },
    { label: "Area", value: "West Bay" },
    { label: "Starting price", value: "$250" },
    { label: "Reviews", value: "12" },
    { label: "Capacity", value: "Up to 8 guests" },
    { label: "Minimum notice", value: "24 hours" },
  ]);
});

test("builds good-to-know notes from booking and availability details", () => {
  const notes = buildGoodToKnow({
    availabilityNote: "Subject to weather.",
    maxGuests: 10,
    minimumNoticeHours: 12,
  });

  assert.deepEqual(notes, [
    "Booking requests are reviewed before confirmation.",
    "Subject to weather.",
    "Best for groups up to 10 guests.",
    "Please request at least 12 hours ahead.",
  ]);
});
