export type AdminRevenueAddon = {
  name?: string | null;
  price_cents?: number | null;
};

export type AdminRevenueBooking = {
  id: string;
  full_name?: string | null;
  listing_id?: string | null;
  status?: string | null;
  deposit_status?: string | null;
  deposit_amount_cents?: number | null;
  booking_value_cents?: number | null;
  commission_amount_cents?: number | null;
  commission_status?: string | null;
  payout_note?: string | null;
  payout_scheduled_for?: string | null;
  payout_paid_at?: string | null;
  selected_addons?: AdminRevenueAddon[] | null;
  tour_date?: string | null;
  tour_time?: string | null;
};

export type AdminRevenueListing = {
  id: string;
  title?: string | null;
  vendor_id?: string | null;
};

export type AdminRevenueVendor = {
  id: string;
  business_name?: string | null;
  is_active?: boolean | null;
};

export type AdminRevenueSummary = {
  grossBookingValueCents: number;
  confirmedValueCents: number;
  pendingValueCents: number;
  cancelledValueCents: number;
  paidDepositCents: number;
  unpaidDepositCents: number;
  addonRevenueCents: number;
  platformCommissionCents: number;
  vendorPayoutCents: number;
  averageBookingValueCents: number;
  topAddonLabel: string;
  highValueBookingCount: number;
  label: string;
};

export type VendorRevenueLeaderboardRow = {
  vendorId: string;
  vendorName: string;
  bookingCount: number;
  confirmedCount: number;
  grossBookingValueCents: number;
  commissionCents: number;
  payoutCents: number;
  needsAttention: boolean;
};

export type BookingMoneyRow = {
  bookingId: string;
  guestName: string;
  listingTitle: string;
  vendorName: string;
  status: string;
  depositStatus: string;
  depositLabel: string;
  bookingValueCents: number;
  commissionCents: number;
  vendorPayoutCents: number;
  addOnValueCents: number;
  highValue: boolean;
};

export type VendorPayoutStatus = "unpaid" | "scheduled" | "paid" | "waived";

export type VendorPayoutSummary = {
  unpaidCount: number;
  scheduledCount: number;
  paidCount: number;
  waivedCount: number;
  unpaidCents: number;
  scheduledCents: number;
  paidCents: number;
  waivedCents: number;
  nextScheduledDate: string | null;
  label: string;
};

export type VendorPayoutRow = BookingMoneyRow & {
  vendorId: string;
  tourDate: string | null;
  tourTime: string | null;
  payoutStatus: VendorPayoutStatus;
  payoutNote: string | null;
  payoutScheduledFor: string | null;
  payoutPaidAt: string | null;
};

export type VendorPayoutStatement = {
  statementId: string;
  vendorId: string;
  vendorName: string;
  period: string;
  bookingCount: number;
  bookingValueCents: number;
  commissionCents: number;
  vendorPayoutCents: number;
  paidCents: number;
  scheduledCents: number;
  unpaidCents: number;
  waivedCents: number;
  receiptCount: number;
  lastPaidAt: string | null;
  label: string;
  rows: VendorPayoutRow[];
};

export type VendorPayoutReceipt = {
  receiptId: string;
  bookingId: string;
  vendorId: string;
  vendorName: string;
  guestName: string;
  listingTitle: string;
  tourDate: string | null;
  tourTime: string | null;
  bookingValueCents: number;
  commissionCents: number;
  vendorPayoutCents: number;
  payoutPaidAt: string | null;
  payoutNote: string | null;
  label: string;
};

function normalizeStatus(value?: string | null) {
  return (value || "").toLowerCase();
}

function cents(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function isCancelled(booking: AdminRevenueBooking) {
  return normalizeStatus(booking.status) === "cancelled";
}

function isConfirmed(booking: AdminRevenueBooking) {
  return ["confirmed", "completed"].includes(normalizeStatus(booking.status));
}

function isPaidDeposit(booking: AdminRevenueBooking) {
  return ["paid", "full_paid"].includes(normalizeStatus(booking.deposit_status));
}

function addOnValueCents(booking: AdminRevenueBooking) {
  return (booking.selected_addons || []).reduce(
    (total, addon) => total + cents(addon.price_cents),
    0,
  );
}

function commissionCents(booking: AdminRevenueBooking, commissionRate = 0.1) {
  if (typeof booking.commission_amount_cents === "number") {
    return booking.commission_amount_cents;
  }

  return Math.round(cents(booking.booking_value_cents) * commissionRate);
}

function revenueLabel(valueCents: number) {
  return `${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(valueCents / 100)} marketplace value`;
}

function listingById(listings: AdminRevenueListing[]) {
  return new Map(listings.map((listing) => [listing.id, listing]));
}

function vendorById(vendors: AdminRevenueVendor[]) {
  return new Map(vendors.map((vendor) => [vendor.id, vendor]));
}

function vendorName(vendor?: AdminRevenueVendor | null) {
  return vendor?.business_name || "Unassigned vendor";
}

function depositLabel(status?: string | null) {
  const normalized = normalizeStatus(status);

  if (["paid", "full_paid"].includes(normalized)) return "Paid deposit";
  if (["checkout_started", "full_checkout_started", "processing"].includes(normalized)) {
    return "Deposit started";
  }
  if (normalized === "failed") return "Deposit failed";

  return "No deposit";
}

function currencyLabel(valueCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(valueCents / 100);
}

function moneyLabel(valueCents: number, suffix: string) {
  return `${currencyLabel(valueCents)} ${suffix}`;
}

function payoutStatus(booking: AdminRevenueBooking): VendorPayoutStatus {
  const normalized = normalizeStatus(booking.commission_status);

  if (["scheduled", "paid", "waived"].includes(normalized)) {
    return normalized as VendorPayoutStatus;
  }

  return "unpaid";
}

function payoutPeriod(row: VendorPayoutRow) {
  const dateSource = row.payoutPaidAt || row.payoutScheduledFor || row.tourDate;

  return dateSource ? dateSource.slice(0, 7) : "unscheduled";
}

function payoutStatementLabel(statement: VendorPayoutStatement) {
  if (
    statement.paidCents > 0 &&
    statement.scheduledCents === 0 &&
    statement.unpaidCents === 0
  ) {
    return moneyLabel(statement.paidCents, `paid for ${statement.vendorName}`);
  }

  if (
    statement.scheduledCents > 0 &&
    statement.paidCents === 0 &&
    statement.unpaidCents === 0
  ) {
    return moneyLabel(
      statement.scheduledCents,
      `scheduled for ${statement.vendorName}`,
    );
  }

  if (
    statement.unpaidCents > 0 &&
    statement.paidCents === 0 &&
    statement.scheduledCents === 0
  ) {
    return moneyLabel(statement.unpaidCents, `unpaid for ${statement.vendorName}`);
  }

  return moneyLabel(
    statement.vendorPayoutCents,
    `statement for ${statement.vendorName}`,
  );
}

function receiptId(bookingId: string) {
  return `PAY-${bookingId.slice(0, 8).toUpperCase()}`;
}

function escapeEmailValue(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getAdminRevenueSummary({
  bookings,
  commissionRate = 0.1,
  highValueThresholdCents = 20000,
}: {
  bookings: AdminRevenueBooking[];
  commissionRate?: number;
  highValueThresholdCents?: number;
}): AdminRevenueSummary {
  const activeBookings = bookings.filter((booking) => !isCancelled(booking));
  const bookingsWithValue = activeBookings.filter(
    (booking) => typeof booking.booking_value_cents === "number",
  );
  const addonCounts = new Map<string, number>();
  const grossBookingValueCents = activeBookings.reduce(
    (total, booking) => total + cents(booking.booking_value_cents),
    0,
  );
  const confirmedValueCents = activeBookings
    .filter(isConfirmed)
    .reduce((total, booking) => total + cents(booking.booking_value_cents), 0);
  const cancelledValueCents = bookings
    .filter(isCancelled)
    .reduce((total, booking) => total + cents(booking.booking_value_cents), 0);
  const addonRevenueCents = activeBookings.reduce((total, booking) => {
    for (const addon of booking.selected_addons || []) {
      if (addon.name) {
        addonCounts.set(addon.name, (addonCounts.get(addon.name) || 0) + 1);
      }
    }

    return total + addOnValueCents(booking);
  }, 0);
  const platformCommissionCents = activeBookings.reduce(
    (total, booking) => total + commissionCents(booking, commissionRate),
    0,
  );
  const topAddonLabel =
    [...addonCounts.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] ||
    "None yet";

  return {
    grossBookingValueCents,
    confirmedValueCents,
    pendingValueCents: grossBookingValueCents - confirmedValueCents,
    cancelledValueCents,
    paidDepositCents: activeBookings
      .filter(isPaidDeposit)
      .reduce((total, booking) => total + cents(booking.deposit_amount_cents), 0),
    unpaidDepositCents: activeBookings
      .filter((booking) => !isPaidDeposit(booking))
      .reduce((total, booking) => total + cents(booking.deposit_amount_cents), 0),
    addonRevenueCents,
    platformCommissionCents,
    vendorPayoutCents: grossBookingValueCents - platformCommissionCents,
    averageBookingValueCents:
      bookingsWithValue.length > 0
        ? Math.round(grossBookingValueCents / bookingsWithValue.length)
        : 0,
    topAddonLabel,
    highValueBookingCount: activeBookings.filter(
      (booking) => cents(booking.booking_value_cents) >= highValueThresholdCents,
    ).length,
    label: revenueLabel(grossBookingValueCents),
  };
}

export function getVendorRevenueLeaderboard({
  bookings,
  listings,
  vendors,
  commissionRate = 0.1,
  limit = 6,
}: {
  bookings: AdminRevenueBooking[];
  listings: AdminRevenueListing[];
  vendors: AdminRevenueVendor[];
  commissionRate?: number;
  limit?: number;
}): VendorRevenueLeaderboardRow[] {
  const listingsById = listingById(listings);
  const vendorsById = vendorById(vendors);
  const totals = new Map<string, VendorRevenueLeaderboardRow>();

  bookings
    .filter((booking) => !isCancelled(booking))
    .forEach((booking) => {
      const listing = booking.listing_id
        ? listingsById.get(booking.listing_id)
        : null;
      const vendorId = listing?.vendor_id || "unassigned";
      const vendor = vendorId === "unassigned" ? null : vendorsById.get(vendorId);
      const existing =
        totals.get(vendorId) ||
        ({
          vendorId,
          vendorName: vendorName(vendor),
          bookingCount: 0,
          confirmedCount: 0,
          grossBookingValueCents: 0,
          commissionCents: 0,
          payoutCents: 0,
          needsAttention: false,
        } satisfies VendorRevenueLeaderboardRow);

      existing.bookingCount += 1;
      existing.confirmedCount += isConfirmed(booking) ? 1 : 0;
      existing.grossBookingValueCents += cents(booking.booking_value_cents);
      existing.commissionCents += commissionCents(booking, commissionRate);
      existing.payoutCents =
        existing.grossBookingValueCents - existing.commissionCents;
      existing.needsAttention =
        existing.bookingCount > 0 && existing.confirmedCount === 0;
      totals.set(vendorId, existing);
    });

  return [...totals.values()]
    .sort(
      (first, second) =>
        second.grossBookingValueCents - first.grossBookingValueCents ||
        second.bookingCount - first.bookingCount,
    )
    .slice(0, limit);
}

export function getBookingMoneyRows({
  bookings,
  listings,
  vendors,
  commissionRate = 0.1,
  highValueThresholdCents = 20000,
}: {
  bookings: AdminRevenueBooking[];
  listings: AdminRevenueListing[];
  vendors: AdminRevenueVendor[];
  commissionRate?: number;
  highValueThresholdCents?: number;
}): BookingMoneyRow[] {
  const listingsById = listingById(listings);
  const vendorsById = vendorById(vendors);

  return bookings
    .filter((booking) => !isCancelled(booking))
    .map((booking) => {
      const listing = booking.listing_id
        ? listingsById.get(booking.listing_id)
        : null;
      const vendor = listing?.vendor_id
        ? vendorsById.get(listing.vendor_id)
        : null;
      const bookingValueCents = cents(booking.booking_value_cents);
      const rowCommissionCents = commissionCents(booking, commissionRate);

      return {
        bookingId: booking.id,
        guestName: booking.full_name || "Guest",
        listingTitle: listing?.title || "Unassigned listing",
        vendorName: vendorName(vendor),
        status: booking.status || "new",
        depositStatus: booking.deposit_status || "not_requested",
        depositLabel: depositLabel(booking.deposit_status),
        bookingValueCents,
        commissionCents: rowCommissionCents,
        vendorPayoutCents: bookingValueCents - rowCommissionCents,
        addOnValueCents: addOnValueCents(booking),
        highValue: bookingValueCents >= highValueThresholdCents,
      };
    })
    .sort(
      (first, second) =>
        second.bookingValueCents - first.bookingValueCents ||
        first.guestName.localeCompare(second.guestName),
    );
}

export function buildAdminRevenueExportRows({
  bookings,
  listings,
  vendors,
  commissionRate = 0.1,
}: {
  bookings: AdminRevenueBooking[];
  listings: AdminRevenueListing[];
  vendors: AdminRevenueVendor[];
  commissionRate?: number;
}) {
  return getBookingMoneyRows({ bookings, listings, vendors, commissionRate }).map(
    (row) => ({
      booking_id: row.bookingId,
      guest: row.guestName,
      listing: row.listingTitle,
      vendor: row.vendorName,
      status: row.status,
      deposit_status: row.depositStatus,
      booking_value_cents: row.bookingValueCents,
      commission_cents: row.commissionCents,
      vendor_payout_cents: row.vendorPayoutCents,
      add_on_value_cents: row.addOnValueCents,
    }),
  );
}

export function getVendorPayoutSummary({
  bookings,
  commissionRate = 0.1,
}: {
  bookings: AdminRevenueBooking[];
  commissionRate?: number;
}): VendorPayoutSummary {
  const summary: VendorPayoutSummary = {
    unpaidCount: 0,
    scheduledCount: 0,
    paidCount: 0,
    waivedCount: 0,
    unpaidCents: 0,
    scheduledCents: 0,
    paidCents: 0,
    waivedCents: 0,
    nextScheduledDate: null,
    label: "$0 unpaid payouts",
  };

  for (const booking of bookings) {
    const status = payoutStatus(booking);
    const value = cents(booking.booking_value_cents) - commissionCents(booking, commissionRate);

    if (status === "unpaid") {
      summary.unpaidCount += 1;
      summary.unpaidCents += value;
    } else if (status === "scheduled") {
      summary.scheduledCount += 1;
      summary.scheduledCents += value;

      if (
        booking.payout_scheduled_for &&
        (!summary.nextScheduledDate ||
          booking.payout_scheduled_for < summary.nextScheduledDate)
      ) {
        summary.nextScheduledDate = booking.payout_scheduled_for;
      }
    } else if (status === "paid") {
      summary.paidCount += 1;
      summary.paidCents += value;
    } else {
      summary.waivedCount += 1;
      summary.waivedCents += value;
    }
  }

  summary.label = moneyLabel(summary.unpaidCents, "unpaid payouts");

  return summary;
}

export function getVendorPayoutRows({
  bookings,
  listings,
  vendors,
  commissionRate = 0.1,
}: {
  bookings: AdminRevenueBooking[];
  listings: AdminRevenueListing[];
  vendors: AdminRevenueVendor[];
  commissionRate?: number;
}): VendorPayoutRow[] {
  const bookingById = new Map(bookings.map((booking) => [booking.id, booking]));
  const listingsById = listingById(listings);

  return getBookingMoneyRows({
    bookings,
    listings,
    vendors,
    commissionRate,
  }).map((row) => {
    const booking = bookingById.get(row.bookingId);
    const listing = booking?.listing_id
      ? listingsById.get(booking.listing_id)
      : null;

    return {
      ...row,
      vendorId: listing?.vendor_id || "unassigned",
      tourDate: booking?.tour_date || null,
      tourTime: booking?.tour_time || null,
      payoutStatus: booking ? payoutStatus(booking) : "unpaid",
      payoutNote: booking?.payout_note || null,
      payoutScheduledFor: booking?.payout_scheduled_for || null,
      payoutPaidAt: booking?.payout_paid_at || null,
    };
  });
}

export function getVendorPayoutStatements({
  bookings,
  listings,
  vendors,
  commissionRate = 0.1,
}: {
  bookings: AdminRevenueBooking[];
  listings: AdminRevenueListing[];
  vendors: AdminRevenueVendor[];
  commissionRate?: number;
}): VendorPayoutStatement[] {
  const statements = new Map<string, VendorPayoutStatement>();

  for (const row of getVendorPayoutRows({
    bookings,
    listings,
    vendors,
    commissionRate,
  })) {
    const period = payoutPeriod(row);
    const statementId = `${row.vendorId}-${period}`;
    const existing =
      statements.get(statementId) ||
      ({
        statementId,
        vendorId: row.vendorId,
        vendorName: row.vendorName,
        period,
        bookingCount: 0,
        bookingValueCents: 0,
        commissionCents: 0,
        vendorPayoutCents: 0,
        paidCents: 0,
        scheduledCents: 0,
        unpaidCents: 0,
        waivedCents: 0,
        receiptCount: 0,
        lastPaidAt: null,
        label: "",
        rows: [],
      } satisfies VendorPayoutStatement);

    existing.bookingCount += 1;
    existing.bookingValueCents += row.bookingValueCents;
    existing.commissionCents += row.commissionCents;
    existing.vendorPayoutCents += row.vendorPayoutCents;
    existing.rows.push(row);

    if (row.payoutStatus === "paid") {
      existing.paidCents += row.vendorPayoutCents;
      existing.receiptCount += 1;

      if (
        row.payoutPaidAt &&
        (!existing.lastPaidAt || row.payoutPaidAt > existing.lastPaidAt)
      ) {
        existing.lastPaidAt = row.payoutPaidAt;
      }
    } else if (row.payoutStatus === "scheduled") {
      existing.scheduledCents += row.vendorPayoutCents;
    } else if (row.payoutStatus === "waived") {
      existing.waivedCents += row.vendorPayoutCents;
    } else {
      existing.unpaidCents += row.vendorPayoutCents;
    }

    statements.set(statementId, existing);
  }

  return [...statements.values()]
    .map((statement) => ({
      ...statement,
      label: payoutStatementLabel(statement),
      rows: [...statement.rows].sort(
        (first, second) =>
          (second.payoutPaidAt || second.payoutScheduledFor || second.tourDate || "")
            .localeCompare(
              first.payoutPaidAt || first.payoutScheduledFor || first.tourDate || "",
            ) || first.guestName.localeCompare(second.guestName),
      ),
    }))
    .sort((first, second) => {
      if (first.period === "unscheduled" && second.period !== "unscheduled") {
        return 1;
      }

      if (second.period === "unscheduled" && first.period !== "unscheduled") {
        return -1;
      }

      return (
        second.period.localeCompare(first.period) ||
        second.paidCents - first.paidCents ||
        second.scheduledCents - first.scheduledCents ||
        second.unpaidCents - first.unpaidCents ||
        first.vendorName.localeCompare(second.vendorName)
      );
    });
}

export function getVendorPayoutReceipts({
  bookings,
  listings,
  vendors,
  commissionRate = 0.1,
}: {
  bookings: AdminRevenueBooking[];
  listings: AdminRevenueListing[];
  vendors: AdminRevenueVendor[];
  commissionRate?: number;
}): VendorPayoutReceipt[] {
  return getVendorPayoutRows({ bookings, listings, vendors, commissionRate })
    .filter((row) => row.payoutStatus === "paid")
    .map((row) => {
      const id = receiptId(row.bookingId);

      return {
        receiptId: id,
        bookingId: row.bookingId,
        vendorId: row.vendorId,
        vendorName: row.vendorName,
        guestName: row.guestName,
        listingTitle: row.listingTitle,
        tourDate: row.tourDate,
        tourTime: row.tourTime,
        bookingValueCents: row.bookingValueCents,
        commissionCents: row.commissionCents,
        vendorPayoutCents: row.vendorPayoutCents,
        payoutPaidAt: row.payoutPaidAt,
        payoutNote: row.payoutNote,
        label: `Payout receipt ${id}`,
      };
    })
    .sort(
      (first, second) =>
        (second.payoutPaidAt || "").localeCompare(first.payoutPaidAt || "") ||
        first.vendorName.localeCompare(second.vendorName),
    );
}

export function buildVendorPayoutExportRows({
  bookings,
  listings,
  vendors,
  commissionRate = 0.1,
}: {
  bookings: AdminRevenueBooking[];
  listings: AdminRevenueListing[];
  vendors: AdminRevenueVendor[];
  commissionRate?: number;
}) {
  return getVendorPayoutRows({ bookings, listings, vendors, commissionRate }).map(
    (row) => ({
      booking_id: row.bookingId,
      guest: row.guestName,
      listing: row.listingTitle,
      vendor: row.vendorName,
      booking_status: row.status,
      payout_status: row.payoutStatus,
      booking_value_cents: row.bookingValueCents,
      platform_commission_cents: row.commissionCents,
      vendor_payout_cents: row.vendorPayoutCents,
      payout_scheduled_for: row.payoutScheduledFor,
      payout_paid_at: row.payoutPaidAt,
      payout_note: row.payoutNote,
    }),
  );
}

export function buildVendorPayoutStatementExportRows({
  bookings,
  listings,
  vendors,
  commissionRate = 0.1,
}: {
  bookings: AdminRevenueBooking[];
  listings: AdminRevenueListing[];
  vendors: AdminRevenueVendor[];
  commissionRate?: number;
}) {
  return getVendorPayoutStatements({
    bookings,
    listings,
    vendors,
    commissionRate,
  }).map((statement) => ({
    statement_id: statement.statementId,
    vendor: statement.vendorName,
    period: statement.period,
    booking_count: statement.bookingCount,
    booking_value_cents: statement.bookingValueCents,
    platform_commission_cents: statement.commissionCents,
    vendor_payout_cents: statement.vendorPayoutCents,
    paid_cents: statement.paidCents,
    scheduled_cents: statement.scheduledCents,
    unpaid_cents: statement.unpaidCents,
    receipt_count: statement.receiptCount,
    last_paid_at: statement.lastPaidAt,
    label: statement.label,
  }));
}

export function buildVendorPayoutReceiptEmail(receipt: VendorPayoutReceipt) {
  const rows: [string, string | number | null][] = [
    ["Receipt", receipt.receiptId],
    ["Vendor", receipt.vendorName],
    ["Listing", receipt.listingTitle],
    ["Guest", receipt.guestName],
    ["Tour date", receipt.tourDate],
    ["Tour time", receipt.tourTime],
    ["Booking value", currencyLabel(receipt.bookingValueCents)],
    ["Platform commission", currencyLabel(receipt.commissionCents)],
    ["Vendor payout", currencyLabel(receipt.vendorPayoutCents)],
    ["Paid at", receipt.payoutPaidAt],
  ];
  const htmlRows = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 0;color:#64748b">${escapeEmailValue(label)}</td>
          <td style="padding:10px 0;text-align:right;font-weight:700;color:#0b3c5d">${escapeEmailValue(value)}</td>
        </tr>
      `,
    )
    .join("");
  const note = receipt.payoutNote
    ? `<p style="margin-top:18px"><strong>Note:</strong> ${escapeEmailValue(receipt.payoutNote)}</p>`
    : "";

  return {
    subject: receipt.label,
    html: `
      <p>Your RoatanIsland.life vendor payout has been marked paid.</p>
      <table style="width:100%;border-collapse:collapse">${htmlRows}</table>
      ${note}
    `,
    text: [
      receipt.label,
      `Vendor: ${receipt.vendorName}`,
      `Listing: ${receipt.listingTitle}`,
      `Guest: ${receipt.guestName}`,
      `Booking value: ${currencyLabel(receipt.bookingValueCents)}`,
      `Platform commission: ${currencyLabel(receipt.commissionCents)}`,
      `Vendor payout: ${currencyLabel(receipt.vendorPayoutCents)}`,
      `Paid at: ${receipt.payoutPaidAt || ""}`,
      receipt.payoutNote ? `Note: ${receipt.payoutNote}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}
