import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildSupportTicketInsert,
  buildSupportTicketUpdate,
  getGuestSupportTicketSummary,
  getSupportTicketAdminDigest,
  supportTicketPriorities,
  supportTicketStatuses,
} from "./support-tickets.ts";

test("support ticket helpers expose stable status and priority options", () => {
  assert.deepEqual(supportTicketStatuses, [
    "new",
    "in_progress",
    "waiting_on_guest",
    "resolved",
  ]);
  assert.deepEqual(supportTicketPriorities, ["urgent", "normal", "low"]);
});

test("buildSupportTicketInsert stores support form details for admin follow-up", () => {
  assert.deepEqual(
    buildSupportTicketInsert({
      name: "Keddie",
      email: "Keddie@Example.com",
      phone: "555-1111",
      interest: "Booking issue",
      message:
        "Support type: Booking issue\nBooking reference: ABC123\n\nNeed pickup help.",
      sourcePath: "/support",
    }),
    {
      name: "Keddie",
      email: "keddie@example.com",
      phone: "555-1111",
      intent: "Booking issue",
      booking_reference: "ABC123",
      message:
        "Support type: Booking issue\nBooking reference: ABC123\n\nNeed pickup help.",
      status: "new",
      priority: "normal",
      source_path: "/support",
    },
  );
});

test("buildSupportTicketInsert marks urgent requests as urgent", () => {
  const insert = buildSupportTicketInsert({
    name: "Guest",
    email: "guest@example.com",
    interest: "Urgent help",
    message: "Support type: Urgent help\nBooking reference: Not provided",
  });

  assert.equal(insert.priority, "urgent");
  assert.equal(insert.booking_reference, null);
});

test("buildSupportTicketUpdate normalizes editable admin fields", () => {
  const update = buildSupportTicketUpdate({
    status: "waiting_on_guest",
    priority: "urgent",
    admin_notes: "Need passport name.",
  });

  assert.equal(update.status, "waiting_on_guest");
  assert.equal(update.priority, "urgent");
  assert.equal(update.admin_notes, "Need passport name.");
  assert.match(update.updated_at, /^\d{4}-\d{2}-\d{2}T/);

  assert.deepEqual(
    {
      status: buildSupportTicketUpdate({ status: "bad" }).status,
      priority: buildSupportTicketUpdate({ priority: "bad" }).priority,
    },
    { status: "new", priority: "normal" },
  );
});

test("getSupportTicketAdminDigest highlights urgent open work first", () => {
  const digest = getSupportTicketAdminDigest({
    tickets: [
      {
        id: "resolved",
        status: "resolved",
        priority: "low",
        created_at: "2026-05-01T12:00:00Z",
      },
      {
        id: "waiting",
        status: "waiting_on_guest",
        priority: "normal",
        created_at: "2026-05-02T12:00:00Z",
      },
      {
        id: "urgent",
        status: "new",
        priority: "urgent",
        created_at: "2026-05-03T12:00:00Z",
      },
    ],
  });

  assert.equal(digest.headline, "2 open support tickets");
  assert.equal(digest.urgentCount, 1);
  assert.equal(digest.waitingOnGuestCount, 1);
  assert.equal(digest.resolvedCount, 1);
  assert.equal(digest.nextTicket?.id, "urgent");
});

test("getGuestSupportTicketSummary summarizes a guest's ticket history", () => {
  const summary = getGuestSupportTicketSummary({
    tickets: [
      {
        id: "old",
        status: "resolved",
        priority: "low",
        created_at: "2026-05-01T12:00:00Z",
      },
      {
        id: "newer",
        status: "in_progress",
        priority: "normal",
        created_at: "2026-05-04T12:00:00Z",
      },
    ],
  });

  assert.equal(summary.openCount, 1);
  assert.equal(summary.resolvedCount, 1);
  assert.equal(summary.latestTicket?.id, "newer");
  assert.equal(summary.label, "1 open request");
});

test("support ticket pages and API are wired to the saved ticket system", () => {
  assert.match(
    readFileSync("app/api/contact/route.ts", "utf8"),
    /buildSupportTicketInsert/,
  );
  assert.match(
    readFileSync("app/admin/support/page.tsx", "utf8"),
    /Support Ticket System/,
  );
  assert.match(readFileSync("app/account/page.tsx", "utf8"), /Support requests/);
  assert.match(
    readFileSync("app/admin/AdminNav.tsx", "utf8"),
    /\/admin\/support/,
  );
  assert.match(
    readFileSync("app/api/admin/export/route.ts", "utf8"),
    /support_tickets/,
  );
  assert.match(
    readFileSync("supabase/support-tickets.sql", "utf8"),
    /create table if not exists public\.support_tickets/,
  );
});
