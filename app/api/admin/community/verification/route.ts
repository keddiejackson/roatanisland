import { NextResponse } from "next/server";
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

type VerificationMessageRow = {
  id: string;
  request_id: string;
  sender_email: string | null;
  sender_role: string | null;
  body: string | null;
  created_at: string | null;
};

type VerifiedProfileRow = {
  user_id: string;
  email: string;
  display_name: string | null;
  profile_image_url: string | null;
  community_verification_type: string | null;
  community_verified_at: string | null;
  community_verified_by: string | null;
};

function mapMessage(row: VerificationMessageRow) {
  return {
    id: row.id,
    requestId: row.request_id,
    senderEmail: row.sender_email || "",
    senderRole: row.sender_role === "admin" ? "admin" : "traveler",
    body: row.body || "",
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapRequest(row: VerificationRequestRow, messages: VerificationMessageRow[]) {
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
    messages: messages.map(mapMessage),
  };
}

export async function GET(request: Request) {
  const adminEmail = await verifyCommunityAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ data: requestRows, error }, { data: verifiedRows }] =
    await Promise.all([
      supabaseServer
        .from("community_verification_requests")
        .select(
          "id, user_id, email, display_name, requested_type, approved_type, status, social_links, notes, admin_note, reviewed_by, reviewed_at, created_at, updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseServer
        .from("guest_profiles")
        .select(
          "user_id, email, display_name, profile_image_url, community_verification_type, community_verified_at, community_verified_by",
        )
        .neq("community_verification_type", "unverified")
        .order("community_verified_at", { ascending: false })
        .limit(100),
    ]);

  if (error) {
    return NextResponse.json({
      requests: [],
      verifiedAccounts: [],
      setupRequired: true,
      error: error.message,
    });
  }

  const rows = (requestRows || []) as VerificationRequestRow[];
  const ids = rows.map((row) => row.id);
  const messagesByRequest = new Map<string, VerificationMessageRow[]>();

  if (ids.length > 0) {
    const { data: messageRows } = await supabaseServer
      .from("community_verification_messages")
      .select("id, request_id, sender_email, sender_role, body, created_at")
      .in("request_id", ids)
      .order("created_at", { ascending: true });

    ((messageRows || []) as VerificationMessageRow[]).forEach((message) => {
      const list = messagesByRequest.get(message.request_id) || [];
      list.push(message);
      messagesByRequest.set(message.request_id, list);
    });
  }

  return NextResponse.json({
    requests: rows.map((row) =>
      mapRequest(row, messagesByRequest.get(row.id) || []),
    ),
    verifiedAccounts: ((verifiedRows || []) as VerifiedProfileRow[]).map(
      (row) => ({
        userId: row.user_id,
        email: row.email,
        displayName: row.display_name || row.email,
        profileImageUrl: row.profile_image_url || null,
        verificationType: normalizeCommunityVerificationType(
          row.community_verification_type,
        ),
        verifiedAt: row.community_verified_at || null,
        verifiedBy: row.community_verified_by || "",
      }),
    ),
    setupRequired: false,
  });
}
