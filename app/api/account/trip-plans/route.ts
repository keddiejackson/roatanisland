import { NextResponse } from "next/server";
import {
  guestTripPlanFromRow,
  normalizeGuestTripPlanInput,
  type GuestTripPlanRow,
} from "@/lib/guest-trip-plans";
import { supabaseServer } from "@/lib/supabase-server";

type TripPlanBody = Parameters<typeof normalizeGuestTripPlanInput>[0];

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

  const { data, error } = await supabaseServer
    .from("guest_trip_plans")
    .select(
      "id, user_id, email, name, pickup_area, arrival_type, trip_date, trip_time, guest_count, source, status, concierge_lead_id, stops, created_at, updated_at",
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    tripPlans: ((data as GuestTripPlanRow[]) || []).map(guestTripPlanFromRow),
  });
}

export async function POST(request: Request) {
  const user = await getUser(request);

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as TripPlanBody;
  const plan = normalizeGuestTripPlanInput(body);

  if (plan.stops.length === 0) {
    return NextResponse.json(
      { error: "Save at least one stop before saving a plan." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseServer
    .from("guest_trip_plans")
    .insert({
      user_id: user.id,
      email: user.email.toLowerCase(),
      name: plan.name,
      pickup_area: plan.pickupArea,
      arrival_type: plan.arrivalType,
      trip_date: plan.tripDate || null,
      trip_time: plan.tripTime || null,
      guest_count: plan.guestCount,
      source: plan.source,
      status: "saved",
      stops: plan.stops,
      updated_at: now,
    })
    .select(
      "id, user_id, email, name, pickup_area, arrival_type, trip_date, trip_time, guest_count, source, status, concierge_lead_id, stops, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { tripPlan: guestTripPlanFromRow(data as GuestTripPlanRow) },
    { status: 201 },
  );
}
