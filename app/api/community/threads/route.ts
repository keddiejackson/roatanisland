import { NextResponse } from "next/server";
import {
  cleanCommunityText,
  communityDisplayName,
  normalizeCommunityCategory,
  type CommunityReply,
  type CommunityThread,
} from "@/lib/community-forum";
import { supabaseServer } from "@/lib/supabase-server";

type ThreadRow = {
  id: string;
  category: string | null;
  title: string | null;
  body: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  anonymous: boolean | null;
  reply_count: number | null;
  created_at: string | null;
  last_reply_at: string | null;
};

type ReplyRow = {
  id: string;
  thread_id: string;
  body: string | null;
  display_name: string | null;
  profile_image_url: string | null;
  anonymous: boolean | null;
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
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function mapThread(row: ThreadRow, replies: CommunityReply[]): CommunityThread {
  return {
    id: row.id,
    category: normalizeCommunityCategory(row.category),
    title: row.title || "Roatan question",
    body: row.body || "",
    displayName: row.display_name || "Roatan traveler",
    profileImageUrl: row.profile_image_url || null,
    anonymous: Boolean(row.anonymous),
    replyCount: row.reply_count || replies.length,
    createdAt: row.created_at || new Date().toISOString(),
    lastReplyAt: row.last_reply_at || row.created_at || new Date().toISOString(),
    replies,
  };
}

export async function GET() {
  const { data: threadRows, error } = await supabaseServer
    .from("community_threads")
    .select(
      "id, category, title, body, display_name, profile_image_url, anonymous, reply_count, created_at, last_reply_at",
    )
    .eq("status", "active")
    .order("last_reply_at", { ascending: false })
    .limit(40);

  if (error) {
    return NextResponse.json({
      threads: [],
      setupRequired: true,
      error: error.message,
    });
  }

  const rows = (threadRows || []) as ThreadRow[];
  const threadIds = rows.map((row) => row.id);
  const repliesByThread = new Map<string, CommunityReply[]>();

  if (threadIds.length > 0) {
    const { data: replyRows } = await supabaseServer
      .from("community_replies")
      .select(
        "id, thread_id, body, display_name, profile_image_url, anonymous, created_at",
      )
      .in("thread_id", threadIds)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(240);

    ((replyRows || []) as ReplyRow[]).forEach((row) => {
      const replies = repliesByThread.get(row.thread_id) || [];
      replies.push(mapReply(row));
      repliesByThread.set(row.thread_id, replies);
    });
  }

  return NextResponse.json({
    threads: rows.map((row) =>
      mapThread(row, (repliesByThread.get(row.id) || []).slice(-6)),
    ),
    setupRequired: false,
  });
}

export async function POST(request: Request) {
  const user = await getUser(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Sign in to post." }, { status: 401 });
  }

  const body = (await request.json()) as {
    category?: string;
    title?: string;
    body?: string;
    anonymous?: boolean;
  };
  const title = cleanCommunityText(body.title, 120);
  const message = cleanCommunityText(body.body, 1200);
  const anonymous = Boolean(body.anonymous);

  if (!title || !message) {
    return NextResponse.json(
      { error: "Add a title and message." },
      { status: 400 },
    );
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
    .from("community_threads")
    .insert([
      {
        user_id: user.id,
        email: user.email.toLowerCase(),
        category: normalizeCommunityCategory(body.category),
        title,
        body: message,
        display_name: displayName,
        profile_image_url: profileImageUrl,
        anonymous,
        status: "active",
        reply_count: 0,
        last_reply_at: now,
      },
    ])
    .select(
      "id, category, title, body, display_name, profile_image_url, anonymous, reply_count, created_at, last_reply_at",
    )
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message, setupRequired: true },
      { status: 500 },
    );
  }

  return NextResponse.json({
    thread: mapThread(data as ThreadRow, []),
  });
}
