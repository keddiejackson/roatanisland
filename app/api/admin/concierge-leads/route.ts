import { NextResponse } from "next/server";
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

export async function GET(request: Request) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("concierge_leads")
    .select(
      "id, guest_name, guest_email, guest_phone, lead_type, status, priority, interest, message, travel_date, guests, pickup_area, arrival_type, trip_style, budget, plan, admin_notes, follow_up_date, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ leads: data || [] });
}
