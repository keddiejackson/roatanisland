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

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    isActive?: boolean;
    expiresAt?: string | null;
  };

  const { data, error } = await supabaseServer
    .from("promo_codes")
    .update({
      ...(typeof body.isActive === "boolean" ? { is_active: body.isActive } : {}),
      ...(body.expiresAt !== undefined
        ? { expires_at: body.expiresAt || null }
        : {}),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ promo: data });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { error } = await supabaseServer.from("promo_codes").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
