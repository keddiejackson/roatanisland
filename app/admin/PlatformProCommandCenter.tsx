"use client";

import Link from "next/link";
import {
  getPlatformProAdminCommand,
} from "@/lib/platform-pro";

type Booking = {
  id?: string;
  status?: string | null;
  deposit_status?: string | null;
  balance_due_cents?: number | null;
};

type Listing = {
  id?: string;
  title?: string | null;
  is_active?: boolean | null;
  approval_status?: string | null;
  image_url?: string | null;
  tour_times?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
};

type Vendor = {
  id?: string;
  is_active?: boolean | null;
};

type Review = {
  id?: string;
  is_approved?: boolean | null;
};

type SupportTicket = {
  id?: string;
  status?: string | null;
  priority?: string | null;
};

type ConciergeLead = {
  id?: string;
  status?: string | null;
  priority?: string | null;
};

export default function PlatformProCommandCenter({
  bookings,
  listings,
  vendors,
  reviews,
  supportTickets,
  conciergeLeads,
}: {
  bookings: Booking[];
  listings: Listing[];
  vendors: Vendor[];
  reviews: Review[];
  supportTickets: SupportTicket[];
  conciergeLeads: ConciergeLead[];
}) {
  const command = getPlatformProAdminCommand({
    bookings,
    listings,
    vendors,
    reviews,
    supportTickets,
    conciergeLeads,
  });

  return (
    <section className="mt-6 overflow-hidden rounded-2xl bg-[#071F2F] text-white shadow-2xl shadow-[#071F2F]/10">
      <div className="grid gap-0 lg:grid-cols-[1fr_260px]">
        <div className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#D6B56D]">
            Platform Pro command center
          </p>
          <h2 className="mt-2 text-3xl font-black">{command.headline}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
            {command.subhead}
          </p>
        </div>
        <div className="border-t border-white/10 bg-white/10 p-6 lg:border-l lg:border-t-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9EE8E3]">
            Guest trust score
          </p>
          <p className="mt-2 text-5xl font-black">{command.healthScore}%</p>
          <p className="mt-2 text-sm text-white/65">
            Weighted toward support, bookings, payment clarity, and listing
            confidence.
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-t border-white/10 p-5 lg:grid-cols-5">
        {command.priorityActions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="rounded-2xl border border-white/10 bg-white/[0.07] p-4 transition hover:-translate-y-0.5 hover:bg-white/12"
          >
            <span className="rounded-full bg-[#D6B56D] px-3 py-1 text-xs font-black text-[#071F2F]">
              {action.count || 0}
            </span>
            <h3 className="mt-3 text-lg font-black">{action.label}</h3>
            <p className="mt-2 text-sm leading-6 text-white/65">
              {action.text}
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 border-t border-white/10 p-5 md:grid-cols-3">
        {command.trustFocus.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl bg-white p-4 text-[#0B3C5D]"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
              {item.label}
            </p>
            <p className="mt-2 text-xl font-black">{item.value}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
