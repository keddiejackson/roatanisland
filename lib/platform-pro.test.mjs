import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getGuestMasterpiecePlan,
  getPlatformProAdminCommand,
  getPublicMasterpieceMoments,
  getVendorProCommand,
} from "./platform-pro.ts";

test("getGuestMasterpiecePlan prioritizes what a signed-in guest needs next", () => {
  const plan = getGuestMasterpiecePlan({
    today: "2026-05-29",
    bookings: [
      {
        id: "booking-1",
        status: "confirmed",
        tour_date: "2026-06-04",
        deposit_status: "paid",
        balance_due_cents: 0,
      },
    ],
    supportTickets: [
      {
        id: "ticket-1",
        status: "waiting_on_guest",
        priority: "urgent",
        intent: "Pickup question",
      },
    ],
    unreadMessageCount: 2,
  });

  assert.equal(plan.headline, "We are watching your Roatan day closely.");
  assert.equal(plan.score, 80);
  assert.equal(plan.nextAction.label, "Reply to support");
  assert.equal(plan.readinessSteps.length, 5);
  assert.equal(plan.readinessSteps.filter((step) => step.complete).length, 4);
});

test("getGuestMasterpiecePlan gives new guests a calm starting path", () => {
  const plan = getGuestMasterpiecePlan({
    bookings: [],
    supportTickets: [],
    unreadMessageCount: 0,
  });

  assert.equal(plan.headline, "Start your Roatan plan with confidence.");
  assert.equal(plan.nextAction.href, "/map");
  assert.equal(plan.score, 20);
});

test("getPlatformProAdminCommand surfaces guest-impacting work first", () => {
  const command = getPlatformProAdminCommand({
    bookings: [
      { id: "b1", status: "new", deposit_status: "not_requested" },
      { id: "b2", status: "confirmed", deposit_status: "unpaid" },
    ],
    listings: [
      {
        id: "l1",
        is_active: true,
        approval_status: "pending",
        image_url: null,
        tour_times: [],
        latitude: null,
        longitude: null,
      },
    ],
    vendors: [{ id: "v1", is_active: true }],
    reviews: [{ id: "r1", is_approved: false }],
    supportTickets: [{ id: "s1", status: "new", priority: "urgent" }],
    conciergeLeads: [{ id: "c1", status: "new", priority: "urgent" }],
  });

  assert.equal(command.headline, "Guests need attention now.");
  assert.equal(command.priorityActions[0].label, "Reply to urgent support");
  assert.equal(command.metrics.urgentSupport, 1);
  assert.equal(command.metrics.unpaidDeposits, 1);
  assert.ok(command.healthScore < 100);
});

test("getVendorProCommand gives operators a quality and response plan", () => {
  const command = getVendorProCommand({
    listings: [
      {
        id: "l1",
        title: "Private island day",
        is_active: true,
        approval_status: "approved",
        image_url: null,
        tour_times: ["9:00 AM"],
        latitude: 16.3,
        longitude: -86.5,
      },
    ],
    bookings: [
      { id: "b1", status: "new", deposit_status: "not_requested" },
      { id: "b2", status: "confirmed", deposit_status: "paid" },
    ],
    documents: [{ id: "d1", status: "pending" }],
  });

  assert.equal(command.headline, "2 operator moves for today.");
  assert.equal(command.focusItems[0].label, "Respond to booking requests");
  assert.equal(command.metrics.missingPhotos, 1);
  assert.ok(command.score < 100);
});

test("getPublicMasterpieceMoments explains the marketplace through a guest lens", () => {
  const moments = getPublicMasterpieceMoments({
    listings: [
      { id: "1", category: "Tours", is_active: true },
      { id: "2", category: "Transport", is_active: true },
      { id: "3", category: "Hotels", is_active: false },
    ],
  });

  assert.equal(moments.heroPromise, "A calmer way to plan a Roatan day.");
  assert.equal(moments.activeListingCount, 2);
  assert.equal(moments.moments.length, 4);
});

test("Platform Pro is wired into the main guest, admin, and vendor surfaces", () => {
  assert.match(readFileSync("app/page.tsx", "utf8"), /GuestMasterpieceSection/);
  assert.match(
    readFileSync("app/account/page.tsx", "utf8"),
    /GuestMasterpiecePanel/,
  );
  assert.match(
    readFileSync("app/admin/page.tsx", "utf8"),
    /PlatformProCommandCenter/,
  );
  assert.match(
    readFileSync("app/vendor/dashboard/page.tsx", "utf8"),
    /VendorProCommandCenter/,
  );
});
