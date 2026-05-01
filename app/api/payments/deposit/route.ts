import { NextResponse } from "next/server";
import { logAppError } from "@/lib/error-log";
import { supabaseServer } from "@/lib/supabase-server";

type DepositRequest = {
  bookingId?: string;
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
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const depositAmountCents = Number(
    process.env.STRIPE_DEPOSIT_AMOUNT_CENTS || "5000",
  );
  const body = (await request.json()) as DepositRequest;

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
    .select("id, full_name, email, listing_id")
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

  let listingTitle = "Roatan booking deposit";

  if (booking.listing_id) {
    const { data: listing } = await supabaseServer
      .from("listings")
      .select("title")
      .eq("id", booking.listing_id)
      .maybeSingle();

    if (listing?.title) {
      listingTitle = `${listing.title} deposit`;
    }
  }

  const baseUrl = getBaseUrl(request);
  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("submit_type", "book");
  params.append("customer_email", booking.email);
  params.append(
    "success_url",
    `${baseUrl}/book/success?booking=${booking.id}&session_id={CHECKOUT_SESSION_ID}`,
  );
  params.append(
    "cancel_url",
    `${baseUrl}/book${booking.listing_id ? `?listing=${booking.listing_id}` : ""}`,
  );
  params.append("client_reference_id", booking.id);
  params.append("line_items[0][quantity]", "1");
  params.append("line_items[0][price_data][currency]", "usd");
  params.append(
    "line_items[0][price_data][unit_amount]",
    String(depositAmountCents),
  );
  params.append(
    "line_items[0][price_data][product_data][name]",
    listingTitle,
  );
  params.append("metadata[booking_id]", booking.id);
  params.append("payment_intent_data[metadata][booking_id]", booking.id);

  const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
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
      deposit_status: "checkout_started",
      deposit_amount_cents: depositAmountCents,
      stripe_checkout_session_id: checkoutSession.id,
    })
    .eq("id", booking.id);

  return NextResponse.json({ url: checkoutSession.url });
}
