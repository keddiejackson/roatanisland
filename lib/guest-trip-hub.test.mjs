import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getGuestTripHubHero,
  getGuestTripPrimaryActions,
} from "./guest-command-center.ts";
import { buildTripPacket } from "./trip-packet.ts";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("guest trip hub hero adapts to booking progress", () => {
  assert.deepEqual(
    getGuestTripHubHero({
      bookingCount: 0,
      confirmedCount: 0,
      tripScore: 20,
      nextDate: "Flexible",
      walletLabel: "No deposits due",
    }),
    {
      eyebrow: "Luxury guest trip hub",
      title: "Build your Roatan plans in one calm place.",
      text: "Save stops, complete your traveler profile, and request bookings when the trip shape feels right.",
      actionLabel: "Explore the map",
      actionHref: "/map",
    },
  );

  assert.equal(
    getGuestTripHubHero({
      bookingCount: 2,
      confirmedCount: 1,
      tripScore: 86,
      nextDate: "2026-07-10",
      walletLabel: "1 deposit paid",
    }).title,
    "Your confirmed Roatan plans are ready.",
  );
});

test("guest trip primary actions prioritize useful booking tasks", () => {
  assert.deepEqual(
    getGuestTripPrimaryActions({
      id: "booking-1",
      status: "completed",
      listing_id: "listing-1",
      deposit_status: "paid",
    }).map((action) => action.label),
    [
      "Open chat",
      "Trip packet",
      "Booking status",
      "Invoice",
      "Receipt",
      "Leave review",
    ],
  );
});

test("trip packet includes day-of sections and readiness copy", () => {
  const packet = buildTripPacket({
    booking: {
      id: "booking-1",
      full_name: "Keddie",
      tour_date: "2026-07-10",
      tour_time: "10:30 AM",
      guests: 4,
      status: "confirmed",
      deposit_status: "paid",
      deposit_amount_cents: 10000,
      booking_value_cents: 40000,
      amount_paid_cents: 10000,
      balance_due_cents: 30000,
      guest_message: "Pickup preference: West Bay",
      vendor_note: "Meet in lobby.",
    },
    listingTitle: "Private Island Day",
    statusUrl: "/book/status/booking-1",
    chatUrl: "/account",
  });

  assert.equal(packet.readiness.label, "Confirmed plan");
  assert.deepEqual(
    packet.dayOfSections.map((section) => section.label),
    ["Pickup check", "Payment check", "Guest comfort"],
  );
});

test("guest trip hub pages include premium dashboard markers", () => {
  const account = readProjectFile("app/account/page.tsx");
  const commandCenter = readProjectFile("app/account/GuestTravelCommandCenter.tsx");
  const tripPacket = readProjectFile("app/book/trip/[id]/page.tsx");

  assert.match(account, /Luxury guest trip hub/);
  assert.match(account, /Top trip actions/);
  assert.match(commandCenter, /Trip timeline/);
  assert.match(commandCenter, /Premium trip board/);
  assert.match(tripPacket, /Day-of command sheet/);
  assert.match(tripPacket, /Travel-ready packet/);
});
