import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAdminRevenueExportRows,
  buildVendorPayoutExportRows,
  getAdminRevenueSummary,
  getBookingMoneyRows,
  getVendorPayoutRows,
  getVendorPayoutSummary,
  getVendorRevenueLeaderboard,
} from "./admin-revenue.ts";

const vendors = [
  { id: "v1", business_name: "Dive Co", is_active: true },
  { id: "v2", business_name: "Island Ride", is_active: true },
];

const listings = [
  { id: "l1", title: "Reef Tour", vendor_id: "v1" },
  { id: "l2", title: "Airport Pickup", vendor_id: "v2" },
];

const bookings = [
  {
    id: "b1",
    full_name: "A Guest",
    listing_id: "l1",
    status: "confirmed",
    deposit_status: "paid",
    deposit_amount_cents: 5000,
    booking_value_cents: 30000,
    commission_amount_cents: 3000,
    commission_status: "unpaid",
    payout_note: "Pay after dive clears.",
    payout_scheduled_for: null,
    payout_paid_at: null,
    selected_addons: [
      { name: "Lunch", price_cents: 2500 },
      { name: "Pickup", price_cents: 1500 },
    ],
  },
  {
    id: "b2",
    full_name: "B Guest",
    listing_id: "l2",
    status: "new",
    deposit_status: "checkout_started",
    deposit_amount_cents: 5000,
    booking_value_cents: 12000,
    commission_amount_cents: null,
    commission_status: "scheduled",
    payout_note: "Send Friday batch.",
    payout_scheduled_for: "2026-06-12",
    payout_paid_at: null,
    selected_addons: [{ name: "Lunch", price_cents: 2000 }],
  },
  {
    id: "b3",
    full_name: "C Guest",
    listing_id: "l1",
    status: "completed",
    deposit_status: "paid",
    deposit_amount_cents: 20000,
    booking_value_cents: 20000,
    commission_amount_cents: 2000,
    commission_status: "paid",
    payout_note: "Paid by bank transfer.",
    payout_scheduled_for: null,
    payout_paid_at: "2026-06-03T12:00:00Z",
    selected_addons: [],
  },
  {
    id: "b4",
    full_name: "Cancelled Guest",
    listing_id: "l2",
    status: "cancelled",
    deposit_status: "failed",
    deposit_amount_cents: 5000,
    booking_value_cents: 9000,
    commission_amount_cents: 900,
    commission_status: "waived",
    payout_note: null,
    payout_scheduled_for: null,
    payout_paid_at: null,
    selected_addons: [{ name: "Pickup", price_cents: 1500 }],
  },
];

test("summarizes admin marketplace revenue, deposits, commission, and add-ons", () => {
  assert.deepEqual(getAdminRevenueSummary({ bookings }), {
    grossBookingValueCents: 62000,
    confirmedValueCents: 50000,
    pendingValueCents: 12000,
    cancelledValueCents: 9000,
    paidDepositCents: 25000,
    unpaidDepositCents: 5000,
    addonRevenueCents: 6000,
    platformCommissionCents: 6200,
    vendorPayoutCents: 55800,
    averageBookingValueCents: 20667,
    topAddonLabel: "Lunch",
    highValueBookingCount: 2,
    label: "$620 marketplace value",
  });
});

test("ranks vendors by booking value and payout estimate", () => {
  assert.deepEqual(
    getVendorRevenueLeaderboard({ bookings, listings, vendors }),
    [
      {
        vendorId: "v1",
        vendorName: "Dive Co",
        bookingCount: 2,
        confirmedCount: 2,
        grossBookingValueCents: 50000,
        commissionCents: 5000,
        payoutCents: 45000,
        needsAttention: false,
      },
      {
        vendorId: "v2",
        vendorName: "Island Ride",
        bookingCount: 1,
        confirmedCount: 0,
        grossBookingValueCents: 12000,
        commissionCents: 1200,
        payoutCents: 10800,
        needsAttention: true,
      },
    ],
  );
});

test("builds booking money rows sorted by highest value first", () => {
  assert.deepEqual(
    getBookingMoneyRows({ bookings, listings, vendors }).map((row) => [
      row.bookingId,
      row.vendorName,
      row.listingTitle,
      row.bookingValueCents,
      row.depositLabel,
      row.highValue,
    ]),
    [
      ["b1", "Dive Co", "Reef Tour", 30000, "Paid deposit", true],
      ["b3", "Dive Co", "Reef Tour", 20000, "Paid deposit", true],
      ["b2", "Island Ride", "Airport Pickup", 12000, "Deposit started", false],
    ],
  );
});

test("builds admin revenue export rows with vendor payout fields", () => {
  assert.deepEqual(buildAdminRevenueExportRows({ bookings, listings, vendors }), [
    {
      booking_id: "b1",
      guest: "A Guest",
      listing: "Reef Tour",
      vendor: "Dive Co",
      status: "confirmed",
      deposit_status: "paid",
      booking_value_cents: 30000,
      commission_cents: 3000,
      vendor_payout_cents: 27000,
      add_on_value_cents: 4000,
    },
    {
      booking_id: "b3",
      guest: "C Guest",
      listing: "Reef Tour",
      vendor: "Dive Co",
      status: "completed",
      deposit_status: "paid",
      booking_value_cents: 20000,
      commission_cents: 2000,
      vendor_payout_cents: 18000,
      add_on_value_cents: 0,
    },
    {
      booking_id: "b2",
      guest: "B Guest",
      listing: "Airport Pickup",
      vendor: "Island Ride",
      status: "new",
      deposit_status: "checkout_started",
      booking_value_cents: 12000,
      commission_cents: 1200,
      vendor_payout_cents: 10800,
      add_on_value_cents: 2000,
    },
  ]);
});

test("summarizes vendor payouts by unpaid, scheduled, paid, and waived status", () => {
  assert.deepEqual(getVendorPayoutSummary({ bookings }), {
    unpaidCount: 1,
    scheduledCount: 1,
    paidCount: 1,
    waivedCount: 1,
    unpaidCents: 27000,
    scheduledCents: 10800,
    paidCents: 18000,
    waivedCents: 8100,
    nextScheduledDate: "2026-06-12",
    label: "$270 unpaid payouts",
  });
});

test("builds vendor payout rows with notes and scheduled dates", () => {
  assert.deepEqual(
    getVendorPayoutRows({ bookings, listings, vendors }).map((row) => [
      row.bookingId,
      row.vendorName,
      row.payoutStatus,
      row.vendorPayoutCents,
      row.payoutNote,
      row.payoutScheduledFor,
    ]),
    [
      ["b1", "Dive Co", "unpaid", 27000, "Pay after dive clears.", null],
      ["b3", "Dive Co", "paid", 18000, "Paid by bank transfer.", null],
      ["b2", "Island Ride", "scheduled", 10800, "Send Friday batch.", "2026-06-12"],
    ],
  );
});

test("builds vendor payout export rows for admin reporting", () => {
  assert.deepEqual(buildVendorPayoutExportRows({ bookings, listings, vendors }), [
    {
      booking_id: "b1",
      guest: "A Guest",
      listing: "Reef Tour",
      vendor: "Dive Co",
      booking_status: "confirmed",
      payout_status: "unpaid",
      booking_value_cents: 30000,
      platform_commission_cents: 3000,
      vendor_payout_cents: 27000,
      payout_scheduled_for: null,
      payout_paid_at: null,
      payout_note: "Pay after dive clears.",
    },
    {
      booking_id: "b3",
      guest: "C Guest",
      listing: "Reef Tour",
      vendor: "Dive Co",
      booking_status: "completed",
      payout_status: "paid",
      booking_value_cents: 20000,
      platform_commission_cents: 2000,
      vendor_payout_cents: 18000,
      payout_scheduled_for: null,
      payout_paid_at: "2026-06-03T12:00:00Z",
      payout_note: "Paid by bank transfer.",
    },
    {
      booking_id: "b2",
      guest: "B Guest",
      listing: "Airport Pickup",
      vendor: "Island Ride",
      booking_status: "new",
      payout_status: "scheduled",
      booking_value_cents: 12000,
      platform_commission_cents: 1200,
      vendor_payout_cents: 10800,
      payout_scheduled_for: "2026-06-12",
      payout_paid_at: null,
      payout_note: "Send Friday batch.",
    },
  ]);
});
