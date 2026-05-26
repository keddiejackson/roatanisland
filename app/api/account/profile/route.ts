import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type ProfileBody = {
  displayName?: string;
  profileImageUrl?: string;
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

export async function GET(request: Request) {
  const user = await getUser(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseServer
    .from("guest_profiles")
    .select("user_id, email, display_name, profile_image_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    profile: profile || {
      user_id: user.id,
      email: user.email,
      display_name: "",
      profile_image_url: "",
    },
  });
}

export async function PATCH(request: Request) {
  const user = await getUser(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as ProfileBody;
  const displayName = (body.displayName || "").trim().slice(0, 80);
  const profileImageUrl = (body.profileImageUrl || "").trim();
  const now = new Date().toISOString();

  const { data: profile, error } = await supabaseServer
    .from("guest_profiles")
    .upsert(
      {
        user_id: user.id,
        email: user.email.toLowerCase(),
        display_name: displayName || null,
        profile_image_url: profileImageUrl || null,
        updated_at: now,
      },
      { onConflict: "user_id" },
    )
    .select("user_id, email, display_name, profile_image_url")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile });
}
