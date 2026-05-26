import assert from "node:assert/strict";
import test from "node:test";
import {
  getIdleTimeoutRedirectPath,
  hasIdleSessionExpired,
  idleTimeoutMs,
} from "./session-timeout.ts";

test("expires signed-in sessions after thirty inactive minutes", () => {
  assert.equal(idleTimeoutMs, 30 * 60 * 1000);
  assert.equal(hasIdleSessionExpired(Date.now() - idleTimeoutMs - 1), true);
  assert.equal(hasIdleSessionExpired(Date.now() - 60 * 1000), false);
});

test("sends timed out users back to the right sign-in page", () => {
  assert.equal(getIdleTimeoutRedirectPath("/admin/bookings"), "/admin/login?timeout=1");
  assert.equal(getIdleTimeoutRedirectPath("/vendor/dashboard"), "/vendor/login?timeout=1");
  assert.equal(getIdleTimeoutRedirectPath("/map"), "/signin?timeout=1");
});
