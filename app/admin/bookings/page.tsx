"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BookingChatDrawer, {
  type BookingChatThread,
} from "@/app/BookingChatDrawer";
import AdminNav from "@/app/admin/AdminNav";
import ExportCsvButton from "@/app/admin/ExportCsvButton";
import { isAdminUser } from "@/lib/admin";
import {
  getVendorPayoutSummary,
  type VendorPayoutStatus,
} from "@/lib/admin-revenue";
import { groupBookingsByDate } from "@/lib/availability-calendar";
import {
  formatMoneyCents,
  getBookingMoneyAlerts,
  getBookingMoneySnapshot,
  getCashflowForecast,
  getOverduePaymentReminders,
  getPaymentHistoryTimeline,
  getPaymentPresets,
  type BookingMoneyEventLike,
  type RefundStatus,
} from "@/lib/booking-money-command";
import {
  getBookingChangeRequestSummary,
  type BookingChangeRequest,
} from "@/lib/booking-change-requests";
import {
  bookingThreadSummary,
  type BookingMessageLike,
  type BookingThreadSummary,
} from "@/lib/booking-communication";
import {
  formatBookingStatus,
  getBookingOpsPriority,
} from "@/lib/booking-flow";
import { supabase } from "@/lib/supabase";

type BookingRow = {
  id: string;
  full_name: string;
  email: string;
  tour_date: string;
  tour_time: string;
  guests: number;
  guest_message: string | null;
  vendor_note: string | null;
  status: BookingStatus | null;
  admin_notes: string | null;
  listing_id: string | null;
  deposit_status: string | null;
  deposit_amount_cents: number | null;
  booking_value_cents: number | null;
  payment_schedule_type: string | null;
  payment_due_date: string | null;
  balance_due_date: string | null;
  amount_paid_cents: number | null;
  balance_due_cents: number | null;
  payment_method: string | null;
  manual_payment_note: string | null;
  payment_requested_at: string | null;
  payment_last_sent_at: string | null;
  payment_link_url: string | null;
  paid_at: string | null;
  invoice_number: string | null;
  receipt_number: string | null;
  refund_status: string | null;
  refund_amount_cents: number | null;
  refund_note: string | null;
  payment_issue_flag: boolean | null;
  payment_issue_note: string | null;
  commission_amount_cents: number | null;
  commission_status: string | null;
  commission_override_cents: number | null;
  payout_note: string | null;
  vendor_private_payout_note: string | null;
  payout_scheduled_for: string | null;
  payout_paid_at: string | null;
};

type BookingStatus = "new" | "confirmed" | "completed" | "cancelled";

type ListingRow = {
  id: string;
  title: string;
};

type BookingWithListingName = BookingRow & {
  listing_name: string;
};

type BookingMessageRow = BookingMessageLike & {
  booking_id: string;
};

type BookingReadReceiptRow = {
  booking_id: string;
  last_read_at: string | null;
};

type BookingMoneyEventRow = BookingMoneyEventLike & {
  booking_id: string;
};

function formatDeposit(booking: BookingWithListingName) {
  if (!booking.deposit_status || booking.deposit_status === "not_requested") {
    return "Not requested";
  }

  const amount = booking.deposit_amount_cents
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(booking.deposit_amount_cents / 100)
    : "";

  return `${booking.deposit_status.replaceAll("_", " ")} ${amount}`.trim();
}

function formatMoney(cents: number | null) {
  if (!cents) {
    return "Not set";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function moneyInputValue(value: number | null) {
  return typeof value === "number" ? String(value) : "";
}

function toNullableCents(value: string) {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function formatPayoutStatus(status: string | null) {
  return (status || "unpaid").replaceAll("_", " ");
}

function summarizeThreads(
  messages: BookingMessageRow[],
  readReceipts: BookingReadReceiptRow[] = [],
) {
  const grouped = new Map<string, BookingMessageLike[]>();
  const lastReadByBooking = new Map(
    readReceipts.map((receipt) => [receipt.booking_id, receipt.last_read_at]),
  );

  for (const message of messages) {
    grouped.set(message.booking_id, [
      ...(grouped.get(message.booking_id) || []),
      message,
    ]);
  }

  return Object.fromEntries(
    [...grouped.entries()].map(([bookingId, bookingMessages]) => [
      bookingId,
      bookingThreadSummary(
        bookingMessages,
        "admin",
        lastReadByBooking.get(bookingId),
      ),
    ]),
  );
}

function threadBadgeClass(summary?: BookingThreadSummary) {
  if (!summary || summary.messageCount === 0) {
    return "bg-gray-100 text-gray-600";
  }

  if (summary.needsResponse) {
    return "bg-[#D6B56D] text-[#0B3C5D]";
  }

  return "bg-[#EEF7F6] text-[#0B3C5D]";
}

export default function AdminBookingsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminEmail, setAdminEmail] = useState("");
  const [bookings, setBookings] = useState<BookingWithListingName[]>([]);
  const [changeRequestsByBooking, setChangeRequestsByBooking] = useState<
    Record<string, BookingChangeRequest[]>
  >({});
  const [changeActionNotes, setChangeActionNotes] = useState<Record<string, string>>({});
  const [threadSummaries, setThreadSummaries] = useState<
    Record<string, BookingThreadSummary>
  >({});
  const [moneyEventsByBooking, setMoneyEventsByBooking] = useState<
    Record<string, BookingMoneyEventRow[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [responseFilter, setResponseFilter] = useState<"all" | "needs_response">(
    "all",
  );
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");

  useEffect(() => {
    async function verifyAdminSession() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user || !(await isAdminUser(data.user.email))) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      setAdminEmail(data.user.email || "");
      setAuthorized(true);
      setCheckingAuth(false);
    }

    verifyAdminSession();
  }, [router]);

  useEffect(() => {
    async function fetchBookingsAndListings() {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (bookingsError) {
        console.error("Error loading bookings:", bookingsError);
        setLoading(false);
        return;
      }

      const { data: listingsData, error: listingsError } = await supabase
        .from("listings")
        .select("id, title");

      if (listingsError) {
        console.error("Error loading listings:", listingsError);
        setLoading(false);
        return;
      }

      const listingMap = new Map<string, string>();
      (listingsData as ListingRow[]).forEach((listing) => {
        listingMap.set(listing.id, listing.title);
      });

      const enrichedBookings = (bookingsData as BookingRow[]).map((booking) => ({
        ...booking,
        listing_name: booking.listing_id
          ? listingMap.get(booking.listing_id) || "Unknown Listing"
          : "No Listing",
      }));

      setBookings(enrichedBookings);
      const bookingIds = enrichedBookings.map((booking) => booking.id);

      if (bookingIds.length > 0) {
        const { data: changeRows, error: changeError } = await supabase
          .from("booking_change_requests")
          .select("*")
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: false });

        if (!changeError) {
          const grouped = new Map<string, BookingChangeRequest[]>();

          for (const changeRequest of (changeRows as BookingChangeRequest[]) || []) {
            grouped.set(changeRequest.booking_id, [
              ...(grouped.get(changeRequest.booking_id) || []),
              changeRequest,
            ]);
          }

          setChangeRequestsByBooking(Object.fromEntries(grouped.entries()));
        } else {
          setChangeRequestsByBooking({});
        }

        const { data: moneyRows, error: moneyError } = await supabase
          .from("booking_money_events")
          .select("booking_id, event_type, actor_role, actor_email, amount_cents, note, metadata, created_at")
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: false });

        if (!moneyError) {
          const groupedMoneyEvents = new Map<string, BookingMoneyEventRow[]>();

          for (const event of (moneyRows as BookingMoneyEventRow[]) || []) {
            groupedMoneyEvents.set(event.booking_id, [
              ...(groupedMoneyEvents.get(event.booking_id) || []),
              event,
            ]);
          }

          setMoneyEventsByBooking(
            Object.fromEntries(groupedMoneyEvents.entries()),
          );
        } else {
          setMoneyEventsByBooking({});
        }
      } else {
        setChangeRequestsByBooking({});
        setMoneyEventsByBooking({});
      }

      if (enrichedBookings.length > 0) {
        const { data: messageRows, error: messageError } = await supabase
          .from("booking_messages")
          .select("booking_id, sender_role, sender_email, message, is_internal, created_at")
          .in(
            "booking_id",
            enrichedBookings.map((booking) => booking.id),
          )
          .order("created_at", { ascending: true });

        if (!messageError) {
          const { data: readRows } = await supabase
            .from("booking_message_reads")
            .select("booking_id, last_read_at")
            .in(
              "booking_id",
              enrichedBookings.map((booking) => booking.id),
            )
            .eq("reader_role", "admin")
            .eq("reader_email", adminEmail.toLowerCase());

          setThreadSummaries(
            summarizeThreads(
              (messageRows as BookingMessageRow[]) || [],
              (readRows as BookingReadReceiptRow[]) || [],
            ),
          );
        }
      } else {
        setThreadSummaries({});
      }
      setLoading(false);
    }

    if (authorized) {
      fetchBookingsAndListings();
    }
  }, [adminEmail, authorized]);

  const filteredBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const bookingStatus = booking.status || "new";
        const matchesStatus =
          statusFilter === "all" || bookingStatus === statusFilter;
        const matchesSearch = [
          booking.listing_name,
          booking.full_name,
          booking.email,
          booking.tour_date,
          booking.tour_time,
          booking.guest_message || "",
          booking.vendor_note || "",
          booking.admin_notes || "",
          threadSummaries[booking.id]?.lastMessagePreview || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
        const matchesResponse =
          responseFilter === "all" ||
          Boolean(threadSummaries[booking.id]?.needsResponse);

        return matchesStatus && matchesSearch && matchesResponse;
      }),
    [bookings, responseFilter, search, statusFilter, threadSummaries],
  );

  const groupedBookings = useMemo(
    () => groupBookingsByDate(filteredBookings),
    [filteredBookings],
  );
  const chatThreads: BookingChatThread[] = useMemo(
    () =>
      bookings.map((booking) => ({
        id: booking.id,
        title: booking.full_name,
        subtitle: `${booking.listing_name} - ${booking.tour_date} at ${booking.tour_time}`,
        apiPath: `/api/admin/bookings/${booking.id}/messages`,
        summary: threadSummaries[booking.id],
      })),
    [bookings, threadSummaries],
  );

  const bookingSummary = useMemo(
    () => ({
      totalRequests: filteredBookings.length,
      totalGuests: filteredBookings.reduce(
        (total, booking) => total + booking.guests,
        0,
      ),
      newRequests: filteredBookings.filter(
        (booking) => (booking.status || "new") === "new",
      ).length,
      confirmedRequests: filteredBookings.filter(
        (booking) => booking.status === "confirmed",
      ).length,
      needsResponse: bookings.filter(
        (booking) => threadSummaries[booking.id]?.needsResponse,
      ).length,
      pendingChanges: Object.values(changeRequestsByBooking).reduce(
        (total, requests) =>
          total + getBookingChangeRequestSummary(requests).pendingCount,
        0,
      ),
      payouts: getVendorPayoutSummary({ bookings: filteredBookings }),
    }),
    [bookings, changeRequestsByBooking, filteredBookings, threadSummaries],
  );
  const moneyForecast = useMemo(
    () => getCashflowForecast({ bookings: filteredBookings }),
    [filteredBookings],
  );
  const moneyAlerts = useMemo(
    () => getBookingMoneyAlerts({ bookings: filteredBookings }).slice(0, 6),
    [filteredBookings],
  );
  const paymentReminders = useMemo(
    () => getOverduePaymentReminders({ bookings: filteredBookings }).slice(0, 5),
    [filteredBookings],
  );
  const paymentPresets = useMemo(() => getPaymentPresets(), []);

  if (checkingAuth || !authorized) {
    return null;
  }

  function patchLocalBooking(
    bookingId: string,
    patch: Partial<BookingWithListingName>,
  ) {
    setBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking.id === bookingId ? { ...booking, ...patch } : booking,
      ),
    );
  }

  async function updateBooking(
    bookingId: string,
    changes: Pick<BookingWithListingName, "status" | "admin_notes">,
    sendEmail = false,
    payout?: {
      commissionStatus?: VendorPayoutStatus;
      payoutNote?: string | null;
      payoutScheduledFor?: string | null;
    },
    money?: Record<string, unknown>,
  ) {
    setSavingBookingId(bookingId);

    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        status: changes.status,
        adminNotes: changes.admin_notes,
        sendEmail,
        commissionStatus: payout?.commissionStatus,
        payoutNote: payout?.payoutNote,
        payoutScheduledFor: payout?.payoutScheduledFor,
        ...(money || {}),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(`Unable to update booking: ${result.error || "Please try again."}`);
      setSavingBookingId(null);
      return;
    }

    setBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              ...changes,
              ...(result.booking || {}),
              ...(payout?.commissionStatus
                ? { commission_status: payout.commissionStatus }
                : {}),
              ...(payout && "payoutNote" in payout
                ? { payout_note: payout.payoutNote || null }
                : {}),
              ...(payout && "payoutScheduledFor" in payout
                ? { payout_scheduled_for: payout.payoutScheduledFor || null }
                : {}),
              ...(payout?.commissionStatus
                ? {
                    payout_paid_at:
                      payout.commissionStatus === "paid"
                        ? new Date().toISOString()
                        : null,
                  }
                : {}),
            }
          : booking,
      ),
    );
    setSavingBookingId(null);
  }

  function saveMoneyCommand(
    booking: BookingWithListingName,
    money: Record<string, unknown>,
  ) {
    return updateBooking(
      booking.id,
      {
        status: booking.status || "new",
        admin_notes: booking.admin_notes,
      },
      false,
      undefined,
      money,
    );
  }

  async function updateChangeRequest(
    bookingId: string,
    changeRequestId: string,
    action: "approved" | "declined",
  ) {
    const { data: sessionData } = await supabase.auth.getSession();
    setSavingBookingId(bookingId);

    const response = await fetch(`/api/booking-change-requests/${changeRequestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        action,
        responseNote: changeActionNotes[changeRequestId] || "",
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      changeRequest?: BookingChangeRequest;
    };

    setSavingBookingId(null);

    if (!response.ok || !result.changeRequest) {
      alert(result.error || "Unable to update change request.");
      return;
    }

    setChangeRequestsByBooking((current) => ({
      ...current,
      [bookingId]: (current[bookingId] || []).map((request) =>
        request.id === changeRequestId ? result.changeRequest! : request,
      ),
    }));

    if (action === "approved") {
      setBookings((currentBookings) =>
        currentBookings.map((booking) =>
          booking.id === bookingId
            ? {
                ...booking,
                tour_date:
                  result.changeRequest?.requested_tour_date || booking.tour_date,
                tour_time:
                  result.changeRequest?.requested_tour_time || booking.tour_time,
                guests: result.changeRequest?.requested_guests || booking.guests,
              }
            : booking,
        ),
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <div className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-[#0B3C5D]">
                Admin Bookings
              </h1>
              <p className="mt-2 text-gray-600">
                View all booking requests submitted through RoatanIsland.life
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <ExportCsvButton type="bookings" />
              <ExportCsvButton type="vendor_payout_statements" />
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  setAuthorized(false);
                  router.push("/admin/login");
                }}
                className="rounded-xl bg-red-500 px-4 py-2 text-white"
              >
                Logout
              </button>
            </div>
          </div>

          {loading ? (
            <p className="mt-8">Loading bookings...</p>
          ) : bookings.length === 0 ? (
            <p className="mt-8">No bookings found.</p>
          ) : (
            <>
            <div className="mt-8 grid gap-3 md:grid-cols-4">
              {[
                ["Shown requests", bookingSummary.totalRequests],
                ["Guests", bookingSummary.totalGuests],
                ["Needs review", bookingSummary.newRequests],
                ["Needs response", bookingSummary.needsResponse],
                ["Pending changes", bookingSummary.pendingChanges],
                ["Unpaid payouts", formatMoney(bookingSummary.payouts.unpaidCents)],
                ["Scheduled payouts", formatMoney(bookingSummary.payouts.scheduledCents)],
                ["Paid payouts", formatMoney(bookingSummary.payouts.paidCents)],
                ["Next payout", bookingSummary.payouts.nextScheduledDate || "Not scheduled"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-2xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-4"
                >
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#9C7A2F]">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#0B3C5D]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <section className="mt-6 rounded-2xl bg-[#071F2F] p-5 text-white shadow-xl shadow-[#071F2F]/10">
              <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D6B56D]">
                    Booking Money Command Center
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    Payments, refunds, invoices, and payouts in one place.
                  </h2>
                </div>
                <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-black">
                  Cashflow forecast: {moneyForecast.label}
                </span>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-5">
                {[
                  ["30-day balances", formatMoneyCents(moneyForecast.next30BalanceCents)],
                  ["Paid so far", formatMoneyCents(moneyForecast.paidCents)],
                  ["Refund workflow", formatMoneyCents(moneyForecast.refundPendingCents)],
                  ["Payout ready", formatMoneyCents(moneyForecast.payoutDueCents)],
                  ["Money alerts", moneyAlerts.length],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/10 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9EE8E3]">
                      {label}
                    </p>
                    <p className="mt-2 text-xl font-black">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2 md:grid-cols-3">
                {moneyAlerts.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75">
                    No overdue balances, refund flags, or payout issues in the
                    current view.
                  </p>
                ) : (
                  moneyAlerts.map((alert) => (
                    <p
                      key={`${alert.type}-${alert.bookingId}`}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white"
                    >
                      {alert.label}: {formatMoneyCents(alert.amountCents)}
                    </p>
                  ))
                )}
              </div>
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9EE8E3]">
                  Overdue balance reminders
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {paymentReminders.length > 0 ? (
                    paymentReminders.map((reminder) => (
                      <p
                        key={`${reminder.bookingId}-${reminder.tone}`}
                        className="rounded-lg bg-white/10 px-3 py-2 text-sm font-bold"
                      >
                        {reminder.label}: {formatMoneyCents(reminder.amountCents)}
                      </p>
                    ))
                  ) : (
                    <p className="text-sm text-white/70">
                      No payment reminders need attention right now.
                    </p>
                  )}
                </div>
              </div>
            </section>
            <div className="mt-8 grid gap-4 rounded-2xl bg-[#F7F3EA] p-4 lg:grid-cols-[1fr_190px_190px_190px_auto] lg:items-center">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bookings, names, emails, dates, notes"
                className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
              />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as BookingStatus | "all")
                }
                className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
              >
                <option value="all">All statuses</option>
                <option value="new">New</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <select
                value={viewMode}
                onChange={(e) =>
                  setViewMode(e.target.value as "calendar" | "table")
                }
                className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
              >
                <option value="calendar">Calendar view</option>
                <option value="table">Table view</option>
              </select>
              <select
                value={responseFilter}
                onChange={(e) =>
                  setResponseFilter(e.target.value as "all" | "needs_response")
                }
                className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
              >
                <option value="all">All threads</option>
                <option value="needs_response">Needs response</option>
              </select>
              <p className="text-sm font-semibold text-[#0B3C5D]">
                {filteredBookings.length} shown
              </p>
            </div>

            {filteredBookings.length === 0 ? (
              <p className="mt-8 rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                No bookings match those filters.
              </p>
            ) : (
              <>
                {viewMode === "calendar" ? (
            <div className="mt-6 grid gap-5">
              {groupedBookings.map((group) => (
                <section
                  key={group.date}
                  className="rounded-2xl border border-gray-200 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <h2 className="text-xl font-bold text-[#0B3C5D]">
                      {group.date}
                    </h2>
                    <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-sm font-semibold text-[#0B3C5D]">
                      {group.bookings.length} booking
                      {group.bookings.length === 1 ? "" : "s"} -{" "}
                      {group.totalGuests} guest
                      {group.totalGuests === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {group.bookings.map((booking) => (
                      <article
                        key={booking.id}
                        className="rounded-xl bg-[#F7F3EA] p-4"
                      >
                        <div className="flex flex-wrap justify-between gap-3">
                          <div>
                            <p className="font-bold text-[#0B3C5D]">
                              {booking.tour_time} - {booking.full_name}
                            </p>
                            <p className="mt-1 text-sm text-gray-600">
                              {booking.listing_name}
                            </p>
                          </div>
                          <span className="h-fit rounded-full bg-white px-3 py-1 text-sm font-semibold capitalize text-[#0B3C5D]">
                            {formatBookingStatus(booking.status)}
                          </span>
                          <span
                            className={`h-fit rounded-full px-3 py-1 text-sm font-semibold ${threadBadgeClass(
                              threadSummaries[booking.id],
                            )}`}
                          >
                            {threadSummaries[booking.id]?.badgeLabel ||
                              "No messages"}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-gray-600">
                          {booking.guests} guest
                          {booking.guests === 1 ? "" : "s"} - {booking.email}
                        </p>
                        <p className="mt-2 text-sm font-semibold capitalize text-[#0B3C5D]">
                          Vendor payout: {formatPayoutStatus(booking.commission_status)} -{" "}
                          {formatMoney(
                            (booking.booking_value_cents || 0) -
                              (booking.commission_amount_cents || 0),
                          )}
                        </p>
                        {(() => {
                          const opsPriority = getBookingOpsPriority({
                            status: booking.status,
                            depositStatus: booking.deposit_status,
                            threadNeedsResponse: Boolean(
                              threadSummaries[booking.id]?.needsResponse,
                            ),
                            paymentIssue: booking.payment_issue_flag,
                            tourDate: booking.tour_date,
                          });

                          return (
                            <div className="mt-3 rounded-lg border border-[#00A8A8]/15 bg-white p-3">
                              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#007B7B]">
                                Command cue
                              </p>
                              <p className="mt-1 font-black text-[#0B3C5D]">
                                {opsPriority.label}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-gray-600">
                                {opsPriority.text}
                              </p>
                            </div>
                          );
                        })()}
                        <div className="mt-3 grid gap-2 rounded-lg bg-white p-3 text-sm sm:grid-cols-3">
                          {(() => {
                            const snapshot = getBookingMoneySnapshot(booking);
                            return (
                              <>
                                <p>
                                  <span className="block text-xs font-black uppercase text-gray-500">
                                    Payment
                                  </span>
                                  <span className="font-bold text-[#0B3C5D]">
                                    {snapshot.paymentLabel}
                                  </span>
                                </p>
                                <p>
                                  <span className="block text-xs font-black uppercase text-gray-500">
                                    Balance
                                  </span>
                                  <span className="font-bold text-[#0B3C5D]">
                                    {formatMoneyCents(snapshot.balanceDueCents)}
                                  </span>
                                </p>
                                <p>
                                  <span className="block text-xs font-black uppercase text-gray-500">
                                    Due
                                  </span>
                                  <span className="font-bold text-[#0B3C5D]">
                                    {snapshot.dueLabel}
                                  </span>
                                </p>
                              </>
                            );
                          })()}
                        </div>
                        {(changeRequestsByBooking[booking.id] || []).filter(
                          (request) => request.status === "pending",
                        ).length > 0 ? (
                          <div className="mt-3 rounded-lg bg-[#FFF8E8] p-3">
                            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9C7A2F]">
                              Pending changes
                            </p>
                            {(changeRequestsByBooking[booking.id] || [])
                              .filter((request) => request.status === "pending")
                              .slice(0, 1)
                              .map((request) => (
                                <div key={request.id} className="mt-2">
                                  <p className="text-sm text-gray-700">
                                    {request.requested_tour_date ||
                                      booking.tour_date}{" "}
                                    at{" "}
                                    {request.requested_tour_time ||
                                      booking.tour_time}
                                    {request.requested_guests
                                      ? ` / ${request.requested_guests} guests`
                                      : ""}
                                  </p>
                                  <textarea
                                    value={changeActionNotes[request.id] || ""}
                                    onChange={(event) =>
                                      setChangeActionNotes((current) => ({
                                        ...current,
                                        [request.id]: event.target.value,
                                      }))
                                    }
                                    rows={2}
                                    placeholder="Response note"
                                    className="mt-2 w-full rounded-lg border border-white px-3 py-2 text-sm outline-none"
                                  />
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateChangeRequest(
                                          booking.id,
                                          request.id,
                                          "approved",
                                        )
                                      }
                                      className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateChangeRequest(
                                          booking.id,
                                          request.id,
                                          "declined",
                                        )
                                      }
                                      className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : null}
                        {booking.guest_message || booking.vendor_note ? (
                          <p className="mt-3 text-sm leading-6 text-gray-600">
                            {booking.vendor_note ||
                              booking.guest_message ||
                              ""}
                          </p>
                        ) : null}
                        <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-gray-600">
                          {threadSummaries[booking.id]?.lastMessagePreview ||
                            "No thread messages yet."}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBookingId(booking.id);
                            setChatOpen(true);
                          }}
                          className="mt-3 rounded-lg bg-[#0B3C5D] px-4 py-2 text-sm font-bold text-white"
                        >
                          Open thread
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            ) : (
            <>
            <div className="mt-6 rounded-xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-4 text-sm font-semibold text-[#0B3C5D] md:hidden">
              Table view is optimized for wider screens. Use calendar view on
              your phone for the cleanest booking workflow.
            </div>
            <div className="mt-6 hidden md:block overflow-x-auto">
              <table className="min-w-[1100px] border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Listing</th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Guests</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Vendor Note</th>
                  <th className="px-4 py-3">Deposit</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Money command</th>
                  <th className="px-4 py-3">Vendor payout</th>
                  <th className="px-4 py-3">Payout note</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
                  <th className="px-4 py-3">Change requests</th>
                  <th className="px-4 py-3">Messages</th>
                  <th className="px-4 py-3">Thread</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="border-b align-top">
                    <td className="px-4 py-3 font-medium">{booking.listing_name}</td>
                    <td className="px-4 py-3">{booking.full_name}</td>
                    <td className="px-4 py-3">{booking.email}</td>
                    <td className="px-4 py-3">{booking.tour_date}</td>
                    <td className="px-4 py-3">{booking.tour_time}</td>
                    <td className="px-4 py-3">{booking.guests}</td>
                    <td className="max-w-72 px-4 py-3 text-sm text-gray-600">
                      {booking.guest_message || "No message"}
                    </td>
                    <td className="max-w-72 px-4 py-3 text-sm text-gray-600">
                      {booking.vendor_note || "No vendor note"}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {formatDeposit(booking)}
                    </td>
                    <td className="px-4 py-3">
                      {formatMoney(booking.booking_value_cents)}
                    </td>
                    <td className="min-w-[430px] px-4 py-3">
                      {(() => {
                        const snapshot = getBookingMoneySnapshot(booking);

                        return (
                          <div className="rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
                                  Payment schedule
                                </p>
                                <p className="mt-1 font-black text-[#0B3C5D]">
                                  {snapshot.paymentLabel}
                                </p>
                                <p className="text-xs font-bold text-gray-600">
                                  Balance due:{" "}
                                  {formatMoneyCents(snapshot.balanceDueCents)} /{" "}
                                  {snapshot.dueLabel}
                                </p>
                              </div>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0B3C5D]">
                                {snapshot.invoiceNumber}
                              </span>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-[#0B3C5D]">
                                Payment schedule
                                <select
                                  value={
                                    booking.payment_schedule_type ||
                                    "request_later"
                                  }
                                  onChange={(event) => {
                                    patchLocalBooking(booking.id, {
                                      payment_schedule_type: event.target.value,
                                    });
                                    saveMoneyCommand(booking, {
                                      paymentScheduleType: event.target.value,
                                    });
                                  }}
                                  className="rounded-lg border border-white px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none"
                                >
                                  {paymentPresets.map((preset) => (
                                    <option key={preset.id} value={preset.id}>
                                      {preset.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-[#0B3C5D]">
                                Deposit status
                                <select
                                  value={
                                    booking.deposit_status || "not_requested"
                                  }
                                  onChange={(event) => {
                                    patchLocalBooking(booking.id, {
                                      deposit_status: event.target.value,
                                    });
                                    saveMoneyCommand(booking, {
                                      depositStatus: event.target.value,
                                    });
                                  }}
                                  className="rounded-lg border border-white px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none"
                                >
                                  <option value="not_requested">Not requested</option>
                                  <option value="checkout_started">
                                    Checkout started
                                  </option>
                                  <option value="paid">Deposit paid</option>
                                  <option value="full_paid">Full paid</option>
                                  <option value="manual_paid">Manual paid</option>
                                  <option value="failed">Failed</option>
                                  <option value="waived">Waived</option>
                                </select>
                              </label>
                              {[
                                [
                                  "Booking value cents",
                                  "booking_value_cents",
                                  "bookingValueCents",
                                  booking.booking_value_cents,
                                ],
                                [
                                  "Amount paid cents",
                                  "amount_paid_cents",
                                  "amountPaidCents",
                                  booking.amount_paid_cents,
                                ],
                                [
                                  "Balance due cents",
                                  "balance_due_cents",
                                  "balanceDueCents",
                                  booking.balance_due_cents,
                                ],
                              ].map(([label, localKey, payloadKey, value]) => (
                                <label
                                  key={String(localKey)}
                                  className="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-[#0B3C5D]"
                                >
                                  {label}
                                  <input
                                    type="number"
                                    min="0"
                                    value={moneyInputValue(value as number | null)}
                                    onChange={(event) =>
                                      patchLocalBooking(booking.id, {
                                        [localKey as keyof BookingWithListingName]:
                                          toNullableCents(event.target.value),
                                      } as Partial<BookingWithListingName>)
                                    }
                                    onBlur={(event) =>
                                      saveMoneyCommand(booking, {
                                        [payloadKey as string]:
                                          event.currentTarget.value,
                                      })
                                    }
                                    className="rounded-lg border border-white px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none"
                                  />
                                </label>
                              ))}
                              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-[#0B3C5D]">
                                Balance due date
                                <input
                                  type="date"
                                  value={booking.balance_due_date || ""}
                                  onChange={(event) =>
                                    patchLocalBooking(booking.id, {
                                      balance_due_date:
                                        event.target.value || null,
                                    })
                                  }
                                  onBlur={(event) =>
                                    saveMoneyCommand(booking, {
                                      balanceDueDate:
                                        event.currentTarget.value || null,
                                    })
                                  }
                                  className="rounded-lg border border-white px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none"
                                />
                              </label>
                              <label className="grid gap-1 text-xs font-black uppercase tracking-[0.1em] text-[#0B3C5D]">
                                Payment method
                                <select
                                  value={booking.payment_method || ""}
                                  onChange={(event) => {
                                    patchLocalBooking(booking.id, {
                                      payment_method:
                                        event.target.value || null,
                                    });
                                    saveMoneyCommand(booking, {
                                      paymentMethod:
                                        event.target.value || null,
                                    });
                                  }}
                                  className="rounded-lg border border-white px-3 py-2 text-sm font-semibold normal-case tracking-normal outline-none"
                                >
                                  <option value="">Not set</option>
                                  <option value="stripe">Stripe</option>
                                  <option value="cash">Cash</option>
                                  <option value="zelle">Zelle</option>
                                  <option value="paypal">PayPal</option>
                                  <option value="bank">Bank transfer</option>
                                  <option value="other">Other</option>
                                </select>
                              </label>
                            </div>
                            <details className="mt-3 rounded-lg bg-white p-3">
                              <summary className="cursor-pointer text-sm font-black text-[#0B3C5D]">
                                Invoice and Receipt
                              </summary>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <input
                                  value={booking.invoice_number || ""}
                                  onChange={(event) =>
                                    patchLocalBooking(booking.id, {
                                      invoice_number: event.target.value,
                                    })
                                  }
                                  onBlur={(event) =>
                                    saveMoneyCommand(booking, {
                                      invoiceNumber: event.currentTarget.value,
                                    })
                                  }
                                  placeholder="Invoice number"
                                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                                />
                                <input
                                  value={booking.receipt_number || ""}
                                  onChange={(event) =>
                                    patchLocalBooking(booking.id, {
                                      receipt_number: event.target.value,
                                    })
                                  }
                                  onBlur={(event) =>
                                    saveMoneyCommand(booking, {
                                      receiptNumber: event.currentTarget.value,
                                    })
                                  }
                                  placeholder="Receipt number"
                                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                                />
                              </div>
                            </details>
                            <details className="mt-3 rounded-lg bg-white p-3">
                              <summary className="cursor-pointer text-sm font-black text-[#0B3C5D]">
                                Manual payment
                              </summary>
                              <textarea
                                value={booking.manual_payment_note || ""}
                                onChange={(event) =>
                                  patchLocalBooking(booking.id, {
                                    manual_payment_note: event.target.value,
                                  })
                                }
                                onBlur={(event) =>
                                  saveMoneyCommand(booking, {
                                    manualPaymentNote: event.currentTarget.value,
                                  })
                                }
                                rows={2}
                                placeholder="Cash, transfer reference, or other manual payment note"
                                className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                              />
                            </details>
                            <details className="mt-3 rounded-lg bg-white p-3">
                              <summary className="cursor-pointer text-sm font-black text-[#0B3C5D]">
                                Refund workflow
                              </summary>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <select
                                  value={booking.refund_status || "none"}
                                  onChange={(event) => {
                                    patchLocalBooking(booking.id, {
                                      refund_status: event.target.value,
                                    });
                                    saveMoneyCommand(booking, {
                                      refundStatus: event.target
                                        .value as RefundStatus,
                                    });
                                  }}
                                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                                >
                                  <option value="none">No refund</option>
                                  <option value="pending">Pending</option>
                                  <option value="partial">Partial</option>
                                  <option value="full">Full refund</option>
                                  <option value="declined">Declined</option>
                                </select>
                                <input
                                  type="number"
                                  min="0"
                                  value={moneyInputValue(
                                    booking.refund_amount_cents,
                                  )}
                                  onChange={(event) =>
                                    patchLocalBooking(booking.id, {
                                      refund_amount_cents: toNullableCents(
                                        event.target.value,
                                      ),
                                    })
                                  }
                                  onBlur={(event) =>
                                    saveMoneyCommand(booking, {
                                      refundAmountCents:
                                        event.currentTarget.value,
                                    })
                                  }
                                  placeholder="Refund cents"
                                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                                />
                              </div>
                              <textarea
                                value={booking.refund_note || ""}
                                onChange={(event) =>
                                  patchLocalBooking(booking.id, {
                                    refund_note: event.target.value,
                                  })
                                }
                                onBlur={(event) =>
                                  saveMoneyCommand(booking, {
                                    refundNote: event.currentTarget.value,
                                  })
                                }
                                rows={2}
                                placeholder="Refund note"
                                className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                              />
                            </details>
                            <details className="mt-3 rounded-lg bg-white p-3">
                              <summary className="cursor-pointer text-sm font-black text-[#0B3C5D]">
                                Payment issue
                              </summary>
                              <label className="mt-3 flex items-center gap-2 text-sm font-bold text-[#0B3C5D]">
                                <input
                                  type="checkbox"
                                  checked={Boolean(booking.payment_issue_flag)}
                                  onChange={(event) => {
                                    patchLocalBooking(booking.id, {
                                      payment_issue_flag:
                                        event.target.checked,
                                    });
                                    saveMoneyCommand(booking, {
                                      paymentIssueFlag: event.target.checked,
                                    });
                                  }}
                                />
                                Flag this booking for payment review
                              </label>
                              <textarea
                                value={booking.payment_issue_note || ""}
                                onChange={(event) =>
                                  patchLocalBooking(booking.id, {
                                    payment_issue_note: event.target.value,
                                  })
                                }
                                onBlur={(event) =>
                                  saveMoneyCommand(booking, {
                                    paymentIssueNote:
                                      event.currentTarget.value,
                                  })
                                }
                                rows={2}
                                placeholder="Payment issue note"
                                className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                              />
                            </details>
                            <details className="mt-3 rounded-lg bg-white p-3">
                              <summary className="cursor-pointer text-sm font-black text-[#0B3C5D]">
                                Commission override and private payout note
                              </summary>
                              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={moneyInputValue(
                                    booking.commission_override_cents,
                                  )}
                                  onChange={(event) =>
                                    patchLocalBooking(booking.id, {
                                      commission_override_cents: toNullableCents(
                                        event.target.value,
                                      ),
                                    })
                                  }
                                  onBlur={(event) =>
                                    saveMoneyCommand(booking, {
                                      commissionOverrideCents:
                                        event.currentTarget.value,
                                    })
                                  }
                                  placeholder="Commission override cents"
                                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                                />
                                <input
                                  value={booking.payment_link_url || ""}
                                  onChange={(event) =>
                                    patchLocalBooking(booking.id, {
                                      payment_link_url: event.target.value,
                                    })
                                  }
                                  onBlur={(event) =>
                                    saveMoneyCommand(booking, {
                                      paymentLinkUrl:
                                        event.currentTarget.value,
                                    })
                                  }
                                  placeholder="Payment link URL"
                                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                                />
                              </div>
                              <textarea
                                value={booking.vendor_private_payout_note || ""}
                                onChange={(event) =>
                                  patchLocalBooking(booking.id, {
                                    vendor_private_payout_note:
                                      event.target.value,
                                  })
                                }
                                onBlur={(event) =>
                                  saveMoneyCommand(booking, {
                                    vendorPrivatePayoutNote:
                                      event.currentTarget.value,
                                  })
                                }
                                rows={2}
                                placeholder="Private payout note visible to vendor"
                                className="mt-3 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
                              />
                            </details>
                            <div className="mt-3 rounded-lg bg-white p-3">
                              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                                <div>
                                  <p className="text-sm font-black text-[#0B3C5D]">
                                    Send payment request
                                  </p>
                                  <p className="mt-1 text-xs font-semibold text-gray-600">
                                    Emails the guest with their balance, invoice,
                                    due date, and payment link.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    saveMoneyCommand(booking, {
                                      sendPaymentRequest: true,
                                      paymentLinkUrl:
                                        booking.payment_link_url ||
                                        `${window.location.origin}/book/status/${booking.id}`,
                                    })
                                  }
                                  disabled={savingBookingId === booking.id}
                                  className="rounded-lg bg-[#00A8A8] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                                >
                                  Send payment request
                                </button>
                              </div>
                              {booking.payment_last_sent_at ? (
                                <p className="mt-2 text-xs font-bold text-[#007B7B]">
                                  Last sent{" "}
                                  {new Date(
                                    booking.payment_last_sent_at,
                                  ).toLocaleString()}
                                </p>
                              ) : null}
                            </div>
                            <details className="mt-3 rounded-lg bg-white p-3">
                              <summary className="cursor-pointer text-sm font-black text-[#0B3C5D]">
                                Payment history
                              </summary>
                              <div className="mt-3 grid gap-2">
                                {getPaymentHistoryTimeline({
                                  booking,
                                  events: moneyEventsByBooking[booking.id] || [],
                                })
                                  .slice(0, 5)
                                  .map((item, index) => (
                                    <div
                                      key={`${item.label}-${item.createdAt}-${index}`}
                                      className="rounded-lg bg-[#F7F3EA] p-3 text-sm"
                                    >
                                      <div className="flex justify-between gap-3">
                                        <p className="font-black text-[#0B3C5D]">
                                          {item.label}
                                        </p>
                                        <p className="font-black text-[#007B7B]">
                                          {item.amountLabel}
                                        </p>
                                      </div>
                                      <p className="mt-1 text-xs text-gray-600">
                                        {item.note || item.actorLabel}
                                        {item.createdAt
                                          ? ` / ${new Date(item.createdAt).toLocaleString()}`
                                          : ""}
                                      </p>
                                    </div>
                                  ))}
                                {getPaymentHistoryTimeline({
                                  booking,
                                  events: moneyEventsByBooking[booking.id] || [],
                                }).length === 0 ? (
                                  <p className="text-sm text-gray-600">
                                    No payment history yet.
                                  </p>
                                ) : null}
                              </div>
                            </details>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 capitalize">
                      <p className="font-semibold text-[#0B3C5D]">
                        {formatMoney(
                          (booking.booking_value_cents || 0) -
                            (booking.commission_amount_cents || 0),
                        )}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Commission kept: {formatMoney(booking.commission_amount_cents)}
                      </p>
                      <select
                        value={booking.commission_status || "unpaid"}
                        onChange={(e) =>
                          updateBooking(
                            booking.id,
                            {
                              status: booking.status || "new",
                              admin_notes: booking.admin_notes,
                            },
                            false,
                            {
                              commissionStatus:
                                e.target.value as VendorPayoutStatus,
                            },
                          )
                        }
                        className="mt-2 rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none"
                        disabled={savingBookingId === booking.id}
                      >
                        <option value="unpaid">Unpaid</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="paid">Paid</option>
                        <option value="waived">Waived</option>
                      </select>
                      <input
                        type="date"
                        value={booking.payout_scheduled_for || ""}
                        onChange={(e) =>
                          updateBooking(
                            booking.id,
                            {
                              status: booking.status || "new",
                              admin_notes: booking.admin_notes,
                            },
                            false,
                            {
                              payoutScheduledFor: e.target.value || null,
                              commissionStatus:
                                e.target.value &&
                                (booking.commission_status || "unpaid") === "unpaid"
                                  ? "scheduled"
                                  : (booking.commission_status ||
                                      "unpaid") as VendorPayoutStatus,
                            },
                          )
                        }
                        className="mt-2 w-36 rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none"
                        disabled={savingBookingId === booking.id}
                      />
                      {booking.payout_paid_at ? (
                        <p className="mt-1 text-xs text-green-700">
                          Paid {booking.payout_paid_at.slice(0, 10)}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <label className="sr-only">Payout note</label>
                      <textarea
                        value={booking.payout_note || ""}
                        onChange={(e) => {
                          const payoutNote = e.target.value;
                          setBookings((currentBookings) =>
                            currentBookings.map((currentBooking) =>
                              currentBooking.id === booking.id
                                ? {
                                    ...currentBooking,
                                    payout_note: payoutNote,
                                  }
                                : currentBooking,
                            ),
                          );
                        }}
                        onBlur={(e) =>
                          updateBooking(
                            booking.id,
                            {
                              status: booking.status || "new",
                              admin_notes: booking.admin_notes,
                            },
                            false,
                            { payoutNote: e.target.value || null },
                          )
                        }
                        rows={2}
                        className="min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                        placeholder="Payout note"
                        disabled={savingBookingId === booking.id}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={booking.status || "new"}
                        onChange={(e) =>
                          updateBooking(booking.id, {
                            status: e.target.value as BookingStatus,
                            admin_notes: booking.admin_notes,
                          }, e.target.value !== booking.status)
                        }
                        className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                        disabled={savingBookingId === booking.id}
                      >
                        <option value="new">New</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <textarea
                        value={booking.admin_notes || ""}
                        onChange={(e) => {
                          const adminNotes = e.target.value;
                          setBookings((currentBookings) =>
                            currentBookings.map((currentBooking) =>
                              currentBooking.id === booking.id
                                ? {
                                    ...currentBooking,
                                    admin_notes: adminNotes,
                                  }
                                : currentBooking,
                            ),
                          );
                        }}
                        onBlur={(e) =>
                          updateBooking(booking.id, {
                            status: booking.status || "new",
                            admin_notes: e.target.value,
                          })
                        }
                        rows={2}
                        className="min-w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                        placeholder="Add follow-up notes"
                        disabled={savingBookingId === booking.id}
                      />
                    </td>
                    <td className="max-w-80 px-4 py-3">
                      {(changeRequestsByBooking[booking.id] || []).length > 0 ? (
                        <div className="grid gap-3">
                          <span className="w-fit rounded-full bg-[#FFF8E8] px-3 py-1 text-xs font-black text-[#7A5B12]">
                            {
                              getBookingChangeRequestSummary(
                                changeRequestsByBooking[booking.id] || [],
                              ).latestLabel
                            }
                          </span>
                          {(changeRequestsByBooking[booking.id] || [])
                            .filter((request) => request.status === "pending")
                            .slice(0, 1)
                            .map((request) => (
                              <div key={request.id} className="grid gap-2">
                                <p className="text-sm text-gray-600">
                                  {request.requested_tour_date ||
                                    booking.tour_date}{" "}
                                  at{" "}
                                  {request.requested_tour_time ||
                                    booking.tour_time}
                                  {request.requested_guests
                                    ? ` / ${request.requested_guests} guests`
                                    : ""}
                                </p>
                                <textarea
                                  value={changeActionNotes[request.id] || ""}
                                  onChange={(event) =>
                                    setChangeActionNotes((current) => ({
                                      ...current,
                                      [request.id]: event.target.value,
                                    }))
                                  }
                                  rows={2}
                                  placeholder="Response note"
                                  className="min-w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                                />
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateChangeRequest(
                                        booking.id,
                                        request.id,
                                        "approved",
                                      )
                                    }
                                    className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateChangeRequest(
                                        booking.id,
                                        request.id,
                                        "declined",
                                      )
                                    }
                                    className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white"
                                  >
                                    Decline
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No changes</span>
                      )}
                    </td>
                    <td className="max-w-72 px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${threadBadgeClass(
                          threadSummaries[booking.id],
                        )}`}
                      >
                        {threadSummaries[booking.id]?.badgeLabel ||
                          "No messages"}
                      </span>
                      <p className="mt-2 text-sm text-gray-600">
                        {threadSummaries[booking.id]?.lastMessagePreview ||
                          "No thread messages yet."}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBookingId(booking.id);
                          setChatOpen(true);
                        }}
                        className="rounded-lg bg-[#0B3C5D] px-3 py-2 text-sm font-bold text-white"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            </>
            )}
              </>
            )}
            </>
          )}
        </div>
        <BookingChatDrawer
          threads={chatThreads}
          viewerRole="admin"
          allowInternalNotes
          open={chatOpen}
          onOpenChange={setChatOpen}
          selectedThreadId={selectedBookingId}
          onSelectedThreadIdChange={setSelectedBookingId}
          emptyText="No booking conversations yet."
        />
      </div>
    </main>
  );
}
