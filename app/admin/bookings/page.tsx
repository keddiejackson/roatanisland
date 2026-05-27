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
  bookingThreadSummary,
  type BookingMessageLike,
  type BookingThreadSummary,
} from "@/lib/booking-communication";
import { formatBookingStatus } from "@/lib/booking-flow";
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
  commission_amount_cents: number | null;
  commission_status: string | null;
  payout_note: string | null;
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
  const [threadSummaries, setThreadSummaries] = useState<
    Record<string, BookingThreadSummary>
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
      payouts: getVendorPayoutSummary({ bookings: filteredBookings }),
    }),
    [bookings, filteredBookings, threadSummaries],
  );

  if (checkingAuth || !authorized) {
    return null;
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
            <div className="mt-6 overflow-x-auto">
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
                  <th className="px-4 py-3">Vendor payout</th>
                  <th className="px-4 py-3">Payout note</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
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
