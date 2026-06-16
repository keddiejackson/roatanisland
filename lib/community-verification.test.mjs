import assert from "node:assert/strict";
import test from "node:test";
import {
  canReplyToCommunityThread,
  communityVerificationBadge,
  normalizeCommunityVerificationRequestStatus,
  normalizeCommunityVerificationType,
  normalizeVerificationSocialLinks,
  verificationStatusLabel,
} from "./community-verification.ts";

test("community verification badges use the required labels and colors", () => {
  assert.deepEqual(communityVerificationBadge("admin"), {
    label: "Admin",
    className: "bg-red-100 text-red-700 ring-red-200",
  });
  assert.deepEqual(communityVerificationBadge("vendor"), {
    label: "Vendor",
    className: "bg-blue-100 text-blue-700 ring-blue-200",
  });
  assert.deepEqual(communityVerificationBadge("local"), {
    label: "Local",
    className: "bg-green-100 text-green-700 ring-green-200",
  });
  assert.deepEqual(communityVerificationBadge("traveler"), {
    label: "Traveler",
    className: "bg-yellow-100 text-yellow-800 ring-yellow-200",
  });
  assert.deepEqual(communityVerificationBadge("unverified"), {
    label: "Unverified",
    className: "bg-orange-100 text-orange-700 ring-orange-200",
  });
});

test("normalizes verification types and statuses safely", () => {
  assert.equal(normalizeCommunityVerificationType("vendor"), "vendor");
  assert.equal(normalizeCommunityVerificationType("operator"), "vendor");
  assert.equal(normalizeCommunityVerificationType("guide"), "local");
  assert.equal(normalizeCommunityVerificationType("anything"), "unverified");
  assert.equal(normalizeCommunityVerificationRequestStatus("needs_info"), "needs_info");
  assert.equal(normalizeCommunityVerificationRequestStatus("waiting"), "pending");
  assert.equal(verificationStatusLabel("needs_info"), "Needs info");
});

test("cleans social media links for verification requests", () => {
  assert.deepEqual(
    normalizeVerificationSocialLinks(
      " instagram.com/roatan-guide \n https://facebook.com/roatan-guide \n not a link \n https://facebook.com/roatan-guide ",
    ),
    [
      "https://instagram.com/roatan-guide",
      "https://facebook.com/roatan-guide",
    ],
  );
});

test("closed community threads cannot receive replies", () => {
  assert.equal(
    canReplyToCommunityThread({ status: "active", isLocked: false }),
    true,
  );
  assert.equal(
    canReplyToCommunityThread({ status: "active", isLocked: true }),
    false,
  );
  assert.equal(
    canReplyToCommunityThread({ status: "hidden", isLocked: false }),
    false,
  );
});
