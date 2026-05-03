import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { logAppError } from "@/lib/error-log";
import { escapeHtml, sendAdminNotification } from "@/lib/notifications";
import {
  createSupabaseUserClient,
  supabaseServer,
} from "@/lib/supabase-server";
import { normalizeWebsiteUrl } from "@/lib/url";

type VendorListingRequest = {
  vendorId?: string | null;
  businessName?: string;
  contactName?: string;
  vendorEmail?: string;
  phone?: string;
  website?: string;
  vendorNotes?: string;
  title?: string;
  description?: string;
  price?: number | string;
  location?: string;
  category?: string;
  imageUrl?: string;
  galleryImageUrls?: unknown;
  tourTimes?: string[];
  blockedDates?: unknown;
  availabilityNote?: string;
  maxGuests?: number | string;
  minimumNoticeHours?: number | string;
  latitude?: number | string;
  longitude?: number | string;
};

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

async function getSessionFromRequest(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return { token: null, userId: null, email: null };
  }

  const { data } = await supabaseServer.auth.getUser(token);
  return {
    token,
    userId: data.user?.id ?? null,
    email: data.user?.email ?? null,
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as VendorListingRequest;
  const price = Number(body.price);
  const maxGuests = body.maxGuests ? Number(body.maxGuests) : null;
  const minimumNoticeHours = body.minimumNoticeHours
    ? Number(body.minimumNoticeHours)
    : null;
  const latitude = body.latitude ? Number(body.latitude) : null;
  const longitude = body.longitude ? Number(body.longitude) : null;

  if (
    !body.title ||
    !body.description ||
    !body.location ||
    !body.category ||
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
      (!Number.isInteger(minimumNoticeHours) || minimumNoticeHours < 0))
  ) {
    return NextResponse.json(
      { error: "Please check the capacity and notice settings." },
      { status: 400 },
    );
  }

  if (
    (latitude !== null && !Number.isFinite(latitude)) ||
    (longitude !== null && !Number.isFinite(longitude))
  ) {
    return NextResponse.json(
      { error: "Please check the map pin coordinates." },
      { status: 400 },
    );
  }

  const { token, userId, email } = await getSessionFromRequest(request);
  let vendorId = body.vendorId || null;

  if (vendorId && userId) {
    const userSupabase = token
      ? createSupabaseUserClient(token)
      : supabaseServer;
    const { data: linkedVendor } = await userSupabase
      .from("vendor_users")
      .select("vendor_id")
      .eq("vendor_id", vendorId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!linkedVendor) {
      return NextResponse.json(
        { error: "This listing is not linked to your vendor account." },
        { status: 403 },
      );
    }
  }

  if (!vendorId) {
    if (!body.businessName || !body.vendorEmail) {
      return NextResponse.json(
        { error: "Please add the business name and vendor email." },
        { status: 400 },
      );
    }

    const { data: vendor, error: vendorError } = await supabaseServer
      .from("vendors")
      .insert([
        {
          business_name: body.businessName,
          contact_name: body.contactName || null,
          email: body.vendorEmail || null,
          phone: body.phone || null,
          website: normalizeWebsiteUrl(body.website),
          notes: body.vendorNotes || null,
          is_active: true,
        },
      ])
      .select("id")
      .single();

    if (vendorError) {
      console.error("Vendor listing vendor error:", vendorError.message);
      await logAppError({
        source: "vendor_listing_vendor",
        message: vendorError.message,
        details: {
          businessName: body.businessName,
          vendorEmail: body.vendorEmail,
        },
      });
      return NextResponse.json({ error: vendorError.message }, { status: 500 });
    }

    vendorId = vendor.id;

    if (userId) {
      await supabaseServer.from("vendor_users").insert([
        {
          vendor_id: vendorId,
          user_id: userId,
          email: body.vendorEmail || null,
        },
      ]);
    }
  }

  const { data: listing, error: listingError } = await supabaseServer
    .from("listings")
    .insert([
      {
        vendor_id: vendorId,
        title: body.title,
        description: body.description,
        price,
        location: body.location,
        category: body.category,
        image_url: body.imageUrl || null,
        gallery_image_urls: cleanTextList(body.galleryImageUrls),
        tour_times: cleanTourTimes(body.tourTimes),
        blocked_dates: cleanTextList(body.blockedDates, 60),
        availability_note: body.availabilityNote?.trim() || null,
        max_guests: maxGuests,
        minimum_notice_hours: minimumNoticeHours,
        latitude,
        longitude,
        is_active: false,
        approval_status: "pending",
        approval_note: null,
      },
    ])
    .select("id, title, price, location, category, vendor_id")
    .single();

  if (listingError) {
    console.error("Vendor listing API error:", listingError.message);
    await logAppError({
      source: "vendor_listing_submission",
      message: listingError.message,
      details: {
        vendorId,
        title: body.title,
        category: body.category,
      },
    });
    return NextResponse.json({ error: listingError.message }, { status: 500 });
  }

  await sendAdminNotification({
    subject: `New vendor listing for review: ${listing.title}`,
    replyTo: body.vendorEmail,
    html: `
      <h2>New vendor listing submitted</h2>
      <p><strong>Title:</strong> ${escapeHtml(listing.title)}</p>
      <p><strong>Category:</strong> ${escapeHtml(listing.category)}</p>
      <p><strong>Location:</strong> ${escapeHtml(listing.location)}</p>
      <p><strong>Price:</strong> $${escapeHtml(listing.price)}</p>
      <p><strong>Vendor ID:</strong> ${escapeHtml(listing.vendor_id)}</p>
      <p><strong>Vendor email:</strong> ${escapeHtml(body.vendorEmail)}</p>
    `,
    text: [
      "New vendor listing submitted",
      `Title: ${listing.title}`,
      `Category: ${listing.category}`,
      `Location: ${listing.location}`,
      `Price: $${listing.price}`,
      `Vendor ID: ${listing.vendor_id}`,
      `Vendor email: ${body.vendorEmail || ""}`,
    ].join("\n"),
  });

  await supabaseServer.from("analytics_events").insert([
    {
      event_type: "vendor_listing_submission",
      path: "/vendor/add-listing",
      listing_id: listing.id,
      vendor_id: listing.vendor_id,
      metadata: {
        category: listing.category,
      },
    },
  ]);

  await logActivity({
    actorEmail: email || body.vendorEmail || null,
    actorRole: userId ? "vendor" : "guest",
    action: "listing_submitted",
    targetType: "listing",
    targetId: listing.id,
    targetLabel: listing.title,
    metadata: {
      vendor_id: listing.vendor_id,
      category: listing.category,
      status: "waiting_for_admin_review",
    },
  });

  return NextResponse.json({ listingId: listing.id });
}
