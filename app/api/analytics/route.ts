import { NextResponse } from "next/server";
import { logAppError } from "@/lib/error-log";
import { enforceRateLimit, readJsonObject } from "@/lib/server-security";
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
  const limited = await enforceRateLimit(request, "analytics:event", {
    limit: 180,
    windowSeconds: 10 * 60,
  });
  if (limited) return limited;

  const parsedBody = await readJsonObject<AnalyticsRequest>(request, 16 * 1024);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

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
    await logAppError({
      source: "analytics",
      message: error.message,
      details: {
        eventType: body.eventType,
        path: body.path,
      },
      severity: "warning",
    });
  }

  return NextResponse.json({ ok: true });
}
