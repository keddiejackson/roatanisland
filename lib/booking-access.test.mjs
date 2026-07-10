import assert from "node:assert/strict";
import test from "node:test";
import {
  createBookingAccessToken,
  verifyBookingAccessToken,
  withBookingAccess,
} from "./booking-access.ts";

process.env.BOOKING_ACCESS_SECRET = "test-only-booking-secret";

test("signs and verifies booking access without exposing guest details", () => {
  const subject = { id: "booking-123", email: "Guest@Example.com" };
  const token = createBookingAccessToken(subject);

  assert.match(token, /^v1\.[A-Za-z0-9_-]+$/);
  assert.equal(token.includes("Guest"), false);
  assert.equal(verifyBookingAccessToken(subject, token), true);
  assert.equal(
    verifyBookingAccessToken({ ...subject, email: "other@example.com" }, token),
    false,
  );
});

test("adds booking access to links safely", () => {
  assert.equal(
    withBookingAccess("/book/status/123", "v1.a+b"),
    "/book/status/123?access=v1.a%2Bb",
  );
});

test("never signs booking links with the public Supabase key", () => {
  const previousBookingSecret = process.env.BOOKING_ACCESS_SECRET;
  const previousServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  delete process.env.BOOKING_ACCESS_SECRET;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert.throws(
    () => createBookingAccessToken({ id: "booking-123", email: "guest@example.com" }),
    /Missing BOOKING_ACCESS_SECRET/,
  );

  process.env.BOOKING_ACCESS_SECRET = previousBookingSecret;
  if (previousServiceKey) process.env.SUPABASE_SERVICE_ROLE_KEY = previousServiceKey;
});
