import Link from "next/link";
import SiteLogo from "@/app/SiteLogo";
import SiteFooter from "@/app/SiteFooter";
import {
  getBookingTrustSteps,
  getLuxuryBookingFlowSteps,
} from "@/lib/booking-flow";
import BookingForm from "./BookingForm";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{
    listing?: string;
    date?: string;
    time?: string;
    guests?: string;
  }>;
}) {
  const { listing, date, time, guests } = await searchParams;
  const trustSteps = getBookingTrustSteps();
  const luxurySteps = getLuxuryBookingFlowSteps();

  return (
    <main className="brand-page min-h-screen overflow-hidden px-4 py-6 sm:px-6 sm:py-10">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_20%_20%,rgba(0,168,168,0.2),transparent_34%),radial-gradient(circle_at_82%_12%,rgba(214,181,109,0.22),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <SiteLogo />
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="brand-button-secondary"
            >
              Home
            </Link>
            <Link
              href="/map"
              className="brand-button-secondary"
            >
              Map
            </Link>
          </div>
        </div>

        <section className="brand-hero-panel mb-6 grid gap-6 overflow-hidden p-4 text-white sm:mb-8 sm:p-6 lg:grid-cols-[1fr_0.78fr] lg:p-10">
          <div>
            <p className="brand-eyebrow-gold">
              Luxury booking flow
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.98] sm:text-6xl">
              A private-request experience for your Roatan day.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/76">
              Choose the date, time, pickup details, and guest notes in one
              calm flow. You see payment expectations before sending, and the
              operator confirms availability before anything is final.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#booking-request"
                className="brand-button-primary"
              >
                Start request
              </a>
              <Link
                href="/account"
                className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 font-bold text-white backdrop-blur transition hover:bg-white/15"
              >
                Trip dashboard
              </Link>
            </div>
          </div>
          <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/20 backdrop-blur">
            <p className="px-2 text-sm font-black uppercase tracking-[0.18em] text-[#D6B56D]">
              Guided request path
            </p>
            <div className="mt-4 grid gap-3">
              {luxurySteps.map((step) => (
                <div
                  key={step.label}
                  className="rounded-2xl bg-white/10 px-4 py-3 text-sm ring-1 ring-white/15"
                >
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D6B56D] text-xs font-black text-[#071F2F]">
                      {step.number}
                    </span>
                    <span>
                      <span className="block font-black text-white">
                        {step.label}
                      </span>
                      <span className="mt-1 block leading-5 text-white/70">
                        {step.text}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="brand-card mb-8 p-6 lg:p-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="brand-eyebrow">
                Private booking concierge
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                Clear requests before anyone commits.
              </h2>
              <p className="mt-2 max-w-2xl leading-7 text-gray-600">
                Built for travelers who want premium clarity: availability,
                pickup, payment timing, and the next message thread are all
                explained before the request is sent.
              </p>
            </div>
            <Link
              href="/account"
              className="brand-button-secondary"
            >
              View trip dashboard
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-4">
            {trustSteps.map((step) => (
              <div key={step.label} className="brand-card-lift p-4">
                <p className="font-black text-[#0B3C5D]">{step.label}</p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="booking-request" className="scroll-mt-8">
          <BookingForm
            listingId={listing}
            initialDate={date || ""}
            initialTime={time || ""}
            initialGuests={guests || ""}
          />
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
