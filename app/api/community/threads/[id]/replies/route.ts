import { NextResponse } from "next/server";
import {
  cleanCommunityText,
  communityDisplayName,
  normalizeCommunityAuthorRole,
  normalizeCommunityStatus,
  type CommunityReply,
} from "@/lib/community-forum";
import { supabaseServer } from "@/lib/supabase-server";

type ReplyRow = {
  id: string;
  thread_id: string;
  body: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  anonymous: boolean | null;
  author_role: string | null;
  is_verified_local: boolean | null;
  is_verified_operator: boolean | null;
  is_best_answer: boolean | null;
  is_concierge_pick: boolean | null;
  helpful_count: number | null;
  status: string | null;
  created_at: string | null;
};

async function getUser(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  return data.user
    ? {
        id: data.user.id,
        email: data.user.email || null,
      }
    : null;
}

async function getProfile(userId: string) {
  const { data } = await supabaseServer
    .from("guest_profiles")
    .select("display_name, profile_image_url")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    displayName: data?.display_name || "",
    profileImageUrl: data?.profile_image_url || null,
  };
}

function mapReply(row: ReplyRow): CommunityReply {
  return {
    id: row.id,
    threadId: row.thread_id,
    body: row.body || "",
    displayName: row.display_name || "Roatan traveler",
    profileImageUrl: row.profile_image_url || null,
    anonymous: Boolean(row.anonymous),
    authorRole: normalizeCommunityAuthorRole(row.author_role),
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
  const user = await getUser(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Sign in to reply." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    body?: string;
    anonymous?: boolean;
  };
  const message = cleanCommunityText(body.body, 1000);
  const anonymous = Boolean(body.anonymous);

  if (!message) {
    return NextResponse.json({ error: "Write a reply first." }, { status: 400 });
  }

  const profile = await getProfile(user.id);
  const displayName = communityDisplayName({
    anonymous,
    displayName: profile.displayName,
    email: user.email,
  });
  const profileImageUrl = anonymous ? null : profile.profileImageUrl;
  const now = new Date().toISOString();

  const { data, error } = await supabaseServer
    .from("community_replies")
    .insert([
      {
        thread_id: id,
        user_id: user.id,
        email: user.email.toLowerCase(),
        body: message,
        display_name: displayName,
        profile_image_url: profileImageUrl,
        anonymous,
        author_role: "traveler",
        is_verified_local: false,
        is_verified_operator: false,
        is_best_answer: false,
        is_concierge_pick: false,
        helpful_count: 0,
        status: "active",
      },
    ])
    .select(
      "id, thread_id, body, display_name, profile_image_url, anonymous, author_role, is_verified_local, is_verified_operator, is_best_answer, is_concierge_pick, helpful_count, status, created_at",
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
