import { NextResponse } from "next/server";
import { createBookingAccessToken } from "@/lib/booking-access";
import {
  enforceRateLimit,
  getRequestUser,
  getVendorMembership,
  isAdminUser,
  unauthorized,
} from "@/lib/server-security";
import { supabaseServer } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await enforceRateLimit(request, "booking:access", {
    limit: 30,
    windowSeconds: 15 * 60,
  });
  if (limited) return limited;

  const user = await getRequestUser(request);
  if (!user) return unauthorized();

  const { id } = await params;
  const { data: booking } = await supabaseServer
    .from("bookings")
    .select("id, email, listing_id")
    .eq("id", id)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  let allowed = user.email === String(booking.email).trim().toLowerCase();
  if (!allowed) allowed = await isAdminUser(user);

  if (!allowed && booking.listing_id) {
    const { data: listing } = await supabaseServer
      .from("listings")
      .select("vendor_id")
      .eq("id", booking.listing_id)
      .maybeSingle();
    allowed = Boolean(
      listing?.vendor_id &&
        (await getVendorMembership(user, String(listing.vendor_id))),
    );
  }

  if (!allowed) {
    return NextResponse.json({ error: "Booking access denied." }, { status: 403 });
  }

  return NextResponse.json({
    accessToken: createBookingAccessToken({
      id: String(booking.id),
      email: String(booking.email),
    }),
  });
}

