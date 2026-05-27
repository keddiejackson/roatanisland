import {
  buildReminderEmail,
  getBookingReminderCandidates,
  getDefaultReminderSettings,
  type BookingReminderBooking,
  type BookingReminderCandidate,
  type BookingReminderLog,
  type BookingReminderMessage,
  type BookingReminderSetting,
} from "@/lib/booking-reminders";
import { sendEmailNotification } from "@/lib/notifications";
import { supabaseServer } from "@/lib/supabase-server";

type ListingRow = {
  id: string;
  title: string | null;
  vendor_id: string | null;
};

type VendorRow = {
  id: string;
  business_name: string | null;
  email: string | null;
};

type ReminderLogRow = BookingReminderLog & {
  id: string;
  subject: string | null;
  metadata: Record<string, unknown> | null;
};

function defaultSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.roatanisland.life";
}

function mergeReminderSettings(settings: BookingReminderSetting[]) {
  const settingsByType = new Map(
    settings.map((setting) => [setting.reminder_type, setting]),
  );

  return getDefaultReminderSettings().map((defaults) => {
    const override = settingsByType.get(defaults.reminder_type);
    return {
      ...defaults,
      ...override,
      subject_template:
        override?.subject_template || defaults.subject_template || "",
      body_template: override?.body_template || defaults.body_template || "",
    };
  });
}

export async function loadBookingReminderRuntime({
  siteUrl = defaultSiteUrl(),
  includeSent = false,
  logLimit = 120,
}: {
  siteUrl?: string;
  includeSent?: boolean;
  logLimit?: number;
} = {}) {
  const { data: bookingRows } = await supabaseServer
    .from("bookings")
    .select(
      "id, full_name, email, tour_date, tour_time, status, created_at, listing_id, deposit_status, deposit_amount_cents, booking_value_cents, amount_paid_cents, balance_due_cents, balance_due_date, payment_due_date, payment_link_url, invoice_number, receipt_number, payout_paid_at",
    )
    .order("tour_date", { ascending: true })
    .limit(400);
  const bookings = ((bookingRows as BookingReminderBooking[] | null) || []).filter(
    (booking) => booking.id,
  );
  const listingIds = Array.from(
    new Set(bookings.map((booking) => booking.listing_id).filter(Boolean)),
  ) as string[];
  const { data: listingRows } =
    listingIds.length === 0
      ? { data: [] }
      : await supabaseServer
          .from("listings")
          .select("id, title, vendor_id")
          .in("id", listingIds);
  const listings = (listingRows as ListingRow[] | null) || [];
  const vendorIds = Array.from(
    new Set(listings.map((listing) => listing.vendor_id).filter(Boolean)),
  ) as string[];
  const { data: vendorRows } =
    vendorIds.length === 0
      ? { data: [] }
      : await supabaseServer
          .from("vendors")
          .select("id, business_name, email")
          .in("id", vendorIds);
  const vendors = (vendorRows as VendorRow[] | null) || [];
  const listingsById = new Map(listings.map((listing) => [listing.id, listing]));
  const vendorsById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const enrichedBookings = bookings.map((booking) => {
    const listing = booking.listing_id
      ? listingsById.get(booking.listing_id)
      : null;
    const vendor = listing?.vendor_id ? vendorsById.get(listing.vendor_id) : null;

    return {
      ...booking,
      listing_title: listing?.title || "Roatan booking",
      vendor_email: vendor?.email || null,
      vendor_name: vendor?.business_name || "Vendor",
    };
  });
  const bookingIds = enrichedBookings.map((booking) => booking.id);
  const { data: messageRows } =
    bookingIds.length === 0
      ? { data: [] }
      : await supabaseServer
          .from("booking_messages")
          .select("booking_id, sender_role, sender_email, message, is_internal, created_at")
          .in("booking_id", bookingIds)
          .order("created_at", { ascending: false });
  const logsResult =
    bookingIds.length === 0
      ? { data: [], error: null }
      : await supabaseServer
          .from("booking_reminder_logs")
          .select(
            "id, booking_id, reminder_type, recipient_role, recipient_email, subject, status, trigger_key, metadata, sent_at, created_at",
          )
          .order("sent_at", { ascending: false })
          .limit(logLimit);
  const settingsResult = await supabaseServer
    .from("booking_reminder_settings")
    .select("reminder_type, enabled, subject_template, body_template");
  const logs = (logsResult.data as ReminderLogRow[] | null) || [];
  const settings = mergeReminderSettings(
    (settingsResult.data as BookingReminderSetting[] | null) || [],
  );
  const candidates = getBookingReminderCandidates({
    bookings: enrichedBookings,
    messages: (messageRows as BookingReminderMessage[] | null) || [],
    logs,
    settings,
    siteUrl,
    includeSent,
  });

  return {
    candidates,
    logs,
    settings,
    setupMissing:
      logsResult.error?.code === "42P01" || settingsResult.error?.code === "42P01",
  };
}

export async function sendBookingReminder(
  candidate: BookingReminderCandidate,
  {
    status = "sent",
    actorEmail = "system",
  }: { status?: "sent" | "manual"; actorEmail?: string | null } = {},
) {
  const email = buildReminderEmail(candidate);
  const emailResult = await sendEmailNotification({
    to: candidate.recipientEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  const finalStatus = emailResult.sent
    ? status
    : emailResult.skipped
      ? "skipped"
      : "failed";

  const { data: log } = await supabaseServer
    .from("booking_reminder_logs")
    .insert([
      {
        booking_id: candidate.bookingId,
        reminder_type: candidate.reminderType,
        recipient_role: candidate.recipientRole,
        recipient_email: candidate.recipientEmail,
        subject: email.subject,
        status: finalStatus,
        trigger_key: candidate.triggerKey,
        metadata: {
          label: candidate.label,
          actor_email: actorEmail,
          action_url: candidate.actionUrl,
          trip_packet_url: candidate.tripPacketUrl,
        },
      },
    ])
    .select(
      "id, booking_id, reminder_type, recipient_role, recipient_email, subject, status, trigger_key, metadata, sent_at, created_at",
    )
    .maybeSingle();

  return {
    candidate,
    emailSent: emailResult.sent,
    status: finalStatus,
    log,
  };
}

export async function runDueBookingReminders({ limit = 20 } = {}) {
  const runtime = await loadBookingReminderRuntime({ includeSent: false });
  if (runtime.setupMissing) {
    return {
      setupMissing: true,
      found: runtime.candidates.length,
      sent: 0,
      results: [],
    };
  }

  const selected = runtime.candidates.slice(0, limit);
  const results = [];

  for (const candidate of selected) {
    results.push(await sendBookingReminder(candidate));
  }

  return {
    setupMissing: runtime.setupMissing,
    found: runtime.candidates.length,
    sent: results.filter((result) => result.status === "sent").length,
    results,
  };
}
