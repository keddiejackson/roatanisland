import assert from "node:assert/strict";
import test from "node:test";
import {
  checkBookingAvailability,
  getAvailabilityPreviewDays,
  getMinimumNoticeDateValue,
  normalizeTourTimes,
  shouldAutoConfirmBooking,
} from "./booking-availability.ts";

const baseListing = {
  tour_times: ["9:00 AM", "1:00 PM"],
  blocked_dates: ["2026-06-15"],
  max_guests: 8,
  minimum_notice_hours: 24,
  booking_cutoff_hours: null,
  private_booking_mode: false,
  available_weekdays: [1, 2, 3, 4, 5, 6, 0],
  season_start_date: null,
  season_end_date: null,
};

test("normalizes vendor tour times without adding defaults", () => {
  assert.deepEqual(normalizeTourTimes([" 9:00 AM ", "", "9:00 AM", "1:00 PM"]), [
    "9:00 AM",
    "1:00 PM",
  ]);
  assert.deepEqual(normalizeTourTimes(null), []);
});

test("blocks booking requests on vendor blocked dates", () => {
  const result = checkBookingAvailability({
    listing: baseListing,
    tourDate: "2026-06-15",
    tourTime: "9:00 AM",
    guests: 2,
    now: new Date("2026-06-01T12:00:00"),
  });

  assert.equal(result.ok, false);
  assert.equal(result.tone, "blocked");
  assert.match(result.text, /date is not available/i);
});

test("requires one of the vendor listed tour times when times exist", () => {
  const result = checkBookingAvailability({
    listing: baseListing,
    tourDate: "2026-06-16",
    tourTime: "5:00 PM",
    guests: 2,
    now: new Date("2026-06-01T12:00:00"),
  });

  assert.equal(result.ok, false);
  assert.equal(result.tone, "blocked");
  assert.deepEqual(result.allowedTourTimes, ["9:00 AM", "1:00 PM"]);
  assert.match(result.text, /available times/i);
});

test("enforces max guests, reserved capacity, and minimum notice", () => {
  assert.match(
    checkBookingAvailability({
      listing: baseListing,
      tourDate: "2026-06-16",
      tourTime: "9:00 AM",
      guests: 9,
      now: new Date("2026-06-01T12:00:00"),
    }).text,
    /up to 8 guests/i,
  );

  assert.match(
    checkBookingAvailability({
      listing: baseListing,
      tourDate: "2026-06-16",
      tourTime: "9:00 AM",
      guests: 4,
      reservedGuests: 6,
      now: new Date("2026-06-01T12:00:00"),
    }).text,
    /2 spots left/i,
  );

  assert.match(
    checkBookingAvailability({
      listing: baseListing,
      tourDate: "2026-06-16",
      tourTime: "9:00 AM",
      guests: 2,
      now: new Date("2026-06-15T18:00:00"),
    }).text,
    /24 hours/i,
  );
});

test("allows custom times when a vendor has not listed fixed times", () => {
  const result = checkBookingAvailability({
    listing: { ...baseListing, tour_times: [] },
    tourDate: "2026-06-16",
    tourTime: "5:00 PM",
    guests: 2,
    now: new Date("2026-06-01T12:00:00"),
  });

  assert.equal(result.ok, true);
  assert.equal(result.tone, "available");
});

test("builds minimum notice date value for form date fields", () => {
  assert.equal(
    getMinimumNoticeDateValue(36, new Date("2026-06-01T12:00:00")),
    "2026-06-03",
  );
});

test("blocks requests outside selected weekdays and seasonal date window", () => {
  const listing = {
    ...baseListing,
    available_weekdays: [1, 3, 5],
    season_start_date: "06-01",
    season_end_date: "08-31",
  };

  assert.match(
    checkBookingAvailability({
      listing,
      tourDate: "2026-06-14",
      tourTime: "9:00 AM",
      guests: 2,
      now: new Date("2026-06-01T12:00:00"),
    }).text,
    /not run on this day/i,
  );

  assert.match(
    checkBookingAvailability({
      listing,
      tourDate: "2026-09-02",
      tourTime: "9:00 AM",
      guests: 2,
      now: new Date("2026-06-01T12:00:00"),
    }).text,
    /outside this listing's season/i,
  );
});

test("private booking mode closes a slot after the first active booking", () => {
  const result = checkBookingAvailability({
    listing: { ...baseListing, private_booking_mode: true },
    tourDate: "2026-06-16",
    tourTime: "9:00 AM",
    guests: 2,
    reservedGuests: 1,
    now: new Date("2026-06-01T12:00:00"),
  });

  assert.equal(result.ok, false);
  assert.match(result.text, /private booking/i);
});

test("booking cutoff hours override minimum notice when set", () => {
  const result = checkBookingAvailability({
    listing: {
      ...baseListing,
      minimum_notice_hours: 24,
      booking_cutoff_hours: 72,
    },
    tourDate: "2026-06-04",
    tourTime: "9:00 AM",
    guests: 2,
    now: new Date("2026-06-02T12:00:00"),
  });

  assert.equal(result.ok, false);
  assert.match(result.text, /72 hours/i);
});

test("auto-confirm requires the setting and passing availability", () => {
  assert.equal(
    shouldAutoConfirmBooking({
      listing: { ...baseListing, auto_confirm_bookings: true },
      availability: checkBookingAvailability({
        listing: { ...baseListing, auto_confirm_bookings: true },
        tourDate: "2026-06-16",
        tourTime: "9:00 AM",
        guests: 2,
        now: new Date("2026-06-01T12:00:00"),
      }),
    }),
    true,
  );

  assert.equal(
    shouldAutoConfirmBooking({
      listing: { ...baseListing, auto_confirm_bookings: false },
      availability: checkBookingAvailability({
        listing: baseListing,
        tourDate: "2026-06-16",
        tourTime: "9:00 AM",
        guests: 2,
        now: new Date("2026-06-01T12:00:00"),
      }),
    }),
    false,
  );
});

test("builds guest-facing availability preview days", () => {
  const days = getAvailabilityPreviewDays({
    listing: {
      ...baseListing,
      blocked_dates: ["2026-06-15", "2026-06-18"],
      available_weekdays: [1, 2, 3, 4, 5],
    },
    startDate: "2026-06-15",
    count: 7,
    now: new Date("2026-06-01T12:00:00"),
  });

  assert.deepEqual(
    days.map((day) => [day.date, day.status]),
    [
      ["2026-06-15", "blocked"],
      ["2026-06-16", "available"],
      ["2026-06-17", "available"],
      ["2026-06-18", "blocked"],
      ["2026-06-19", "available"],
      ["2026-06-20", "blocked"],
      ["2026-06-21", "blocked"],
    ],
  );
});
