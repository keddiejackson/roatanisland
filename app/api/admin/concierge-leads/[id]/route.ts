import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import {
  conciergeLeadPriorities,
  conciergeLeadStatuses,
  normalizeConciergeLeadStatus,
  type ConciergeLeadStatus,
  type ConciergeLeadPriority,
} from "@/lib/concierge-leads";
import { escapeHtml, sendEmailNotification } from "@/lib/notifications";
import { supabaseServer } from "@/lib/supabase-server";

async function verifyAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;
  if (!email) return null;

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return admin ? email : null;
}

const roaStatusEmailCopy: Partial<
  Record<ConciergeLeadStatus, { subject: string; title: string; body: string }>
> = {
  reviewing: {
    subject: "Roa is reviewing your concierge plan",
    title: "Your Roa plan is being reviewed",
    body: "We are checking your dates, guest count, pickup details, timing, and the best local fit before we move it forward.",
  },
  contacted: {
    subject: "We are checking local options for your Roa plan",
    title: "Local operators are being checked",
    body: "The RoatanIsland.life team is checking vendor fit, timing, pickup details, and availability for your requested plan.",
  },
  quoted: {
    subject: "Your Roa concierge plan is ready for quote review",
    title: "Your quote is ready for review",
    body: "Your concierge plan has moved to quote review. Open your account for next steps, messages, and booking details.",
  },
  booked: {
    subject: "Your Roa concierge plan is booked",
    title: "Your Roa trip is booked",
    body: "Your plan is now booked. Keep an eye on your account for pickup notes, payments, messages, and final trip details.",
  },
};

function isRoaPlanLead(lead: {
  interest?: string | null;
  message?: string | null;
  plan?: unknown;
}) {
  const plan = lead.plan as { source?: string } | null;
  const text = [lead.interest, lead.message, plan?.source]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return text.includes("roa");
}

async function sendRoaStatusEmail({
  lead,
  status,
}: {
  lead: {
    guest_name: string;
    guest_email: string;
    interest?: string | null;
    message?: string | null;
    plan?: unknown;
  };
  status: ConciergeLeadStatus;
}) {
  const copy = roaStatusEmailCopy[status];

  if (!copy || !lead.guest_email || !isRoaPlanLead(lead)) return;

  await sendEmailNotification({
    to: lead.guest_email,
    subject: copy.subject,
    replyTo:
      process.env.ADMIN_NOTIFICATION_EMAIL ||
      process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",")[0]?.trim(),
    html: `
      <p>Hi ${escapeHtml(lead.guest_name)},</p>
      <h2>${escapeHtml(copy.title)}</h2>
      <p>${escapeHtml(copy.body)}</p>
      <p>You can return to your RoatanIsland.life account anytime to see saved plans, messages, and booking updates.</p>
    `,
    text: [
      `Hi ${lead.guest_name},`,
      "",
      copy.title,
      copy.body,
      "",
      "You can return to your RoatanIsland.life account anytime to see saved plans, messages, and booking updates.",
    ].join("\n"),
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminEmail = await verifyAdmin(request);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: string;
    priority?: string;
    adminNotes?: string;
    followUpDate?: string;
  };

  const status = normalizeConciergeLeadStatus(body.status);
  const priority = conciergeLeadPriorities.includes(
    body.priority as ConciergeLeadPriority,
  )
    ? body.priority
    : "general";

  if (
    body.status &&
    !conciergeLeadStatuses.includes(body.status as ConciergeLeadStatus)
  ) {
    return NextResponse.json({ error: "Choose a valid status." }, { status: 400 });
  }

  if (
    body.priority &&
    !conciergeLeadPriorities.includes(body.priority as ConciergeLeadPriority)
  ) {
    return NextResponse.json(
      { error: "Choose a valid priority." },
      { status: 400 },
    );
  }

  const { data: currentLead } = await supabaseServer
    .from("concierge_leads")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  const { data: lead, error } = await supabaseServer
    .from("concierge_leads")
    .update({
      status,
      priority,
      admin_notes: body.adminNotes?.trim() || null,
      follow_up_date: body.followUpDate || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, guest_name, guest_email, guest_phone, lead_type, status, priority, interest, message, travel_date, guests, pickup_area, arrival_type, trip_style, budget, plan, admin_notes, follow_up_date, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "concierge_lead_updated",
    targetType: "concierge_lead",
    targetId: lead.id,
    targetLabel: lead.guest_name,
    metadata: { status, priority, follow_up_date: body.followUpDate || null },
  });

  if (body.status && currentLead?.status !== status) {
    await sendRoaStatusEmail({ lead, status });
  }

  return NextResponse.json({ lead });
}
