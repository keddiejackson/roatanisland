import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import {
  draftSiteSettingsKey,
  publishedSiteSettingsKey,
} from "@/lib/homepage-settings";
import { supabaseServer } from "@/lib/supabase-server";

async function verifyAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
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

export async function PATCH(request: Request) {
  const adminEmail = await verifyAdmin(request);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const action =
    body.action === "save_draft" || body.action === "publish"
      ? body.action
      : "publish";
  const settings =
    body.settings && typeof body.settings === "object" && !Array.isArray(body.settings)
      ? (body.settings as Record<string, unknown>)
      : body;
  const updatedAt = new Date().toISOString();
  const rows =
    action === "save_draft"
      ? [
          {
            key: draftSiteSettingsKey,
            value: settings,
            updated_at: updatedAt,
          },
        ]
      : [
          {
            key: publishedSiteSettingsKey,
            value: settings,
            updated_at: updatedAt,
          },
          {
            key: draftSiteSettingsKey,
            value: settings,
            updated_at: updatedAt,
          },
        ];

  const { error } = await supabaseServer.from("site_settings").upsert(rows);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action:
      action === "save_draft"
        ? "site_settings_draft_saved"
        : "site_settings_updated",
    targetType: "settings",
    targetId:
      action === "save_draft" ? draftSiteSettingsKey : publishedSiteSettingsKey,
    targetLabel: "Site settings",
  });

  return NextResponse.json({ saved: true, action });
}
