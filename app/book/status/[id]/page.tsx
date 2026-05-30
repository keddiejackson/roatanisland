import Link from "next/link";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
import {
  bookingNextAction,
  bookingStatusSteps,
  formatBookingCents,
  formatBookingStatus,
  formatDepositStatus,
} from "@/lib/booking-flow";
import {
  formatMoneyCents,
  getBookingMoneySnapshot,
} from "@/lib/booking-money-command";
import { bookingTimeline, type BookingEventLike } from "@/lib/booking-communication";
import { supabaseServer } from "@/lib/supabase-server";

type Booking = {
  id: string;
  full_name: string;
  email: string;
  tour_date: string;
  tour_time: string;
  guests: number;
  status: string;
  deposit_status: string | null;
  deposit_amount_cents: number | null;
  booking_value_cents: number | null;
  payment_schedule_type: string | null;
  payment_due_date: string | null;
  balance_due_date: string | null;
  amount_paid_cents: number | null;
  balance_due_cents: number | null;
  invoice_number: string | null;
  receipt_number: string | null;
  refund_status: string | null;
  refund_amount_cents: number | null;
  guest_message: string | null;
  vendor_note: string | null;
  selected_addons: { name?: string; price_cents?: number }[] | null;
  listing_id: string | null;
  created_at: string;
};

type Listing = {
  title: string;
};

export default async function BookingStatusPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data } = await supabaseServer
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const booking = data as Booking | null;
  let listing: Listing | null = null;

  if (booking?.listing_id) {
    const { data: listingData } = await supabaseServer
      .from("listings")
      .select("title")
      .eq("id", booking.listing_id)
      .maybeSingle();
    listing = listingData as Listing | null;
  }

  const { data: eventRows } = booking
    ? await supabaseServer
        .from("booking_events")
        .select("event_type, actor_role, actor_email, from_status, to_status, note, created_at")
        .eq("booking_id", booking.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  if (!booking) {
    return (
      <main className="min-h-screen bg-[#F7F3EA] px-6 py-10 text-[#17324D]">
        <div className="mx-auto max-w-3xl">
          <SiteLogo />
          <div className="mt-8 rounded-2xl bg-white p-8 shadow">
            <h1 className="text-2xl font-bold text-[#0B3C5D]">
              Booking not found
            </h1>
            <p className="mt-3 leading-7 text-gray-600">
              We could not find that booking status page. Check the link and try
              again.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
            >
              Back to Home
            </Link>
          </div>
        </div>
        <SiteFooter />
      </main>
    );
  }

  const steps = bookingStatusSteps(booking.status);
  const nextAction = bookingNextAction({
    status: booking.status,
    depositStatus: booking.deposit_status,
    canReview: Boolean(booking.status === "completed" && booking.listing_id),
  });
  const nextActionClass =
    nextAction.tone === "cancelled"
      ? "border-red-200 bg-red-50 text-red-800"
      : nextAction.tone === "paid" || nextAction.tone === "complete"
        ? "border-green-200 bg-green-50 text-green-800"
        : "border-[#D6B56D]/35 bg-[#FFF8E8] text-[#0B3C5D]";
  const selectedAddons = Array.isArray(booking.selected_addons)
    ? booking.selected_addons
    : [];
  const moneySnapshot = getBookingMoneySnapshot(booking);
  const experienceTitle = listing?.title || "Your Roatan experience";
  const realTimeline = bookingTimeline({
    booking,
    events: (eventRows as BookingEventLike[] | null) || [],
    messages: [],
  });

  return (
    <main className="brand-page min-h-screen overflow-hidden px-6 py-10 text-[#17324D]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_18%_18%,rgba(0,168,168,0.16),transparent_34%),radial-gradient(circle_at_82%_10%,rgba(214,181,109,0.2),transparent_30%)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <SiteLogo />
          <Link
            href="/"
            className="brand-button-secondary"
          >
            Home
          </Link>
        </div>
        <section className="rounded-[2rem] bg-white p-6 shadow-2xl shadow-[#071F2F]/10 ring-1 ring-black/5 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
            Private trip lounge
          </p>
          <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <h1 className="text-4xl font-black leading-tight text-[#0B3C5D] sm:text-6xl">
                {experienceTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-gray-600">
                Everything you need before, during, and after your Roatan day:
                status, payment clarity, pickup notes, guest chat, and your
                travel-ready packet.
              </p>
            </div>
            <div className="rounded-2xl bg-[#071F2F] px-5 py-4 text-white shadow-xl shadow-[#071F2F]/10">
              <p className="text-xs font-semibold uppercase text-white/55">
                Current status
              </p>
              <p className="mt-1 text-lg font-black">
                {formatBookingStatus(booking.status)}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/account#guest-plans"
              className="rounded-xl bg-[#00A8A8] px-5 py-3 text-sm font-black text-white"
            >
              Open guest chat
            </Link>
            <Link
              href={`/book/trip/${booking.id}`}
              className="rounded-xl bg-[#071F2F] px-5 py-3 text-sm font-black text-white"
            >
              Luxury trip packet
            </Link>
            <Link
              href="/support"
              className="rounded-xl border border-[#0B3C5D]/15 px-5 py-3 text-sm font-black text-[#0B3C5D]"
            >
              Concierge support
            </Link>
          </div>

          <div className={`mt-6 rounded-2xl border p-5 ${nextActionClass}`}>
            <p className="text-sm font-bold uppercase tracking-[0.16em]">
              Next step
            </p>
            <h2 className="mt-2 text-2xl font-black">{nextAction.label}</h2>
            <p className="mt-2 leading-7">{nextAction.text}</p>
          </div>

          <div className="mt-8 rounded-2xl border border-[#00A8A8]/15 bg-[#EEF7F6] p-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#007B7B]">
              Travel confidence
            </p>
            <div className="mt-4 grid gap-3 lg:grid-cols-4">
              {steps.map((step) => (
                <div
                  key={step.key}
                  className={`rounded-xl border p-4 ${
                    step.state === "current"
                      ? "border-[#00A8A8] bg-white"
                      : step.state === "complete"
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 bg-white/75"
                  }`}
                >
                  <p className="text-sm font-black text-[#0B3C5D]">
                    {step.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {step.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[#D6B56D]/25 bg-[#FFFDF7] p-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#9C7A2F]">
              Messages and concierge
            </p>
            <div className="mt-3 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-2xl font-black text-[#0B3C5D]">
                  Keep every trip question in one quiet thread.
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
                  Open guest chat for pickup notes, timing questions, operator
                  updates, or anything that should stay attached to this trip.
                </p>
              </div>
              <Link
                href="/account#guest-plans"
                className="rounded-xl bg-[#0B3C5D] px-5 py-3 text-center text-sm font-black text-white"
              >
                Open guest chat
              </Link>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[#D6B56D]/20 bg-[#FFF8E8] p-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#9C7A2F]">
              Booking timeline
            </p>
            <div className="mt-4 grid gap-3">
              {realTimeline.map((item, index) => (
                <div
                  key={`${item.kind}-${item.createdAt || index}`}
                  className="rounded-xl bg-white p-4"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="font-bold text-[#0B3C5D]">{item.title}</p>
                    <p className="text-xs font-bold uppercase text-gray-500">
                      {item.actorLabel}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {item.text}
                  </p>
                  {item.createdAt ? (
                    <p className="mt-2 text-xs text-gray-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#007B7B]">
                  Payment records
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                  Invoice and receipt details
                </h2>
              </div>
              <span className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#0B3C5D]">
                Use browser print to save
              </span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Payment", moneySnapshot.paymentLabel],
                ["Balance due", formatMoneyCents(moneySnapshot.balanceDueCents)],
                ["Invoice", moneySnapshot.invoiceNumber],
                ["Receipt", moneySnapshot.receiptNumber],
                ["Paid", formatMoneyCents(moneySnapshot.paidCents)],
                ["Total", formatMoneyCents(moneySnapshot.totalCents)],
                ["Due", moneySnapshot.dueLabel],
                [
                  "Refund",
                  booking.refund_status === "pending"
                    ? formatMoneyCents(booking.refund_amount_cents || 0)
                    : booking.refund_status || "None",
                ],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white p-4">
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="mt-1 break-words font-bold text-[#0B3C5D]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={`/book/invoice/${booking.id}`}
                className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#0B3C5D]"
              >
                Printable invoice
              </Link>
              <Link
                href={`/book/receipt/${booking.id}`}
                className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#0B3C5D]"
              >
                Printable receipt
              </Link>
              <Link
                href={`/book/trip/${booking.id}`}
                className="rounded-xl bg-[#0B3C5D] px-4 py-2 text-sm font-black text-white"
              >
                Trip packet
              </Link>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#00A8A8]">
              Itinerary essentials
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Name", booking.full_name],
              ["Email", booking.email],
              ["Date", booking.tour_date],
              ["Time", booking.tour_time],
              ["Guests", String(booking.guests)],
              ["Deposit", formatDepositStatus(booking.deposit_status)],
              ["Estimated value", formatBookingCents(booking.booking_value_cents)],
              ["Booking ID", booking.id],
              ["Requested", new Date(booking.created_at).toLocaleDateString()],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#F7F3EA] p-4">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="mt-1 break-words font-bold text-[#0B3C5D]">
                  {value}
                </p>
              </div>
            ))}
            </div>
          </div>

          {selectedAddons.length > 0 ||
          booking.guest_message ||
          booking.vendor_note ? (
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {selectedAddons.length > 0 ? (
                <div className="rounded-xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-4">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#9C7A2F]">
                    Add-ons
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-[#0B3C5D]">
                    {selectedAddons.map((addon, index) => (
                      <p key={`${addon.name || "addon"}-${index}`}>
                        {addon.name || "Add-on"}{" "}
                        {addon.price_cents
                          ? `- ${formatBookingCents(addon.price_cents)}`
                          : ""}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
              {booking.guest_message ? (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#00A8A8]">
                    Your notes
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
                    {booking.guest_message}
                  </p>
                </div>
              ) : null}
              {booking.vendor_note ? (
                <div className="rounded-xl border border-[#00A8A8]/25 bg-[#EEF7F6] p-4">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#007B7B]">
                    Operator note
                  </p>
                  <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">
                    {booking.vendor_note}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 rounded-2xl border border-[#D6B56D]/30 bg-[#FFF8E8] p-5">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#9C7A2F]">
              Need a change?
            </p>
            <div className="mt-3 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <p className="max-w-2xl text-sm leading-6 text-gray-700">
                For date, time, guest count, pickup, or special request changes,
                message the team first so the full conversation stays with this
                booking.
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/account#guest-plans"
                  className="rounded-xl bg-[#00A8A8] px-5 py-3 text-sm font-black text-white"
                >
                  Open guest chat
                </Link>
                <Link
                  href="/support"
                  className="rounded-xl border border-[#0B3C5D]/15 bg-white px-5 py-3 text-sm font-black text-[#0B3C5D]"
                >
                  Contact concierge
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
            >
              Back to Home
            </Link>
            {booking.listing_id ? (
              <Link
                href={`/listings/${booking.listing_id}`}
                className="rounded-xl border border-[#00A8A8] px-5 py-3 font-semibold text-[#007B7B]"
              >
                View listing
              </Link>
            ) : null}
            {booking.status === "completed" && booking.listing_id ? (
              <Link
                href={`/listings/${booking.listing_id}#review`}
                className="rounded-xl bg-[#D6B56D] px-5 py-3 font-semibold text-[#0B3C5D]"
              >
                Leave review
              </Link>
            ) : null}
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
