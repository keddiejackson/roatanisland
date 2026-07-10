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
import { authorizeBookingPage } from "@/lib/booking-access-server";
import {
  enforceRateLimit,
  getRequestUser,
  readJsonObject,
} from "@/lib/server-security";
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

async function getGuestBooking(
  request: Request,
  bookingId: string,
  accessToken?: string | null,
  quoteToken?: string | null,
) {
  const { data: booking } = await supabaseServer
    .from("bookings")
    .select("id, full_name, email, tour_date, tour_time, guests, listing_id")
    .eq("id", bookingId)
    .maybeSingle();
  const bookingRow = booking as BookingSnapshot | null;

  if (!bookingRow) {
    return { error: "Booking not found.", status: 404 as const };
  }

  if (
    await authorizeBookingPage({
      booking: bookingRow,
      accessToken,
      quoteToken,
    })
  ) {
    return {
      user: { email: bookingRow.email.toLowerCase() },
      booking: bookingRow,
    };
  }

  const user = await getRequestUser(request);
  if (!user) return { error: "Unauthorized", status: 401 as const };
  if (bookingRow.email.toLowerCase() !== user.email) {
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
  const limited = await enforceRateLimit(request, "booking-change:list", {
    limit: 40,
    windowSeconds: 15 * 60,
  });
  if (limited) return limited;

  const { id } = await context.params;
  const url = new URL(request.url);
  const access = await getGuestBooking(
    request,
    id,
    url.searchParams.get("access"),
    url.searchParams.get("quote"),
  );

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
  const limited = await enforceRateLimit(request, "booking-change:create", {
    limit: 8,
    windowSeconds: 60 * 60,
  });
  if (limited) return limited;

  const { id } = await context.params;
  const url = new URL(request.url);
  const access = await getGuestBooking(
    request,
    id,
    url.searchParams.get("access"),
    url.searchParams.get("quote"),
  );

  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const parsedBody = await readJsonObject<ChangeRequestCreateBody>(request, 16 * 1024);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;
  const requestedGuests =
    typeof body.requestedGuests === "number" ? body.requestedGuests : null;

  if (
    (body.requestedTourDate && !/^\d{4}-\d{2}-\d{2}$/.test(body.requestedTourDate)) ||
    (requestedGuests !== null &&
      (!Number.isInteger(requestedGuests) || requestedGuests < 1 || requestedGuests > 100)) ||
    (body.requestedTourTime?.length || 0) > 120 ||
    (body.requestedPickupNote?.length || 0) > 500 ||
    (body.reason?.length || 0) > 1000
  ) {
    return NextResponse.json(
      { error: "Please check the requested date, time, guests, and notes." },
      { status: 400 },
    );
  }
  const hasChange =
    Boolean(body.requestedTourDate) ||
    Boolean(body.requestedTourTime) ||
    requestedGuests !== null ||
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
        requested_guests: requestedGuests,
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
