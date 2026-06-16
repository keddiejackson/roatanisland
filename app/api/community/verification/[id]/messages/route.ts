import { NextResponse } from "next/server";
import { cleanCommunityText } from "@/lib/community-forum";
import { getCommunityUser, verifyCommunityAdmin } from "@/lib/community-server";
import { supabaseServer } from "@/lib/supabase-server";

type VerificationRequestAccessRow = {
  id: string;
  user_id: string;
  email: string;
  status: string | null;
};

type VerificationMessageRow = {
  id: string;
  request_id: string;
  sender_email: string | null;
  sender_role: string | null;
  body: string | null;
  created_at: string | null;
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

async function getRequestAccess(request: Request, requestId: string) {
  const [user, adminEmail] = await Promise.all([
    getCommunityUser(request),
    verifyCommunityAdmin(request),
  ]);

  if (!user?.email && !adminEmail) return null;

  const { data } = await supabaseServer
    .from("community_verification_requests")
    .select("id, user_id, email, status")
    .eq("id", requestId)
    .maybeSingle();
  const row = data as VerificationRequestAccessRow | null;

  if (!row) return null;

  const isOwner = user?.id === row.user_id;
  if (!isOwner && !adminEmail) return null;

  return {
    row,
    user,
    adminEmail,
    senderRole: adminEmail ? "admin" : "traveler",
  };
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const access = await getRequestAccess(request, id);

  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("community_verification_messages")
    .select("id, request_id, sender_email, sender_role, body, created_at")
    .eq("request_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    messages: ((data || []) as VerificationMessageRow[]).map(mapMessage),
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const access = await getRequestAccess(request, id);

  if (!access) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { body?: string };
  const message = cleanCommunityText(body.body, 1200);

  if (!message) {
    return NextResponse.json({ error: "Write a message first." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("community_verification_messages")
    .insert([
      {
        request_id: id,
        sender_user_id: access.user?.id || null,
        sender_email:
          access.adminEmail?.toLowerCase() ||
          access.user?.email?.toLowerCase() ||
          null,
        sender_role: access.senderRole,
        body: message,
      },
    ])
    .select("id, request_id, sender_email, sender_role, body, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (access.senderRole === "admin" && access.row.status === "pending") {
    await supabaseServer
      .from("community_verification_requests")
      .update({
        status: "needs_info",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
  }

  return NextResponse.json({ message: mapMessage(data as VerificationMessageRow) });
}
