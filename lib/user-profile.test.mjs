import assert from "node:assert/strict";
import test from "node:test";
import {
  displayNameFromProfile,
  profileInitials,
} from "./user-profile.ts";

test("builds friendly profile initials from name or email", () => {
  assert.equal(profileInitials("Keddie Jackson", "keddie@example.com"), "KJ");
  assert.equal(profileInitials("", "keddie@example.com"), "K");
  assert.equal(profileInitials("", ""), "RI");
});

test("uses profile display name before falling back to email", () => {
  assert.equal(
    displayNameFromProfile({
      display_name: "Keddie",
      email: "keddie@example.com",
    }),
    "Keddie",
  );
  assert.equal(
    displayNameFromProfile({
      display_name: "",
      email: "keddie@example.com",
    }),
    "keddie",
  );
});
