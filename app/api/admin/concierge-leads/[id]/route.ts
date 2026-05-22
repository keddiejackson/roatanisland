import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import {
  conciergeLeadPriorities,
  conciergeLeadStatuses,
  normalizeConciergeLeadStatus,
  type ConciergeLeadStatus,
  type ConciergeLeadPriority,
} from "@/lib/concierge-leads";
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
    status?: string;
    priority?: string;
    adminNotes?: string;
    followUpDate?: string;
  };

  const status = normalizeConciergeLeadStatus(body.status);
  const priority = conciergeLeadPriorities.includes(
    body.priority as ConciergeLeadPriority,
  )
    ? body.priority
    : "general";

  if (
    body.status &&
    !conciergeLeadStatuses.includes(body.status as ConciergeLeadStatus)
  ) {
    return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
  }

  if (
    body.priority &&
    !conciergeLeadPriorities.includes(body.priority as ConciergeLeadPriority)
  ) {
    return NextResponse.json(
      { error: "Choose a valid priority." },
      { status: 400 },
    );
  }

  const { data: lead, error } = await supabaseServer
    .from("concierge_leads")
    .update({
      status,
      priority,
      admin_notes: body.adminNotes?.trim() || null,
      follow_up_date: body.followUpDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, guest_name, guest_email, guest_phone, lead_type, status, priority, interest, message, travel_date, guests, pickup_area, arrival_type, trip_style, budget, plan, admin_notes, follow_up_date, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "concierge_lead_updated",
    targetType: "concierge_lead",
    targetId: lead.id,
    targetLabel: lead.guest_name,
    metadata: { status, priority, follow_up_date: body.followUpDate || null },
  });

  return NextResponse.json({ lead });
}
