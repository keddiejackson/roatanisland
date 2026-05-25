import assert from "node:assert/strict";
import test from "node:test";
import { getGuestSignOutLabel } from "./guest-account-actions.ts";

test("shows the guest sign out action label", () => {
  assert.equal(getGuestSignOutLabel(false), "Sign out");
  assert.equal(getGuestSignOutLabel(true), "Signing out...");
});
