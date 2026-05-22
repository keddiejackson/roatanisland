import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { buildConciergeAssignmentInsert } from "@/lib/concierge-leads";
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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminEmail = await verifyAdmin(request);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    listingId?: string;
    vendorId?: string;
    status?: string;
    contactMethod?: string;
    vendorNote?: string;
    guestQuoteCents?: number | string;
  };

  let vendorId = body.vendorId || null;

  if (body.listingId && !vendorId) {
    const { data: listing } = await supabaseServer
      .from("listings")
      .select("vendor_id")
      .eq("id", body.listingId)
      .maybeSingle();

    vendorId = listing?.vendor_id || null;
  }

  if (!body.listingId && !vendorId) {
    return NextResponse.json(
      { error: "Choose a listing or vendor to assign." },
      { status: 400 },
    );
  }

  const { data: assignment, error } = await supabaseServer
    .from("concierge_lead_assignments")
    .insert([
      buildConciergeAssignmentInsert({
        leadId: id,
        listingId: body.listingId || null,
        vendorId,
        status: body.status,
        contactMethod: body.contactMethod,
        vendorNote: body.vendorNote,
        guestQuoteCents: body.guestQuoteCents,
      }),
    ])
    .select(
      "id, lead_id, listing_id, vendor_id, status, contact_method, vendor_note, guest_quote_cents, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServer
    .from("concierge_leads")
    .update({ status: "reviewing", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "new");

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "concierge_assignment_created",
    targetType: "concierge_lead",
    targetId: id,
    targetLabel: assignment.listing_id || assignment.vendor_id,
    metadata: {
      assignment_id: assignment.id,
      listing_id: assignment.listing_id,
      vendor_id: assignment.vendor_id,
      status: assignment.status,
    },
  });

  return NextResponse.json({ assignment });
}
