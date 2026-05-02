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
  const { data: listing } = await supabaseServer
    .from("listings")
    .select("title")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabaseServer
    .from("listings")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "permanent_delete",
    targetType: "listing",
    targetId: id,
    targetLabel: listing?.title || "Deleted listing",
  });

  return NextResponse.json({ deleted: true });
}
