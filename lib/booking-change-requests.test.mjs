import assert from "node:assert/strict";
import test from "node:test";
import {
  applyApprovedChangeRequest,
  buildChangeRequestMessage,
  getBookingChangeRequestSummary,
  normalizeChangeRequestStatus,
} from "./booking-change-requests.ts";

const requests = [
  {
    id: "cr1",
    booking_id: "b1",
    requested_by_role: "guest",
    requested_by_email: "guest@example.com",
    status: "pending",
    requested_tour_date: "2026-07-04",
    requested_tour_time: "2:00 PM",
    requested_guests: 4,
    requested_pickup_note: "West Bay dock",
    reason: "Flight arrives later.",
    response_note: null,
    resolved_by_role: null,
    resolved_by_email: null,
    resolved_at: null,
    created_at: "2026-06-01T10:00:00Z",
  },
  {
    id: "cr2",
    booking_id: "b1",
    requested_by_role: "vendor",
    requested_by_email: "vendor@example.com",
    status: "approved",
    requested_tour_date: "2026-07-03",
    requested_tour_time: "10:00 AM",
    requested_guests: null,
    requested_pickup_note: null,
    reason: "Better weather window.",
    response_note: "Confirmed by vendor.",
    resolved_by_role: "admin",
    resolved_by_email: "admin@example.com",
    resolved_at: "2026-06-02T10:00:00Z",
    created_at: "2026-05-31T10:00:00Z",
  },
];

test("normalizes unknown change request status to pending", () => {
  assert.equal(normalizeChangeRequestStatus("approved"), "approved");
  assert.equal(normalizeChangeRequestStatus("something_else"), "pending");
  assert.equal(normalizeChangeRequestStatus(null), "pending");
});

test("summarizes booking change requests for action badges", () => {
  assert.deepEqual(getBookingChangeRequestSummary(requests), {
    totalCount: 2,
    pendingCount: 1,
    approvedCount: 1,
    declinedCount: 0,
    counteredCount: 0,
    cancelledCount: 0,
    needsAction: true,
    latestStatus: "pending",
    latestLabel: "Change requested",
  });
});

test("applies approved change request values without erasing unchanged fields", () => {
  assert.deepEqual(
    applyApprovedChangeRequest(
      {
        tour_date: "2026-07-01",
        tour_time: "9:00 AM",
        guests: 2,
        vendor_note: "Original pickup",
      },
      requests[0],
    ),
    {
      tour_date: "2026-07-04",
      tour_time: "2:00 PM",
      guests: 4,
      vendor_note: "Original pickup\nChange request pickup: West Bay dock",
    },
  );
});

test("builds conversation messages for booking change actions", () => {
  assert.equal(
    buildChangeRequestMessage({
      request: requests[0],
      action: "requested",
      actorRole: "guest",
    }),
    "Guest requested a booking change: 2026-07-04 at 2:00 PM for 4 guests. Pickup/details: West Bay dock. Reason: Flight arrives later.",
  );

  assert.equal(
    buildChangeRequestMessage({
      request: requests[0],
      action: "approved",
      actorRole: "vendor",
      responseNote: "We can make that work.",
    }),
    "Vendor approved this booking change. New request: 2026-07-04 at 2:00 PM for 4 guests. Note: We can make that work.",
  );
});
