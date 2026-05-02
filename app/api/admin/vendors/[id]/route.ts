import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

async function verifyAdmin(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return false;
  }

  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;

  if (!email) {
    return false;
  }

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return Boolean(admin);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

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

  return NextResponse.json({ deleted: true });
}
