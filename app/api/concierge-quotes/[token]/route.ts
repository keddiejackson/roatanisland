import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-log";
import { supabaseServer } from "@/lib/supabase-server";

type QuoteActionRequest = {
  action?: "approve" | "request_changes";
  message?: string;
};

type QuoteLineItem = {
  assignmentId?: string;
  title?: string;
  vendorName?: string;
  amountCents?: number;
};

function cleanText(value: unknown, maxLength = 4000) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

async function commissionRate() {
  const { data: settingsData } = await supabaseServer
    .from("site_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();
  const settings = settingsData?.value as
    | { commissionRate?: string | number }
    | null;

  return settings?.commissionRate ? Number(settings.commissionRate) : 0.1;
}

async function firstListingId(lineItems: QuoteLineItem[]) {
  const assignmentIds = lineItems
    .map((item) => item.assignmentId)
    .filter(Boolean) as string[];

  if (assignmentIds.length === 0) return null;

  const { data } = await supabaseServer
    .from("concierge_lead_assignments")
    .select("listing_id")
    .in("id", assignmentIds)
    .not("listing_id", "is", null)
    .limit(1);

  return data?.[0]?.listing_id || null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const body = (await request.json()) as QuoteActionRequest;

  const { data: quote, error: quoteError } = await supabaseServer
    .from("concierge_quotes")
    .select(
      "id, lead_id, public_token, status, title, line_items, total_amount_cents, deposit_amount_cents, guest_note, booking_id, expires_at",
    )
    .eq("public_token", token)
    .maybeSingle();

  if (quoteError || !quote) {
    return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  }

  if (
    quote.expires_at &&
    quote.expires_at < todayValue() &&
    !["approved", "deposit_started", "paid"].includes(quote.status)
  ) {
    await supabaseServer
      .from("concierge_quotes")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("id", quote.id);

    return NextResponse.json(
      { error: "This quote has expired. Please request an updated quote." },
      { status: 400 },
    );
  }

  if (body.action === "request_changes") {
    const message = cleanText(body.message);

    if (!message) {
      return NextResponse.json(
        { error: "Add a short note about what you want changed." },
        { status: 400 },
      );
    }

    const { data: updatedQuote, error } = await supabaseServer
      .from("concierge_quotes")
      .update({
        status: "change_requested",
        guest_response: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", quote.id)
      .select("id, status, guest_response")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseServer
      .from("concierge_leads")
      .update({ status: "reviewing", updated_at: new Date().toISOString() })
      .eq("id", quote.lead_id);

    await logActivity({
      actorRole: "guest",
      action: "concierge_quote_change_requested",
      targetType: "concierge_quote",
      targetId: quote.id,
      targetLabel: quote.title,
      metadata: { message },
    });

    return NextResponse.json({ quote: updatedQuote });
  }

  if (body.action !== "approve") {
    return NextResponse.json({ error: "Choose a valid action." }, { status: 400 });
  }

  if (quote.booking_id) {
    return NextResponse.json({ bookingId: quote.booking_id });
  }

  const { data: lead, error: leadError } = await supabaseServer
    .from("concierge_leads")
    .select(
      "id, guest_name, guest_email, travel_date, guests, pickup_area, arrival_type, trip_style, budget, message",
    )
    .eq("id", quote.lead_id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  if (!lead.travel_date) {
    return NextResponse.json(
      { error: "This quote needs a travel date before it can be approved." },
      { status: 400 },
    );
  }

  const lineItems = Array.isArray(quote.line_items)
    ? (quote.line_items as QuoteLineItem[])
    : [];
  const rate = await commissionRate();
  const listingId = await firstListingId(lineItems);
  const guestMessage = [
    "Concierge quote approved.",
    `Quote: ${quote.title}`,
    `Pickup: ${lead.pickup_area || "Not set"}`,
    `Arrival: ${lead.arrival_type || "Not set"}`,
    `Style: ${lead.trip_style || "Not set"}`,
    `Budget: ${lead.budget || "Not set"}`,
    quote.guest_note ? `Quote note: ${quote.guest_note}` : "",
    lead.message ? `Original request: ${lead.message}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const { data: booking, error: bookingError } = await supabaseServer
    .from("bookings")
    .insert([
      {
        full_name: lead.guest_name,
        email: lead.guest_email,
        tour_date: lead.travel_date,
        tour_time: "Concierge plan",
        guests: lead.guests || 1,
        status: "confirmed",
        guest_message: guestMessage,
        listing_id: listingId,
        booking_value_cents: quote.total_amount_cents,
        commission_rate: rate,
        commission_amount_cents: Math.round(quote.total_amount_cents * rate),
        selected_addons: lineItems,
      },
    ])
    .select("id")
    .single();

  if (bookingError || !booking) {
    return NextResponse.json(
      { error: bookingError?.message || "Unable to create booking." },
      { status: 500 },
    );
  }

  const { data: updatedQuote, error: updateError } = await supabaseServer
    .from("concierge_quotes")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      booking_id: booking.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", quote.id)
    .select("id, status, booking_id")
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  await logActivity({
    actorEmail: lead.guest_email,
    actorRole: "guest",
    action: "concierge_quote_approved",
    targetType: "concierge_quote",
    targetId: quote.id,
    targetLabel: quote.title,
    metadata: { booking_id: booking.id },
  });

  return NextResponse.json({ quote: updatedQuote, bookingId: booking.id });
}
