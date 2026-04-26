import { NextResponse } from "next/server";
import { escapeHtml, sendAdminNotification } from "@/lib/notifications";
import { supabaseServer } from "@/lib/supabase-server";

type BookingRequest = {
  fullName?: string;
  email?: string;
  tourDate?: string;
  tourTime?: string;
  guests?: number | string;
  listingId?: string | null;
};

export async function POST(request: Request) {
  const body = (await request.json()) as BookingRequest;
  const guests = Number(body.guests);

  if (
    !body.fullName ||
    !body.email ||
    !body.tourDate ||
    !body.tourTime ||
    !Number.isFinite(guests) ||
    guests < 1
  ) {
    return NextResponse.json(
      { error: "Please complete every required booking field." },
      { status: 400 },
    );
  }

  const { data: booking, error } = await supabaseServer
    .from("bookings")
    .insert([
      {
        full_name: body.fullName,
        email: body.email,
        tour_date: body.tourDate,
        tour_time: body.tourTime,
        guests,
        listing_id: body.listingId || null,
      },
    ])
    .select("id, full_name, email, tour_date, tour_time, guests, listing_id")
    .single();

  if (error) {
    console.error("Booking API error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let listingTitle = "General booking request";

  if (booking.listing_id) {
    const { data: listing } = await supabaseServer
      .from("listings")
      .select("title")
      .eq("id", booking.listing_id)
      .maybeSingle();

    if (listing?.title) {
      listingTitle = listing.title;
    }
  }

  await sendAdminNotification({
    subject: `New booking request: ${listingTitle}`,
    replyTo: booking.email,
    html: `
      <h2>New booking request</h2>
      <p><strong>Listing:</strong> ${escapeHtml(listingTitle)}</p>
      <p><strong>Name:</strong> ${escapeHtml(booking.full_name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(booking.email)}</p>
      <p><strong>Date:</strong> ${escapeHtml(booking.tour_date)}</p>
      <p><strong>Time:</strong> ${escapeHtml(booking.tour_time)}</p>
      <p><strong>Guests:</strong> ${escapeHtml(booking.guests)}</p>
    `,
    text: [
      "New booking request",
      `Listing: ${listingTitle}`,
      `Name: ${booking.full_name}`,
      `Email: ${booking.email}`,
      `Date: ${booking.tour_date}`,
      `Time: ${booking.tour_time}`,
      `Guests: ${booking.guests}`,
    ].join("\n"),
  });

  return NextResponse.json({ bookingId: booking.id });
}
