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
const legacyTripPlanSelect =
  "id, user_id, email, name, pickup_area, arrival_type, trip_date, trip_time, guest_count, source, status, stops, created_at, updated_at";

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

function isMissingConciergeLeadColumn(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("concierge_lead_id") ||
      error?.message?.includes("guest_trip_plans_concierge_lead_id"),
  );
}

async function fetchTripPlan(id: string, userId: string) {
  const result = await supabaseServer
    .from("guest_trip_plans")
    .select(tripPlanSelect)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!isMissingConciergeLeadColumn(result.error)) {
    return {
      row: result.data ? (result.data as GuestTripPlanRow) : null,
      error: result.error,
      missingConciergeColumn: false,
    };
  }

  const fallback = await supabaseServer
    .from("guest_trip_plans")
    .select(legacyTripPlanSelect)
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  return {
    row: fallback.data
      ? ({ ...fallback.data, concierge_lead_id: null } as GuestTripPlanRow)
      : null,
    error: fallback.error,
    missingConciergeColumn: true,
  };
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
  const {
    row,
    error: planError,
    missingConciergeColumn,
  } = await fetchTripPlan(id, user.id);

  if (planError) {
    return NextResponse.json({ error: planError.message }, { status: 500 });
  }

  if (!row) {
    return NextResponse.json({ error: "Saved plan not found." }, { status: 404 });
  }

  const plan = guestTripPlanFromRow(row);

  if (plan.conciergeLeadId || plan.status === "concierge_requested") {
    return NextResponse.json({
      tripPlan: plan,
      conciergeLeadId: plan.conciergeLeadId || null,
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

  const updatePayload = missingConciergeColumn
    ? {
        status: "concierge_requested",
        updated_at: new Date().toISOString(),
      }
    : {
        concierge_lead_id: lead.id,
        status: "concierge_requested",
        updated_at: new Date().toISOString(),
      };
  const updateSelect = missingConciergeColumn
    ? legacyTripPlanSelect
    : tripPlanSelect;

  const { data: updatedRow, error: updateError } = await supabaseServer
    .from("guest_trip_plans")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", user.id)
    .select(updateSelect)
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const updatedPlanRow = updatedRow as unknown as GuestTripPlanRow;

  return NextResponse.json({
    tripPlan: guestTripPlanFromRow({
      ...updatedPlanRow,
      concierge_lead_id: missingConciergeColumn ? null : lead.id,
    }),
    conciergeLeadId: lead.id,
    warning: missingConciergeColumn
      ? "Concierge request sent without concierge tracking. Run the updated SQL to link saved plans to leads."
      : null,
  });
}
