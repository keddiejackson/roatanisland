import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { supabaseServer } from "@/lib/supabase-server";

async function verifyAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;
  if (!email) return null;
  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return admin ? email : null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminEmail = await verifyAdmin(request);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  const body = (await request.json()) as { status?: string };
  const status = body.status || "reviewing";

  if (!["new", "reviewing", "resolved"].includes(status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("listing_reports")
    .update({ status })
    .eq("id", id)
    .select("id, listing_id, reason, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "listing_report_updated",
    targetType: "report",
    targetId: data.id,
    targetLabel: data.reason,
    metadata: { status, listing_id: data.listing_id },
  });

  return NextResponse.json({ report: data });
}
