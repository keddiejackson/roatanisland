import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { supabaseServer } from "@/lib/supabase-server";
import { normalizeWebsiteUrl } from "@/lib/url";

type VendorProfileRequest = {
  businessName?: string;
  contactName?: string;
  phone?: string;
  website?: string;
  notes?: string;
  profileImageUrl?: string;
  showContactName?: boolean;
  showEmail?: boolean;
  showPhone?: boolean;
  showWebsite?: boolean;
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

export async function PATCH(request: Request) {
  const user = await getUser(request);

  if (!user) {
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
    .eq("user_id", user.id)
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
      website: normalizeWebsiteUrl(body.website),
      notes: body.notes?.trim() || null,
      profile_image_url: body.profileImageUrl?.trim() || null,
      show_contact_name: body.showContactName ?? true,
      show_email: body.showEmail ?? true,
      show_phone: body.showPhone ?? true,
      show_website: body.showWebsite ?? true,
    })
    .eq("id", vendorLink.vendor_id)
    .select(
      "id, business_name, contact_name, email, phone, website, notes, profile_image_url, show_contact_name, show_email, show_phone, show_website",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorEmail: user.email,
    actorRole: "vendor",
    action: "vendor_profile_updated",
    targetType: "vendor",
    targetId: vendor.id,
    targetLabel: vendor.business_name,
    metadata: {
      show_contact_name: vendor.show_contact_name,
      show_email: vendor.show_email,
      show_phone: vendor.show_phone,
      show_website: vendor.show_website,
    },
  });

  return NextResponse.json({ vendor });
}
