import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type StripeCheckoutSession = {
  id: string;
  payment_intent?: string;
  payment_status?: string;
  metadata?: {
    booking_id?: string;
  };
};

type StripeEvent = {
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
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    return false;
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}

async function markBookingPaid(session: StripeCheckoutSession) {
  const bookingId = session.metadata?.booking_id;

  if (!bookingId) {
    return;
  }

  await supabaseServer
    .from("bookings")
    .update({
      deposit_status: session.payment_status === "paid" ? "paid" : "processing",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent || null,
      paid_at: session.payment_status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", bookingId);
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 400 });
  }

  if (!verifyStripeSignature(payload, signature, webhookSecret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    await markBookingPaid(event.data.object);
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const bookingId = event.data.object.metadata?.booking_id;

    if (bookingId) {
      await supabaseServer
        .from("bookings")
        .update({ deposit_status: "failed" })
        .eq("id", bookingId);
    }
  }

  return NextResponse.json({ received: true });
}
