import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { cleanCommunityText } from "@/lib/community-forum";
import { verifyCommunityAdmin } from "@/lib/community-server";
import {
  normalizeCommunityVerificationRequestStatus,
  normalizeCommunityVerificationType,
} from "@/lib/community-verification";
import { supabaseServer } from "@/lib/supabase-server";

type VerificationRequestRow = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  requested_type: string | null;
  approved_type: string | null;
  status: string | null;
  social_links: string[] | null;
  notes: string | null;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function mapRequest(row: VerificationRequestRow) {
  return {
    id: row.id,
    userId: row.user_id,
    email: row.email,
    displayName: row.display_name || "",
    requestedType: normalizeCommunityVerificationType(row.requested_type),
    approvedType: normalizeCommunityVerificationType(row.approved_type),
    status: normalizeCommunityVerificationRequestStatus(row.status),
    socialLinks: row.social_links || [],
    notes: row.notes || "",
    adminNote: row.admin_note || "",
    reviewedBy: row.reviewed_by || "",
    reviewedAt: row.reviewed_at || null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.created_at || new Date().toISOString(),
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminEmail = await verifyCommunityAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: string;
    approvedType?: string;
    adminNote?: string;
  };
  const status = normalizeCommunityVerificationRequestStatus(body.status);
  const approvedType = normalizeCommunityVerificationType(body.approvedType);
  const safeApprovedType =
    approvedType === "unverified" || approvedType === "admin"
      ? "traveler"
      : approvedType;
  const now = new Date().toISOString();

  const { data: existing } = await supabaseServer
    .from("community_verification_requests")
    .select("id, user_id, email, display_name, requested_type")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Request not found." }, { status: 404 });
  }

  const requestedType = normalizeCommunityVerificationType(existing.requested_type);
  const selectedApprovedType = body.approvedType
    ? safeApprovedType
    : requestedType === "admin" || requestedType === "unverified"
      ? "traveler"
      : requestedType;
  const finalApprovedType =
    status === "approved"
      ? selectedApprovedType
      : null;

  const { data, error } = await supabaseServer
    .from("community_verification_requests")
    .update({
      status,
      approved_type: finalApprovedType,
      admin_note: cleanCommunityText(body.adminNote, 1200) || null,
      reviewed_by: status === "pending" ? null : adminEmail.toLowerCase(),
      reviewed_at: status === "pending" ? null : now,
      updated_at: now,
    })
    .eq("id", id)
    .select(
      "id, user_id, email, display_name, requested_type, approved_type, status, social_links, notes, admin_note, reviewed_by, reviewed_at, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (status === "approved" && finalApprovedType) {
    await supabaseServer.from("guest_profiles").upsert(
      {
        user_id: existing.user_id,
        email: existing.email.toLowerCase(),
        display_name: existing.display_name || existing.email.split("@")[0],
        community_verification_type: finalApprovedType,
        community_verified_at: now,
        community_verified_by: adminEmail.toLowerCase(),
        community_verification_note:
          cleanCommunityText(body.adminNote, 1200) || null,
        updated_at: now,
      },
      { onConflict: "user_id" },
    );
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "community_verification_updated",
    targetType: "community_verification_request",
    targetId: id,
    targetLabel: existing.email,
    metadata: {
      status,
      approved_type: finalApprovedType,
    },
  });

  return NextResponse.json({ request: mapRequest(data as VerificationRequestRow) });
}
