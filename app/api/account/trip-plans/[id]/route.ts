import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

const allowedStatuses = new Set([
  "saved",
  "concierge_requested",
  "new",
  "reviewing",
  "contacted",
  "quoted",
  "booked",
  "closed",
]);

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

function cleanStatus(value: unknown) {
  return typeof value === "string" && allowedStatuses.has(value)
    ? value
    : "saved";
}

function cleanId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isMissingConciergeLeadColumn(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("concierge_lead_id") ||
      error?.message?.includes("guest_trip_plans_concierge_lead_id"),
  );
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getUser(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: string;
    conciergeLeadId?: string | null;
  };
  const status = cleanStatus(body.status);
  const conciergeLeadId = cleanId(body.conciergeLeadId);
  const basePayload = {
    status,
    updated_at: new Date().toISOString(),
  };

  let result = await supabaseServer
    .from("guest_trip_plans")
    .update({
      ...basePayload,
      concierge_lead_id: conciergeLeadId,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, status, concierge_lead_id")
    .single();

  if (isMissingConciergeLeadColumn(result.error)) {
    result = await supabaseServer
      .from("guest_trip_plans")
      .update(basePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, status")
      .single();
  }

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    tripPlan: {
      id,
      status,
      conciergeLeadId,
    },
  });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getUser(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { error } = await supabaseServer
    .from("guest_trip_plans")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
