import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { supabaseServer } from "@/lib/supabase-server";

type ClaimRequest = {
  token?: string;
};

async function getUser(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  const { data } = await supabaseServer.auth.getUser(token);
  return data.user
    ? { id: data.user.id, email: data.user.email || null }
    : null;
}

export async function POST(request: Request) {
  const user = await getUser(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Please log in first." }, { status: 401 });
  }

  const body = (await request.json()) as ClaimRequest;

  if (!body.token) {
    return NextResponse.json({ error: "Invite token missing." }, { status: 400 });
  }

  const { data: invite } = await supabaseServer
    .from("vendor_invites")
    .select("id, vendor_id, email, accepted_at, expires_at, vendors(business_name)")
    .eq("token", body.token)
    .maybeSingle();

  const inviteRow = invite as
    | {
        id: string;
        vendor_id: string;
        email: string;
        accepted_at: string | null;
        expires_at: string;
        vendors: { business_name: string } | null;
      }
    | null;

  if (!inviteRow) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  if (inviteRow.accepted_at) {
    return NextResponse.json({ error: "Invite already accepted." }, { status: 400 });
  }

  if (new Date(inviteRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite expired." }, { status: 400 });
  }

  if (inviteRow.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json(
      { error: "Please log in with the invited email address." },
      { status: 403 },
    );
  }

  const { error } = await supabaseServer.from("vendor_users").insert([
    {
      vendor_id: inviteRow.vendor_id,
      user_id: user.id,
      email: user.email,
    },
  ]);

  if (error && !error.message.includes("duplicate key")) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServer
    .from("vendor_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", inviteRow.id);

  await logActivity({
    actorEmail: user.email,
    actorRole: "vendor",
    action: "vendor_profile_claimed",
    targetType: "vendor",
    targetId: inviteRow.vendor_id,
    targetLabel: inviteRow.vendors?.business_name || "Vendor",
  });

  return NextResponse.json({ vendorId: inviteRow.vendor_id });
}
