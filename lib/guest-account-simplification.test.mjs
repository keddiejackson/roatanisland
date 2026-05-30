import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/account/page.tsx", "utf8");

test("guest account page is a single premium travel lounge", () => {
  assert.doesNotMatch(source, /type AccountTab/);
  assert.doesNotMatch(source, /const accountTabs/);
  assert.doesNotMatch(source, /role="tab"/);
  assert.doesNotMatch(source, /activeAccountTab/);
  assert.match(source, /aria-label="Private guest travel lounge"/);
  assert.match(source, /Private guest lounge/);
  assert.match(source, /Welcome back/);
  assert.match(source, /Your plans/);
  assert.match(source, /View all trips/);
  assert.match(source, /Open messages/);
  assert.match(source, /View trip/);
  assert.match(source, /Profile and settings/);
  assert.match(source, /Need help\?/);
  assert.doesNotMatch(source, /Booking requests/);
  assert.doesNotMatch(source, /Guest balance tracking/);
  assert.doesNotMatch(source, /Payments, invoices, and receipts/);
  assert.doesNotMatch(source, /Payment and trip tools/);
  assert.doesNotMatch(source, /Request a change/);
  assert.doesNotMatch(source, /Private itinerary/);
  assert.doesNotMatch(source, /Support is one tap away/);
  assert.doesNotMatch(source, /<GuestMasterpiecePanel/);
  assert.doesNotMatch(source, /<GuestTravelCommandCenter/);
  assert.doesNotMatch(source, /Top trip actions/);
  assert.doesNotMatch(source, /Guest access/);
});
