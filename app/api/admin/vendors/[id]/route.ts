import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { supabaseServer } from "@/lib/supabase-server";

async function verifyAdmin(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;

  if (!email) {
    return null;
  }

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return admin ? email : null;
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { data: vendor } = await supabaseServer
    .from("vendors")
    .select("business_name")
    .eq("id", id)
    .maybeSingle();

  const { count: listingCount } = await supabaseServer
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("vendor_id", id);

  const { error: listingsError } = await supabaseServer
    .from("listings")
    .delete()
    .eq("vendor_id", id);

  if (listingsError) {
    return NextResponse.json(
      { error: listingsError.message },
      { status: 500 },
    );
  }

  const { error: vendorError } = await supabaseServer
    .from("vendors")
    .delete()
    .eq("id", id);

  if (vendorError) {
    return NextResponse.json({ error: vendorError.message }, { status: 500 });
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "permanent_delete",
    targetType: "vendor",
    targetId: id,
    targetLabel: vendor?.business_name || "Deleted vendor",
    metadata: {
      deleted_listings: listingCount || 0,
    },
  });

  return NextResponse.json({ deleted: true });
}
