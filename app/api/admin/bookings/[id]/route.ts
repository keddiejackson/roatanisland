import { NextResponse } from "next/server";
import {
  escapeHtml,
  sendEmailNotification,
} from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import { supabaseServer } from "@/lib/supabase-server";

type BookingStatus = "new" | "confirmed" | "completed" | "cancelled";

type BookingUpdateRequest = {
  status?: BookingStatus;
  adminNotes?: string | null;
  sendEmail?: boolean;
};

async function verifyAdmin(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;

  if (!email) {
    return null;
  }

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return admin ? email : null;
}

function statusSubject(status: BookingStatus, listingTitle: string) {
  const readableStatus =
    status === "confirmed"
      ? "confirmed"
      : status === "completed"
        ? "completed"
        : "cancelled";

  return `Your ${listingTitle} booking request was ${readableStatus}`;
}

function statusMessage(status: BookingStatus) {
  if (status === "confirmed") {
    return "Your booking request has been confirmed.";
  }

  if (status === "completed") {
    return "Your booking has been marked completed. Thank you for using RoatanIsland.life.";
  }

  if (status === "cancelled") {
    return "Your booking request has been cancelled.";
  }

  return "Your booking request has been updated.";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as BookingUpdateRequest;
  const nextStatus = body.status || "new";

  const { data: booking, error } = await supabaseServer
    .from("bookings")
    .update({
      status: nextStatus,
      admin_notes: body.adminNotes || null,
    })
    .eq("id", id)
    .select(
      "id, full_name, email, tour_date, tour_time, guests, status, admin_notes, listing_id",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let listingTitle = "Roatan booking";

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

  if (body.sendEmail && nextStatus !== "new") {
    await sendEmailNotification({
      to: booking.email,
      subject: statusSubject(nextStatus, listingTitle),
      html: `
        <h2>${escapeHtml(statusMessage(nextStatus))}</h2>
        <p><strong>Listing:</strong> ${escapeHtml(listingTitle)}</p>
        <p><strong>Name:</strong> ${escapeHtml(booking.full_name)}</p>
        <p><strong>Date:</strong> ${escapeHtml(booking.tour_date)}</p>
        <p><strong>Time:</strong> ${escapeHtml(booking.tour_time)}</p>
        <p><strong>Guests:</strong> ${escapeHtml(booking.guests)}</p>
        ${
          booking.admin_notes
            ? `<p><strong>Notes:</strong> ${escapeHtml(booking.admin_notes)}</p>`
            : ""
        }
      `,
      text: [
        statusMessage(nextStatus),
        `Listing: ${listingTitle}`,
        `Name: ${booking.full_name}`,
        `Date: ${booking.tour_date}`,
        `Time: ${booking.tour_time}`,
        `Guests: ${booking.guests}`,
        booking.admin_notes ? `Notes: ${booking.admin_notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  await supabaseServer.from("analytics_events").insert([
    {
      event_type: "booking_status_update",
      path: "/admin/bookings",
      listing_id: booking.listing_id,
      metadata: {
        status: nextStatus,
        emailed: Boolean(body.sendEmail && nextStatus !== "new"),
      },
    },
  ]);

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "booking_status_updated",
    targetType: "booking",
    targetId: booking.id,
    targetLabel: `${booking.full_name} - ${listingTitle}`,
    metadata: {
      status: nextStatus,
      emailed: Boolean(body.sendEmail && nextStatus !== "new"),
      listing_id: booking.listing_id,
    },
  });

  return NextResponse.json({ booking });
}
