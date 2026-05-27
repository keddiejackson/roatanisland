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
