import { NextResponse } from "next/server";
import { checkBookingAvailability } from "@/lib/booking-availability";
import { supabaseServer } from "@/lib/supabase-server";

type ListingAvailabilityRules = {
  tour_times: string[] | null;
  max_guests: number | null;
  blocked_dates: string[] | null;
  minimum_notice_hours: number | null;
  booking_cutoff_hours: number | null;
  private_booking_mode: boolean | null;
  available_weekdays: number[] | null;
  season_start_date: string | null;
  season_end_date: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  const date = searchParams.get("date") || "";
  const time = searchParams.get("time") || "";
  const guests = Number(searchParams.get("guests") || "1");
  const requestedGuests = Number.isFinite(guests) && guests > 0 ? guests : 1;

  if (!listingId) {
    return NextResponse.json(
      { error: "Missing listing ID." },
      { status: 400 },
    );
  }

  const { data: listing, error: listingError } = await supabaseServer
    .from("listings")
    .select(
      "tour_times, max_guests, blocked_dates, minimum_notice_hours, booking_cutoff_hours, private_booking_mode, available_weekdays, season_start_date, season_end_date",
    )
    .eq("id", listingId)
    .maybeSingle();

  if (listingError) {
    return NextResponse.json({ error: listingError.message }, { status: 500 });
  }

  if (!listing) {
    return NextResponse.json(
      { error: "Listing not found." },
      { status: 404 },
    );
  }

  let reservedGuests = 0;

  if (date && time) {
    const { data: bookings, error: bookingsError } = await supabaseServer
      .from("bookings")
      .select("guests")
      .eq("listing_id", listingId)
      .eq("tour_date", date)
      .eq("tour_time", time)
      .in("status", ["new", "confirmed"]);

    if (bookingsError) {
      return NextResponse.json(
        { error: bookingsError.message },
        { status: 500 },
      );
    }

    reservedGuests = ((bookings as { guests: number }[] | null) || []).reduce(
      (total, booking) => total + booking.guests,
      0,
    );
  }

  const rules = listing as ListingAvailabilityRules;
  const summary = checkBookingAvailability({
    listing: rules,
    tourDate: date,
    tourTime: time,
    guests: requestedGuests,
    reservedGuests,
  });

  return NextResponse.json({
    ...summary,
    reservedGuests,
    requestedGuests,
  });
}
