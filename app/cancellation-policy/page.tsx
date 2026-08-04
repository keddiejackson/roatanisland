import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";

export const metadata: Metadata = {
  title: "Cancellation Policy",
  description:
    "How cancellations and refunds work on RoatanIsland.life, and how to check a specific operator's terms.",
};

export default function CancellationPolicyPage() {
  return (
    <main className="brand-page min-h-screen">
      <section className="px-4 py-6 text-white sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <header className="grid gap-4 sm:flex sm:items-center sm:justify-between">
            <SiteLogo variant="light" />
            <Link href="/" className="brand-button-secondary w-fit">
              Home
            </Link>
          </header>

          <div className="brand-hero-panel mt-6 px-5 py-10 sm:mt-8 sm:px-10 sm:py-14">
            <p className="brand-eyebrow-gold">Legal</p>
            <h1 className="mt-3 text-3xl font-black leading-tight sm:text-5xl">
              Cancellation Policy
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78">
              RoatanIsland.life is a marketplace of independent local
              operators — cancellation terms are set by each operator, not
              by us. Here&apos;s how that works and what to expect.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 text-[#17324D] sm:px-6 sm:py-16">
        <div className="grid gap-8 text-sm leading-7 text-[#334155]">
          <div className="rounded-2xl border border-[#D6B56D]/30 bg-[#FFFDF7] p-5">
            <p className="text-sm font-black uppercase tracking-[0.14em] text-[#9C7A2F]">
              The short version
            </p>
            <p className="mt-2">
              Check the specific listing you booked first — operators can set
              their own cancellation terms, shown right on that listing page.
              If a listing doesn&apos;t show custom terms, the general policy
              below applies.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              1. Terms differ by operator
            </h2>
            <p className="mt-3">
              Every tour, stay, and transfer on RoatanIsland.life is run by
              an independent local operator, and cancellation windows
              reasonably vary by activity — a private boat charter and an
              easy family beach day don&apos;t carry the same costs to
              cancel late. When an operator sets a specific cancellation
              policy for a listing, it&apos;s shown on that listing&apos;s
              page and takes priority over the general policy below.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              2. General marketplace policy
            </h2>
            <p className="mt-3">
              For listings without a custom policy, refund eligibility is
              reviewed case by case with the operator, taking into account
              how much notice was given and whether the operator already
              committed resources (a boat, a guide, a vehicle) to your
              booking. As a starting point, cancellations made well ahead of
              the scheduled date have a much better chance of a full or
              partial refund than a same-day cancellation.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              3. Deposits and payment
            </h2>
            <p className="mt-3">
              Most bookings are secured with a deposit, with the remaining
              balance due separately. If your booking is fully or partially
              paid, cancelling it does not automatically trigger a refund —
              refunds are reviewed and processed manually by our team once a
              cancellation is confirmed, not issued instantly by the
              system.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              4. How to request a cancellation
            </h2>
            <p className="mt-3">
              The fastest way is to message the operator directly through
              your booking (find it under{" "}
              <Link href="/account" className="font-bold text-[#007B7B]">
                My Account
              </Link>
              ). If you booked as a guest without an account, use the secure
              link from your booking confirmation email. You can also reach
              us through{" "}
              <Link href="/support" className="font-bold text-[#007B7B]">
                Support
              </Link>{" "}
              and we&apos;ll help coordinate with the operator.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              5. Operator or weather cancellations
            </h2>
            <p className="mt-3">
              If an operator needs to cancel or reschedule — including for
              weather or safety reasons — you&apos;ll be notified as early
              as possible and offered a reschedule or a refund of any amount
              already paid.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              6. Related pages
            </h2>
            <p className="mt-3">
              See our{" "}
              <Link href="/terms" className="font-bold text-[#007B7B]">
                Terms of Service
              </Link>{" "}
              for the full booking and payment terms, or our{" "}
              <Link href="/privacy" className="font-bold text-[#007B7B]">
                Privacy Policy
              </Link>{" "}
              for how we handle your information.
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
