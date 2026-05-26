import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingThreadSummary,
  bookingMessagePreview,
  bookingTimeline,
  normalizeBookingMessage,
  vendorResponseActions,
} from "./booking-communication.ts";

test("normalizes booking messages for safe storage", () => {
  assert.equal(normalizeBookingMessage("  We can pick you up at 8.  "), "We can pick you up at 8.");
  assert.equal(normalizeBookingMessage(""), "");
  assert.equal(normalizeBookingMessage("x".repeat(1500)).length, 1200);
});

test("builds message previews with sender labels", () => {
  assert.equal(
    bookingMessagePreview({
      sender_role: "vendor",
      sender_email: "captain@example.com",
      message: "Meet at the cruise port gate.",
    }),
    "Vendor: Meet at the cruise port gate.",
  );
  assert.equal(
    bookingMessagePreview({
      sender_role: "admin",
      sender_email: null,
      message: "Internal reminder",
      is_internal: true,
    }),
    "Internal admin note: Internal reminder",
  );
});

test("builds a complete booking timeline from booking, events, and messages", () => {
  const timeline = bookingTimeline({
    booking: {
      created_at: "2026-05-20T10:00:00Z",
      status: "confirmed",
      deposit_status: "paid",
    },
    events: [
      {
        event_type: "status_change",
        actor_role: "vendor",
        from_status: "new",
        to_status: "confirmed",
        note: "Confirmed with private pickup.",
        created_at: "2026-05-20T11:00:00Z",
      },
    ],
    messages: [
      {
        sender_role: "guest",
        sender_email: "guest@example.com",
        message: "Thanks!",
        is_internal: false,
        created_at: "2026-05-20T12:00:00Z",
      },
    ],
  });

  assert.deepEqual(
    timeline.map((item) => [item.kind, item.title, item.actorLabel]),
    [
      ["created", "Request received", "Guest"],
      ["status", "Confirmed", "Vendor"],
      ["payment", "Deposit paid", "Payment"],
      ["message", "Guest message", "Guest"],
    ],
  );
});

test("offers vendor response actions for booking requests", () => {
  assert.deepEqual(
    vendorResponseActions.map((action) => [action.value, action.label]),
    [
      ["confirmed", "Confirm"],
      ["suggest_time", "Suggest another time"],
      ["cancelled", "Decline"],
    ],
  );
});

test("shows vendor time suggestions as timeline events", () => {
  const timeline = bookingTimeline({
    booking: {
      created_at: "2026-05-20T10:00:00Z",
      status: "new",
      deposit_status: "not_requested",
    },
    events: [
      {
        event_type: "time_suggestion",
        actor_role: "vendor",
        note: "Could you do 11:30 AM instead?",
        created_at: "2026-05-20T11:00:00Z",
      },
    ],
    messages: [],
  });

  assert.equal(timeline[1].title, "New time suggested");
  assert.equal(timeline[1].tone, "warning");
});

test("summarizes booking threads for guest, vendor, and admin inboxes", () => {
  const messages = [
    {
      sender_role: "guest",
      sender_email: "guest@example.com",
      message: "Can you confirm pickup?",
      is_internal: false,
      created_at: "2026-05-20T10:00:00Z",
    },
    {
      sender_role: "admin",
      sender_email: "admin@example.com",
      message: "Call vendor if no reply by noon.",
      is_internal: true,
      created_at: "2026-05-20T10:30:00Z",
    },
  ];

  assert.deepEqual(bookingThreadSummary(messages, "vendor"), {
    messageCount: 1,
    internalCount: 0,
    lastMessagePreview: "Guest: Can you confirm pickup?",
    lastSenderRole: "guest",
    badgeLabel: "Needs response",
    needsResponse: true,
  });

  assert.deepEqual(bookingThreadSummary(messages, "guest"), {
    messageCount: 1,
    internalCount: 0,
    lastMessagePreview: "Guest: Can you confirm pickup?",
    lastSenderRole: "guest",
    badgeLabel: "Sent",
    needsResponse: false,
  });

  assert.equal(bookingThreadSummary(messages, "admin").internalCount, 1);
});

test("marks guest inboxes when a vendor or admin has replied", () => {
  const summary = bookingThreadSummary(
    [
      {
        sender_role: "vendor",
        sender_email: "vendor@example.com",
        message: "We can pick you up at 9.",
        is_internal: false,
        created_at: "2026-05-20T11:00:00Z",
      },
    ],
    "guest",
  );

  assert.equal(summary.needsResponse, true);
  assert.equal(summary.badgeLabel, "New reply");
});
