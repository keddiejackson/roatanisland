import { NextResponse } from "next/server";
import {
  bookingTimeline,
  normalizeBookingMessage,
  type BookingMessageLike,
  type BookingEventLike,
} from "@/lib/booking-communication";
import {
  escapeHtml,
  sendAdminNotification,
  sendEmailNotification,
} from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import { supabaseServer } from "@/lib/supabase-server";

type BookingMessageRequest = {
  message?: string;
};

type BookingSnapshot = {
  id: string;
  full_name: string;
  email: string;
  tour_date: string;
  tour_time: string;
  guests: number;
  status: string | null;
  deposit_status: string | null;
  listing_id: string | null;
  created_at: string | null;
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
    .select(
      "id, full_name, email, tour_date, tour_time, guests, status, deposit_status, listing_id, created_at",
    )
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

  const listingRow = listing as { title?: string | null; vendor_id?: string | null } | null;
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

async function getConversation(booking: BookingSnapshot, includeInternal = false) {
  const [messagesResult, eventsResult] = await Promise.all([
    supabaseServer
      .from("booking_messages")
      .select("id, sender_role, sender_email, message, is_internal, created_at")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true }),
    supabaseServer
      .from("booking_events")
      .select("id, event_type, actor_role, actor_email, from_status, to_status, note, created_at")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true }),
  ]);

  const messages = ((messagesResult.data as BookingMessageLike[] | null) || [])
    .filter((message) => includeInternal || !message.is_internal);
  const events = (eventsResult.data as BookingEventLike[] | null) || [];

  return {
    messages,
    events,
    timeline: bookingTimeline({
      booking,
      messages,
      events,
    }),
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

  return NextResponse.json(await getConversation(access.booking));
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

  const body = (await request.json()) as BookingMessageRequest;
  const message = normalizeBookingMessage(body.message);

  if (!message) {
    return NextResponse.json(
      { error: "Write a message before sending." },
      { status: 400 },
    );
  }

  const { data: createdMessage, error } = await supabaseServer
    .from("booking_messages")
    .insert([
      {
        booking_id: access.booking.id,
        sender_role: "guest",
        sender_email: access.user.email,
        message,
      },
    ])
    .select("id, sender_role, sender_email, message, is_internal, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { listingTitle, vendorEmail, vendorName } = await getListingContext(
    access.booking.listing_id,
  );

  await sendAdminNotification({
    subject: `Guest message: ${listingTitle}`,
    replyTo: access.user.email || undefined,
    html: `
      <h2>Guest sent a booking message</h2>
      <p><strong>Listing:</strong> ${escapeHtml(listingTitle)}</p>
      <p><strong>Guest:</strong> ${escapeHtml(access.booking.full_name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(access.booking.email)}</p>
      <p><strong>Message:</strong> ${escapeHtml(message)}</p>
    `,
    text: [
      "Guest sent a booking message",
      `Listing: ${listingTitle}`,
      `Guest: ${access.booking.full_name}`,
      `Email: ${access.booking.email}`,
      `Message: ${message}`,
    ].join("\n"),
  });

  if (vendorEmail) {
    await sendEmailNotification({
      to: vendorEmail,
      subject: `Guest message: ${listingTitle}`,
      replyTo: access.user.email || undefined,
      html: `
        <h2>Guest sent a booking message</h2>
        <p><strong>Business:</strong> ${escapeHtml(vendorName)}</p>
        <p><strong>Listing:</strong> ${escapeHtml(listingTitle)}</p>
        <p><strong>Guest:</strong> ${escapeHtml(access.booking.full_name)}</p>
        <p><strong>Message:</strong> ${escapeHtml(message)}</p>
      `,
      text: [
        "Guest sent a booking message",
        `Business: ${vendorName || ""}`,
        `Listing: ${listingTitle}`,
        `Guest: ${access.booking.full_name}`,
        `Message: ${message}`,
      ].join("\n"),
    });
  }

  await logActivity({
    actorEmail: access.user.email,
    actorRole: "guest",
    action: "booking_message_sent",
    targetType: "booking",
    targetId: access.booking.id,
    targetLabel: `${access.booking.full_name} - ${listingTitle}`,
    metadata: {
      listing_id: access.booking.listing_id,
      vendor_notified: Boolean(vendorEmail),
    },
  });

  return NextResponse.json({ message: createdMessage });
}
