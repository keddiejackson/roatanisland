import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type AnalyticsRequest = {
  eventType?: string;
  path?: string;
  listingId?: string | null;
  vendorId?: string | null;
  referrer?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AnalyticsRequest;

  if (!body.eventType && !body.path) {
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabaseServer.from("analytics_events").insert([
    {
      event_type: body.eventType || "page_view",
      path: body.path || null,
      listing_id: body.listingId || null,
      vendor_id: body.vendorId || null,
      metadata: body.metadata || {},
      referrer: body.referrer || null,
      user_agent: request.headers.get("user-agent"),
    },
  ]);

  if (error) {
    console.error("Analytics event failed:", error.message);
  }

  return NextResponse.json({ ok: true });
}
