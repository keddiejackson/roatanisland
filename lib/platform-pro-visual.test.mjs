import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getGuestMasterpiecePlan,
  getPublicMasterpieceMoments,
} from "./platform-pro.ts";

test("guest masterpiece plan includes a calm premium readiness story", () => {
  const plan = getGuestMasterpiecePlan({
    bookings: [
      {
        id: "booking-1",
        status: "confirmed",
        tour_date: "2026-06-12",
        deposit_status: "paid",
      },
    ],
    supportTickets: [],
    unreadMessageCount: 0,
  });

  assert.equal(plan.experiencePromise, "Clear, calm, and ready before you go.");
  assert.equal(plan.conciergeNote.title, "Your trip should feel handled.");
  assert.equal(plan.readinessSteps.length, 5);
});

test("public masterpiece moments include visible guest trust cues", () => {
  const moments = getPublicMasterpieceMoments({
    listings: [
      { id: "1", category: "Tours", is_active: true },
      { id: "2", category: "Transport", is_active: true },
    ],
  });

  assert.equal(moments.trustCues.length, 3);
  assert.equal(moments.trustCues[0].label, "Local context");
});

test("visual polish text is wired into the guest-first surfaces", () => {
  assert.match(
    readFileSync("app/GuestMasterpieceSection.tsx", "utf8"),
    /Your Roatan day should feel understood before you request it/,
  );
  assert.match(
    readFileSync("app/account/GuestMasterpiecePanel.tsx", "utf8"),
    /Clear, calm, and ready before you go/,
  );
  assert.match(
    readFileSync("app/admin/PlatformProCommandCenter.tsx", "utf8"),
    /Guest-facing polish/,
  );
  assert.match(
    readFileSync("app/vendor/VendorProCommandCenter.tsx", "utf8"),
    /What guests notice first/,
  );
});
