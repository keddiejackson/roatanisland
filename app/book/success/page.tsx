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
        <section className="grid gap-6 rounded-2xl bg-white p-8 shadow lg:grid-cols-[1fr_0.72fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
              Payment received
            </p>
            <h1 className="mt-2 text-3xl font-black text-[#0B3C5D] sm:text-5xl">
              Thanks, your deposit checkout is complete.
            </h1>
            <p className="mt-4 leading-7 text-gray-600">
              Your booking request is still reviewed by the local operator
              before it is final. Keep the status page handy for updates.
            </p>
            {booking ? (
              <p className="mt-5 rounded-xl bg-[#F7F3EA] px-4 py-3 text-sm font-semibold text-[#0B3C5D]">
                Booking ID: {booking}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={booking ? `/book/status/${booking}` : "/"}
                className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
              >
                View booking status
              </Link>
              <Link
                href="/account"
                className="rounded-xl bg-[#071F2F] px-5 py-3 font-semibold text-white"
              >
                Open trip dashboard
              </Link>
              <Link
                href="/#marketplace"
                className="rounded-xl border border-[#00A8A8] px-5 py-3 font-semibold text-[#007B7B]"
              >
                Browse listings
              </Link>
            </div>
          </div>
          <div className="rounded-2xl bg-[#071F2F] p-6 text-white">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9EE8E3]">
              What happens next
            </p>
            <div className="mt-5 grid gap-3">
              {[
                "Payment is attached to your request.",
                "The operator confirms availability.",
                "Watch your status page for pickup notes.",
                "You receive the next steps by email.",
              ].map((item) => (
                <div key={item} className="rounded-xl bg-white/10 p-4 text-sm font-semibold">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
