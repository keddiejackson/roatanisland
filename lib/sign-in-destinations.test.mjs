import assert from "node:assert/strict";
import test from "node:test";
import {
  getPrimarySignInDestination,
  safeInternalReturnPath,
  signInDestinations,
} from "./sign-in-destinations.ts";

test("provides sign-in destinations for guests, vendors, and admins", () => {
  assert.deepEqual(
    signInDestinations.map((destination) => [
      destination.role,
      destination.href,
      destination.cta,
      destination.secondaryHref || "",
      destination.secondaryLabel || "",
    ]),
    [
      [
        "Guests",
        "/account",
        "Guest Sign In",
        "/account?mode=signup",
        "Create guest account",
      ],
      [
        "Vendors",
        "/vendor/login",
        "Vendor Sign In",
        "/vendor/signup",
        "Create vendor account",
      ],
      ["Admin", "/admin/login", "Admin Sign In", "", ""],
    ],
  );
});

test("finds the primary sign-in destination by role", () => {
  assert.equal(getPrimarySignInDestination("guest").href, "/account");
  assert.equal(getPrimarySignInDestination("vendor").href, "/vendor/login");
  assert.equal(getPrimarySignInDestination("admin").href, "/admin/login");
});

test("keeps post-sign-in redirects on this website", () => {
  assert.equal(
    safeInternalReturnPath("/book/status/booking-1?access=v1.token"),
    "/book/status/booking-1?access=v1.token",
  );
  assert.equal(safeInternalReturnPath("https://example.com/steal"), "/account");
  assert.equal(safeInternalReturnPath("//example.com/steal"), "/account");
  assert.equal(safeInternalReturnPath("javascript:alert(1)"), "/account");
});
