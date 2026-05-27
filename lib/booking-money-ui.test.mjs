import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("admin, guest, and vendor pages expose the money command center surfaces", () => {
  const adminBookings = read("app/admin/bookings/page.tsx");
  const guestAccount = read("app/account/page.tsx");
  const vendorDashboard = read("app/vendor/dashboard/page.tsx");

  for (const label of [
    "Booking Money Command Center",
    "Send payment request",
    "Payment history",
    "Payment schedule",
    "Manual payment",
    "Refund workflow",
    "Payment issue",
    "Cashflow forecast",
    "Invoice",
    "Receipt",
  ]) {
    assert.ok(adminBookings.includes(label), `admin page is missing ${label}`);
  }

  for (const label of [
    "Guest balance tracking",
    "Balance due",
    "Invoice",
    "Receipt",
    "/book/invoice/",
    "/book/receipt/",
  ]) {
    assert.ok(guestAccount.includes(label), `guest account is missing ${label}`);
  }

  for (const label of [
    "Vendor payout forecast",
    "Vendor payout statements",
    "Guest payment status",
    "Private payout note",
  ]) {
    assert.ok(
      vendorDashboard.includes(label),
      `vendor dashboard is missing ${label}`,
    );
  }
});

test("printable invoice and receipt pages exist", () => {
  assert.ok(
    read("app/book/invoice/[id]/page.tsx").includes("Printable invoice"),
  );
  assert.ok(
    read("app/book/receipt/[id]/page.tsx").includes("Printable receipt"),
  );
});
