export type GuestTripPlanStop = {
  listingId: string;
  title: string;
  timeBlock?: string;
  note?: string;
  location?: string;
  category?: string;
  price?: number | null;
};

export type GuestTripPlanInput = {
  name?: string | null;
  pickupArea?: string | null;
  arrivalType?: string | null;
  tripDate?: string | null;
  tripTime?: string | null;
  guestCount?: string | number | null;
  source?: string | null;
  stops?: GuestTripPlanStop[] | null;
  status?: string | null;
};

export type GuestTripPlan = {
  id?: string;
  email?: string | null;
  name: string;
  pickupArea: string;
  arrivalType: string;
  tripDate: string;
  tripTime: string;
  guestCount: number | null;
  source: string;
  status?: string;
  stops: GuestTripPlanStop[];
  created_at?: string;
  updated_at?: string;
};

export type GuestTripPlanRow = {
  id: string;
  user_id?: string;
  email: string | null;
  name: string;
  pickup_area: string | null;
  arrival_type: string | null;
  trip_date: string | null;
  trip_time: string | null;
  guest_count: number | null;
  source: string | null;
  status: string | null;
  stops: GuestTripPlanStop[] | null;
  created_at: string;
  updated_at: string;
};

function cleanText(value: unknown, fallback = "", maxLength = 140) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned.slice(0, maxLength) || fallback;
}

function cleanGuestCount(value: GuestTripPlanInput["guestCount"]) {
  if (value === null || value === undefined || value === "") return null;
  const count = Number(value);
  if (!Number.isFinite(count) || count < 1) return null;
  return Math.min(99, Math.round(count));
}

function cleanPrice(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const price = Number(value);
  return Number.isFinite(price) ? price : null;
}

export function normalizeGuestTripPlanInput(input: GuestTripPlanInput) {
  const stops = (Array.isArray(input.stops) ? input.stops : [])
    .map((stop): GuestTripPlanStop | null => {
      const listingId = cleanText(stop.listingId, "", 80);
      if (!listingId) return null;

      return {
        listingId,
        title: cleanText(stop.title, "Saved stop", 120),
        timeBlock: cleanText(stop.timeBlock, "", 40),
        note: cleanText(stop.note, "", 180),
        location: cleanText(stop.location, "", 80),
        category: cleanText(stop.category, "", 80),
        price: cleanPrice(stop.price),
      };
    })
    .filter((stop): stop is GuestTripPlanStop => Boolean(stop))
    .slice(0, 12);

  return {
    name: cleanText(input.name, `Roatan plan (${stops.length} stops)`, 100),
    pickupArea: cleanText(input.pickupArea, "Flexible pickup", 100),
    arrivalType: cleanText(input.arrivalType, "Map plan", 80),
    tripDate: cleanText(input.tripDate, "", 20),
    tripTime: cleanText(input.tripTime, "", 40),
    guestCount: cleanGuestCount(input.guestCount),
    source: cleanText(input.source, "map", 40),
    stops,
  };
}

export function guestTripPlanFromRow(row: GuestTripPlanRow): GuestTripPlan {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    pickupArea: row.pickup_area || "Flexible pickup",
    arrivalType: row.arrival_type || "Map plan",
    tripDate: row.trip_date || "",
    tripTime: row.trip_time || "",
    guestCount: row.guest_count,
    source: row.source || "map",
    status: row.status || "saved",
    stops: Array.isArray(row.stops) ? row.stops : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function getGuestTripPlanSummary(plan: Pick<GuestTripPlan, "pickupArea" | "tripDate" | "stops">) {
  const stopCount = plan.stops.length;
  const stopLabel = `${stopCount} stop${stopCount === 1 ? "" : "s"}`;
  const parts = [stopLabel, plan.pickupArea, plan.tripDate].filter(Boolean);
  return parts.join(" / ");
}

export function buildGuestTripPlanMapUrl(plan: Pick<GuestTripPlan, "stops">) {
  const ids = plan.stops
    .map((stop) => stop.listingId)
    .filter(Boolean)
    .join(",");

  return ids ? `/map?trip=${encodeURIComponent(ids)}` : "/map";
}

export function getGuestTripPlanAdminSummary(
  plans: Array<Pick<GuestTripPlan, "status" | "stops">>,
) {
  const total = plans.length;
  const conciergeRequested = plans.filter(
    (plan) => plan.status === "concierge_requested",
  ).length;
  const saved = plans.filter((plan) => (plan.status || "saved") === "saved").length;
  const stopCount = plans.reduce((totalStops, plan) => totalStops + plan.stops.length, 0);

  return {
    total,
    conciergeRequested,
    saved,
    stopCount,
    label:
      total === 1 ? "1 saved guest plan" : `${total} saved guest plans`,
  };
}
