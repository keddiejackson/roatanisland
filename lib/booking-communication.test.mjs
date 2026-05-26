import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingChatQuickReplies,
  bookingDrawerStats,
  countUnreadBookingMessages,
  groupBookingMessagesByDay,
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
    unreadCount: 1,
    lastMessagePreview: "Guest: Can you confirm pickup?",
    lastSenderRole: "guest",
    badgeLabel: "1 unread",
    needsResponse: true,
  });

  assert.deepEqual(bookingThreadSummary(messages, "guest"), {
    messageCount: 1,
    internalCount: 0,
    unreadCount: 0,
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
  assert.equal(summary.badgeLabel, "1 unread");
});

test("counts unread messages after the viewer last opened a thread", () => {
  const messages = [
    {
      sender_role: "guest",
      message: "I am ready",
      created_at: "2026-05-20T10:00:00Z",
    },
    {
      sender_role: "vendor",
      message: "Meet at 10:30",
      created_at: "2026-05-20T11:00:00Z",
    },
    {
      sender_role: "admin",
      message: "Internal note",
      is_internal: true,
      created_at: "2026-05-20T12:00:00Z",
    },
  ];

  assert.equal(
    countUnreadBookingMessages(messages, "guest", "2026-05-20T10:30:00Z"),
    1,
  );
  assert.equal(
    countUnreadBookingMessages(messages, "vendor", "2026-05-20T10:30:00Z"),
    0,
  );
  assert.equal(bookingThreadSummary(messages, "guest", null).unreadCount, 1);
});

test("groups booking messages by calendar day for chat dividers", () => {
  const groups = groupBookingMessagesByDay(
    [
      {
        sender_role: "guest",
        message: "Yesterday message",
        created_at: "2026-05-25T10:00:00Z",
      },
      {
        sender_role: "vendor",
        message: "Today message",
        created_at: "2026-05-26T10:00:00Z",
      },
    ],
    new Date("2026-05-26T18:00:00Z"),
  );

  assert.deepEqual(
    groups.map((group) => [group.label, group.messages.length]),
    [
      ["Yesterday", 1],
      ["Today", 1],
    ],
  );
});

test("provides role-specific quick replies for the chat drawer", () => {
  assert.deepEqual(bookingChatQuickReplies("guest").slice(0, 3), [
    "Yes, that works",
    "Can you suggest another time?",
    "Where should we meet?",
  ]);
  assert.ok(
    bookingChatQuickReplies("vendor").includes("Confirmed with pickup details"),
  );
  assert.ok(bookingChatQuickReplies("admin").includes("I will follow up now"));
});

test("summarizes drawer threads for floating button counts", () => {
  assert.deepEqual(
    bookingDrawerStats([
      { messageCount: 2, internalCount: 0, unreadCount: 2, lastMessagePreview: "", lastSenderRole: "guest", badgeLabel: "Needs response", needsResponse: true },
      { messageCount: 1, internalCount: 1, unreadCount: 0, lastMessagePreview: "", lastSenderRole: "vendor", badgeLabel: "Updated", needsResponse: false },
    ]),
    {
      threadCount: 2,
      needsResponseCount: 1,
      messageCount: 3,
      unreadCount: 2,
    },
  );
});

test("keeps drawer thread counts when some bookings have no message summary", () => {
  assert.deepEqual(bookingDrawerStats([], 3), {
    threadCount: 3,
    needsResponseCount: 0,
    messageCount: 0,
    unreadCount: 0,
  });
});
