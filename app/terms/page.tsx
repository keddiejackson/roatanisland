import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern using RoatanIsland.life as a guest or as a listed local operator.",
};

export default function TermsPage() {
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
              Terms of Service
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78">
              Last updated: check with RoatanIsland.life for the current
              version. These terms apply to every guest and every local
              operator using the site.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 text-[#17324D] sm:px-6 sm:py-16">
        <div className="grid gap-8 text-sm leading-7 text-[#334155]">
          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              1. What RoatanIsland.life is
            </h2>
            <p className="mt-3">
              RoatanIsland.life is a marketplace that connects travelers
              (&quot;guests&quot;) with independent local tour operators,
              transportation providers, and stays on Roatán
              (&quot;operators&quot; or &quot;vendors&quot;). We help guests
              discover options, plan a day using the map and the Roa
              concierge assistant, and send booking requests. We are not the
              operator of the tours, transportation, or stays listed on the
              site, and we are not a party to the service each operator
              provides.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              2. Accounts
            </h2>
            <p className="mt-3">
              Guest and vendor accounts are created and managed through the
              site&apos;s sign-in system. You&apos;re responsible for keeping
              your account credentials secure and for the accuracy of the
              information you provide. We may suspend or close an account
              that violates these terms, misrepresents a business, or is
              used to abuse other users.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              3. Booking requests, deposits, and payment
            </h2>
            <p className="mt-3">
              A booking made through the site is a request until an operator
              (or an admin, for concierge-assisted bookings) confirms it.
              Where a deposit or payment is required, checkout is handled
              through Stripe; RoatanIsland.life does not store your card
              details. The amount due, the split between deposit and
              balance, and the currency are shown before you pay.
            </p>
            <p className="mt-3">
              Operators set their own pricing and availability. We may
              charge operators a commission on completed bookings; that
              commission does not change the price a guest sees or pays.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              4. Cancellations and refunds
            </h2>
            <p className="mt-3">
              Cancellation terms can vary by operator and are shown on each
              listing. Read our full{" "}
              <Link
                href="/cancellation-policy"
                className="font-bold text-[#007B7B]"
              >
                Cancellation Policy
              </Link>{" "}
              for how refund requests are handled.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              5. Operator responsibilities
            </h2>
            <p className="mt-3">
              If you list a business on RoatanIsland.life, you&apos;re
              responsible for the accuracy of your listing, honoring
              confirmed bookings, holding any licenses or permits your
              activity requires under Honduran law, and responding to guest
              messages and booking requests in good time. Listings are
              reviewed before going live and may be removed for inaccurate,
              unsafe, or misleading content.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              6. Guest conduct
            </h2>
            <p className="mt-3">
              Show up for confirmed bookings, communicate honestly with
              operators, and follow the safety guidance each activity
              provider gives you. Tours, water activities, and
              transportation carry inherent risk; participate at your own
              discretion and judgment.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              7. Our role and limitation of liability
            </h2>
            <p className="mt-3">
              RoatanIsland.life provides the planning tools, listings, and
              booking-request system. We do not supervise, insure, or
              guarantee the services independent operators provide. To the
              fullest extent permitted by law, RoatanIsland.life is not
              liable for the acts, omissions, quality, or safety record of
              any operator listed on the site. Disputes about a specific
              tour, stay, or transfer should be raised with the operator
              first; we&apos;re glad to help facilitate that conversation
              through{" "}
              <Link href="/support" className="font-bold text-[#007B7B]">
                Support
              </Link>
              .
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              8. Changes to these terms
            </h2>
            <p className="mt-3">
              We may update these terms as the marketplace grows. Material
              changes will be reflected here with an updated date. Continuing
              to use the site after a change means you accept the updated
              terms.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">9. Contact</h2>
            <p className="mt-3">
              Questions about these terms? Reach us through{" "}
              <Link href="/support" className="font-bold text-[#007B7B]">
                Support
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
