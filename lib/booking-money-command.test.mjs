import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBookingMoneyUpdate,
  getBookingMoneyAlerts,
  getBookingMoneySnapshot,
  getCashflowForecast,
  getGuestBalanceSummary,
  getPaymentPresets,
  getVendorPayoutForecast,
} from "./booking-money-command.ts";

const now = new Date("2026-06-01T12:00:00Z");

const bookings = [
  {
    id: "booking-alpha-123",
    created_at: "2026-05-20T12:00:00Z",
    full_name: "A Guest",
    email: "a@example.com",
    status: "confirmed",
    tour_date: "2026-06-30",
    deposit_status: "paid",
    deposit_amount_cents: 25000,
    booking_value_cents: 120000,
    payment_schedule_type: "split_payment",
    amount_paid_cents: null,
    balance_due_cents: null,
    balance_due_date: "2026-06-25",
    invoice_number: null,
    receipt_number: null,
    commission_amount_cents: 12000,
    commission_status: "unpaid",
  },
  {
    id: "booking-beta-456",
    created_at: "2026-05-18T12:00:00Z",
    full_name: "B Guest",
    email: "b@example.com",
    status: "completed",
    tour_date: "2026-05-20",
    deposit_status: "full_paid",
    deposit_amount_cents: 80000,
    booking_value_cents: 80000,
    payment_schedule_type: "full_payment",
    amount_paid_cents: 80000,
    balance_due_cents: 0,
    balance_due_date: null,
    refund_status: "pending",
    refund_amount_cents: 15000,
    commission_amount_cents: 8000,
    commission_status: "unpaid",
    payment_issue_flag: true,
    payment_issue_note: "Card dispute opened",
  },
];

test("summarizes split payments with invoice, receipt, and balance countdown", () => {
  assert.deepEqual(getBookingMoneySnapshot(bookings[0], now), {
    totalCents: 120000,
    paidCents: 25000,
    balanceDueCents: 95000,
    paymentLabel: "Deposit paid, balance due",
    dueLabel: "Due in 24 days",
    invoiceNumber: "INV-ALPHA123",
    receiptNumber: "RCT-ALPHA123",
    statusTone: "due",
  });
});

test("builds admin alerts for overdue balances, refunds, issues, and payouts", () => {
  const alerts = getBookingMoneyAlerts({
    bookings: [
      ...bookings,
      {
        ...bookings[0],
        id: "booking-overdue-789",
        balance_due_date: "2026-05-28",
      },
    ],
    now,
  });

  assert.deepEqual(
    alerts.map((alert) => [alert.type, alert.bookingId, alert.label]),
    [
      ["overdue_balance", "booking-overdue-789", "Balance overdue"],
      ["refund_pending", "booking-beta-456", "Refund pending"],
      ["payment_issue", "booking-beta-456", "Payment issue"],
      ["payout_ready", "booking-beta-456", "Payout ready"],
    ],
  );
});

test("forecasts cashflow and vendor payouts from booking money fields", () => {
  assert.deepEqual(getCashflowForecast({ bookings, now }), {
    next7BalanceCents: 0,
    next30BalanceCents: 95000,
    next90BalanceCents: 95000,
    paidCents: 105000,
    refundPendingCents: 15000,
    payoutDueCents: 72000,
    commissionCents: 20000,
    label: "$950 due in 30 days",
  });

  assert.deepEqual(getVendorPayoutForecast(bookings[1]), {
    grossCents: 80000,
    commissionCents: 8000,
    payoutCents: 72000,
    label: "$720 vendor payout",
    status: "ready",
  });
});

test("summarizes guest balances and payment presets", () => {
  assert.deepEqual(getGuestBalanceSummary(bookings), {
    bookingCount: 2,
    paidCents: 105000,
    balanceDueCents: 95000,
    refundPendingCents: 15000,
    nextDueDate: "2026-06-25",
    label: "$950 balance due",
  });

  assert.deepEqual(
    getPaymentPresets().map((preset) => [preset.id, preset.label]),
    [
      ["request_later", "Request later"],
      ["deposit_only", "Deposit only"],
      ["split_payment", "Deposit plus balance"],
      ["full_payment", "Full payment"],
      ["manual", "Manual payment"],
      ["waived", "Waived / comped"],
    ],
  );
});

test("normalizes admin money updates for API payloads", () => {
  assert.deepEqual(
    buildBookingMoneyUpdate({
      paymentScheduleType: "split_payment",
      bookingValueCents: "125000",
      amountPaidCents: "25000",
      balanceDueDate: "2026-07-01",
      paymentIssueFlag: true,
      refundStatus: "partial",
      refundAmountCents: "10000",
      commissionOverrideCents: "9000",
    }),
    {
      payment_schedule_type: "split_payment",
      booking_value_cents: 125000,
      amount_paid_cents: 25000,
      balance_due_date: "2026-07-01",
      payment_issue_flag: true,
      refund_status: "partial",
      refund_amount_cents: 10000,
      commission_override_cents: 9000,
    },
  );
});
