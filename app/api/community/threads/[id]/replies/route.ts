import { NextResponse } from "next/server";
import {
  cleanCommunityText,
  normalizeCommunityAuthorRole,
  normalizeCommunityIdentity,
  normalizeCommunityStatus,
  type CommunityReply,
} from "@/lib/community-forum";
import { getCommunityIdentity, getCommunityUser } from "@/lib/community-server";
import { canReplyToCommunityThread } from "@/lib/community-verification";
import { supabaseServer } from "@/lib/supabase-server";

type ReplyRow = {
  id: string;
  thread_id: string;
  body: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  anonymous: boolean | null;
  author_role: string | null;
  community_verification_type: string | null;
  is_verified_local: boolean | null;
  is_verified_operator: boolean | null;
  is_best_answer: boolean | null;
  is_concierge_pick: boolean | null;
  helpful_count: number | null;
  status: string | null;
  created_at: string | null;
};

function mapReply(row: ReplyRow): CommunityReply {
  const verificationType = normalizeCommunityIdentity({
    authorRole: row.author_role,
    isVerifiedLocal: row.is_verified_local,
    isVerifiedOperator: row.is_verified_operator,
    verificationType: row.community_verification_type,
  });

  return {
    id: row.id,
    threadId: row.thread_id,
    body: row.body || "",
    displayName: row.display_name || "Roatan traveler",
    profileImageUrl: row.profile_image_url || null,
    anonymous: Boolean(row.anonymous),
    authorRole: normalizeCommunityAuthorRole(row.author_role),
    verificationType,
    isVerifiedLocal: Boolean(row.is_verified_local),
    isVerifiedOperator: Boolean(row.is_verified_operator),
    isBestAnswer: Boolean(row.is_best_answer),
    isConciergePick: Boolean(row.is_concierge_pick),
    helpfulCount: row.helpful_count || 0,
    status: normalizeCommunityStatus(row.status),
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCommunityUser(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });
  }

  const { id } = await context.params;
  const { data: thread, error: threadError } = await supabaseServer
    .from("community_threads")
    .select("status, is_locked")
    .eq("id", id)
    .maybeSingle();

  if (threadError) {
    return NextResponse.json({ error: threadError.message }, { status: 500 });
  }

  if (
    !thread ||
    !canReplyToCommunityThread({
      status: thread.status,
      isLocked: thread.is_locked,
    })
  ) {
    return NextResponse.json(
      { error: "This discussion is closed because a best answer was selected." },
      { status: 423 },
    );
  }

  const body = (await request.json()) as {
    body?: string;
    anonymous?: boolean;
  };
  const message = cleanCommunityText(body.body, 1000);
  const anonymous = Boolean(body.anonymous);

  if (!message) {
    return NextResponse.json({ error: "Write a reply first." }, { status: 400 });
  }

  const identity = await getCommunityIdentity({ anonymous, user });
  const now = new Date().toISOString();

  const { data, error } = await supabaseServer
    .from("community_replies")
    .insert([
      {
        thread_id: id,
        user_id: user.id,
        email: user.email.toLowerCase(),
        body: message,
        display_name: identity.displayName,
        profile_image_url: identity.profileImageUrl,
        anonymous,
        author_role: identity.authorRole,
        community_verification_type: identity.verificationType,
        is_verified_local: identity.isVerifiedLocal,
        is_verified_operator: identity.isVerifiedOperator,
        is_best_answer: false,
        is_concierge_pick: false,
        helpful_count: 0,
        status: "active",
      },
    ])
    .select(
      "id, thread_id, body, display_name, profile_image_url, anonymous, author_role, community_verification_type, is_verified_local, is_verified_operator, is_best_answer, is_concierge_pick, helpful_count, status, created_at",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message, setupRequired: true },
      { status: 500 },
    );
  }

  await supabaseServer.rpc("increment_community_thread_reply_count", {
    thread_id_input: id,
    last_reply_at_input: now,
  });

  return NextResponse.json({ reply: mapReply(data as ReplyRow) });
}
