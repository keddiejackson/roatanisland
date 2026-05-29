"use client";

import Link from "next/link";
import { getVendorProCommand } from "@/lib/platform-pro";

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

type Booking = {
  id?: string;
  status?: string | null;
  deposit_status?: string | null;
};

type VendorDocument = {
  id?: string;
  status?: string | null;
};

export default function VendorProCommandCenter({
  listings,
  bookings,
  documents,
}: {
  listings: Listing[];
  bookings: Booking[];
  documents: VendorDocument[];
}) {
  const command = getVendorProCommand({ listings, bookings, documents });

  return (
    <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow">
      <div className="grid gap-0 lg:grid-cols-[1fr_240px]">
        <div className="p-6">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
            Operator Pro board
          </p>
          <h2 className="mt-2 text-3xl font-black text-[#0B3C5D]">
            {command.headline}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
            {command.subhead}
          </p>
        </div>
        <div className="bg-[#071F2F] p-6 text-white">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D6B56D]">
            Guest-ready score
          </p>
          <p className="mt-2 text-5xl font-black">{command.score}%</p>
          <p className="mt-2 text-sm text-white/65">
            Photos, times, map confidence, active listings, and request response.
          </p>
        </div>
      </div>

      <div className="grid gap-3 border-t border-gray-100 p-5 lg:grid-cols-5">
        {command.focusItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="rounded-2xl bg-[#F7F3EA] p-4 transition hover:-translate-y-0.5 hover:shadow"
          >
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0B3C5D]">
              {item.count || 0}
            </span>
            <h3 className="mt-3 text-base font-black text-[#0B3C5D]">
              {item.label}
            </h3>
            <p className="mt-2 text-xs leading-5 text-gray-600">{item.text}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
