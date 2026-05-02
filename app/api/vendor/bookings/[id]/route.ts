import { NextResponse } from "next/server";
import { escapeHtml, sendEmailNotification } from "@/lib/notifications";
import { supabaseServer } from "@/lib/supabase-server";

type VendorBookingStatus = "confirmed" | "cancelled";

type VendorBookingUpdateRequest = {
  status?: VendorBookingStatus;
  vendorNote?: string;
};

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

function statusSubject(status: VendorBookingStatus, listingTitle: string) {
  return `Your ${listingTitle} booking request was ${status}`;
}

function statusMessage(status: VendorBookingStatus) {
  if (status === "confirmed") {
    return "Your booking request has been confirmed.";
  }

  return "Your booking request has been cancelled.";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as VendorBookingUpdateRequest;
  const nextStatus = body.status;
  const vendorNote = body.vendorNote?.trim().slice(0, 1000) || null;

  if (nextStatus !== "confirmed" && nextStatus !== "cancelled") {
    return NextResponse.json(
      { error: "Vendors can confirm or cancel booking requests." },
      { status: 400 },
    );
  }

  const { data: vendorLink } = await supabaseServer
    .from("vendor_users")
    .select("vendor_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!vendorLink?.vendor_id) {
    return NextResponse.json({ error: "Vendor account not found." }, { status: 403 });
  }

  const { data: booking } = await supabaseServer
    .from("bookings")
    .select("id, listing_id")
    .eq("id", id)
    .maybeSingle();

  if (!booking?.listing_id) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const { data: listing } = await supabaseServer
    .from("listings")
    .select("id, title")
    .eq("id", booking.listing_id)
    .eq("vendor_id", vendorLink.vendor_id)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const { data: updatedBooking, error } = await supabaseServer
    .from("bookings")
    .update({ status: nextStatus, vendor_note: vendorNote })
    .eq("id", id)
    .select(
      "id, full_name, email, tour_date, tour_time, guests, status, vendor_note, listing_id",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await sendEmailNotification({
    to: updatedBooking.email,
    subject: statusSubject(nextStatus, listing.title),
    html: `
      <h2>${escapeHtml(statusMessage(nextStatus))}</h2>
      <p><strong>Listing:</strong> ${escapeHtml(listing.title)}</p>
      <p><strong>Name:</strong> ${escapeHtml(updatedBooking.full_name)}</p>
      <p><strong>Date:</strong> ${escapeHtml(updatedBooking.tour_date)}</p>
      <p><strong>Time:</strong> ${escapeHtml(updatedBooking.tour_time)}</p>
      <p><strong>Guests:</strong> ${escapeHtml(updatedBooking.guests)}</p>
      ${
        updatedBooking.vendor_note
          ? `<p><strong>Note from operator:</strong> ${escapeHtml(updatedBooking.vendor_note)}</p>`
          : ""
      }
    `,
    text: [
      statusMessage(nextStatus),
      `Listing: ${listing.title}`,
      `Name: ${updatedBooking.full_name}`,
      `Date: ${updatedBooking.tour_date}`,
      `Time: ${updatedBooking.tour_time}`,
      `Guests: ${updatedBooking.guests}`,
      updatedBooking.vendor_note
        ? `Note from operator: ${updatedBooking.vendor_note}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  await supabaseServer.from("analytics_events").insert([
    {
      event_type: "vendor_booking_status_update",
      path: "/vendor/dashboard",
      listing_id: updatedBooking.listing_id,
      vendor_id: vendorLink.vendor_id,
      metadata: {
        status: nextStatus,
        emailed: true,
        has_vendor_note: Boolean(updatedBooking.vendor_note),
      },
    },
  ]);

  return NextResponse.json({ booking: updatedBooking });
}
