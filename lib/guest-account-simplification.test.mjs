import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/account/page.tsx", "utf8");

test("guest account page uses a simplified luxury lounge", () => {
  assert.match(source, /type AccountTab = "overview" \| "messages" \| "profile"/);
  assert.match(source, /const accountTabs/);
  assert.match(source, /useState<AccountTab>\("overview"\)/);
  assert.match(source, /aria-selected=\{activeAccountTab === tab\.id\}/);
  assert.match(source, /aria-label="Guest account sections"/);
  assert.match(source, /Private guest lounge/);
  assert.match(source, /Your Roatan plans, simplified\./);
  assert.match(source, /activeAccountTab === "overview"/);
  assert.match(source, /activeAccountTab === "messages"/);
  assert.match(source, /activeAccountTab === "profile"/);
  assert.match(source, /Open conversation/);
  assert.match(source, /Open trip details/);
  assert.match(source, /Need help\?/);
  assert.doesNotMatch(source, /<GuestMasterpiecePanel/);
  assert.doesNotMatch(source, /<GuestTravelCommandCenter/);
  assert.doesNotMatch(source, /Top trip actions/);
  assert.doesNotMatch(source, /Guest access/);
});
