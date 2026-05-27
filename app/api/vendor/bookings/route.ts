import { NextResponse } from "next/server";
import type { BookingChangeRequest } from "@/lib/booking-change-requests";
import { supabaseServer } from "@/lib/supabase-server";

async function getUserId(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  const { data } = await supabaseServer.auth.getUser(token);
  return data.user?.id || null;
}

export async function GET(request: Request) {
  const userId = await getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: vendorLink } = await supabaseServer
    .from("vendor_users")
    .select("vendor_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!vendorLink?.vendor_id) {
    return NextResponse.json({ bookings: [] });
  }

  const { data: listings } = await supabaseServer
    .from("listings")
    .select("id, title")
    .eq("vendor_id", vendorLink.vendor_id);

  const listingRows = (listings as { id: string; title: string }[]) || [];
  const listingIds = listingRows.map((listing) => listing.id);
  const listingMap = new Map(
    listingRows.map((listing) => [listing.id, listing.title]),
  );

  if (listingIds.length === 0) {
    return NextResponse.json({ bookings: [] });
  }

  const bookingSelectWithPayout =
    "id, full_name, email, tour_date, tour_time, guests, guest_message, vendor_note, status, listing_id, deposit_status, booking_value_cents, commission_amount_cents, commission_status, payout_note, payout_scheduled_for, payout_paid_at, selected_addons, created_at";
  const bookingResult = await supabaseServer
    .from("bookings")
    .select(bookingSelectWithPayout)
    .in("listing_id", listingIds)
    .order("created_at", { ascending: false })
    .limit(100);
  let bookings = bookingResult.data as unknown[] | null;
  let error = bookingResult.error;

  if (error?.code === "42703") {
    const fallback = await supabaseServer
      .from("bookings")
      .select(
        "id, full_name, email, tour_date, tour_time, guests, guest_message, vendor_note, status, listing_id, deposit_status, booking_value_cents, commission_amount_cents, commission_status, selected_addons, created_at",
      )
      .in("listing_id", listingIds)
      .order("created_at", { ascending: false })
      .limit(100);

    bookings = fallback.data as unknown[] | null;
    error = fallback.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const bookingRows = (bookings as { id: string; listing_id: string | null }[]) || [];
  const { data: changeRequests } =
    bookingRows.length === 0
      ? { data: [] }
      : await supabaseServer
          .from("booking_change_requests")
          .select("*")
          .in(
            "booking_id",
            bookingRows.map((booking) => booking.id),
          )
          .order("created_at", { ascending: false });
  const requestsByBooking = new Map<string, BookingChangeRequest[]>();

  for (const changeRequest of (changeRequests as BookingChangeRequest[]) || []) {
    requestsByBooking.set(changeRequest.booking_id, [
      ...(requestsByBooking.get(changeRequest.booking_id) || []),
      changeRequest,
    ]);
  }

  return NextResponse.json({
    bookings: bookingRows.map((booking) => ({
        ...booking,
        listing_name: booking.listing_id
          ? listingMap.get(booking.listing_id) || "Unknown listing"
          : "No listing",
        change_requests: requestsByBooking.get(booking.id) || [],
      })),
  });
}
