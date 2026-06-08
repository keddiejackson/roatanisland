import { NextResponse } from "next/server";
import { buildConciergeLeadInsert } from "@/lib/concierge-leads";
import { logAppError } from "@/lib/error-log";
import {
  escapeHtml,
  sendAdminNotification,
  sendEmailNotification,
} from "@/lib/notifications";
import { supabaseServer } from "@/lib/supabase-server";
import { buildSupportTicketInsert } from "@/lib/support-tickets";

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
  const isSupportLead = body.leadType === "support_request";
  let conciergeLeadId: string | null = null;
  let supportTicketId: string | null = null;

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

  if (isSupportLead) {
    const { data: ticket, error: ticketError } = await supabaseServer
      .from("support_tickets")
      .insert([buildSupportTicketInsert(body)])
      .select("id")
      .single();

    if (ticketError) {
      await logAppError({
        source: "support_ticket_insert",
        message: ticketError.message,
        details: {
          code: ticketError.code,
          email: body.email,
        },
        severity: "warning",
      });
    } else {
      supportTicketId = ticket.id;
    }
  }

  await sendAdminNotification({
    subject: isSupportLead
      ? `Support request: ${body.name}`
      : `New planning lead: ${body.name}`,
    replyTo: body.email,
    html: `
      <h2>${isSupportLead ? "New support request" : "New planning lead"}</h2>
      <p><strong>Name:</strong> ${escapeHtml(body.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(body.email)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(body.phone)}</p>
      <p><strong>Interest:</strong> ${escapeHtml(body.interest)}</p>
      <p><strong>Message:</strong></p>
      <p>${escapeHtml(body.message)}</p>
    `,
    text: [
      isSupportLead ? "New support request" : "New planning lead",
      `Name: ${body.name}`,
      `Email: ${body.email}`,
      `Phone: ${body.phone || ""}`,
      `Interest: ${body.interest || ""}`,
      `Message: ${body.message}`,
    ].join("\n"),
  });

  if (isConciergeLead) {
    await sendEmailNotification({
      to: body.email,
      subject: "We received your Roa concierge plan",
      replyTo:
        process.env.ADMIN_NOTIFICATION_EMAIL ||
        process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",")[0]?.trim(),
      html: `
        <p>Hi ${escapeHtml(body.name)},</p>
        <p>We received your Roa concierge plan. The RoatanIsland.life team will review your dates, guest count, pickup details, and suggested local options.</p>
        <p><strong>What happens next:</strong></p>
        <ol>
          <li>We check the plan details and timing.</li>
          <li>We follow up with any missing questions.</li>
          <li>We help shape the best next step or booking request.</li>
        </ol>
        <p>You can return to your account anytime to review saved trips and booking messages.</p>
      `,
      text: [
        `Hi ${body.name},`,
        "",
        "We received your Roa concierge plan. The RoatanIsland.life team will review your dates, guest count, pickup details, and suggested local options.",
        "",
        "What happens next:",
        "1. We check the plan details and timing.",
        "2. We follow up with any missing questions.",
        "3. We help shape the best next step or booking request.",
        "",
        "You can return to your account anytime to review saved trips and booking messages.",
      ].join("\n"),
    });
  }

  const { error: analyticsError } = await supabaseServer.from("analytics_events").insert([
    {
      event_type: isSupportLead ? "support_request" : "planning_lead",
      path: body.sourcePath || "/",
      metadata: {
        interest: body.interest || "",
        lead_type: body.leadType || "planning_lead",
        concierge_lead_id: conciergeLeadId,
        support_ticket_id: supportTicketId,
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
        support_ticket_id: supportTicketId,
      },
      severity: "warning",
    });
  }

  return NextResponse.json({ ok: true, conciergeLeadId, supportTicketId });
}
