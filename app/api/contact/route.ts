import { NextResponse } from "next/server";
import { buildConciergeLeadInsert } from "@/lib/concierge-leads";
import { logAppError } from "@/lib/error-log";
import { escapeHtml, sendAdminNotification } from "@/lib/notifications";
import { supabaseServer } from "@/lib/supabase-server";

type ContactRequest = {
  name?: string;
  email?: string;
  phone?: string;
  interest?: string;
  message?: string;
  leadType?: string;
  travelDate?: string;
  guests?: string | number;
  pickupArea?: string;
  arrivalType?: string;
  tripStyle?: string;
  budget?: string;
  plan?: unknown;
  sourcePath?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ContactRequest;

  if (!body.name || !body.email || !body.message) {
    return NextResponse.json(
      { error: "Please add your name, email, and message." },
      { status: 400 },
    );
  }

  const isConciergeLead =
    body.leadType === "concierge_plan" ||
    (body.interest || "").toLowerCase().includes("concierge");
  let conciergeLeadId: string | null = null;

  if (isConciergeLead) {
    const { data: lead, error: leadError } = await supabaseServer
      .from("concierge_leads")
      .insert([buildConciergeLeadInsert(body)])
      .select("id")
      .single();

    if (leadError) {
      await logAppError({
        source: "concierge_lead_insert",
        message: leadError.message,
        details: {
          code: leadError.code,
          email: body.email,
        },
        severity: "warning",
      });
    } else {
      conciergeLeadId = lead.id;
    }
  }

  await sendAdminNotification({
    subject: `New planning lead: ${body.name}`,
    replyTo: body.email,
    html: `
      <h2>New planning lead</h2>
      <p><strong>Name:</strong> ${escapeHtml(body.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(body.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(body.phone)}</p>
      <p><strong>Interest:</strong> ${escapeHtml(body.interest)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(body.message)}</p>
    `,
    text: [
      "New planning lead",
      `Name: ${body.name}`,
      `Email: ${body.email}`,
      `Phone: ${body.phone || ""}`,
      `Interest: ${body.interest || ""}`,
      `Message: ${body.message}`,
    ].join("\n"),
  });

  const { error: analyticsError } = await supabaseServer.from("analytics_events").insert([
    {
      event_type: "planning_lead",
      path: body.sourcePath || "/",
      metadata: {
        interest: body.interest || "",
        lead_type: body.leadType || "planning_lead",
        concierge_lead_id: conciergeLeadId,
      },
    },
  ]);

  if (analyticsError) {
    await logAppError({
      source: "planning_lead_analytics",
      message: analyticsError.message,
      details: {
        interest: body.interest || "",
        concierge_lead_id: conciergeLeadId,
      },
      severity: "warning",
    });
  }

  return NextResponse.json({ ok: true, conciergeLeadId });
}
