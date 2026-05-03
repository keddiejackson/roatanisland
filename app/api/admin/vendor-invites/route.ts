import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { brandedEmail, sendEmailNotification } from "@/lib/notifications";
import { supabaseServer } from "@/lib/supabase-server";

type InviteRequest = {
  vendorId?: string;
  email?: string;
};

function getBaseUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("host")}`
  );
}

async function verifyAdmin(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;

  if (!email) {
    return null;
  }

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return admin ? email : null;
}

export async function POST(request: Request) {
  const adminEmail = await verifyAdmin(request);

  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as InviteRequest;
  const inviteEmail = body.email?.trim().toLowerCase();

  if (!body.vendorId || !inviteEmail) {
    return NextResponse.json(
      { error: "Choose a vendor and email." },
      { status: 400 },
    );
  }

  const { data: vendor } = await supabaseServer
    .from("vendors")
    .select("id, business_name")
    .eq("id", body.vendorId)
    .maybeSingle();

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
  }

  const { data: invite, error } = await supabaseServer
    .from("vendor_invites")
    .insert([
      {
        vendor_id: vendor.id,
        email: inviteEmail,
      },
    ])
    .select("id, token, expires_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const claimUrl = `${getBaseUrl(request)}/vendor/claim?token=${invite.token}`;

  await sendEmailNotification({
    to: inviteEmail,
    subject: `Claim your RoatanIsland.life vendor profile`,
    html: brandedEmail(
      "Claim your vendor profile",
      [
        ["Business", vendor.business_name],
        ["Invite expires", invite.expires_at],
      ],
      `Use this link to log in and claim your vendor profile: ${claimUrl}`,
    ),
    text: [
      `Claim your vendor profile for ${vendor.business_name}.`,
      claimUrl,
    ].join("\n"),
  });

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "vendor_invite_sent",
    targetType: "vendor",
    targetId: vendor.id,
    targetLabel: vendor.business_name,
    metadata: {
      invite_email: inviteEmail,
    },
  });

  return NextResponse.json({ inviteId: invite.id });
}
