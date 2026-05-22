import assert from "node:assert/strict";
import test from "node:test";
import {
  getPrimarySignInDestination,
  signInDestinations,
} from "./sign-in-destinations.ts";

test("provides sign-in destinations for guests, vendors, and admins", () => {
  assert.deepEqual(
    signInDestinations.map((destination) => [
      destination.role,
      destination.href,
      destination.cta,
    ]),
    [
      ["Guests", "/account", "Guest Sign In"],
      ["Vendors", "/vendor/login", "Vendor Sign In"],
      ["Admin", "/admin/login", "Admin Sign In"],
    ],
  );
});

test("finds the primary sign-in destination by role", () => {
  assert.equal(getPrimarySignInDestination("guest").href, "/account");
  assert.equal(getPrimarySignInDestination("vendor").href, "/vendor/login");
  assert.equal(getPrimarySignInDestination("admin").href, "/admin/login");
});
