import { NextResponse } from "next/server";
import { cleanCommunityText } from "@/lib/community-forum";
import { getCommunityUser } from "@/lib/community-server";
import {
  normalizeCommunityVerificationRequestStatus,
  normalizeCommunityVerificationType,
  normalizeVerificationSocialLinks,
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
    messages: messages.map((message) => ({
      id: message.id,
      requestId: message.request_id,
      senderEmail: message.sender_email || "",
      senderRole: message.sender_role === "admin" ? "admin" : "traveler",
      body: message.body || "",
      createdAt: message.created_at || new Date().toISOString(),
    })),
  };
}

export async function GET(request: Request) {
  const user = await getCommunityUser(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseServer
    .from("guest_profiles")
    .select("display_name, community_verification_type")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: rows, error } = await supabaseServer
    .from("community_verification_requests")
    .select(
      "id, user_id, email, display_name, requested_type, approved_type, status, social_links, notes, admin_note, reviewed_by, reviewed_at, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({
      requests: [],
      setupRequired: true,
      error: error.message,
      profileVerificationType: normalizeCommunityVerificationType(
        profile?.community_verification_type,
      ),
    });
  }

  const requestRows = (rows || []) as VerificationRequestRow[];
  const requestIds = requestRows.map((row) => row.id);
  const messagesByRequest = new Map<string, VerificationMessageRow[]>();

  if (requestIds.length > 0) {
    const { data: messageRows } = await supabaseServer
      .from("community_verification_messages")
      .select("id, request_id, sender_email, sender_role, body, created_at")
      .in("request_id", requestIds)
      .order("created_at", { ascending: true });

    ((messageRows || []) as VerificationMessageRow[]).forEach((message) => {
      const list = messagesByRequest.get(message.request_id) || [];
      list.push(message);
      messagesByRequest.set(message.request_id, list);
    });
  }

  return NextResponse.json({
    profileVerificationType: normalizeCommunityVerificationType(
      profile?.community_verification_type,
    ),
    requests: requestRows.map((row) =>
      mapRequest(row, messagesByRequest.get(row.id) || []),
    ),
    setupRequired: false,
  });
}

export async function POST(request: Request) {
  const user = await getCommunityUser(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    requestedType?: string;
    socialLinks?: string[] | string;
    notes?: string;
  };
  const requestedType = normalizeCommunityVerificationType(body.requestedType);
  const safeRequestedType =
    requestedType === "admin" || requestedType === "unverified"
      ? "traveler"
      : requestedType;
  const socialLinks = normalizeVerificationSocialLinks(body.socialLinks);
  const notes = cleanCommunityText(body.notes, 1200);

  if (socialLinks.length === 0) {
    return NextResponse.json(
      { error: "Add at least one social media or public profile link." },
      { status: 400 },
    );
  }

  const { data: profile } = await supabaseServer
    .from("guest_profiles")
    .select("display_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data, error } = await supabaseServer
    .from("community_verification_requests")
    .insert([
      {
        user_id: user.id,
        email: user.email.toLowerCase(),
        display_name: profile?.display_name || user.email.split("@")[0],
        requested_type: safeRequestedType,
        status: "pending",
        social_links: socialLinks,
        notes: notes || null,
      },
    ])
    .select(
      "id, user_id, email, display_name, requested_type, approved_type, status, social_links, notes, admin_note, reviewed_by, reviewed_at, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message, setupRequired: true },
      { status: 500 },
    );
  }

  if (notes) {
    await supabaseServer.from("community_verification_messages").insert([
      {
        request_id: data.id,
        sender_user_id: user.id,
        sender_email: user.email.toLowerCase(),
        sender_role: "traveler",
        body: notes,
      },
    ]);
  }

  return NextResponse.json({
    request: mapRequest(data as VerificationRequestRow, []),
  });
}
