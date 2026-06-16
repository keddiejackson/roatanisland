import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import {
  normalizeCommunityAuthorRole,
  normalizeCommunityStatus,
} from "@/lib/community-forum";
import { normalizeCommunityVerificationType } from "@/lib/community-verification";
import { supabaseServer } from "@/lib/supabase-server";

async function verifyAdmin(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

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
    authorRole?: string;
    isVerifiedLocal?: boolean;
    isVerifiedOperator?: boolean;
    communityVerificationType?: string;
  };
  const updates: Record<string, string | boolean> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.status === "string") {
    updates.status = normalizeCommunityStatus(body.status);
  }

  if (typeof body.authorRole === "string") {
    updates.author_role = normalizeCommunityAuthorRole(body.authorRole);
  }

  if (typeof body.isVerifiedLocal === "boolean") {
    updates.is_verified_local = body.isVerifiedLocal;
  }

  if (typeof body.isVerifiedOperator === "boolean") {
    updates.is_verified_operator = body.isVerifiedOperator;
  }

  if (typeof body.communityVerificationType === "string") {
    updates.community_verification_type = normalizeCommunityVerificationType(
      body.communityVerificationType,
    );
  }

  const { data: reply, error } = await supabaseServer
    .from("community_replies")
    .update(updates)
    .eq("id", id)
    .select("id, thread_id, display_name, status, author_role")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "community_reply_updated",
    targetType: "community_reply",
    targetId: id,
    targetLabel: reply.display_name || "Community reply",
    metadata: {
      thread_id: reply.thread_id,
      status: reply.status,
      author_role: reply.author_role,
    },
  });

  return NextResponse.json({ reply });
}
