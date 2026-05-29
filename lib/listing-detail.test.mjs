import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBookingConfidenceNotes,
  buildGoodToKnow,
  buildListingHighlights,
  buildTripPreparationSections,
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

test("builds luxury booking confidence notes", () => {
  const notes = buildBookingConfidenceNotes({
    priceLabel: "$250",
    autoConfirmBookings: false,
    privateBookingMode: true,
  });

  assert.deepEqual(notes, [
    "Starting price: $250.",
    "Deposit and final payment details are shared before confirmation.",
    "The operator reviews availability before your plans are final.",
    "Private booking mode helps protect the operator's calendar from overlapping requests.",
    "Messages stay connected to the guest trip dashboard after booking.",
  ]);
});

test("builds trip preparation sections for the listing page", () => {
  const sections = buildTripPreparationSections({
    location: "West Bay",
    availabilityNote: "Weather dependent.",
    minimumNoticeHours: 24,
  });

  assert.deepEqual(sections, [
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
        "Pickup planning is based around West Bay.",
        "Please request at least 24 hours ahead.",
        "Weather dependent.",
      ],
    },
  ]);
});
