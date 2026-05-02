import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

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

export async function GET(request: Request) {
  const userId = await getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: vendorLink } = await supabaseServer
    .from("vendor_users")
    .select("vendor_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!vendorLink?.vendor_id) {
    return NextResponse.json({ bookings: [] });
  }

  const { data: listings } = await supabaseServer
    .from("listings")
    .select("id, title")
    .eq("vendor_id", vendorLink.vendor_id);

  const listingRows = (listings as { id: string; title: string }[]) || [];
  const listingIds = listingRows.map((listing) => listing.id);
  const listingMap = new Map(
    listingRows.map((listing) => [listing.id, listing.title]),
  );

  if (listingIds.length === 0) {
    return NextResponse.json({ bookings: [] });
  }

  const { data: bookings, error } = await supabaseServer
    .from("bookings")
    .select(
      "id, full_name, email, tour_date, tour_time, guests, guest_message, vendor_note, status, listing_id, deposit_status, created_at",
    )
    .in("listing_id", listingIds)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    bookings: ((bookings as { listing_id: string | null }[]) || []).map(
      (booking) => ({
        ...booking,
        listing_name: booking.listing_id
          ? listingMap.get(booking.listing_id) || "Unknown listing"
          : "No listing",
      }),
    ),
  });
}
