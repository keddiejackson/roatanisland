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
  assert.match(source, /Your Roatan trip, beautifully handled\./);
  assert.match(source, /Next step/);
  assert.match(source, /Your trips/);
  assert.match(source, /Open messages/);
  assert.match(source, /Edit profile/);
  assert.match(source, /Open trip details/);
  assert.match(source, /Need help\?/);
  assert.doesNotMatch(source, /<GuestMasterpiecePanel/);
  assert.doesNotMatch(source, /<GuestTravelCommandCenter/);
  assert.doesNotMatch(source, /Top trip actions/);
  assert.doesNotMatch(source, /Guest access/);
});
