import { NextResponse } from "next/server";
import {
  buildChangeRequestMessage,
  type BookingChangeRequest,
} from "@/lib/booking-change-requests";
import {
  escapeHtml,
  sendAdminNotification,
  sendEmailNotification,
} from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import { supabaseServer } from "@/lib/supabase-server";

type ChangeRequestCreateBody = {
  requestedTourDate?: string | null;
  requestedTourTime?: string | null;
  requestedGuests?: number | null;
  requestedPickupNote?: string | null;
  reason?: string | null;
};

type BookingSnapshot = {
  id: string;
  full_name: string;
  email: string;
  tour_date: string;
  tour_time: string;
  guests: number;
  listing_id: string | null;
};

async function getUser(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  return data.user ? { id: data.user.id, email: data.user.email || null } : null;
}

async function getGuestBooking(request: Request, bookingId: string) {
  const user = await getUser(request);

  if (!user?.email) {
    return { error: "Unauthorized", status: 401 as const };
  }

  const { data: booking } = await supabaseServer
    .from("bookings")
    .select("id, full_name, email, tour_date, tour_time, guests, listing_id")
    .eq("id", bookingId)
    .maybeSingle();
  const bookingRow = booking as BookingSnapshot | null;

  if (!bookingRow || bookingRow.email.toLowerCase() !== user.email.toLowerCase()) {
    return { error: "Booking not found.", status: 404 as const };
  }

  return { user, booking: bookingRow };
}

async function getListingContext(listingId: string | null) {
  if (!listingId) {
    return { listingTitle: "Roatan booking", vendorEmail: null, vendorName: null };
  }

  const { data: listing } = await supabaseServer
    .from("listings")
    .select("title, vendor_id")
    .eq("id", listingId)
    .maybeSingle();
  const listingRow = listing as {
    title?: string | null;
    vendor_id?: string | null;
  } | null;
  let vendorEmail: string | null = null;
  let vendorName: string | null = null;

  if (listingRow?.vendor_id) {
    const { data: vendor } = await supabaseServer
      .from("vendors")
      .select("business_name, email")
      .eq("id", listingRow.vendor_id)
      .maybeSingle();

    vendorEmail = vendor?.email || null;
    vendorName = vendor?.business_name || null;
  }

  return {
    listingTitle: listingRow?.title || "Roatan booking",
    vendorEmail,
    vendorName,
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const access = await getGuestBooking(request, id);

  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { data, error } = await supabaseServer
    .from("booking_change_requests")
    .select("*")
    .eq("booking_id", access.booking.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ changeRequests: data || [] });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const access = await getGuestBooking(request, id);

  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await request.json()) as ChangeRequestCreateBody;
  const hasChange =
    Boolean(body.requestedTourDate) ||
    Boolean(body.requestedTourTime) ||
    typeof body.requestedGuests === "number" ||
    Boolean(body.requestedPickupNote?.trim());

  if (!hasChange) {
    return NextResponse.json(
      { error: "Add at least one change before sending." },
      { status: 400 },
    );
  }

  const { data: createdRequest, error } = await supabaseServer
    .from("booking_change_requests")
    .insert([
      {
        booking_id: access.booking.id,
        requested_by_role: "guest",
        requested_by_email: access.user.email,
        status: "pending",
        requested_tour_date: body.requestedTourDate || null,
        requested_tour_time: body.requestedTourTime || null,
        requested_guests:
          typeof body.requestedGuests === "number" ? body.requestedGuests : null,
        requested_pickup_note: body.requestedPickupNote?.trim() || null,
        reason: body.reason?.trim() || null,
      },
    ])
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const changeRequest = createdRequest as BookingChangeRequest;
  const message = buildChangeRequestMessage({
    request: changeRequest,
    action: "requested",
    actorRole: "guest",
  });

  await supabaseServer.from("booking_messages").insert([
    {
      booking_id: access.booking.id,
      sender_role: "guest",
      sender_email: access.user.email,
      message,
    },
  ]);

  await supabaseServer.from("booking_events").insert([
    {
      booking_id: access.booking.id,
      event_type: "change_request_created",
      actor_role: "guest",
      actor_email: access.user.email,
      note: message,
    },
  ]);

  const { listingTitle, vendorEmail, vendorName } = await getListingContext(
    access.booking.listing_id,
  );

  await sendAdminNotification({
    subject: `Booking change requested: ${listingTitle}`,
    replyTo: access.user.email || undefined,
    html: `
      <h2>Guest requested a booking change</h2>
      <p><strong>Listing:</strong> ${escapeHtml(listingTitle)}</p>
      <p><strong>Guest:</strong> ${escapeHtml(access.booking.full_name)}</p>
      <p><strong>Current:</strong> ${escapeHtml(access.booking.tour_date)} at ${escapeHtml(access.booking.tour_time)}</p>
      <p><strong>Request:</strong> ${escapeHtml(message)}</p>
    `,
    text: [
      "Guest requested a booking change",
      `Listing: ${listingTitle}`,
      `Guest: ${access.booking.full_name}`,
      `Current: ${access.booking.tour_date} at ${access.booking.tour_time}`,
      `Request: ${message}`,
    ].join("\n"),
  });

  if (vendorEmail) {
    await sendEmailNotification({
      to: vendorEmail,
      subject: `Booking change requested: ${listingTitle}`,
      replyTo: access.user.email || undefined,
      html: `
        <h2>Guest requested a booking change</h2>
        <p><strong>Business:</strong> ${escapeHtml(vendorName)}</p>
        <p><strong>Listing:</strong> ${escapeHtml(listingTitle)}</p>
        <p><strong>Guest:</strong> ${escapeHtml(access.booking.full_name)}</p>
        <p><strong>Request:</strong> ${escapeHtml(message)}</p>
      `,
      text: [
        "Guest requested a booking change",
        `Business: ${vendorName || ""}`,
        `Listing: ${listingTitle}`,
        `Guest: ${access.booking.full_name}`,
        `Request: ${message}`,
      ].join("\n"),
    });
  }

  await logActivity({
    actorEmail: access.user.email,
    actorRole: "guest",
    action: "booking_change_requested",
    targetType: "booking",
    targetId: access.booking.id,
    targetLabel: `${access.booking.full_name} - ${listingTitle}`,
    metadata: {
      listing_id: access.booking.listing_id,
      change_request_id: changeRequest.id,
    },
  });

  return NextResponse.json({ changeRequest });
}

