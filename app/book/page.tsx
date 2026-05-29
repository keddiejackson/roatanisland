import Link from "next/link";
import SiteLogo from "@/app/SiteLogo";
import SiteFooter from "@/app/SiteFooter";
import { getBookingTrustSteps } from "@/lib/booking-flow";
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

  return (
    <main className="brand-page min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
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

        <section className="brand-hero-panel mb-8 grid gap-6 p-6 text-white lg:grid-cols-[1fr_0.72fr] lg:p-8">
          <div>
            <p className="brand-eyebrow-gold">
              Booking request
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight sm:text-5xl">
              Send the details. The operator confirms availability.
            </h1>
            <p className="mt-4 max-w-2xl leading-7 text-white/76">
              Choose your date, time, guests, and add-ons. You will see a clear
              request summary before submitting.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {[
              ["1", "Request your preferred date"],
              ["2", "Operator checks availability"],
              ["3", "Confirm plans or payment"],
            ].map(([number, item]) => (
              <div
                key={item}
                className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold ring-1 ring-white/15"
              >
                <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#00A8A8] text-xs text-white">
                  {number}
                </span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="brand-card mb-8 p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="brand-eyebrow">
                Why booking here works
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                Clear requests before anyone commits.
              </h2>
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

        <BookingForm
          listingId={listing}
          initialDate={date || ""}
          initialTime={time || ""}
          initialGuests={guests || ""}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
