import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import {
  escapeHtml,
  sendAdminNotification,
  sendEmailNotification,
} from "@/lib/notifications";
import { supabaseServer } from "@/lib/supabase-server";

type VendorBookingStatus = "confirmed" | "cancelled" | "suggest_time";

type VendorBookingUpdateRequest = {
  status?: VendorBookingStatus;
  vendorNote?: string;
};

async function getUser(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  const { data } = await supabaseServer.auth.getUser(token);
  return data.user ? { id: data.user.id, email: data.user.email || null } : null;
}

function statusSubject(status: VendorBookingStatus, listingTitle: string) {
  if (status === "suggest_time") {
    return `New suggested time for ${listingTitle}`;
  }

  return `Your ${listingTitle} booking request was ${status}`;
}

function statusMessage(status: VendorBookingStatus) {
  if (status === "confirmed") {
    return "Your booking request has been confirmed.";
  }

  if (status === "suggest_time") {
    return "The operator suggested another time for your booking request.";
  }

  return "Your booking request has been cancelled.";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as VendorBookingUpdateRequest;
  const nextStatus = body.status;
  const vendorNote = body.vendorNote?.trim().slice(0, 1000) || null;

  if (
    nextStatus !== "confirmed" &&
    nextStatus !== "cancelled" &&
    nextStatus !== "suggest_time"
  ) {
    return NextResponse.json(
      { error: "Vendors can confirm, decline, or suggest another time." },
      { status: 400 },
    );
  }

  const { data: vendorLink } = await supabaseServer
    .from("vendor_users")
    .select("vendor_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vendorLink?.vendor_id) {
    return NextResponse.json({ error: "Vendor account not found." }, { status: 403 });
  }

  const { data: booking } = await supabaseServer
    .from("bookings")
    .select("id, listing_id, status")
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

  const updateStatus =
    nextStatus === "suggest_time" ? booking.status || "new" : nextStatus;

  const { data: updatedBooking, error } = await supabaseServer
    .from("bookings")
    .update({ status: updateStatus, vendor_note: vendorNote })
    .eq("id", id)
    .select(
      "id, full_name, email, tour_date, tour_time, guests, status, vendor_note, listing_id",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServer.from("booking_events").insert([
    {
      booking_id: updatedBooking.id,
      event_type:
        nextStatus === "suggest_time" ? "time_suggestion" : "status_change",
      actor_role: "vendor",
      actor_email: user.email,
      from_status: booking.status || "new",
      to_status: updateStatus,
      note: vendorNote,
    },
  ]);

  if (vendorNote) {
    await supabaseServer.from("booking_messages").insert([
      {
        booking_id: updatedBooking.id,
        sender_role: "vendor",
        sender_email: user.email,
        message:
          nextStatus === "suggest_time"
            ? `Suggested another time: ${vendorNote}`
            : vendorNote,
      },
    ]);
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

  if (nextStatus === "suggest_time") {
    await sendAdminNotification({
      subject: `Vendor suggested another time: ${listing.title}`,
      replyTo: user.email || undefined,
      html: `
        <h2>Vendor suggested another time</h2>
        <p><strong>Listing:</strong> ${escapeHtml(listing.title)}</p>
        <p><strong>Guest:</strong> ${escapeHtml(updatedBooking.full_name)}</p>
        <p><strong>Date:</strong> ${escapeHtml(updatedBooking.tour_date)}</p>
        <p><strong>Current time:</strong> ${escapeHtml(updatedBooking.tour_time)}</p>
        ${
          updatedBooking.vendor_note
            ? `<p><strong>Vendor note:</strong> ${escapeHtml(updatedBooking.vendor_note)}</p>`
            : ""
        }
      `,
      text: [
        "Vendor suggested another time",
        `Listing: ${listing.title}`,
        `Guest: ${updatedBooking.full_name}`,
        `Date: ${updatedBooking.tour_date}`,
        `Current time: ${updatedBooking.tour_time}`,
        updatedBooking.vendor_note
          ? `Vendor note: ${updatedBooking.vendor_note}`
          : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

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

  await logActivity({
    actorEmail: user.email,
    actorRole: "vendor",
    action: "booking_status_updated",
    targetType: "booking",
    targetId: updatedBooking.id,
    targetLabel: `${updatedBooking.full_name} - ${listing.title}`,
    metadata: {
      status: nextStatus,
      vendor_id: vendorLink.vendor_id,
      listing_id: updatedBooking.listing_id,
      emailed: true,
      has_vendor_note: Boolean(updatedBooking.vendor_note),
    },
  });

  return NextResponse.json({ booking: updatedBooking });
}
