import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

async function verifyAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;
  if (!email) return false;
  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  return Boolean(admin);
}

export async function POST(request: Request) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = (await request.json()) as {
    code?: string;
    description?: string;
    discountPercent?: string;
    discountAmountCents?: string;
    expiresAt?: string;
  };
  const { data, error } = await supabaseServer
    .from("promo_codes")
    .insert([
      {
        code: body.code?.trim().toUpperCase(),
        description: body.description?.trim() || null,
        discount_percent: body.discountPercent
          ? Number(body.discountPercent)
          : null,
        discount_amount_cents: body.discountAmountCents
          ? Number(body.discountAmountCents)
          : null,
        expires_at: body.expiresAt || null,
        is_active: true,
      },
    ])
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ promo: data });
}
