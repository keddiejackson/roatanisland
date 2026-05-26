import { NextResponse } from "next/server";
import {
  bookingTimeline,
  normalizeBookingMessage,
  type BookingEventLike,
  type BookingMessageLike,
} from "@/lib/booking-communication";
import { markBookingThreadRead } from "@/lib/booking-message-reads";
import { logActivity } from "@/lib/activity-log";
import { escapeHtml, sendEmailNotification } from "@/lib/notifications";
import { supabaseServer } from "@/lib/supabase-server";

type AdminMessageRequest = {
  message?: string;
  isInternal?: boolean;
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

async function verifyAdmin(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;

  if (!email) return null;

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return admin ? email : null;
}

async function getBooking(id: string) {
  const { data: booking } = await supabaseServer
    .from("bookings")
    .select(
      "id, full_name, email, tour_date, tour_time, guests, status, deposit_status, listing_id, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  return booking as BookingSnapshot | null;
}

async function getListingTitle(listingId: string | null) {
  if (!listingId) return "Roatan booking";

  const { data: listing } = await supabaseServer
    .from("listings")
    .select("title")
    .eq("id", listingId)
    .maybeSingle();

  return listing?.title || "Roatan booking";
}

async function getConversation(booking: BookingSnapshot) {
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

  const messages = (messagesResult.data as BookingMessageLike[] | null) || [];
  const events = (eventsResult.data as BookingEventLike[] | null) || [];

  return {
    messages,
    events,
    timeline: bookingTimeline({ booking, messages, events }),
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const booking = await getBooking(id);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const [conversation, readReceipt] = await Promise.all([
    getConversation(booking),
    markBookingThreadRead({
      bookingId: booking.id,
      readerRole: "admin",
      readerEmail: adminEmail,
    }),
  ]);

  return NextResponse.json({ ...conversation, readReceipt });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const booking = await getBooking(id);

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const body = (await request.json()) as AdminMessageRequest;
  const message = normalizeBookingMessage(body.message);
  const isInternal = Boolean(body.isInternal);
  const notifyByEmail = !isInternal && body.notifyByEmail !== false;

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
        booking_id: booking.id,
        sender_role: "admin",
        sender_email: adminEmail,
        message,
        is_internal: isInternal,
      },
    ])
    .select("id, sender_role, sender_email, message, is_internal, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const listingTitle = await getListingTitle(booking.listing_id);

  if (notifyByEmail) {
    await sendEmailNotification({
      to: booking.email,
      subject: `Booking update: ${listingTitle}`,
      replyTo: adminEmail,
      html: `
        <h2>RoatanIsland.life sent a booking update</h2>
        <p><strong>Listing:</strong> ${escapeHtml(listingTitle)}</p>
        <p><strong>Date:</strong> ${escapeHtml(booking.tour_date)}</p>
        <p><strong>Time:</strong> ${escapeHtml(booking.tour_time)}</p>
        <p><strong>Message:</strong> ${escapeHtml(message)}</p>
      `,
      text: [
        "RoatanIsland.life sent a booking update",
        `Listing: ${listingTitle}`,
        `Date: ${booking.tour_date}`,
        `Time: ${booking.tour_time}`,
        `Message: ${message}`,
      ].join("\n"),
    });
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: isInternal ? "booking_internal_note_added" : "booking_message_sent",
    targetType: "booking",
    targetId: booking.id,
    targetLabel: `${booking.full_name} - ${listingTitle}`,
    metadata: {
      listing_id: booking.listing_id,
      emailed: notifyByEmail,
    },
  });

  return NextResponse.json({ message: createdMessage, emailed: notifyByEmail });
}
