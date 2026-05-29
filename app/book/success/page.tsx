import Link from "next/link";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";

export default async function BookingPaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const { booking } = await searchParams;

  return (
    <main className="brand-page min-h-screen overflow-hidden px-6 py-10 text-[#17324D]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_18%_20%,rgba(0,168,168,0.18),transparent_34%),radial-gradient(circle_at_84%_12%,rgba(214,181,109,0.22),transparent_30%)]" />
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
        <section className="grid gap-6 overflow-hidden rounded-[2rem] bg-white p-6 shadow-2xl shadow-[#071F2F]/10 ring-1 ring-black/5 lg:grid-cols-[1fr_0.72fr] lg:p-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
              Trip request concierge
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight text-[#0B3C5D] sm:text-6xl">
              Your Roatan request is moving.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Payment or request details have been saved. The local operator
              still confirms availability, pickup notes, and final next steps
              before your plans are complete.
            </p>
            {booking ? (
              <p className="mt-6 rounded-2xl bg-[#F7F3EA] px-4 py-3 text-sm font-black text-[#0B3C5D]">
                Booking ID: {booking}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={booking ? `/book/status/${booking}` : "/"}
                className="brand-button-primary"
              >
                View booking status
              </Link>
              <Link
                href="/account"
                className="rounded-xl bg-[#071F2F] px-5 py-3 font-bold text-white"
              >
                Open trip dashboard
              </Link>
              <Link
                href="/#marketplace"
                className="brand-button-secondary"
              >
                Browse listings
              </Link>
            </div>
          </div>
          <div className="rounded-[1.75rem] bg-[#071F2F] p-6 text-white">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#9EE8E3]">
              What happens next
            </p>
            <div className="mt-5 grid gap-3">
              {[
                "Payment is attached to your request.",
                "The operator confirms availability.",
                "Watch your status page for pickup notes.",
                "You receive the next steps by email.",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/10 p-4 text-sm font-semibold">
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[1.5rem] border border-white/15 bg-white/10 p-5">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#D6B56D]">
                Confirmation checklist
              </p>
              <div className="mt-4 grid gap-3">
                {[
                  "Save your booking status page.",
                  "Check your email for payment and request details.",
                  "Watch chat for pickup or timing notes.",
                  "Open your trip dashboard before travel day.",
                ].map((item) => (
                  <div key={item} className="rounded-2xl bg-white/10 p-3 text-sm font-semibold">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
