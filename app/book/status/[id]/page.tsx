import Link from "next/link";
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

function formatStatus(status: string | null) {
  return (status || "new").replaceAll("_", " ");
}

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
      <main className="min-h-screen bg-[#F7F3EA] px-6 py-16 text-[#17324D]">
        <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-[#0B3C5D]">
            Booking not found
          </h1>
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-16 text-[#17324D]">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
          Booking status
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
          {listing?.title || "Roatan booking"}
        </h1>
        <p className="mt-3 leading-7 text-gray-600">
          Keep this page for your records. The operator will still confirm
          availability before plans are final.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            ["Name", booking.full_name],
            ["Email", booking.email],
            ["Date", booking.tour_date],
            ["Time", booking.tour_time],
            ["Guests", String(booking.guests)],
            ["Status", formatStatus(booking.status)],
            ["Deposit", formatStatus(booking.deposit_status || "not_requested")],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#F7F3EA] p-4">
              <p className="text-sm text-gray-500">{label}</p>
              <p className="mt-1 font-bold capitalize text-[#0B3C5D]">
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
      </div>
    </main>
  );
}
