"use client";

import Link from "next/link";
import { getGuestMasterpiecePlan } from "@/lib/platform-pro";

type Booking = {
  id?: string;
  status?: string | null;
  tour_date?: string | null;
  deposit_status?: string | null;
  balance_due_cents?: number | null;
};

type SupportTicket = {
  id?: string;
  status?: string | null;
  priority?: string | null;
  intent?: string | null;
};

export default function GuestMasterpiecePanel({
  bookings,
  supportTickets,
  unreadMessageCount,
}: {
  bookings: Booking[];
  supportTickets: SupportTicket[];
  unreadMessageCount: number;
}) {
  const plan = getGuestMasterpiecePlan({
    bookings,
    supportTickets,
    unreadMessageCount,
  });

  return (
    <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
      <div className="grid gap-0 lg:grid-cols-[1fr_280px]">
        <div className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
            Guest masterpiece view
          </p>
          <h2 className="mt-2 text-3xl font-black leading-tight text-[#0B3C5D]">
            {plan.headline}
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-gray-600">
            {plan.subhead}
          </p>
          <p
            aria-label="Clear, calm, and ready before you go."
            className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-[#D6B56D]"
          >
            {plan.experiencePromise}
          </p>
          <div className="mt-5 rounded-2xl bg-[#F7F3EA] p-4">
            <p className="font-black text-[#0B3C5D]">
              {plan.conciergeNote.title}
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              {plan.conciergeNote.text}
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={plan.nextAction.href}
              className={`rounded-xl px-5 py-3 text-sm font-black ${
                plan.nextAction.tone === "gold"
                  ? "bg-[#D6B56D] text-[#071F2F]"
                  : plan.nextAction.tone === "navy"
                    ? "bg-[#071F2F] text-white"
                    : "bg-[#00A8A8] text-white"
              }`}
            >
              {plan.nextAction.label}
            </Link>
            <Link
              href="/support"
              className="rounded-xl border border-[#00A8A8]/30 px-5 py-3 text-sm font-black text-[#007B7B]"
            >
              Need help?
            </Link>
          </div>
        </div>
        <div className="bg-[#071F2F] p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D6B56D]">
            Trip readiness
          </p>
          <p className="mt-3 text-5xl font-black">{plan.score}%</p>
          <p className="mt-2 text-sm leading-6 text-white/65">
            Built around what guests actually wonder: is it confirmed, paid,
            easy to find, and easy to fix?
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-t border-gray-100 p-5 md:grid-cols-5">
        {plan.readinessSteps.map((step) => (
          <div
            key={step.label}
            className={`rounded-xl p-4 ${
              step.complete
                ? "bg-[#EEF7F6] text-[#0B3C5D]"
                : "bg-[#FFF3D2] text-[#7A5A00]"
            }`}
          >
            <p className="text-sm font-black">{step.label}</p>
            <p className="mt-1 text-xs leading-5 opacity-75">{step.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
