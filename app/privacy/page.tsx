import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "What information RoatanIsland.life collects, how it's used, and how to control it.",
};

export default function PrivacyPage() {
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
              Privacy Policy
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/78">
              This explains what we collect on RoatanIsland.life, why, and
              how you can control it.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 text-[#17324D] sm:px-6 sm:py-16">
        <div className="grid gap-8 text-sm leading-7 text-[#334155]">
          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              1. Information we collect
            </h2>
            <p className="mt-3">
              <strong>Account information:</strong> email address and, if you
              provide it, a display name and profile photo, for guest and
              vendor accounts.
            </p>
            <p className="mt-3">
              <strong>Booking information:</strong> the details you submit
              with a booking request, such as name, contact details, travel
              dates, guest count, pickup location, and messages exchanged
              with an operator.
            </p>
            <p className="mt-3">
              <strong>Payment information:</strong> deposits and payments are
              processed by Stripe. We store payment status, amounts, and
              Stripe reference IDs — we do not store your card number.
            </p>
            <p className="mt-3">
              <strong>Usage information:</strong> basic analytics events
              (pages viewed, listing interactions) to understand what&apos;s
              useful and fix what isn&apos;t.
            </p>
            <p className="mt-3">
              <strong>Local device storage:</strong> saved listings and trip
              plans are kept in your browser&apos;s local storage so your
              plan persists between visits, even before you create an
              account.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              2. How we use it
            </h2>
            <p className="mt-3">
              To operate the marketplace: match your requests with the right
              operator, process payments, send booking confirmations and
              updates, respond to support requests, and keep the site
              secure and working well. We do not sell your personal
              information.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              3. Who we share it with
            </h2>
            <p className="mt-3">
              <strong>Operators:</strong> when you send a booking request,
              the operator you&apos;re booking with receives the details
              needed to fulfill it (name, contact info, dates, party size,
              pickup notes).
            </p>
            <p className="mt-3">
              <strong>Service providers:</strong> Stripe for payment
              processing, Supabase for account and database infrastructure,
              and email delivery providers for booking and account
              notifications. Each only receives what it needs to do its job.
            </p>
            <p className="mt-3">
              We may disclose information if required by law, or to protect
              the safety of guests, operators, or the platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              4. Your choices
            </h2>
            <p className="mt-3">
              You can review and update your profile information from{" "}
              <Link href="/account" className="font-bold text-[#007B7B]">
                My Account
              </Link>
              . To request deletion of your account and associated data,
              contact us through{" "}
              <Link href="/support" className="font-bold text-[#007B7B]">
                Support
              </Link>
              . Clearing your browser&apos;s local storage removes saved
              listings and trip plans kept on that device.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              5. Data retention and security
            </h2>
            <p className="mt-3">
              We keep account and booking data for as long as your account
              is active and as needed to meet legal, tax, and dispute-
              resolution obligations related to completed bookings. Data is
              stored with our infrastructure providers using
              industry-standard access controls; no online service can
              guarantee perfect security, but we take reasonable steps to
              protect your information.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">
              6. Changes to this policy
            </h2>
            <p className="mt-3">
              As the site grows we may update this policy. We&apos;ll reflect
              material changes here.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-black text-[#0B3C5D]">7. Contact</h2>
            <p className="mt-3">
              Questions about your data? Reach us through{" "}
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
