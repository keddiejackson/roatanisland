import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { escapeHtml, sendAdminNotification } from "@/lib/notifications";
import { supabaseServer } from "@/lib/supabase-server";

type VendorListingUpdateRequest = {
  title?: string;
  description?: string;
  price?: number | string;
  location?: string;
  category?: string;
  imageUrl?: string;
  galleryImageUrls?: unknown;
  tourTimes?: unknown;
  blockedDates?: unknown;
  availabilityNote?: string;
  maxGuests?: number | string;
  minimumNoticeHours?: number | string;
  bookingCutoffHours?: number | string;
  autoConfirmBookings?: boolean;
  privateBookingMode?: boolean;
  availableWeekdays?: unknown;
  seasonStartDate?: string;
  seasonEndDate?: string;
  latitude?: number | string;
  longitude?: number | string;
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

function cleanTourTimes(times: unknown) {
  if (!Array.isArray(times)) {
    return ["10:30 AM", "4:30 PM Sunset Cruise"];
  }

  const cleanedTimes = times
    .filter((time): time is string => typeof time === "string")
    .map((time) => time.trim())
    .filter(Boolean);

  return cleanedTimes.length > 0
    ? cleanedTimes.slice(0, 12)
    : ["10:30 AM", "4:30 PM Sunset Cruise"];
}

function cleanTextList(values: unknown, limit = 12) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function cleanWeekdays(values: unknown) {
  if (!Array.isArray(values)) {
    return [0, 1, 2, 3, 4, 5, 6];
  }

  const days = values
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);

  return days.length > 0 ? Array.from(new Set(days)).sort() : [0, 1, 2, 3, 4, 5, 6];
}

function cleanMonthDay(value: string | undefined) {
  const trimmed = value?.trim() || "";
  return /^\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
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
  const body = (await request.json()) as VendorListingUpdateRequest;
  const price = Number(body.price);
  const maxGuests = body.maxGuests ? Number(body.maxGuests) : null;
  const minimumNoticeHours = body.minimumNoticeHours
    ? Number(body.minimumNoticeHours)
    : null;
  const bookingCutoffHours = body.bookingCutoffHours
    ? Number(body.bookingCutoffHours)
    : null;
  const latitude = body.latitude ? Number(body.latitude) : null;
  const longitude = body.longitude ? Number(body.longitude) : null;

  if (
    !body.title?.trim() ||
    !body.description?.trim() ||
    !body.location?.trim() ||
    !body.category?.trim() ||
    !Number.isFinite(price)
  ) {
    return NextResponse.json(
      { error: "Please complete every required listing field." },
      { status: 400 },
    );
  }

  if (
    (maxGuests !== null && (!Number.isInteger(maxGuests) || maxGuests < 1)) ||
    (minimumNoticeHours !== null &&
      (!Number.isInteger(minimumNoticeHours) || minimumNoticeHours < 0)) ||
    (bookingCutoffHours !== null &&
      (!Number.isInteger(bookingCutoffHours) || bookingCutoffHours < 0))
  ) {
    return NextResponse.json(
      { error: "Please check the capacity and notice settings." },
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

  const { data: existingListing } = await supabaseServer
    .from("listings")
    .select("id")
    .eq("id", id)
    .eq("vendor_id", vendorLink.vendor_id)
    .maybeSingle();

  if (!existingListing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const { data: listing, error } = await supabaseServer
    .from("listings")
    .update({
      title: body.title.trim(),
      description: body.description.trim(),
      price,
      location: body.location.trim(),
      category: body.category.trim(),
      image_url: body.imageUrl?.trim() || null,
      gallery_image_urls: cleanTextList(body.galleryImageUrls),
      tour_times: cleanTourTimes(body.tourTimes),
      blocked_dates: cleanTextList(body.blockedDates, 60),
      availability_note: body.availabilityNote?.trim() || null,
      max_guests: maxGuests,
      minimum_notice_hours: minimumNoticeHours,
      booking_cutoff_hours: bookingCutoffHours,
      auto_confirm_bookings: body.autoConfirmBookings === true,
      private_booking_mode: body.privateBookingMode === true,
      available_weekdays: cleanWeekdays(body.availableWeekdays),
      season_start_date: cleanMonthDay(body.seasonStartDate),
      season_end_date: cleanMonthDay(body.seasonEndDate),
      latitude,
      longitude,
      is_active: false,
      approval_status: "pending",
      approval_note: null,
      is_featured: false,
    })
    .eq("id", id)
    .select(
      "id, title, description, price, location, image_url, gallery_image_urls, category, tour_times, blocked_dates, availability_note, max_guests, minimum_notice_hours, booking_cutoff_hours, auto_confirm_bookings, private_booking_mode, available_weekdays, season_start_date, season_end_date, latitude, longitude, is_active, approval_status, approval_note",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await sendAdminNotification({
    subject: `Vendor listing edited for review: ${listing.title}`,
    html: `
      <h2>Vendor listing edited</h2>
      <p><strong>Title:</strong> ${escapeHtml(listing.title)}</p>
      <p><strong>Category:</strong> ${escapeHtml(listing.category)}</p>
      <p><strong>Location:</strong> ${escapeHtml(listing.location)}</p>
      <p><strong>Price:</strong> $${escapeHtml(listing.price)}</p>
      <p><strong>Vendor ID:</strong> ${escapeHtml(vendorLink.vendor_id)}</p>
      <p>This listing is now waiting for admin review.</p>
    `,
    text: [
      "Vendor listing edited",
      `Title: ${listing.title}`,
      `Category: ${listing.category}`,
      `Location: ${listing.location}`,
      `Price: $${listing.price}`,
      `Vendor ID: ${vendorLink.vendor_id}`,
      "This listing is now waiting for admin review.",
    ].join("\n"),
  });

  await logActivity({
    actorEmail: user.email,
    actorRole: "vendor",
    action: "listing_edited",
    targetType: "listing",
    targetId: listing.id,
    targetLabel: listing.title,
    metadata: {
      vendor_id: vendorLink.vendor_id,
      status: "waiting_for_admin_review",
    },
  });

  return NextResponse.json({ listing });
}
