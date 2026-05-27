import { NextResponse } from "next/server";
import {
  escapeHtml,
  sendEmailNotification,
} from "@/lib/notifications";
import {
  buildVendorPayoutReceiptEmail,
  getVendorPayoutReceipts,
} from "@/lib/admin-revenue";
import { logActivity } from "@/lib/activity-log";
import {
  buildBookingMoneyUpdate,
  buildPaymentRequestEmail,
  getBookingMoneySnapshot,
} from "@/lib/booking-money-command";
import { supabaseServer } from "@/lib/supabase-server";

type BookingStatus = "new" | "confirmed" | "completed" | "cancelled";

type BookingUpdateRequest = {
  status?: BookingStatus;
  adminNotes?: string | null;
  sendEmail?: boolean;
  commissionStatus?: "unpaid" | "scheduled" | "paid" | "waived";
  payoutNote?: string | null;
  payoutScheduledFor?: string | null;
  paymentLinkUrl?: string | null;
  sendPaymentRequest?: boolean;
  paymentRequestNote?: string | null;
};

async function verifyAdmin(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return null;
  }

  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;

  if (!email) {
    return null;
  }

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return admin ? email : null;
}

function statusSubject(status: BookingStatus, listingTitle: string) {
  const readableStatus =
    status === "confirmed"
      ? "confirmed"
      : status === "completed"
        ? "completed"
        : "cancelled";

  return `Your ${listingTitle} booking request was ${readableStatus}`;
}

function statusMessage(status: BookingStatus) {
  if (status === "confirmed") {
    return "Your booking request has been confirmed.";
  }

  if (status === "completed") {
    return "Your booking has been marked completed. Thank you for using RoatanIsland.life.";
  }

  if (status === "cancelled") {
    return "Your booking request has been cancelled.";
  }

  return "Your booking request has been updated.";
}

function getBaseUrl(request: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get(
      "host",
    )}`
  );
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
  const body = (await request.json()) as BookingUpdateRequest;
  const nextStatus = body.status || "new";
  const paymentRequestUrl =
    body.paymentLinkUrl || `${getBaseUrl(request)}/book/status/${id}`;
  const paymentRequestUpdate = body.sendPaymentRequest
    ? {
        payment_requested_at: new Date().toISOString(),
        payment_last_sent_at: new Date().toISOString(),
        payment_link_url: paymentRequestUrl,
      }
    : {};
  const moneyUpdate = buildBookingMoneyUpdate(
    body as unknown as Record<string, unknown>,
  );
  const payoutUpdate =
    body.commissionStatus ||
    "payoutNote" in body ||
    "payoutScheduledFor" in body ||
    "vendorPrivatePayoutNote" in body;

  const { data: currentBooking } = await supabaseServer
    .from("bookings")
    .select("status, commission_status")
    .eq("id", id)
    .maybeSingle();

  const { data: booking, error } = await supabaseServer
    .from("bookings")
    .update({
      status: nextStatus,
      admin_notes: body.adminNotes || null,
      ...(body.commissionStatus
        ? {
            commission_status: body.commissionStatus,
            payout_paid_at:
              body.commissionStatus === "paid" ? new Date().toISOString() : null,
          }
        : {}),
      ...("payoutNote" in body ? { payout_note: body.payoutNote || null } : {}),
      ...("payoutScheduledFor" in body
        ? { payout_scheduled_for: body.payoutScheduledFor || null }
        : {}),
      ...moneyUpdate,
      ...paymentRequestUpdate,
    })
    .eq("id", id)
    .select(
      "id, full_name, email, tour_date, tour_time, guests, status, admin_notes, listing_id, deposit_status, deposit_amount_cents, booking_value_cents, payment_schedule_type, payment_due_date, balance_due_date, amount_paid_cents, balance_due_cents, payment_method, manual_payment_note, payment_requested_at, payment_last_sent_at, payment_link_url, invoice_number, receipt_number, refund_status, refund_amount_cents, refund_note, payment_issue_flag, payment_issue_note, commission_amount_cents, commission_override_cents, commission_status, payout_note, vendor_private_payout_note, payout_scheduled_for, payout_paid_at",
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ((currentBooking?.status || "new") !== nextStatus) {
    await supabaseServer.from("booking_events").insert([
      {
        booking_id: booking.id,
        event_type: "status_change",
        actor_role: "admin",
        actor_email: adminEmail,
        from_status: currentBooking?.status || "new",
        to_status: nextStatus,
        note: body.adminNotes || null,
      },
    ]);
  }

  if (Object.keys(moneyUpdate).length > 0) {
    await supabaseServer.from("booking_money_events").insert([
      {
        booking_id: booking.id,
        event_type: "money_update",
        actor_role: "admin",
        actor_email: adminEmail,
        amount_cents:
          typeof moneyUpdate.amount_paid_cents === "number"
            ? moneyUpdate.amount_paid_cents
            : typeof moneyUpdate.balance_due_cents === "number"
              ? moneyUpdate.balance_due_cents
              : null,
        note: body.adminNotes || null,
        metadata: moneyUpdate,
      },
    ]);
  }

  let listingTitle = "Roatan booking";
  let payoutListing: { id: string; title: string; vendor_id: string | null } | null =
    null;
  let payoutVendor: {
    id: string;
    business_name: string | null;
    email: string | null;
  } | null = null;

  if (booking.listing_id) {
    const { data: listing } = await supabaseServer
      .from("listings")
      .select("id, title, vendor_id")
      .eq("id", booking.listing_id)
      .maybeSingle();

    if (listing?.title) {
      listingTitle = listing.title;
    }

    payoutListing = {
      id: booking.listing_id,
      title: listing?.title || listingTitle,
      vendor_id: listing?.vendor_id || null,
    };

    if (listing?.vendor_id) {
      const { data: vendor } = await supabaseServer
        .from("vendors")
        .select("id, business_name, email")
        .eq("id", listing.vendor_id)
        .maybeSingle();

      if (vendor) {
        payoutVendor = vendor;
      }
    }
  }

  if (body.sendEmail && nextStatus !== "new") {
    await sendEmailNotification({
      to: booking.email,
      subject: statusSubject(nextStatus, listingTitle),
      html: `
        <h2>${escapeHtml(statusMessage(nextStatus))}</h2>
        <p><strong>Listing:</strong> ${escapeHtml(listingTitle)}</p>
        <p><strong>Name:</strong> ${escapeHtml(booking.full_name)}</p>
        <p><strong>Date:</strong> ${escapeHtml(booking.tour_date)}</p>
        <p><strong>Time:</strong> ${escapeHtml(booking.tour_time)}</p>
        <p><strong>Guests:</strong> ${escapeHtml(booking.guests)}</p>
        ${
          booking.admin_notes
            ? `<p><strong>Notes:</strong> ${escapeHtml(booking.admin_notes)}</p>`
            : ""
        }
      `,
      text: [
        statusMessage(nextStatus),
        `Listing: ${listingTitle}`,
        `Name: ${booking.full_name}`,
        `Date: ${booking.tour_date}`,
        `Time: ${booking.tour_time}`,
        `Guests: ${booking.guests}`,
        booking.admin_notes ? `Notes: ${booking.admin_notes}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    });
  }

  if (body.sendPaymentRequest) {
    const paymentEmail = buildPaymentRequestEmail({
      booking,
      listingTitle,
      paymentLink: paymentRequestUrl,
    });
    const snapshot = getBookingMoneySnapshot(booking);

    await sendEmailNotification({
      to: booking.email,
      subject: paymentEmail.subject,
      html: paymentEmail.html,
      text: paymentEmail.text,
    });

    await supabaseServer.from("booking_money_events").insert([
      {
        booking_id: booking.id,
        event_type: "payment_request_sent",
        actor_role: "admin",
        actor_email: adminEmail,
        amount_cents: snapshot.balanceDueCents,
        note: body.paymentRequestNote || "Payment request email sent.",
        metadata: {
          payment_link_url: paymentRequestUrl,
          invoice_number: snapshot.invoiceNumber,
        },
      },
    ]);
  }

  if (
    body.commissionStatus === "paid" &&
    currentBooking?.commission_status !== "paid" &&
    payoutVendor?.email
  ) {
    // Vendor payout paid email
    const [receipt] = getVendorPayoutReceipts({
      bookings: [booking],
      listings: payoutListing ? [payoutListing] : [],
      vendors: [
        {
          id: payoutVendor.id,
          business_name: payoutVendor.business_name || "Vendor",
          is_active: true,
        },
      ],
    });

    if (receipt) {
      const email = buildVendorPayoutReceiptEmail(receipt);

      await sendEmailNotification({
        to: payoutVendor.email,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
    }
  }

  await supabaseServer.from("analytics_events").insert([
    {
      event_type: "booking_status_update",
      path: "/admin/bookings",
      listing_id: booking.listing_id,
      metadata: {
        status: nextStatus,
        emailed: Boolean(body.sendEmail && nextStatus !== "new"),
        payout_updated: Boolean(payoutUpdate),
        payout_status: body.commissionStatus || null,
        payment_request_sent: Boolean(body.sendPaymentRequest),
      },
    },
  ]);

  await logActivity({
    actorEmail: adminEmail,
    actorRole: "admin",
    action: "booking_status_updated",
    targetType: "booking",
    targetId: booking.id,
    targetLabel: `${booking.full_name} - ${listingTitle}`,
    metadata: {
      status: nextStatus,
      emailed: Boolean(body.sendEmail && nextStatus !== "new"),
      listing_id: booking.listing_id,
      payout_updated: Boolean(payoutUpdate),
      payout_status: body.commissionStatus || null,
      payment_request_sent: Boolean(body.sendPaymentRequest),
    },
  });

  return NextResponse.json({ booking });
}
