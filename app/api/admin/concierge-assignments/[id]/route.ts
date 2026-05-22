import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import {
  buildConciergeAssignmentInsert,
  conciergeAssignmentStatuses,
  type ConciergeAssignmentStatus,
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

async function syncLeadStatus(leadId: string, assignmentStatus: string) {
  const nextStatus =
    assignmentStatus === "confirmed"
      ? "booked"
      : assignmentStatus === "quoted"
        ? "quoted"
        : assignmentStatus === "contacted"
          ? "contacted"
          : null;

  if (!nextStatus) return;

  const { data: lead } = await supabaseServer
    .from("concierge_leads")
    .select("status")
    .eq("id", leadId)
    .maybeSingle();

  if (!lead || ["booked", "closed"].includes(lead.status)) return;

  await supabaseServer
    .from("concierge_leads")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", leadId);
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
    listingId?: string | null;
    vendorId?: string | null;
    status?: string;
    contactMethod?: string;
    vendorNote?: string;
    guestQuoteCents?: number | string | null;
  };

  if (
    body.status &&
    !conciergeAssignmentStatuses.includes(body.status as ConciergeAssignmentStatus)
  ) {
    return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
  }

  const insertShape = buildConciergeAssignmentInsert({
    leadId: "not-used",
    listingId: body.listingId,
    vendorId: body.vendorId,
    status: body.status,
    contactMethod: body.contactMethod,
    vendorNote: body.vendorNote,
    guestQuoteCents: body.guestQuoteCents,
  });

  const { data: assignment, error } = await supabaseServer
    .from("concierge_lead_assignments")
    .update({
      listing_id: insertShape.listing_id,
      vendor_id: insertShape.vendor_id,
      status: insertShape.status,
      contact_method: insertShape.contact_method,
      vendor_note: insertShape.vendor_note,
      guest_quote_cents: insertShape.guest_quote_cents,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, lead_id, listing_id, vendor_id, status, contact_method, vendor_note, guest_quote_cents, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await syncLeadStatus(assignment.lead_id, assignment.status);

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "concierge_assignment_updated",
    targetType: "concierge_assignment",
    targetId: assignment.id,
    targetLabel: assignment.listing_id || assignment.vendor_id,
    metadata: {
      lead_id: assignment.lead_id,
      status: assignment.status,
      guest_quote_cents: assignment.guest_quote_cents,
    },
  });

  return NextResponse.json({ assignment });
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
  const { data: assignment, error } = await supabaseServer
    .from("concierge_lead_assignments")
    .delete()
    .eq("id", id)
    .select("id, lead_id, listing_id, vendor_id, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "concierge_assignment_deleted",
    targetType: "concierge_assignment",
    targetId: assignment.id,
    targetLabel: assignment.listing_id || assignment.vendor_id,
    metadata: {
      lead_id: assignment.lead_id,
      status: assignment.status,
    },
  });

  return NextResponse.json({ ok: true });
}
