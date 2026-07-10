import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { logAppError } from "@/lib/error-log";
import { supabaseServer } from "@/lib/supabase-server";

type StripeCheckoutSession = {
  id: string;
  amount_total?: number;
  payment_intent?: string;
  payment_status?: string;
  metadata?: {
    booking_id?: string;
    payment_type?: string;
    amount_cents?: string;
  };
};

type StripeEvent = {
  id?: string;
  created?: number;
  type: string;
  data: {
    object: StripeCheckoutSession;
  };
};

function verifyStripeSignature(
  payload: string,
  signatureHeader: string,
  secret: string,
) {
  const parts = signatureHeader.split(",").map((part) => {
    const [key, value] = part.trim().split("=");
    return { key, value };
  });
  const timestamp = parts.find((part) => part.key === "t")?.value;
  const signatures = parts
    .filter((part) => part.key === "v1")
    .map((part) => part.value)
    .filter(Boolean);

  if (!timestamp || signatures.length === 0) {
    return false;
  }

  const signedAt = Number(timestamp);
  if (!Number.isFinite(signedAt) || Math.abs(Date.now() / 1000 - signedAt) > 300) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected);
  return signatures.some((signature) => {
    const actualBuffer = Buffer.from(signature);
    return (
      expectedBuffer.length === actualBuffer.length &&
      timingSafeEqual(expectedBuffer, actualBuffer)
    );
  });
}

async function markBookingPaid(session: StripeCheckoutSession) {
  const bookingId = session.metadata?.booking_id;

  if (!bookingId) {
    return;
  }

  const { data: booking } = await supabaseServer
    .from("bookings")
    .select("booking_value_cents, deposit_amount_cents")
    .eq("id", bookingId)
    .maybeSingle();

  if (session.payment_status === "paid") {
    const paidCents =
      session.amount_total ||
      booking?.deposit_amount_cents ||
      booking?.booking_value_cents ||
      0;

    if (paidCents > 0) {
      const { error: paymentError } = await supabaseServer.rpc(
        "record_stripe_booking_payment",
        {
        p_booking_id: bookingId,
        p_session_id: session.id,
        p_payment_intent_id: session.payment_intent || "",
        p_amount_cents: paidCents,
        },
      );

      if (paymentError) {
        throw new Error(`Unable to record Stripe payment: ${paymentError.message}`);
      }
    }
  } else {
    await supabaseServer
      .from("bookings")
      .update({
        deposit_status: "processing",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: session.payment_intent || null,
      })
      .eq("id", bookingId);
  }

  if (session.payment_status === "paid") {
    const { data: quote } = await supabaseServer
      .from("concierge_quotes")
      .select("id, lead_id")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (quote?.id) {
      await supabaseServer
        .from("concierge_quotes")
        .update({ status: "paid", updated_at: new Date().toISOString() })
        .eq("id", quote.id);

      await supabaseServer
        .from("concierge_leads")
        .update({ status: "booked", updated_at: new Date().toISOString() })
        .eq("id", quote.lead_id);
    }
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > 1024 * 1024) {
    return NextResponse.json({ error: "Payload too large." }, { status: 413 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    await logAppError({
      source: "stripe_webhook",
      message: "Stripe webhook missing secret or signature.",
      details: {
        hasWebhookSecret: Boolean(webhookSecret),
        hasSignature: Boolean(signature),
      },
    });
    return NextResponse.json({ error: "Webhook not configured." }, { status: 400 });
  }

  if (!verifyStripeSignature(payload, signature, webhookSecret)) {
    await logAppError({
      source: "stripe_webhook",
      message: "Stripe webhook signature verification failed.",
      details: {},
    });
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await markBookingPaid(event.data.object);
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const bookingId = event.data.object.metadata?.booking_id;

    if (bookingId) {
      const { data: recordedPayment } = await supabaseServer
        .from("booking_payments")
        .select("id")
        .eq("provider_session_id", event.data.object.id)
        .maybeSingle();

      if (!recordedPayment) {
        await supabaseServer
          .from("bookings")
          .update({ deposit_status: "failed" })
          .eq("id", bookingId)
          .not("deposit_status", "in", '("paid","partial_paid")');
      }

      await supabaseServer
        .from("concierge_quotes")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("booking_id", bookingId);
    }
  }

  return NextResponse.json({ received: true });
}
