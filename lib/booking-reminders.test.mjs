import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReminderEmail,
  getBookingReminderCandidates,
  getDefaultReminderSettings,
} from "./booking-reminders.ts";
import { buildTripPacket } from "./trip-packet.ts";

const now = new Date("2026-06-01T12:00:00Z");

const baseBooking = {
  id: "booking-alpha",
  full_name: "A Guest",
  email: "guest@example.com",
  tour_date: "2026-06-02",
  tour_time: "10:30 AM",
  status: "confirmed",
  created_at: "2026-05-30T12:00:00Z",
  listing_id: "listing-alpha",
  listing_title: "Private Charter",
  vendor_email: "vendor@example.com",
  vendor_name: "Sea Crew",
  deposit_status: "paid",
  deposit_amount_cents: 25000,
  booking_value_cents: 120000,
  amount_paid_cents: 25000,
  balance_due_cents: 95000,
  balance_due_date: "2026-06-02",
  payment_due_date: null,
  payment_link_url: "https://www.roatanisland.life/book/status/booking-alpha",
  invoice_number: "INV-ALPHA",
  receipt_number: "RCT-ALPHA",
  payout_paid_at: null,
};

test("finds due guest and vendor reminders without duplicating sent items", () => {
  const candidates = getBookingReminderCandidates({
    bookings: [
      baseBooking,
      {
        ...baseBooking,
        id: "booking-new",
        status: "new",
        tour_date: "2026-06-20",
        balance_due_date: null,
        balance_due_cents: 0,
      },
      {
        ...baseBooking,
        id: "booking-overdue",
        tour_date: "2026-06-10",
        balance_due_date: "2026-05-29",
      },
      {
        ...baseBooking,
        id: "booking-completed",
        status: "completed",
        tour_date: "2026-05-30",
        balance_due_cents: 0,
      },
      {
        ...baseBooking,
        id: "booking-payout",
        payout_paid_at: "2026-06-01T08:00:00Z",
      },
    ],
    messages: [
      {
        booking_id: "booking-alpha",
        sender_role: "guest",
        sender_email: "guest@example.com",
        message: "Can you confirm pickup?",
        is_internal: false,
        created_at: "2026-06-01T10:00:00Z",
      },
    ],
    logs: [
      {
        booking_id: "booking-alpha",
        reminder_type: "guest_trip_tomorrow",
        recipient_role: "guest",
        recipient_email: "guest@example.com",
        trigger_key: "2026-06-02",
        status: "sent",
        sent_at: "2026-06-01T09:00:00Z",
      },
    ],
    settings: [
      {
        reminder_type: "guest_review_request",
        enabled: false,
        subject_template: null,
        body_template: null,
      },
    ],
    now,
    siteUrl: "https://www.roatanisland.life",
  });

  assert.deepEqual(
    candidates.map((candidate) => [
      candidate.bookingId,
      candidate.reminderType,
      candidate.recipientRole,
      candidate.amountLabel,
    ]),
    [
      ["booking-overdue", "guest_payment_overdue", "guest", "$950"],
      ["booking-alpha", "guest_payment_due_soon", "guest", "$950"],
      ["booking-alpha", "vendor_guest_message", "vendor", "$0"],
      ["booking-alpha", "vendor_trip_tomorrow", "vendor", "$0"],
      ["booking-new", "vendor_booking_needs_response", "vendor", "$0"],
      ["booking-payout", "guest_payment_due_soon", "guest", "$950"],
      ["booking-payout", "guest_trip_tomorrow", "guest", "$0"],
      ["booking-payout", "vendor_trip_tomorrow", "vendor", "$0"],
      ["booking-payout", "vendor_payout_paid", "vendor", "$0"],
    ],
  );
});

test("builds editable reminder email copy from defaults and overrides", () => {
  const [settings] = getDefaultReminderSettings().filter(
    (setting) => setting.reminder_type === "guest_payment_due_soon",
  );
  const [candidate] = getBookingReminderCandidates({
    bookings: [baseBooking],
    messages: [],
    logs: [],
    settings: [
      {
        ...settings,
        subject_template: "Payment due for {listingTitle}",
        body_template: "Hi {guestName}, your {amountDue} balance is due {dueLabel}.",
      },
    ],
    now,
    siteUrl: "https://www.roatanisland.life",
  });

  const email = buildReminderEmail(candidate);

  assert.equal(email.subject, "Payment due for Private Charter");
  assert.match(email.html, /Hi A Guest/);
  assert.match(email.html, /\$950 balance/);
  assert.match(email.text, /Trip packet:/);
  assert.match(email.text, /booking-alpha/);
});

test("builds a guest trip packet with status, payments, chat, and packing notes", () => {
  const packet = buildTripPacket({
    booking: baseBooking,
    listingTitle: "Private Charter",
    statusUrl: "https://www.roatanisland.life/book/status/booking-alpha",
    chatUrl: "https://www.roatanisland.life/account",
  });

  assert.equal(packet.title, "Private Charter trip packet");
  assert.deepEqual(
    packet.summary.map((item) => item.label),
    ["Date", "Time", "Guests", "Status", "Payment", "Balance"],
  );
  assert.ok(packet.actions.some((action) => action.label === "Open chat"));
  assert.ok(packet.actions.some((action) => action.href.includes("/book/invoice/")));
  assert.ok(packet.whatToBring.includes("Sun protection"));
  assert.ok(packet.nextSteps.length >= 3);
});
