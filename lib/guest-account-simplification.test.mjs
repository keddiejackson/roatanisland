import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("app/account/page.tsx", "utf8");

test("guest account page uses a simplified tabbed hub", () => {
  assert.match(source, /type AccountTab = "trips" \| "messages" \| "profile" \| "help"/);
  assert.match(source, /const accountTabs/);
  assert.match(source, /useState<AccountTab>\("trips"\)/);
  assert.match(source, /aria-selected=\{activeAccountTab === tab\.id\}/);
  assert.match(source, /activeAccountTab === "trips"/);
  assert.match(source, /activeAccountTab === "messages"/);
  assert.match(source, /activeAccountTab === "profile"/);
  assert.match(source, /activeAccountTab === "help"/);
  assert.match(source, /Open conversation/);
  assert.doesNotMatch(source, /<GuestMasterpiecePanel/);
});
