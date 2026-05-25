import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { buildConciergeQuoteLineItems } from "@/lib/concierge-leads";
import { supabaseServer } from "@/lib/supabase-server";

type QuoteRequest = {
  quoteId?: string;
  title?: string;
  totalAmountCents?: number | string | null;
  depositAmountCents?: number | string | null;
  guestNote?: string;
  adminNote?: string;
  expiresAt?: string;
};

type AssignmentRow = {
  id: string;
  status: string | null;
  listing_id: string | null;
  vendor_id: string | null;
  vendor_note: string | null;
  guest_quote_cents: number | null;
};

type ListingRow = {
  id: string;
  title: string | null;
};

type VendorRow = {
  id: string;
  business_name: string | null;
};

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

function getBaseUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get(
      "host",
    )}`
  );
}

function cleanText(value: unknown, maxLength = 1000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanCents(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null;
}

function mapById<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const adminEmail = await verifyAdmin(request);
  if (!adminEmail) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as QuoteRequest;

  const { data: lead, error: leadError } = await supabaseServer
    .from("concierge_leads")
    .select("id, guest_name")
    .eq("id", id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const { data: assignmentRows, error: assignmentError } = await supabaseServer
    .from("concierge_lead_assignments")
    .select("id, status, listing_id, vendor_id, vendor_note, guest_quote_cents")
    .eq("lead_id", id)
    .order("created_at", { ascending: true });

  if (assignmentError) {
    return NextResponse.json({ error: assignmentError.message }, { status: 500 });
  }

  const assignments = ((assignmentRows || []) as AssignmentRow[]).filter(
    (assignment) => assignment.status !== "declined",
  );
  const listingIds = assignments
    .map((assignment) => assignment.listing_id)
    .filter(Boolean) as string[];
  const vendorIds = assignments
    .map((assignment) => assignment.vendor_id)
    .filter(Boolean) as string[];

  const [{ data: listings }, { data: vendors }] = await Promise.all([
    listingIds.length > 0
      ? supabaseServer.from("listings").select("id, title").in("id", listingIds)
      : Promise.resolve({ data: [] }),
    vendorIds.length > 0
      ? supabaseServer.from("vendors").select("id, business_name").in("id", vendorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const listingMap = mapById((listings || []) as ListingRow[]);
  const vendorMap = mapById((vendors || []) as VendorRow[]);
  const lineItems = buildConciergeQuoteLineItems(
    assignments.map((assignment) => ({
      ...assignment,
      listing: assignment.listing_id
        ? { title: listingMap.get(assignment.listing_id)?.title || null }
        : null,
      vendor: assignment.vendor_id
        ? { business_name: vendorMap.get(assignment.vendor_id)?.business_name || null }
        : null,
    })),
  );
  const lineItemTotal = lineItems.reduce(
    (total, item) => total + item.amountCents,
    0,
  );
  const totalAmountCents = cleanCents(body.totalAmountCents) ?? lineItemTotal;
  const depositAmountCents = cleanCents(body.depositAmountCents);

  if (lineItems.length === 0) {
    return NextResponse.json(
      { error: "Add at least one vendor match before creating a quote." },
      { status: 400 },
    );
  }

  if (totalAmountCents <= 0) {
    return NextResponse.json(
      { error: "Add quote amounts before sending this quote." },
      { status: 400 },
    );
  }

  const payload = {
    lead_id: id,
    status: "sent",
    title:
      cleanText(body.title, 160) ||
      `${lead.guest_name || "Guest"} Roatan concierge quote`,
    line_items: lineItems,
    total_amount_cents: totalAmountCents,
    deposit_amount_cents: depositAmountCents,
    guest_note: cleanText(body.guestNote, 4000) || null,
    admin_note: cleanText(body.adminNote, 4000) || null,
    expires_at: cleanText(body.expiresAt, 40) || null,
    updated_at: new Date().toISOString(),
  };

  const query = body.quoteId
    ? supabaseServer
        .from("concierge_quotes")
        .update(payload)
        .eq("id", body.quoteId)
        .eq("lead_id", id)
    : supabaseServer.from("concierge_quotes").insert([payload]);

  const { data: quote, error } = await query
    .select(
      "id, lead_id, public_token, status, title, line_items, total_amount_cents, deposit_amount_cents, guest_note, admin_note, guest_response, booking_id, expires_at, approved_at, created_at, updated_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseServer
    .from("concierge_leads")
    .update({ status: "quoted", updated_at: new Date().toISOString() })
    .eq("id", id);

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "concierge_quote_sent",
    targetType: "concierge_lead",
    targetId: id,
    targetLabel: quote.title,
    metadata: {
      quote_id: quote.id,
      total_amount_cents: quote.total_amount_cents,
      public_token: quote.public_token,
    },
  });

  return NextResponse.json({
    quote,
    approvalUrl: `${getBaseUrl(request)}/concierge/quote/${quote.public_token}`,
  });
}
