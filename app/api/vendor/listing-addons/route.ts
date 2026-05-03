import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

async function getUserId(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await supabaseServer.auth.getUser(token);
  return data.user?.id || null;
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json()) as {
    listingId?: string;
    name?: string;
    priceCents?: string | number;
  };
  if (!body.listingId || !body.name?.trim()) {
    return NextResponse.json({ error: "Add listing, name, and price." }, { status: 400 });
  }
  const { data: vendorLink } = await supabaseServer
    .from("vendor_users")
    .select("vendor_id")
    .eq("user_id", userId)
    .maybeSingle();
  const { data: listing } = await supabaseServer
    .from("listings")
    .select("id")
    .eq("id", body.listingId)
    .eq("vendor_id", vendorLink?.vendor_id || "")
    .maybeSingle();
  if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const { data, error } = await supabaseServer
    .from("listing_addons")
    .insert([
      {
        listing_id: body.listingId,
        name: body.name.trim(),
        price_cents: Number(body.priceCents || 0),
      },
    ])
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ addon: data });
}
