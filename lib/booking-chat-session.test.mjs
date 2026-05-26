import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingChatAccountPath,
  bookingChatSignInPath,
  bookingChatStatusLabel,
} from "./booking-chat-session.ts";

test("uses the right signed-in label for each chat role", () => {
  assert.equal(bookingChatStatusLabel("guest"), "Guest signed in");
  assert.equal(bookingChatStatusLabel("vendor"), "Vendor signed in");
  assert.equal(bookingChatStatusLabel("admin"), "Admin signed in");
});

test("uses the right account and sign-in paths for each chat role", () => {
  assert.equal(bookingChatAccountPath("guest"), "/account");
  assert.equal(bookingChatAccountPath("vendor"), "/vendor/dashboard");
  assert.equal(bookingChatAccountPath("admin"), "/admin");
  assert.equal(bookingChatSignInPath("guest"), "/signin");
  assert.equal(bookingChatSignInPath("vendor"), "/vendor/login");
  assert.equal(bookingChatSignInPath("admin"), "/admin/login");
});
