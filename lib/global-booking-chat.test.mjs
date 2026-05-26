import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGlobalBookingChatThread,
  shouldShowGlobalBookingChat,
} from "./global-booking-chat.ts";

test("hides the global chat on pages that already render booking chat", () => {
  assert.equal(shouldShowGlobalBookingChat("/account"), false);
  assert.equal(shouldShowGlobalBookingChat("/admin/bookings"), false);
  assert.equal(shouldShowGlobalBookingChat("/vendor/dashboard"), false);
  assert.equal(shouldShowGlobalBookingChat("/map"), true);
});

test("builds role-aware global booking chat thread links", () => {
  const booking = {
    id: "booking-1",
    full_name: "Keddie Jackson",
    tour_date: "2026-06-30",
    tour_time: "10:30 AM",
    guests: 4,
    status: "confirmed",
    listing_name: "Sunset Cruise",
  };

  assert.equal(
    buildGlobalBookingChatThread(booking, "guest").apiPath,
    "/api/bookings/booking-1/messages",
  );
  assert.equal(
    buildGlobalBookingChatThread(booking, "vendor").apiPath,
    "/api/vendor/bookings/booking-1/messages",
  );
  assert.equal(
    buildGlobalBookingChatThread(booking, "admin").apiPath,
    "/api/admin/bookings/booking-1/messages",
  );
  assert.match(
    buildGlobalBookingChatThread(booking, "admin").title,
    /Keddie Jackson/,
  );
});
