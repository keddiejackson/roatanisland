import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import {
  cleanCommunityText,
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
    isPinned?: boolean;
    isFeatured?: boolean;
    roaSummary?: string;
    bestReplyId?: string | null;
    conciergePickReplyId?: string | null;
    isLocked?: boolean;
    lockedReason?: string;
    authorRole?: string;
    isVerifiedLocal?: boolean;
    isVerifiedOperator?: boolean;
    communityVerificationType?: string;
  };
  const updates: Record<string, string | boolean | null> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.status === "string") {
    updates.status = normalizeCommunityStatus(body.status);
  }

  if (typeof body.isPinned === "boolean") {
    updates.is_pinned = body.isPinned;
  }

  if (typeof body.isFeatured === "boolean") {
    updates.is_featured = body.isFeatured;
  }

  if (typeof body.roaSummary === "string") {
    updates.roa_summary = cleanCommunityText(body.roaSummary, 600) || null;
  }

  if ("bestReplyId" in body) {
    updates.best_reply_id = body.bestReplyId || null;
  }

  if ("conciergePickReplyId" in body) {
    updates.concierge_pick_reply_id = body.conciergePickReplyId || null;
  }

  if (typeof body.isLocked === "boolean") {
    updates.is_locked = body.isLocked;
    updates.locked_at = body.isLocked ? new Date().toISOString() : null;
    updates.locked_by = body.isLocked ? adminEmail.toLowerCase() : null;
    updates.locked_reason = body.isLocked
      ? cleanCommunityText(
          body.lockedReason || "Best answer selected",
          160,
        ) || "Best answer selected"
      : null;
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

  const { data: thread, error } = await supabaseServer
    .from("community_threads")
    .update(updates)
    .eq("id", id)
    .select("id, title, status, best_reply_id, concierge_pick_reply_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ("bestReplyId" in body) {
    await supabaseServer
      .from("community_replies")
      .update({ is_best_answer: false })
      .eq("thread_id", id);

    if (body.bestReplyId) {
      await supabaseServer
        .from("community_replies")
        .update({ is_best_answer: true })
        .eq("id", body.bestReplyId);
    }
  }

  if ("conciergePickReplyId" in body) {
    await supabaseServer
      .from("community_replies")
      .update({ is_concierge_pick: false })
      .eq("thread_id", id);

    if (body.conciergePickReplyId) {
      await supabaseServer
        .from("community_replies")
        .update({
          is_concierge_pick: true,
          author_role: "concierge",
          community_verification_type: "admin",
          is_verified_local: true,
        })
        .eq("id", body.conciergePickReplyId);
    }
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "community_thread_updated",
    targetType: "community_thread",
    targetId: id,
    targetLabel: thread.title,
    metadata: {
      status: thread.status,
      best_reply_id: thread.best_reply_id,
      concierge_pick_reply_id: thread.concierge_pick_reply_id,
    },
  });

  return NextResponse.json({ thread });
}
