import { NextResponse } from "next/server";
import {
  applyApprovedChangeRequest,
  buildChangeRequestMessage,
  type BookingChangeActorRole,
  type BookingChangeRequest,
  type BookingChangeRequestAction,
} from "@/lib/booking-change-requests";
import { logActivity } from "@/lib/activity-log";
import { escapeHtml, sendEmailNotification } from "@/lib/notifications";
import { supabaseServer } from "@/lib/supabase-server";

type ChangeRequestActionBody = {
  action?: Exclude<BookingChangeRequestAction, "requested">;
  responseNote?: string | null;
  requestedTourDate?: string | null;
  requestedTourTime?: string | null;
  requestedGuests?: number | null;
  requestedPickupNote?: string | null;
};

type BookingSnapshot = {
  id: string;
  full_name: string;
  email: string;
  tour_date: string;
  tour_time: string;
  guests: number;
  vendor_note: string | null;
  status: string | null;
  listing_id: string | null;
};

type ListingSnapshot = {
  id: string;
  title: string | null;
  vendor_id: string | null;
};

async function getUser(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  return data.user ? { id: data.user.id, email: data.user.email || null } : null;
}

async function getActorRole({
  userId,
  email,
  booking,
  listing,
}: {
  userId: string;
  email: string;
  booking: BookingSnapshot;
  listing: ListingSnapshot | null;
}): Promise<BookingChangeActorRole | null> {
  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (admin) return "admin";

  if (listing?.vendor_id) {
    const { data: vendorLink } = await supabaseServer
      .from("vendor_users")
      .select("vendor_id")
      .eq("vendor_id", listing.vendor_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (vendorLink) return "vendor";
  }

  if (booking.email.toLowerCase() === email.toLowerCase()) {
    return "guest";
  }

  return null;
}

function actionToStatus(action: Exclude<BookingChangeRequestAction, "requested">) {
  if (action === "approved") return "approved";
  if (action === "declined") return "declined";
  if (action === "countered") return "countered";
  return "cancelled";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getUser(request);

  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as ChangeRequestActionBody;
  const action = body.action || "approved";

  if (!["approved", "declined", "countered", "cancelled"].includes(action)) {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const { data: changeRequestData, error: requestError } = await supabaseServer
    .from("booking_change_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 500 });
  }

  const changeRequest = changeRequestData as BookingChangeRequest | null;

  if (!changeRequest) {
    return NextResponse.json(
      { error: "Change request not found." },
      { status: 404 },
    );
  }

  const { data: bookingData } = await supabaseServer
    .from("bookings")
    .select("id, full_name, email, tour_date, tour_time, guests, vendor_note, status, listing_id")
    .eq("id", changeRequest.booking_id)
    .maybeSingle();
  const booking = bookingData as BookingSnapshot | null;

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const { data: listingData } = booking.listing_id
    ? await supabaseServer
        .from("listings")
        .select("id, title, vendor_id")
        .eq("id", booking.listing_id)
        .maybeSingle()
    : { data: null };
  const listing = listingData as ListingSnapshot | null;
  const actorRole = await getActorRole({
    userId: user.id,
    email: user.email,
    booking,
    listing,
  });

  if (!actorRole) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (actorRole === "guest" && action !== "cancelled") {
    return NextResponse.json(
      { error: "Guests can only cancel pending change requests." },
      { status: 403 },
    );
  }

  const nextRequest = {
    ...changeRequest,
    requested_tour_date:
      action === "countered"
        ? body.requestedTourDate || changeRequest.requested_tour_date
        : changeRequest.requested_tour_date,
    requested_tour_time:
      action === "countered"
        ? body.requestedTourTime || changeRequest.requested_tour_time
        : changeRequest.requested_tour_time,
    requested_guests:
      action === "countered" && typeof body.requestedGuests === "number"
        ? body.requestedGuests
        : changeRequest.requested_guests,
    requested_pickup_note:
      action === "countered"
        ? body.requestedPickupNote || changeRequest.requested_pickup_note
        : changeRequest.requested_pickup_note,
    response_note: body.responseNote?.trim() || null,
  } satisfies BookingChangeRequest;
  const message = buildChangeRequestMessage({
    request: nextRequest,
    action,
    actorRole,
    responseNote: body.responseNote?.trim() || null,
  });

  const { data: updatedRequest, error: updateError } = await supabaseServer
    .from("booking_change_requests")
    .update({
      status: actionToStatus(action),
      requested_tour_date: nextRequest.requested_tour_date,
      requested_tour_time: nextRequest.requested_tour_time,
      requested_guests: nextRequest.requested_guests,
      requested_pickup_note: nextRequest.requested_pickup_note,
      response_note: nextRequest.response_note,
      resolved_by_role: actorRole,
      resolved_by_email: user.email,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", changeRequest.id)
    .select("*")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (action === "approved") {
    await supabaseServer
      .from("bookings")
      .update(applyApprovedChangeRequest(booking, nextRequest))
      .eq("id", booking.id);
  }

  await supabaseServer.from("booking_messages").insert([
    {
      booking_id: booking.id,
      sender_role: actorRole,
      sender_email: user.email,
      message,
    },
  ]);

  await supabaseServer.from("booking_events").insert([
    {
      booking_id: booking.id,
      event_type: `change_request_${action}`,
      actor_role: actorRole,
      actor_email: user.email,
      from_status: booking.status || "new",
      to_status: booking.status || "new",
      note: message,
    },
  ]);

  if (actorRole !== "guest") {
    const listingTitle = listing?.title || "Roatan booking";

    await sendEmailNotification({
      to: booking.email,
      subject: `Booking change ${action}: ${listingTitle}`,
      replyTo: user.email,
      html: `
        <h2>Booking change ${escapeHtml(action)}</h2>
        <p><strong>Listing:</strong> ${escapeHtml(listingTitle)}</p>
        <p><strong>Guest:</strong> ${escapeHtml(booking.full_name)}</p>
        <p><strong>Update:</strong> ${escapeHtml(message)}</p>
      `,
      text: [
        `Booking change ${action}`,
        `Listing: ${listingTitle}`,
        `Guest: ${booking.full_name}`,
        `Update: ${message}`,
      ].join("\n"),
    });
  }

  await logActivity({
    actorEmail: user.email,
    actorRole,
    action: `booking_change_${action}`,
    targetType: "booking",
    targetId: booking.id,
    targetLabel: `${booking.full_name} - ${listing?.title || "Roatan booking"}`,
    metadata: {
      listing_id: booking.listing_id,
      change_request_id: changeRequest.id,
    },
  });

  return NextResponse.json({ changeRequest: updatedRequest });
}

