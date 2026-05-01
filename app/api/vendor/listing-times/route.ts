import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type UpdateTimesRequest = {
  listingId?: string;
  tourTimes?: unknown;
  availabilityNote?: string;
  maxGuests?: number | string;
  minimumNoticeHours?: number | string;
};

async function getUserId(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  const { data } = await supabaseServer.auth.getUser(token);
  return data.user?.id || null;
}

function cleanTourTimes(times: unknown) {
  if (!Array.isArray(times)) {
    return [];
  }

  return times
    .filter((time): time is string => typeof time === "string")
    .map((time) => time.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export async function PATCH(request: Request) {
  const userId = await getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as UpdateTimesRequest;
  const tourTimes = cleanTourTimes(body.tourTimes);
  const availabilityNote = body.availabilityNote?.trim() || null;
  const maxGuests = body.maxGuests ? Number(body.maxGuests) : null;
  const minimumNoticeHours = body.minimumNoticeHours
    ? Number(body.minimumNoticeHours)
    : null;

  if (!body.listingId) {
    return NextResponse.json({ error: "Missing listing." }, { status: 400 });
  }

  if (tourTimes.length === 0) {
    return NextResponse.json(
      { error: "Add at least one tour time." },
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

  const { data: vendorLink } = await supabaseServer
    .from("vendor_users")
    .select("vendor_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!vendorLink?.vendor_id) {
    return NextResponse.json({ error: "Vendor account not found." }, { status: 403 });
  }

  const { data: listing } = await supabaseServer
    .from("listings")
    .select("id")
    .eq("id", body.listingId)
    .eq("vendor_id", vendorLink.vendor_id)
    .maybeSingle();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const { error } = await supabaseServer
    .from("listings")
    .update({
      tour_times: tourTimes,
      availability_note: availabilityNote,
      max_guests: maxGuests,
      minimum_notice_hours: minimumNoticeHours,
    })
    .eq("id", body.listingId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    tourTimes,
    availabilityNote,
    maxGuests,
    minimumNoticeHours,
  });
}
