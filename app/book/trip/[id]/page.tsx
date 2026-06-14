import Link from "next/link";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
import { buildTripPacket } from "@/lib/trip-packet";
import { supabaseServer } from "@/lib/supabase-server";

type TripBooking = {
  id: string;
  full_name: string | null;
  email: string | null;
  tour_date: string | null;
  tour_time: string | null;
  guests: number | null;
  status: string | null;
  guest_message: string | null;
  vendor_note: string | null;
  listing_id: string | null;
  deposit_status: string | null;
  deposit_amount_cents: number | null;
  booking_value_cents: number | null;
  amount_paid_cents: number | null;
  balance_due_cents: number | null;
};

async function loadTripPacket(id: string) {
  const { data: booking } = await supabaseServer
    .from("bookings")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!booking) {
    return { booking: null, listingTitle: "Your Roatan experience" };
  }

  let listingTitle = "Your Roatan experience";

  if (booking.listing_id) {
    const { data: listing } = await supabaseServer
      .from("listings")
      .select("title")
      .eq("id", booking.listing_id)
      .maybeSingle();

    listingTitle = listing?.title || listingTitle;
  }

  return {
    booking: booking as TripBooking,
    listingTitle,
  };
}

export default async function TripPacketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { booking, listingTitle } = await loadTripPacket(id);

  if (!booking) {
    return (
      <main className="brand-page min-h-screen px-4 py-6 text-[#17324D] sm:px-6 sm:py-10">
        <div className="mx-auto max-w-4xl">
          <SiteLogo />
          <section className="mt-8 brand-auth-card p-5 shadow sm:p-8">
            <h1 className="text-3xl font-black text-[#0B3C5D]">
              Trip packet not found
            </h1>
            <Link
              href="/account"
              className="mt-6 inline-block rounded-xl bg-[#00A8A8] px-5 py-3 font-black text-white"
            >
              Open account
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const statusUrl = `/book/status/${booking.id}`;
  const packet = buildTripPacket({
    booking,
    listingTitle,
    statusUrl,
    chatUrl: "/account#guest-plans",
  });

  return (
    <main className="brand-page min-h-screen px-4 py-6 text-[#17324D] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <SiteLogo />
          <Link
            href="/account"
            className="rounded-xl bg-white px-4 py-2 text-sm font-black text-[#0B3C5D] shadow"
          >
            My trips
          </Link>
        </div>

        <section
          aria-label="Trip Packet"
          className="rounded-2xl bg-[#071F2F] p-8 text-white shadow-xl"
        >
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#D6B56D]">
            Private day packet
          </p>
          <div className="mt-3 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-[#9EE8E3]">
                Luxury trip packet
              </p>
              <h1 className="text-4xl font-black sm:text-5xl">
                {packet.title}
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-white/70">
                Keep this page handy for payment records, chat, pickup notes,
                and day-of-trip details.
              </p>
            </div>
            <div className="grid gap-2">
              <span className="rounded-xl bg-white/10 px-4 py-3 text-sm font-black">
                {packet.guestName}
              </span>
              <span className="rounded-xl border border-white/15 px-4 py-3 text-sm font-black text-white/80">
                Save this page
              </span>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9EE8E3]">
              Travel confidence
            </p>
            <h2 className="mt-2 text-xl font-black">{packet.readiness.label}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">
              {packet.readiness.text}
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          {packet.summary.map((item) => (
            <div key={item.label} className="rounded-2xl bg-white p-5 shadow">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
                {item.label}
              </p>
              <p className="mt-2 text-xl font-black text-[#0B3C5D]">
                {item.value}
              </p>
            </div>
          ))}
        </section>

        <section className="mt-6 brand-auth-card p-5 shadow sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#00A8A8]">
            Day-of command sheet
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
            Pickup, payment, and comfort checks
          </h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {packet.dayOfSections.map((section) => (
              <div
                key={section.label}
                className="rounded-2xl border border-[#D6B56D]/20 bg-[#FBF7EC] p-5"
              >
                <h3 className="font-black text-[#0B3C5D]">
                  {section.label}
                </h3>
                <ul className="mt-4 grid gap-3 text-sm leading-6 text-gray-700">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00A8A8]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 brand-auth-card p-5 shadow sm:p-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#00A8A8]">
                Quick actions
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                Chat, payments, and records
              </h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {packet.actions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`rounded-xl px-4 py-2 text-sm font-black ${
                    action.label === "Open chat"
                      ? "bg-[#00A8A8] text-white"
                      : "bg-[#EEF7F6] text-[#0B3C5D]"
                  }`}
                >
                  {action.label === "Open chat" ? "Open guest chat" : action.label}
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="brand-auth-card p-5 shadow sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#00A8A8]">
              Next steps
            </p>
            <div className="mt-4 grid gap-3">
              {packet.nextSteps.map((step) => (
                <div
                  key={step}
                  className="rounded-xl border border-[#00A8A8]/15 bg-[#EEF7F6] px-4 py-3 font-bold text-[#0B3C5D]"
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
          <div className="brand-auth-card p-5 shadow sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#00A8A8]">
              What to bring
            </p>
            <div className="mt-4 grid gap-2">
              {packet.whatToBring.map((item) => (
                <p
                  key={item}
                  className="rounded-xl bg-[#F7F3EA] px-4 py-3 text-sm font-bold text-[#0B3C5D]"
                >
                  {item}
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {packet.notes.map((note) => (
            <div key={note.label} className="brand-auth-card p-5 shadow sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#00A8A8]">
                {note.label}
              </p>
              <p className="mt-3 whitespace-pre-line leading-7 text-gray-700">
                {note.value}
              </p>
            </div>
          ))}
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
