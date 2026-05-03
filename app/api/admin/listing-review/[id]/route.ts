import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { brandedEmail, sendEmailNotification } from "@/lib/notifications";
import { supabaseServer } from "@/lib/supabase-server";

type ReviewRequest = {
  decision?: "approved" | "rejected";
  note?: string | null;
};

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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as ReviewRequest;
  const decision = body.decision;
  const note = body.note?.trim().slice(0, 1000) || null;

  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "Choose approve or reject." }, { status: 400 });
  }

  const { data: listing, error } = await supabaseServer
    .from("listings")
    .update({
      approval_status: decision,
      approval_note: note,
      is_active: decision === "approved",
    })
    .eq("id", id)
    .select("id, title, vendor_id, approval_status, approval_note")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: vendor } = listing.vendor_id
    ? await supabaseServer
        .from("vendors")
        .select("business_name, email")
        .eq("id", listing.vendor_id)
        .maybeSingle()
    : { data: null };

  if (vendor?.email) {
    await sendEmailNotification({
      to: vendor.email,
      subject:
        decision === "approved"
          ? `Listing approved: ${listing.title}`
          : `Listing needs changes: ${listing.title}`,
      html: brandedEmail(
        decision === "approved" ? "Listing approved" : "Listing needs changes",
        [
          ["Listing", listing.title],
          ["Business", vendor.business_name],
          ["Status", decision],
          ["Note", note || "No note added"],
        ],
        decision === "approved"
          ? "Your listing is now live on RoatanIsland.life."
          : "Please update the listing from your vendor dashboard and submit it again.",
      ),
      text: [
        `Listing: ${listing.title}`,
        `Status: ${decision}`,
        note ? `Note: ${note}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: decision === "approved" ? "listing_approved" : "listing_rejected",
    targetType: "listing",
    targetId: listing.id,
    targetLabel: listing.title,
    metadata: {
      note,
      vendor_id: listing.vendor_id,
    },
  });

  return NextResponse.json({ listing });
}
