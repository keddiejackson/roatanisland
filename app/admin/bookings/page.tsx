"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import ExportCsvButton from "@/app/admin/ExportCsvButton";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type BookingRow = {
  id: string;
  full_name: string;
  email: string;
  tour_date: string;
  tour_time: string;
  guests: number;
  status: BookingStatus | null;
  admin_notes: string | null;
  listing_id: string | null;
  deposit_status: string | null;
  deposit_amount_cents: number | null;
};

type BookingStatus = "new" | "confirmed" | "completed" | "cancelled";

type ListingRow = {
  id: string;
  title: string;
};

type BookingWithListingName = BookingRow & {
  listing_name: string;
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

export default function AdminBookingsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [bookings, setBookings] = useState<BookingWithListingName[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");

  useEffect(() => {
    async function verifyAdminSession() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user || !(await isAdminUser(data.user.email))) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

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
      setLoading(false);
    }

    if (authorized) {
      fetchBookingsAndListings();
    }
  }, [authorized]);

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
          booking.admin_notes || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());

        return matchesStatus && matchesSearch;
      }),
    [bookings, search, statusFilter],
  );

  if (checkingAuth || !authorized) {
    return null;
  }

  async function updateBooking(
    bookingId: string,
    changes: Pick<BookingWithListingName, "status" | "admin_notes">,
    sendEmail = false,
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
        booking.id === bookingId ? { ...booking, ...changes } : booking,
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
            <div className="mt-8 grid gap-4 rounded-2xl bg-[#F7F3EA] p-4 lg:grid-cols-[1fr_220px_auto] lg:items-center">
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
              <p className="text-sm font-semibold text-[#0B3C5D]">
                {filteredBookings.length} shown
              </p>
            </div>

            {filteredBookings.length === 0 ? (
              <p className="mt-8 rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                No bookings match those filters.
              </p>
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
                  <th className="px-4 py-3">Deposit</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Notes</th>
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
                    <td className="px-4 py-3 capitalize">
                      {formatDeposit(booking)}
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
                  </tr>
                ))}
              </tbody>
              </table>
            </div>
            )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
