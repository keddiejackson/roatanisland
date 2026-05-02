import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type VendorProfileRequest = {
  businessName?: string;
  contactName?: string;
  phone?: string;
  website?: string;
  notes?: string;
  profileImageUrl?: string;
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

export async function PATCH(request: Request) {
  const userId = await getUserId(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as VendorProfileRequest;

  if (!body.businessName?.trim()) {
    return NextResponse.json(
      { error: "Business name is required." },
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

  const { data: vendor, error } = await supabaseServer
    .from("vendors")
    .update({
      business_name: body.businessName.trim(),
      contact_name: body.contactName?.trim() || null,
      phone: body.phone?.trim() || null,
      website: body.website?.trim() || null,
      notes: body.notes?.trim() || null,
      profile_image_url: body.profileImageUrl?.trim() || null,
    })
    .eq("id", vendorLink.vendor_id)
    .select(
      "id, business_name, contact_name, email, phone, website, notes, profile_image_url",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vendor });
}
