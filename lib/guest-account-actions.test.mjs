import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGuestPasswordResetRedirect,
  getGuestAuthSubmitLabel,
  getGuestSignOutLabel,
} from "./guest-account-actions.ts";

test("shows the guest sign out action label", () => {
  assert.equal(getGuestSignOutLabel(false), "Sign out");
  assert.equal(getGuestSignOutLabel(true), "Signing out...");
});

test("shows guest auth submit labels by mode and loading state", () => {
  assert.equal(getGuestAuthSubmitLabel("signin", false), "Sign in");
  assert.equal(getGuestAuthSubmitLabel("signin", true), "Signing in...");
  assert.equal(getGuestAuthSubmitLabel("signup", false), "Create guest account");
  assert.equal(getGuestAuthSubmitLabel("signup", true), "Creating...");
  assert.equal(getGuestAuthSubmitLabel("reset", false), "Send reset email");
  assert.equal(getGuestAuthSubmitLabel("reset", true), "Sending...");
  assert.equal(getGuestAuthSubmitLabel("updatePassword", false), "Save new password");
  assert.equal(getGuestAuthSubmitLabel("updatePassword", true), "Saving...");
});

test("builds the guest password reset redirect URL", () => {
  assert.equal(
    buildGuestPasswordResetRedirect("https://www.roatanisland.life"),
    "https://www.roatanisland.life/account?mode=reset",
  );
  assert.equal(
    buildGuestPasswordResetRedirect("https://www.roatanisland.life/"),
    "https://www.roatanisland.life/account?mode=reset",
  );
});
