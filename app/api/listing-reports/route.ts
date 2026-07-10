import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { enforceRateLimit, readJsonObject } from "@/lib/server-security";
import { supabaseServer } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "listing-report:create", {
    limit: 5,
    windowSeconds: 24 * 60 * 60,
  });
  if (limited) return limited;

  const parsedBody = await readJsonObject<{
    listingId?: string;
    reporterName?: string;
    reporterEmail?: string;
    reason?: string;
    details?: string;
  }>(request, 16 * 1024);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;
  if (!body.listingId || !body.reason?.trim()) {
    return NextResponse.json({ error: "Choose a reason." }, { status: 400 });
  }
  const { data, error } = await supabaseServer
    .from("listing_reports")
    .insert([
      {
        listing_id: body.listingId,
        reporter_name: body.reporterName?.trim() || null,
        reporter_email: body.reporterEmail?.trim() || null,
        reason: body.reason.trim(),
        details: body.details?.trim() || null,
      },
    ])
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logActivity({
    actorEmail: body.reporterEmail,
    actorRole: "guest",
    action: "listing_reported",
    targetType: "listing",
    targetId: body.listingId,
    targetLabel: body.reason,
    metadata: { report_id: data.id },
  });
  return NextResponse.json({ reportId: data.id });
}
