import { NextResponse } from "next/server";
import {
  escapeHtml,
  sendAdminNotification,
  sendEmailNotification,
} from "@/lib/notifications";
import { logActivity } from "@/lib/activity-log";
import {
  checkBookingAvailability,
  shouldAutoConfirmBooking,
} from "@/lib/booking-availability";
import { formatBookingCents } from "@/lib/booking-flow";
import {
  createBookingAccessToken,
  withBookingAccess,
} from "@/lib/booking-access";
import { logAppError } from "@/lib/error-log";
import {
  enforceRateLimit,
  isValidEmail,
  readJsonObject,
} from "@/lib/server-security";
import { supabaseServer } from "@/lib/supabase-server";

type BookingRequest = {
  fullName?: string;
  email?: string;
  tourDate?: string;
  tourTime?: string;
  guests?: number | string;
  guestMessage?: string;
  listingId?: string | null;
  promoCode?: string;
  selectedAddonIds?: string[];
  requestId?: string;
};

type CreatedBooking = {
  id: string;
  email: string;
  full_name: string;
  tour_date: string;
  tour_time: string;
  guests: number;
  guest_message: string | null;
  listing_id: string | null;
  status: string;
};

function getBaseUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get(
      "host",
    )}`
  );
}

export async function POST(request: Request) {
  const rateLimited = await enforceRateLimit(request, "booking:create", {
    limit: 8,
    windowSeconds: 10 * 60,
  });
  if (rateLimited) return rateLimited;

  const parsedBody = await readJsonObject<BookingRequest>(request, 32 * 1024);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;
  const guests = Number(body.guests);
  const guestMessage = body.guestMessage?.trim().slice(0, 1000) || null;
  const requestKey = body.requestId?.trim().slice(0, 120) || crypto.randomUUID();
  let bookingStatus = "new";
  let estimatedBookingValueCents: number | null = null;
  let estimatedCommissionCents: number | null = null;
  let discountAmountCents: number | null = null;
  let selectedAddons: { id: string; name: string; price_cents: number }[] = [];
  let commissionRate = 0.1;

  if (
    !body.fullName ||
    !isValidEmail(body.email) ||
    !body.tourDate ||
    !body.tourTime ||
    !Number.isFinite(guests) ||
    guests < 1
  ) {
    return NextResponse.json(
      { error: "Please complete every required booking field." },
      { status: 400 },
    );
  }

  if (
    body.fullName.trim().length > 160 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(body.tourDate) ||
    body.tourTime.trim().length > 120 ||
    new Date(`${body.tourDate}T23:59:59Z`).getTime() < Date.now()
  ) {
    return NextResponse.json(
      { error: "Please check the traveler name, date, and time." },
      { status: 400 },
    );
  }

  if (body.listingId) {
    const { data: listing, error: listingRulesError } = await supabaseServer
      .from("listings")
      .select(
        "tour_times, max_guests, minimum_notice_hours, booking_cutoff_hours, auto_confirm_bookings, private_booking_mode, available_weekdays, season_start_date, season_end_date, price, blocked_dates",
      )
      .eq("id", body.listingId)
      .maybeSingle();

    if (listingRulesError && listingRulesError.code !== "42703") {
      return NextResponse.json(
        { error: listingRulesError.message },
        { status: 500 },
      );
    }

    const listingRules = listing as {
      tour_times?: string[] | null;
      max_guests?: number | null;
      minimum_notice_hours?: number | null;
      booking_cutoff_hours?: number | null;
      auto_confirm_bookings?: boolean | null;
      private_booking_mode?: boolean | null;
      available_weekdays?: number[] | null;
      season_start_date?: string | null;
      season_end_date?: string | null;
      price?: number | null;
      blocked_dates?: string[] | null;
    } | null;

    if (!listingRules) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 },
      );
    }

    if (listingRules?.price) {
      estimatedBookingValueCents = Math.round(listingRules.price * guests * 100);
    }

    if (Array.isArray(body.selectedAddonIds) && body.selectedAddonIds.length > 0) {
      const { data: addonRows } = await supabaseServer
        .from("listing_addons")
        .select("id, name, price_cents")
        .eq("listing_id", body.listingId)
        .eq("is_active", true)
        .in("id", body.selectedAddonIds);

      selectedAddons =
        (addonRows as { id: string; name: string; price_cents: number }[]) || [];
      estimatedBookingValueCents =
        (estimatedBookingValueCents || 0) +
        selectedAddons.reduce((total, addon) => total + addon.price_cents, 0);
    }

    if (body.promoCode?.trim() && estimatedBookingValueCents) {
      const { data: promo } = await supabaseServer
        .from("promo_codes")
        .select("code, discount_percent, discount_amount_cents, expires_at")
        .eq("code", body.promoCode.trim().toUpperCase())
        .eq("is_active", true)
        .maybeSingle();

      const promoExpired = promo?.expires_at
        ? new Date(promo.expires_at).getTime() < Date.now()
        : false;

      if (promo?.discount_percent && !promoExpired) {
        discountAmountCents = Math.round(
          estimatedBookingValueCents * (promo.discount_percent / 100),
        );
      } else if (promo?.discount_amount_cents && !promoExpired) {
        discountAmountCents = promo.discount_amount_cents;
      }

      if (discountAmountCents) {
        discountAmountCents = Math.min(discountAmountCents, estimatedBookingValueCents);
        estimatedBookingValueCents -= discountAmountCents;
      }
    }

    if (estimatedBookingValueCents) {
      const { data: settingsData } = await supabaseServer
        .from("site_settings")
        .select("value")
        .eq("key", "site")
        .maybeSingle();
      const settings = settingsData?.value as
        | { commissionRate?: string | number }
        | null;
      commissionRate = settings?.commissionRate
        ? Number(settings.commissionRate)
        : commissionRate;
      estimatedCommissionCents = Math.round(
        estimatedBookingValueCents * commissionRate,
      );
    }

    let reservedGuests = 0;

    if (listingRules.max_guests || listingRules.private_booking_mode) {
      const { data: existingBookings, error: existingBookingsError } =
        await supabaseServer
          .from("bookings")
          .select("guests")
          .eq("listing_id", body.listingId)
          .eq("tour_date", body.tourDate)
          .eq("tour_time", body.tourTime)
          .in("status", ["new", "confirmed"]);

      if (existingBookingsError) {
        return NextResponse.json(
          { error: existingBookingsError.message },
          { status: 500 },
        );
      }

      reservedGuests = (
        (existingBookings as { guests: number }[] | null) || []
      ).reduce((total, booking) => total + booking.guests, 0);
    }

    const availabilityCheck = checkBookingAvailability({
      listing: listingRules,
      tourDate: body.tourDate,
      tourTime: body.tourTime,
      guests,
      reservedGuests,
    });

    if (!availabilityCheck.ok) {
      return NextResponse.json(
        {
          error: availabilityCheck.text,
          reasons: availabilityCheck.reasons,
        },
        { status: 400 },
      );
    }

    if (
      shouldAutoConfirmBooking({
        listing: listingRules,
        availability: availabilityCheck,
      })
    ) {
      bookingStatus = "confirmed";
    }
  }

  const { data: bookingData, error } = await supabaseServer
    .rpc("create_booking_request", {
      p_request_key: requestKey,
      p_full_name: body.fullName.trim().slice(0, 160),
      p_email: body.email.trim().toLowerCase().slice(0, 254),
      p_tour_date: body.tourDate,
      p_tour_time: body.tourTime.trim().slice(0, 120),
      p_guests: guests,
      p_guest_message: guestMessage,
      p_listing_id: body.listingId || null,
      p_status: bookingStatus,
      p_booking_value_cents: estimatedBookingValueCents,
      p_commission_rate: commissionRate,
      p_commission_amount_cents: estimatedCommissionCents,
      p_promo_code: body.promoCode?.trim().toUpperCase() || null,
      p_discount_amount_cents: discountAmountCents,
      p_selected_addons: selectedAddons,
    })
    .single();

  if (error) {
    console.error("Booking API error:", error.message);
    await logAppError({
      source: "booking_request",
      message: error.message,
      details: {
        listingId: body.listingId || null,
        email: body.email,
      },
    });
    const status = /available|enough space/i.test(error.message) ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  if (!bookingData) {
    return NextResponse.json(
      { error: "The booking request could not be created." },
      { status: 500 },
    );
  }

  const booking = bookingData as CreatedBooking;

  const bookingAccessToken = createBookingAccessToken({
    id: booking.id,
    email: booking.email,
  });
  const statusPath = withBookingAccess(
    `/book/status/${booking.id}`,
    bookingAccessToken,
  );
  const statusUrl = new URL(statusPath, getBaseUrl(request)).toString();

  await supabaseServer.from("booking_events").insert([
    {
      booking_id: booking.id,
      event_type: "created",
      actor_role: "guest",
      actor_email: booking.email,
      to_status: booking.status || "new",
      note:
        booking.status === "confirmed"
          ? "Booking request auto-confirmed by listing rules."
          : "Booking request submitted.",
    },
  ]);

  let listingTitle = "General booking request";
  let vendorEmail: string | null = null;
  let vendorName: string | null = null;

  if (booking.listing_id) {
    const { data: listing } = await supabaseServer
      .from("listings")
      .select("title, vendor_id")
      .eq("id", booking.listing_id)
      .maybeSingle();

    if (listing?.title) {
      listingTitle = listing.title;
    }

    if (listing?.vendor_id) {
      const { data: vendor } = await supabaseServer
        .from("vendors")
        .select("business_name, email")
        .eq("id", listing.vendor_id)
        .maybeSingle();

      vendorEmail = vendor?.email || null;
      vendorName = vendor?.business_name || null;
    }
  }

  await sendAdminNotification({
    subject: `New booking request: ${listingTitle}`,
    replyTo: booking.email,
    html: `
      <h2>New booking request</h2>
      <p><strong>Listing:</strong> ${escapeHtml(listingTitle)}</p>
      <p><strong>Name:</strong> ${escapeHtml(booking.full_name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(booking.email)}</p>
      <p><strong>Date:</strong> ${escapeHtml(booking.tour_date)}</p>
      <p><strong>Time:</strong> ${escapeHtml(booking.tour_time)}</p>
      <p><strong>Guests:</strong> ${escapeHtml(booking.guests)}</p>
      <p><strong>Estimated value:</strong> ${escapeHtml(formatBookingCents(estimatedBookingValueCents))}</p>
      ${
        selectedAddons.length > 0
          ? `<p><strong>Add-ons:</strong> ${escapeHtml(
              selectedAddons.map((addon) => addon.name).join(", "),
            )}</p>`
          : ""
      }
      ${
        booking.guest_message
          ? `<p><strong>Guest message:</strong> ${escapeHtml(booking.guest_message)}</p>`
          : ""
      }
    `,
    text: [
      "New booking request",
      `Listing: ${listingTitle}`,
      `Name: ${booking.full_name}`,
      `Email: ${booking.email}`,
      `Date: ${booking.tour_date}`,
      `Time: ${booking.tour_time}`,
      `Guests: ${booking.guests}`,
      `Estimated value: ${formatBookingCents(estimatedBookingValueCents)}`,
      selectedAddons.length > 0
        ? `Add-ons: ${selectedAddons.map((addon) => addon.name).join(", ")}`
        : "",
      booking.guest_message ? `Guest message: ${booking.guest_message}` : "",
    ].join("\n"),
  });

  await sendEmailNotification({
    to: booking.email,
    subject: `We received your Roatan request: ${listingTitle}`,
    html: `
      <p>Hi ${escapeHtml(booking.full_name)},</p>
      <p>Your request for <strong>${escapeHtml(listingTitle)}</strong> is safely in the operator queue.</p>
      <p><strong>Date:</strong> ${escapeHtml(booking.tour_date)}<br />
      <strong>Time:</strong> ${escapeHtml(booking.tour_time)}<br />
      <strong>Guests:</strong> ${escapeHtml(booking.guests)}</p>
      <p><a href="${escapeHtml(statusUrl)}" style="display:inline-block;background:#00a8a8;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700">Open secure trip status</a></p>
      <p style="color:#64748b;font-size:14px">Keep this private link. It gives access to this booking without requiring a password.</p>
    `,
    text: [
      `Hi ${booking.full_name},`,
      `We received your request for ${listingTitle}.`,
      `Date: ${booking.tour_date}`,
      `Time: ${booking.tour_time}`,
      `Guests: ${booking.guests}`,
      `Secure trip status: ${statusUrl}`,
    ].join("\n"),
  });

  await supabaseServer.from("analytics_events").insert([
    {
      event_type: "booking_request",
      path: "/book",
      listing_id: booking.listing_id,
      metadata: {
        guests: booking.guests,
        tour_date: booking.tour_date,
      },
    },
  ]);

  if (vendorEmail) {
    await sendEmailNotification({
      to: vendorEmail,
      subject: `New booking request: ${listingTitle}`,
      replyTo: booking.email,
      html: `
        <h2>New booking request</h2>
        <p><strong>Business:</strong> ${escapeHtml(vendorName)}</p>
        <p><strong>Listing:</strong> ${escapeHtml(listingTitle)}</p>
        <p><strong>Name:</strong> ${escapeHtml(booking.full_name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(booking.email)}</p>
        <p><strong>Date:</strong> ${escapeHtml(booking.tour_date)}</p>
        <p><strong>Time:</strong> ${escapeHtml(booking.tour_time)}</p>
        <p><strong>Guests:</strong> ${escapeHtml(booking.guests)}</p>
        <p><strong>Estimated value:</strong> ${escapeHtml(formatBookingCents(estimatedBookingValueCents))}</p>
        ${
          selectedAddons.length > 0
            ? `<p><strong>Add-ons:</strong> ${escapeHtml(
                selectedAddons.map((addon) => addon.name).join(", "),
              )}</p>`
            : ""
        }
        ${
          booking.guest_message
            ? `<p><strong>Guest message:</strong> ${escapeHtml(booking.guest_message)}</p>`
            : ""
        }
      `,
      text: [
        "New booking request",
        `Business: ${vendorName || ""}`,
        `Listing: ${listingTitle}`,
        `Name: ${booking.full_name}`,
        `Email: ${booking.email}`,
        `Date: ${booking.tour_date}`,
        `Time: ${booking.tour_time}`,
        `Guests: ${booking.guests}`,
        `Estimated value: ${formatBookingCents(estimatedBookingValueCents)}`,
        selectedAddons.length > 0
          ? `Add-ons: ${selectedAddons.map((addon) => addon.name).join(", ")}`
          : "",
        booking.guest_message ? `Guest message: ${booking.guest_message}` : "",
      ].join("\n"),
    });
  }

  await logActivity({
    actorEmail: booking.email,
    actorRole: "guest",
    action: "booking_submitted",
    targetType: "booking",
    targetId: booking.id,
    targetLabel: `${booking.full_name} - ${listingTitle}`,
    metadata: {
      listing_id: booking.listing_id,
      tour_date: booking.tour_date,
      tour_time: booking.tour_time,
      guests: booking.guests,
      vendor_notified: Boolean(vendorEmail),
    },
  });

  return NextResponse.json({
    bookingId: booking.id,
    bookingAccessToken,
    statusUrl,
  });
}
