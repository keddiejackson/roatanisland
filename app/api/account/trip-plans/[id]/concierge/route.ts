import { NextResponse } from "next/server";
import { buildConciergeLeadInsert } from "@/lib/concierge-leads";
import {
  buildGuestTripPlanConciergeRequest,
  guestTripPlanFromRow,
  type GuestTripPlanRow,
} from "@/lib/guest-trip-plans";
import { supabaseServer } from "@/lib/supabase-server";

const tripPlanSelect =
  "id, user_id, email, name, pickup_area, arrival_type, trip_date, trip_time, guest_count, source, status, concierge_lead_id, stops, created_at, updated_at";

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

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getUser(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { data: row, error: planError } = await supabaseServer
    .from("guest_trip_plans")
    .select(tripPlanSelect)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ error: "Saved plan not found." }, { status: 404 });
  }

  const plan = guestTripPlanFromRow(row as GuestTripPlanRow);

  if (plan.conciergeLeadId) {
    return NextResponse.json({
      tripPlan: plan,
      conciergeLeadId: plan.conciergeLeadId,
      alreadyRequested: true,
    });
  }

  const leadRequest = buildGuestTripPlanConciergeRequest(
    plan,
    user.email,
    user.email.split("@")[0],
  );

  const { data: lead, error: leadError } = await supabaseServer
    .from("concierge_leads")
    .insert(buildConciergeLeadInsert(leadRequest))
    .select("id")
    .single();

  if (leadError || !lead?.id) {
    return NextResponse.json(
      { error: leadError?.message || "Unable to create concierge request." },
      { status: 500 },
    );
  }

  const { data: updatedRow, error: updateError } = await supabaseServer
    .from("guest_trip_plans")
    .update({
      concierge_lead_id: lead.id,
      status: "concierge_requested",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(tripPlanSelect)
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({
    tripPlan: guestTripPlanFromRow(updatedRow as GuestTripPlanRow),
    conciergeLeadId: lead.id,
  });
}
