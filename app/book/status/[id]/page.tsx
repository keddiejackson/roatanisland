import Link from "next/link";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
import {
  bookingStatusSteps,
  formatBookingStatus,
  formatDepositStatus,
} from "@/lib/booking-flow";
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
    .select(
      "id, full_name, email, tour_date, tour_time, guests, status, deposit_status, listing_id, created_at",
    )
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

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-10 text-[#17324D]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <SiteLogo />
          <Link
            href="/"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow"
          >
            Home
          </Link>
        </div>
        <section className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
            Booking status
          </p>
          <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <h1 className="text-3xl font-black text-[#0B3C5D] sm:text-5xl">
                {listing?.title || "Roatan booking"}
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-gray-600">
                Keep this page for your records. The operator will still confirm
                availability before plans are final.
              </p>
            </div>
            <div className="rounded-xl bg-[#F7F3EA] px-4 py-3">
              <p className="text-xs font-semibold uppercase text-gray-500">
                Current status
              </p>
              <p className="mt-1 text-lg font-black text-[#0B3C5D]">
                {formatBookingStatus(booking.status)}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 lg:grid-cols-4">
            {steps.map((step) => (
              <div
                key={step.key}
                className={`rounded-xl border p-4 ${
                  step.state === "current"
                    ? "border-[#00A8A8] bg-[#00A8A8]/10"
                    : step.state === "complete"
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-white"
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

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["Name", booking.full_name],
              ["Email", booking.email],
              ["Date", booking.tour_date],
              ["Time", booking.tour_time],
              ["Guests", String(booking.guests)],
              ["Deposit", formatDepositStatus(booking.deposit_status)],
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
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
