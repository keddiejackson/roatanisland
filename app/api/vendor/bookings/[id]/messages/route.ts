import { NextResponse } from "next/server";
import {
  bookingTimeline,
  normalizeBookingMessage,
  type BookingEventLike,
  type BookingMessageLike,
} from "@/lib/booking-communication";
import { enrichBookingMessagesWithProfiles } from "@/lib/booking-message-profiles";
import { markBookingThreadRead } from "@/lib/booking-message-reads";
import { logActivity } from "@/lib/activity-log";
import {
  escapeHtml,
  sendAdminNotification,
  sendEmailNotification,
} from "@/lib/notifications";
import { supabaseServer } from "@/lib/supabase-server";

type VendorMessageRequest = {
  message?: string;
  notifyByEmail?: boolean;
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

type VendorAccess = {
  user: { id: string; email: string | null };
  booking: BookingSnapshot;
  listingTitle: string;
  vendorId: string;
  vendorName: string | null;
};

async function getUser(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  return data.user ? { id: data.user.id, email: data.user.email || null } : null;
}

async function getVendorBookingAccess(
  request: Request,
  bookingId: string,
): Promise<VendorAccess | { error: string; status: 401 | 403 | 404 }> {
  const user = await getUser(request);

  if (!user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: vendorLink } = await supabaseServer
    .from("vendor_users")
    .select("vendor_id, vendors(business_name)")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!vendorLink?.vendor_id) {
    return { error: "Vendor account not found.", status: 403 };
  }

  const { data: booking } = await supabaseServer
    .from("bookings")
    .select(
      "id, full_name, email, tour_date, tour_time, guests, status, deposit_status, listing_id, created_at",
    )
    .eq("id", bookingId)
    .maybeSingle();

  const bookingRow = booking as BookingSnapshot | null;

  if (!bookingRow?.listing_id) {
    return { error: "Booking not found.", status: 404 };
  }

  const { data: listing } = await supabaseServer
    .from("listings")
    .select("id, title")
    .eq("id", bookingRow.listing_id)
    .eq("vendor_id", vendorLink.vendor_id)
    .maybeSingle();

  if (!listing) {
    return { error: "Booking not found.", status: 404 };
  }

  const vendor = vendorLink.vendors as { business_name?: string | null } | null;

  return {
    user,
    booking: bookingRow,
    listingTitle: listing.title || "Roatan booking",
    vendorId: vendorLink.vendor_id,
    vendorName: vendor?.business_name || null,
  };
}

async function getConversation(booking: BookingSnapshot) {
  const [messagesResult, eventsResult] = await Promise.all([
    supabaseServer
      .from("booking_messages")
      .select("id, sender_role, sender_email, message, is_internal, created_at")
      .eq("booking_id", booking.id)
      .eq("is_internal", false)
      .order("created_at", { ascending: true }),
    supabaseServer
      .from("booking_events")
      .select("id, event_type, actor_role, actor_email, from_status, to_status, note, created_at")
      .eq("booking_id", booking.id)
      .order("created_at", { ascending: true }),
  ]);

  const messages = (messagesResult.data as BookingMessageLike[] | null) || [];
  const enrichedMessages = await enrichBookingMessagesWithProfiles(messages);
  const events = (eventsResult.data as BookingEventLike[] | null) || [];

  return {
    messages: enrichedMessages,
    events,
    timeline: bookingTimeline({ booking, messages: enrichedMessages, events }),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const access = await getVendorBookingAccess(request, id);

  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [conversation, readReceipt] = await Promise.all([
    getConversation(access.booking),
    markBookingThreadRead({
      bookingId: access.booking.id,
      readerRole: "vendor",
      readerEmail: access.user.email,
    }),
  ]);

  return NextResponse.json({ ...conversation, readReceipt });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const access = await getVendorBookingAccess(request, id);

  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = (await request.json()) as VendorMessageRequest;
  const message = normalizeBookingMessage(body.message);
  const notifyByEmail = body.notifyByEmail !== false;

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
        sender_role: "vendor",
        sender_email: access.user.email,
        message,
      },
    ])
    .select("id, sender_role, sender_email, message, is_internal, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (notifyByEmail) {
    await sendEmailNotification({
      to: access.booking.email,
      subject: `Operator message: ${access.listingTitle}`,
      replyTo: access.user.email || undefined,
      html: `
        <h2>Your Roatan operator sent a message</h2>
        <p><strong>Business:</strong> ${escapeHtml(access.vendorName)}</p>
        <p><strong>Listing:</strong> ${escapeHtml(access.listingTitle)}</p>
        <p><strong>Date:</strong> ${escapeHtml(access.booking.tour_date)}</p>
        <p><strong>Time:</strong> ${escapeHtml(access.booking.tour_time)}</p>
        <p><strong>Message:</strong> ${escapeHtml(message)}</p>
      `,
      text: [
        "Your Roatan operator sent a message",
        `Business: ${access.vendorName || ""}`,
        `Listing: ${access.listingTitle}`,
        `Date: ${access.booking.tour_date}`,
        `Time: ${access.booking.tour_time}`,
        `Message: ${message}`,
      ].join("\n"),
    });

    await sendAdminNotification({
      subject: `Vendor message: ${access.listingTitle}`,
      replyTo: access.user.email || undefined,
      html: `
        <h2>Vendor sent a booking message</h2>
        <p><strong>Business:</strong> ${escapeHtml(access.vendorName)}</p>
        <p><strong>Listing:</strong> ${escapeHtml(access.listingTitle)}</p>
        <p><strong>Guest:</strong> ${escapeHtml(access.booking.full_name)}</p>
        <p><strong>Message:</strong> ${escapeHtml(message)}</p>
      `,
      text: [
        "Vendor sent a booking message",
        `Business: ${access.vendorName || ""}`,
        `Listing: ${access.listingTitle}`,
        `Guest: ${access.booking.full_name}`,
        `Message: ${message}`,
      ].join("\n"),
    });
  }

  await logActivity({
    actorEmail: access.user.email,
    actorRole: "vendor",
    action: "booking_message_sent",
    targetType: "booking",
    targetId: access.booking.id,
    targetLabel: `${access.booking.full_name} - ${access.listingTitle}`,
    metadata: {
      vendor_id: access.vendorId,
      listing_id: access.booking.listing_id,
      emailed: notifyByEmail,
    },
  });

  const [profiledMessage] = await enrichBookingMessagesWithProfiles([
    createdMessage as BookingMessageLike,
  ]);

  return NextResponse.json({
    message: profiledMessage || createdMessage,
    emailed: notifyByEmail,
  });
}
