import assert from "node:assert/strict";
import test from "node:test";
import {
  availabilitySummary,
  groupBookingsByDate,
  toggleDateLine,
} from "./availability-calendar.ts";

test("summarizes availability from blocked dates and reserved guests", () => {
  assert.equal(
    availabilitySummary({
      date: "2026-06-15",
      time: "9:00 AM",
      requestedGuests: 2,
      maxGuests: 8,
      reservedGuests: 0,
      blockedDates: ["2026-06-15"],
    }).tone,
    "blocked",
  );

  assert.deepEqual(
    availabilitySummary({
      date: "2026-06-16",
      time: "9:00 AM",
      requestedGuests: 2,
      maxGuests: 8,
      reservedGuests: 5,
      blockedDates: [],
    }),
    {
      label: "Limited spots",
      text: "3 spots left for this time.",
      tone: "limited",
      remainingGuests: 3,
    },
  );

  assert.equal(
    availabilitySummary({
      date: "2026-06-16",
      time: "9:00 AM",
      requestedGuests: 4,
      maxGuests: 8,
      reservedGuests: 6,
      blockedDates: [],
    }).tone,
    "full",
  );
});

test("toggles blocked dates in newline text", () => {
  assert.equal(toggleDateLine("2026-06-15\n2026-06-16", "2026-06-15"), "2026-06-16");
  assert.equal(toggleDateLine("2026-06-15", "2026-06-16"), "2026-06-15\n2026-06-16");
});

test("groups calendar bookings by date with guest totals", () => {
  const groups = groupBookingsByDate([
    { id: "a", tour_date: "2026-06-16", tour_time: "2:00 PM", guests: 3 },
    { id: "b", tour_date: "2026-06-15", tour_time: "9:00 AM", guests: 2 },
    { id: "c", tour_date: "2026-06-15", tour_time: "1:00 PM", guests: 4 },
  ]);

  assert.deepEqual(
    groups.map((group) => [group.date, group.totalGuests, group.bookings.map((booking) => booking.id)]),
    [
      ["2026-06-15", 6, ["b", "c"]],
      ["2026-06-16", 3, ["a"]],
    ],
  );
});
