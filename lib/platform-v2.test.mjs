import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSupportRequestPayload,
  getPlatformV2OperatingSignals,
  getSupportCenterIntents,
  getTrustSafetyChecklist,
} from "./platform-v2.ts";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("support center intents cover urgent, booking, cancellation, safety, and vendor help", () => {
  assert.deepEqual(
    getSupportCenterIntents().map((intent) => intent.id),
    ["urgent-help", "booking-issue", "cancel-refund", "safety-weather", "vendor-help"],
  );
});

test("support requests create a clear contact payload", () => {
  assert.deepEqual(
    buildSupportRequestPayload({
      name: "Keddie",
      email: "keddie@example.com",
      phone: "555-1111",
      intent: "booking-issue",
      bookingReference: "ABC123",
      message: "Need pickup help.",
    }),
    {
      name: "Keddie",
      email: "keddie@example.com",
      phone: "555-1111",
      interest: "Booking issue",
      leadType: "support_request",
      sourcePath: "/support",
      message:
        "Support type: Booking issue\nBooking reference: ABC123\n\nNeed pickup help.",
    },
  );
});

test("trust and safety checklist explains operational reliability", () => {
  assert.deepEqual(
    getTrustSafetyChecklist().map((item) => item.title),
    [
      "Verified operator details",
      "Cruise and airport timing",
      "Weather-aware planning",
      "Secure trip messages",
      "Clear payment expectations",
    ],
  );
});

test("platform v2 operating signals combine support, quality, analytics, and growth", () => {
  const signals = getPlatformV2OperatingSignals({
    listings: [
      {
        id: "l1",
        is_active: true,
        image_url: null,
        latitude: null,
        longitude: null,
        reviews_count: 0,
        tour_times: [],
      },
      {
        id: "l2",
        is_active: true,
        image_url: "photo.jpg",
        latitude: 16.3,
        longitude: -86.5,
        reviews_count: 4,
        tour_times: ["9:00 AM"],
      },
    ],
    bookings: [
      { id: "b1", status: "new", deposit_status: "not_requested" },
      { id: "b2", status: "confirmed", deposit_status: "paid" },
    ],
    vendors: [
      { id: "v1", is_active: true },
      { id: "v2", is_active: false },
    ],
    reviews: [{ id: "r1", is_approved: false }],
    conciergeLeads: [
      { id: "c1", status: "new", priority: "high" },
      { id: "c2", status: "quoted", priority: "normal" },
    ],
  });

  assert.equal(signals.platformReadinessScore, 56);
  assert.equal(signals.notificationDigest.headline, "4 high-priority items");
  assert.deepEqual(
    signals.qualityQueue.map((item) => [item.label, item.value]),
    [
      ["Missing photos", 1],
      ["Missing map pins", 1],
      ["Missing tour times", 1],
      ["Pending reviews", 1],
    ],
  );
  assert.equal(signals.growthOpportunities[0].label, "Support center");
});

test("platform v2 pages and navigation are wired into the app", () => {
  const supportPage = readProjectFile("app/support/page.tsx");
  const supportForm = readProjectFile("app/support/SupportRequestForm.tsx");
  const adminPage = readProjectFile("app/admin/page.tsx");
  const footer = readProjectFile("app/SiteFooter.tsx");
  const sitemap = readProjectFile("app/sitemap.ts");

  assert.match(supportPage, /Support Center/);
  assert.match(supportPage, /Travel safety and reliability/);
  assert.match(supportForm, /support_request/);
  assert.match(adminPage, /Platform V2 operations/);
  assert.match(adminPage, /Quality control queue/);
  assert.match(footer, /\/support/);
  assert.match(sitemap, /\/support/);
});
