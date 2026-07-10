import { NextResponse } from "next/server";
import {
  createBookingAccessToken,
  withBookingAccess,
} from "@/lib/booking-access";
import { authorizeBookingRequest } from "@/lib/booking-access-server";
import { logAppError } from "@/lib/error-log";
import { enforceRateLimit, readJsonObject } from "@/lib/server-security";
import { supabaseServer } from "@/lib/supabase-server";

type DepositRequest = {
  bookingId?: string;
  paymentType?: "deposit" | "full";
  bookingAccessToken?: string;
  quoteToken?: string;
};

function getBaseUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get(
      "host",
    )}`
  );
}

export async function POST(request: Request) {
  const rateLimited = await enforceRateLimit(request, "payment:checkout", {
    limit: 12,
    windowSeconds: 15 * 60,
  });
  if (rateLimited) return rateLimited;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  let depositAmountCents = Number(
    process.env.STRIPE_DEPOSIT_AMOUNT_CENTS || "5000",
  );
  const parsedBody = await readJsonObject<DepositRequest>(request, 8 * 1024);
  if (!parsedBody.ok) return parsedBody.response;
  const body = parsedBody.data;

  const { data: settingsData } = await supabaseServer
    .from("site_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();
  const settings = settingsData?.value as
    | { depositAmountCents?: string | number }
    | null;

  if (settings?.depositAmountCents) {
    depositAmountCents = Number(settings.depositAmountCents);
  }

  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Deposits are not enabled yet." },
      { status: 400 },
    );
  }

  if (!body.bookingId || !Number.isFinite(depositAmountCents)) {
    return NextResponse.json(
      { error: "Unable to start deposit checkout." },
      { status: 400 },
    );
  }

  const { data: booking, error: bookingError } = await supabaseServer
    .from("bookings")
    .select(
      "id, full_name, email, listing_id, status, booking_value_cents, amount_paid_cents, balance_due_cents, payment_link_url, deposit_status, deposit_amount_cents",
    )
    .eq("id", body.bookingId)
    .single();

  if (bookingError || !booking) {
    await logAppError({
      source: "stripe_deposit",
      message: bookingError?.message || "Booking not found for deposit checkout.",
      details: {
        bookingId: body.bookingId,
      },
    });
    return NextResponse.json(
      { error: "Booking not found." },
      { status: 404 },
    );
  }

  const authorized = await authorizeBookingRequest({
    request,
    booking,
    accessToken: body.bookingAccessToken,
    quoteToken: body.quoteToken,
  });

  if (!authorized) {
    return NextResponse.json(
      { error: "Use the secure booking link or sign in before opening checkout." },
      { status: 403 },
    );
  }

  if (booking.status === "cancelled") {
    return NextResponse.json(
      { error: "Cancelled bookings cannot accept a payment." },
      { status: 409 },
    );
  }

  let listingTitle = "Roatan booking deposit";
  let checkoutAmountCents = depositAmountCents;
  let paymentLabel = "deposit";
  const { data: conciergeQuote } = await supabaseServer
    .from("concierge_quotes")
    .select("id, title, deposit_amount_cents")
    .eq("booking_id", booking.id)
    .maybeSingle();

  const outstandingBalance = Math.max(
    0,
    booking.balance_due_cents ??
      (booking.booking_value_cents || 0) - (booking.amount_paid_cents || 0),
  );

  if (body.paymentType === "full" && booking.booking_value_cents) {
    checkoutAmountCents = outstandingBalance || booking.booking_value_cents;
    paymentLabel = "full payment";
  } else if (conciergeQuote?.deposit_amount_cents) {
    checkoutAmountCents = conciergeQuote.deposit_amount_cents;
  }

  if (outstandingBalance > 0) {
    checkoutAmountCents = Math.min(checkoutAmountCents, outstandingBalance);
  }

  if (!Number.isInteger(checkoutAmountCents) || checkoutAmountCents < 50) {
    return NextResponse.json(
      { error: "This booking does not currently have a payable balance." },
      { status: 409 },
    );
  }

  if (booking.listing_id) {
    const { data: listing } = await supabaseServer
      .from("listings")
      .select("title")
      .eq("id", booking.listing_id)
      .maybeSingle();

    if (listing?.title) {
      listingTitle = `${listing.title} ${paymentLabel}`;
    }
  }

  if (conciergeQuote?.title) {
    listingTitle = `${conciergeQuote.title} ${paymentLabel}`;
  }

  const baseUrl = getBaseUrl(request);
  const secureAccessToken = createBookingAccessToken({
    id: booking.id,
    email: booking.email,
  });
  const secureStatusPath = withBookingAccess(
    `/book/status/${booking.id}`,
    secureAccessToken,
  );
  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("submit_type", "book");
  params.append("customer_email", booking.email);
  params.append(
    "success_url",
    `${baseUrl}/book/success?booking=${booking.id}&access=${encodeURIComponent(
      secureAccessToken,
    )}&session_id={CHECKOUT_SESSION_ID}`,
  );
  params.append(
    "cancel_url",
    new URL(secureStatusPath, baseUrl).toString(),
  );
  params.append("client_reference_id", booking.id);
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", "usd");
  params.append(
    "line_items[0][price_data][unit_amount]",
    String(checkoutAmountCents),
  );
  params.append(
    "line_items[0][price_data][product_data][name]",
    listingTitle,
  );
  params.append("metadata[booking_id]", booking.id);
  params.append("metadata[payment_type]", body.paymentType || "deposit");
  params.append("metadata[amount_cents]", String(checkoutAmountCents));
  params.append("payment_intent_data[metadata][booking_id]", booking.id);

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": `booking-${booking.id}-${body.paymentType || "deposit"}-${checkoutAmountCents}-${booking.amount_paid_cents || 0}`,
    },
    body: params,
  });

  const checkoutSession = await stripeResponse.json();

  if (!stripeResponse.ok || !checkoutSession.url) {
    console.error("Stripe checkout failed:", checkoutSession);
    await logAppError({
      source: "stripe_deposit",
      message: "Stripe checkout session creation failed.",
      details: {
        bookingId: booking.id,
        stripeResponse: checkoutSession,
      },
    });
    return NextResponse.json(
      { error: "Unable to start Stripe checkout." },
      { status: 500 },
    );
  }

  await supabaseServer
    .from("bookings")
    .update({
      deposit_status:
        body.paymentType === "full" ? "full_checkout_started" : "checkout_started",
      deposit_amount_cents: checkoutAmountCents,
      stripe_checkout_session_id: checkoutSession.id,
      payment_schedule_type:
        body.paymentType === "full" ? "full_payment" : "deposit_only",
      payment_requested_at: new Date().toISOString(),
      payment_last_sent_at: new Date().toISOString(),
      payment_link_url: checkoutSession.url,
      balance_due_cents:
        body.paymentType === "full"
          ? outstandingBalance || checkoutAmountCents
          : outstandingBalance ||
            Math.max(0, (booking.booking_value_cents || 0) - checkoutAmountCents),
    })
    .eq("id", booking.id);

  if (conciergeQuote?.id) {
    await supabaseServer
      .from("concierge_quotes")
      .update({
        status: "deposit_started",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conciergeQuote.id);
  }

  return NextResponse.json({
    url: checkoutSession.url,
    bookingAccessToken: secureAccessToken,
  });
}
