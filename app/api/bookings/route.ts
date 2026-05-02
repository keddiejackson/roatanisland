import { NextResponse } from "next/server";
import {
  escapeHtml,
  sendAdminNotification,
  sendEmailNotification,
} from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import { logAppError } from "@/lib/error-log";
import { supabaseServer } from "@/lib/supabase-server";

type BookingRequest = {
  fullName?: string;
  email?: string;
  tourDate?: string;
  tourTime?: string;
  guests?: number | string;
  guestMessage?: string;
  listingId?: string | null;
};

function dateValueFromOffset(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as BookingRequest;
  const guests = Number(body.guests);
  const guestMessage = body.guestMessage?.trim().slice(0, 1000) || null;
  let estimatedBookingValueCents: number | null = null;
  let estimatedCommissionCents: number | null = null;

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

  if (body.listingId) {
    const { data: listing, error: listingRulesError } = await supabaseServer
      .from("listings")
      .select("max_guests, minimum_notice_hours, price")
      .eq("id", body.listingId)
      .maybeSingle();

    if (listingRulesError && listingRulesError.code !== "42703") {
      return NextResponse.json(
        { error: listingRulesError.message },
        { status: 500 },
      );
    }

    const listingRules = listing as {
      max_guests?: number | null;
      minimum_notice_hours?: number | null;
      price?: number | null;
    } | null;

    if (listingRules?.price) {
      estimatedBookingValueCents = Math.round(listingRules.price * guests * 100);
      estimatedCommissionCents = Math.round(estimatedBookingValueCents * 0.1);
    }

    if (listingRules?.max_guests && guests > listingRules.max_guests) {
      return NextResponse.json(
        {
          error: `This listing allows up to ${listingRules.max_guests} guests per tour.`,
        },
        { status: 400 },
      );
    }

    if (listingRules?.minimum_notice_hours) {
      const minimumDate = dateValueFromOffset(listingRules.minimum_notice_hours);

      if (body.tourDate < minimumDate) {
        return NextResponse.json(
          {
            error: `Please book at least ${listingRules.minimum_notice_hours} hours in advance.`,
          },
          { status: 400 },
        );
      }
    }
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
        guest_message: guestMessage,
        listing_id: body.listingId || null,
        booking_value_cents: estimatedBookingValueCents,
        commission_amount_cents: estimatedCommissionCents,
      },
    ])
    .select(
      "id, full_name, email, tour_date, tour_time, guests, guest_message, listing_id",
    )
    .single();

  if (error) {
    console.error("Booking API error:", error.message);
    await logAppError({
      source: "booking_request",
      message: error.message,
      details: {
        listingId: body.listingId || null,
        email: body.email,
      },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let listingTitle = "General booking request";
  let vendorEmail: string | null = null;
  let vendorName: string | null = null;

  if (booking.listing_id) {
    const { data: listing } = await supabaseServer
      .from("listings")
      .select("title, vendor_id")
      .eq("id", booking.listing_id)
      .maybeSingle();

    if (listing?.title) {
      listingTitle = listing.title;
    }

    if (listing?.vendor_id) {
      const { data: vendor } = await supabaseServer
        .from("vendors")
        .select("business_name, email")
        .eq("id", listing.vendor_id)
        .maybeSingle();

      vendorEmail = vendor?.email || null;
      vendorName = vendor?.business_name || null;
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
      ${
        booking.guest_message
          ? `<p><strong>Guest message:</strong> ${escapeHtml(booking.guest_message)}</p>`
          : ""
      }
    `,
    text: [
      "New booking request",
      `Listing: ${listingTitle}`,
      `Name: ${booking.full_name}`,
      `Email: ${booking.email}`,
      `Date: ${booking.tour_date}`,
      `Time: ${booking.tour_time}`,
      `Guests: ${booking.guests}`,
      booking.guest_message ? `Guest message: ${booking.guest_message}` : "",
    ].join("\n"),
  });

  await supabaseServer.from("analytics_events").insert([
    {
      event_type: "booking_request",
      path: "/book",
      listing_id: booking.listing_id,
      metadata: {
        guests: booking.guests,
        tour_date: booking.tour_date,
      },
    },
  ]);

  if (vendorEmail) {
    await sendEmailNotification({
      to: vendorEmail,
      subject: `New booking request: ${listingTitle}`,
      replyTo: booking.email,
      html: `
        <h2>New booking request</h2>
        <p><strong>Business:</strong> ${escapeHtml(vendorName)}</p>
        <p><strong>Listing:</strong> ${escapeHtml(listingTitle)}</p>
        <p><strong>Name:</strong> ${escapeHtml(booking.full_name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(booking.email)}</p>
        <p><strong>Date:</strong> ${escapeHtml(booking.tour_date)}</p>
        <p><strong>Time:</strong> ${escapeHtml(booking.tour_time)}</p>
        <p><strong>Guests:</strong> ${escapeHtml(booking.guests)}</p>
        ${
          booking.guest_message
            ? `<p><strong>Guest message:</strong> ${escapeHtml(booking.guest_message)}</p>`
            : ""
        }
      `,
      text: [
        "New booking request",
        `Business: ${vendorName || ""}`,
        `Listing: ${listingTitle}`,
        `Name: ${booking.full_name}`,
        `Email: ${booking.email}`,
        `Date: ${booking.tour_date}`,
        `Time: ${booking.tour_time}`,
        `Guests: ${booking.guests}`,
        booking.guest_message ? `Guest message: ${booking.guest_message}` : "",
      ].join("\n"),
    });
  }

  await logActivity({
    actorEmail: booking.email,
    actorRole: "guest",
    action: "booking_submitted",
    targetType: "booking",
    targetId: booking.id,
    targetLabel: `${booking.full_name} - ${listingTitle}`,
    metadata: {
      listing_id: booking.listing_id,
      tour_date: booking.tour_date,
      tour_time: booking.tour_time,
      guests: booking.guests,
      vendor_notified: Boolean(vendorEmail),
    },
  });

  return NextResponse.json({ bookingId: booking.id });
}
