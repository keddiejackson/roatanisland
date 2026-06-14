import Link from "next/link";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
import {
  buildMoneyDocument,
  formatMoneyCents,
  getBookingMoneySnapshot,
} from "@/lib/booking-money-command";
import { supabaseServer } from "@/lib/supabase-server";

type BookingDocument = {
  id: string;
  full_name: string | null;
  email: string | null;
  tour_date: string | null;
  tour_time: string | null;
  guests: number | null;
  listing_id: string | null;
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
  paid_at: string | null;
};

async function loadBookingDocument(id: string) {
  const { data: booking } = await supabaseServer
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!booking) {
    return { booking: null, listingTitle: "Roatan booking" };
  }

  let listingTitle = "Roatan booking";

  if (booking.listing_id) {
    const { data: listing } = await supabaseServer
      .from("listings")
      .select("title")
      .eq("id", booking.listing_id)
      .maybeSingle();

    listingTitle = listing?.title || listingTitle;
  }

  return {
    booking: booking as BookingDocument,
    listingTitle,
  };
}

export default async function BookingReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { booking, listingTitle } = await loadBookingDocument(id);

  if (!booking) {
    return (
      <main className="brand-page min-h-screen px-4 py-6 text-[#17324D] sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <SiteLogo />
          <section className="mt-8 brand-auth-card p-5 shadow sm:p-8">
            <h1 className="text-2xl font-black text-[#0B3C5D]">
              Receipt not found
            </h1>
            <Link href="/" className="mt-6 inline-block font-bold text-[#007B7B]">
              Back to Home
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const document = buildMoneyDocument(booking, "receipt", listingTitle);
  const snapshot = getBookingMoneySnapshot(booking);

  return (
    <main className="brand-page min-h-screen px-4 py-6 text-[#17324D] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4 print:hidden">
          <SiteLogo />
          <Link
            href={`/book/status/${booking.id}`}
            className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#0B3C5D] shadow"
          >
            Booking status
          </Link>
        </div>

        <section className="brand-auth-card p-5 shadow sm:p-8 print:shadow-none">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
            Printable receipt
          </p>
          <div className="mt-3 flex flex-col justify-between gap-4 sm:flex-row">
            <div>
              <h1 className="text-4xl font-black text-[#0B3C5D]">
                {document.title}
              </h1>
              <p className="mt-2 font-bold text-gray-600">
                {document.documentNumber}
              </p>
            </div>
            <div className="rounded-xl bg-[#EEF7F6] px-4 py-3 text-right">
              <p className="text-sm font-black text-[#0B3C5D]">
                {document.totalLabel}
              </p>
              <p className="mt-1 text-xs font-bold text-gray-500">
                Balance due: {formatMoneyCents(snapshot.balanceDueCents)}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[#F7F3EA] p-4">
              <p className="text-sm text-gray-500">Guest</p>
              <p className="mt-1 font-black text-[#0B3C5D]">
                {document.guestName}
              </p>
              <p className="mt-1 text-sm text-gray-600">{booking.email}</p>
            </div>
            <div className="rounded-xl bg-[#F7F3EA] p-4">
              <p className="text-sm text-gray-500">Booking</p>
              <p className="mt-1 font-black text-[#0B3C5D]">
                {document.listingTitle}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {booking.tour_date} at {booking.tour_time} / {booking.guests} guests
              </p>
            </div>
          </div>

          <div className="mt-8 divide-y divide-gray-100 rounded-xl border border-gray-100">
            {document.rows.map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <p className="text-gray-600">{label}</p>
                <p className="font-black text-[#0B3C5D]">{value}</p>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <p className="text-gray-600">Paid on</p>
              <p className="font-black text-[#0B3C5D]">
                {booking.paid_at ? booking.paid_at.slice(0, 10) : "Recorded payment"}
              </p>
            </div>
          </div>

          <p className="mt-6 rounded-xl bg-[#EEF7F6] px-4 py-3 text-sm text-[#0B3C5D] print:hidden">
            Use your browser print option to save this receipt as a PDF.
          </p>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
