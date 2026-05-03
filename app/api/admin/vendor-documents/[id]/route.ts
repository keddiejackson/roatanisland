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
  const body = (await request.json()) as {
    status?: "pending" | "approved" | "rejected";
    adminNote?: string;
  };

  if (!body.status || !["pending", "approved", "rejected"].includes(body.status)) {
    return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
  }

  const { data: document, error } = await supabaseServer
    .from("vendor_documents")
    .update({
      status: body.status,
      admin_note: body.adminNote?.trim() || null,
    })
    .eq("id", id)
    .select("id, vendor_id, title, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (body.status === "approved") {
    await supabaseServer
      .from("vendors")
      .update({ is_verified: true })
      .eq("id", document.vendor_id);
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "vendor_document_reviewed",
    targetType: "vendor",
    targetId: document.vendor_id,
    targetLabel: document.title,
    metadata: { status: document.status },
  });

  return NextResponse.json({ document });
}
