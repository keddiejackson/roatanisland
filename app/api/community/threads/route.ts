import { NextResponse } from "next/server";
import {
  buildCommunityRoaSummary,
  cleanCommunityNumber,
  cleanCommunityText,
  communityDisplayName,
  normalizeCommunityArrivalType,
  normalizeCommunityAuthorRole,
  normalizeCommunityCategory,
  normalizeCommunityStatus,
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
  author_role: string | null;
  is_verified_local: boolean | null;
  is_verified_operator: boolean | null;
  status: string | null;
  trip_date: string | null;
  area: string | null;
  group_size: number | null;
  arrival_type: string | null;
  arrival_time: string | null;
  budget: string | null;
  related_listing_id: string | null;
  related_listing_title: string | null;
  map_area: string | null;
  roa_summary: string | null;
  is_pinned: boolean | null;
  is_featured: boolean | null;
  best_reply_id: string | null;
  concierge_pick_reply_id: string | null;
  helpful_count: number | null;
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

function mapThread(row: ThreadRow, replies: CommunityReply[]): CommunityThread {
  return {
    id: row.id,
    category: normalizeCommunityCategory(row.category),
    title: row.title || "Roatan question",
    body: row.body || "",
    displayName: row.display_name || "Roatan traveler",
    profileImageUrl: row.profile_image_url || null,
    anonymous: Boolean(row.anonymous),
    authorRole: normalizeCommunityAuthorRole(row.author_role),
    isVerifiedLocal: Boolean(row.is_verified_local),
    isVerifiedOperator: Boolean(row.is_verified_operator),
    status: normalizeCommunityStatus(row.status),
    tripDate: row.trip_date || null,
    area: row.area || null,
    groupSize: row.group_size || null,
    arrivalType: normalizeCommunityArrivalType(row.arrival_type),
    arrivalTime: row.arrival_time || null,
    budget: row.budget || null,
    relatedListingId: row.related_listing_id || null,
    relatedListingTitle: row.related_listing_title || null,
    mapArea: row.map_area || row.area || null,
    roaSummary: buildCommunityRoaSummary({
      roaSummary: row.roa_summary,
      category: normalizeCommunityCategory(row.category),
      area: row.area || row.map_area,
      arrivalType: normalizeCommunityArrivalType(row.arrival_type),
      groupSize: row.group_size,
    }),
    isPinned: Boolean(row.is_pinned),
    isFeatured: Boolean(row.is_featured),
    bestReplyId: row.best_reply_id || null,
    conciergePickReplyId: row.concierge_pick_reply_id || null,
    helpfulCount: row.helpful_count || 0,
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
      "id, category, title, body, display_name, profile_image_url, anonymous, author_role, is_verified_local, is_verified_operator, status, trip_date, area, group_size, arrival_type, arrival_time, budget, related_listing_id, related_listing_title, map_area, roa_summary, is_pinned, is_featured, best_reply_id, concierge_pick_reply_id, helpful_count, reply_count, created_at, last_reply_at",
    )
    .eq("status", "active")
    .order("is_pinned", { ascending: false })
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
        "id, thread_id, body, display_name, profile_image_url, anonymous, author_role, is_verified_local, is_verified_operator, is_best_answer, is_concierge_pick, helpful_count, status, created_at",
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
    tripDate?: string;
    area?: string;
    groupSize?: number | string;
    arrivalType?: string;
    arrivalTime?: string;
    budget?: string;
    relatedListingId?: string;
    relatedListingTitle?: string;
    mapArea?: string;
  };
  const title = cleanCommunityText(body.title, 120);
  const message = cleanCommunityText(body.body, 1200);
  const anonymous = Boolean(body.anonymous);
  const category = normalizeCommunityCategory(body.category);
  const arrivalType = normalizeCommunityArrivalType(body.arrivalType);
  const area = cleanCommunityText(body.area, 80);
  const mapArea = cleanCommunityText(body.mapArea, 80) || area;
  const groupSize = cleanCommunityNumber(body.groupSize);
  const tripDate = cleanCommunityText(body.tripDate, 24);
  const arrivalTime = cleanCommunityText(body.arrivalTime, 40);
  const budget = cleanCommunityText(body.budget, 80);
  const relatedListingId = cleanCommunityText(body.relatedListingId, 80);
  const relatedListingTitle = cleanCommunityText(body.relatedListingTitle, 140);

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
        category,
        title,
        body: message,
        display_name: displayName,
        profile_image_url: profileImageUrl,
        anonymous,
        author_role: "traveler",
        is_verified_local: false,
        is_verified_operator: false,
        status: "active",
        trip_date: tripDate || null,
        area: area || null,
        group_size: groupSize,
        arrival_type: arrivalType,
        arrival_time: arrivalTime || null,
        budget: budget || null,
        related_listing_id: relatedListingId || null,
        related_listing_title: relatedListingTitle || null,
        map_area: mapArea || null,
        roa_summary: buildCommunityRoaSummary({
          category,
          area: area || mapArea,
          arrivalType,
          groupSize,
        }),
        is_pinned: false,
        is_featured: false,
        helpful_count: 0,
        reply_count: 0,
        last_reply_at: now,
      },
    ])
    .select(
      "id, category, title, body, display_name, profile_image_url, anonymous, author_role, is_verified_local, is_verified_operator, status, trip_date, area, group_size, arrival_type, arrival_time, budget, related_listing_id, related_listing_title, map_area, roa_summary, is_pinned, is_featured, best_reply_id, concierge_pick_reply_id, helpful_count, reply_count, created_at, last_reply_at",
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
