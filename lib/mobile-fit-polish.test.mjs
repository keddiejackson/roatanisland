import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function source(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

test("mobile layout has reusable overflow and chat fit utilities", () => {
  const css = source("app/globals.css");

  assert.match(css, /\.mobile-no-overflow/);
  assert.match(css, /\.mobile-chat-replies/);
  assert.match(css, /\.mobile-chat-reply/);
});

test("booking form constrains mobile width at every shell level", () => {
  const bookingForm = source("app/book/BookingForm.tsx");

  assert.match(bookingForm, /mobile-no-overflow/);
  assert.match(bookingForm, /id="booking-request-form"/);
  assert.match(bookingForm, /className="mobile-no-overflow mt-8 grid/);
  assert.match(bookingForm, /className="mobile-safe-bottom mobile-no-overflow fixed/);
});

test("booking chat composer uses compact mobile replies and input", () => {
  const chatDrawer = source("app/BookingChatDrawer.tsx");

  assert.match(chatDrawer, /mobile-chat-replies/);
  assert.match(chatDrawer, /mobile-chat-reply/);
  assert.match(chatDrawer, /min-h-16/);
  assert.doesNotMatch(chatDrawer, /rounded-full border border-\[#00A8A8\]\/25/);
});

test("global account chip does not cover the mobile booking form", () => {
  const accountButton = source("app/GlobalAccountButton.tsx");

  assert.match(accountButton, /pathname === "\/book"/);
});
