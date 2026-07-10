import "server-only";

import {
  verifyBookingAccessToken,
  type BookingAccessSubject,
} from "@/lib/booking-access";
import {
  getRequestUser,
  getVendorMembership,
  isAdminUser,
} from "@/lib/server-security";
import { supabaseServer } from "@/lib/supabase-server";

type BookingAuthorization = BookingAccessSubject & {
  listing_id?: string | null;
};

export async function authorizeBookingPage({
  booking,
  accessToken,
  quoteToken,
}: {
  booking: BookingAuthorization;
  accessToken?: string | null;
  quoteToken?: string | null;
}) {
  if (verifyBookingAccessToken(booking, accessToken)) return true;
  if (!quoteToken) return false;

  const { data: quote } = await supabaseServer
    .from("concierge_quotes")
    .select("id")
    .eq("booking_id", booking.id)
    .eq("public_token", quoteToken)
    .maybeSingle();

  return Boolean(quote);
}

export async function authorizeBookingRequest({
  request,
  booking,
  accessToken,
  quoteToken,
}: {
  request: Request;
  booking: BookingAuthorization;
  accessToken?: string | null;
  quoteToken?: string | null;
}) {
  if (await authorizeBookingPage({ booking, accessToken, quoteToken })) return true;

  const user = await getRequestUser(request);
  if (!user) return false;
  if (user.email === booking.email.trim().toLowerCase()) return true;
  if (await isAdminUser(user)) return true;

  if (!booking.listing_id) return false;
  const { data: listing } = await supabaseServer
    .from("listings")
    .select("vendor_id")
    .eq("id", booking.listing_id)
    .maybeSingle();

  return Boolean(
    listing?.vendor_id &&
      (await getVendorMembership(user, String(listing.vendor_id))),
  );
}
