import { NextResponse } from "next/server";
import { availabilitySummary } from "@/lib/availability-calendar";
import { supabaseServer } from "@/lib/supabase-server";

type ListingAvailabilityRules = {
  max_guests: number | null;
  blocked_dates: string[] | null;
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
    .select("max_guests, blocked_dates")
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
  const summary = availabilitySummary({
    date,
    time,
    requestedGuests,
    maxGuests: rules.max_guests,
    reservedGuests,
    blockedDates: rules.blocked_dates || [],
  });

  return NextResponse.json({
    ...summary,
    reservedGuests,
    requestedGuests,
  });
}
