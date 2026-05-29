"use client";

import Link from "next/link";
import { getPublicMasterpieceMoments } from "@/lib/platform-pro";

type Listing = {
  id?: string;
  category?: string | null;
  is_active?: boolean | null;
};

export default function GuestMasterpieceSection({
  listings,
}: {
  listings: Listing[];
}) {
  const moments = getPublicMasterpieceMoments({ listings });

  return (
    <section className="bg-[#FBF8F1] px-5 py-16 sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] bg-[#071F2F] p-6 text-white shadow-2xl shadow-[#071F2F]/15 lg:grid-cols-[0.95fr_1.05fr] lg:items-center sm:p-10">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#D6B56D]">
            Guest-first planning
          </p>
          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
            {moments.heroPromise}
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-white/72">
            RoatanIsland.life should feel less like scrolling through random
            options and more like having a calm local planner organize the day:
            where to go, what fits, what is nearby, and what happens next.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/map"
              className="rounded-xl bg-[#D6B56D] px-5 py-3 text-sm font-black text-[#071F2F]"
            >
              Plan by map
            </Link>
            <Link
              href="/account"
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white"
            >
              Open trip dashboard
            </Link>
          </div>
        </div>

        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9EE8E3]">
                Live marketplace
              </p>
              <p className="mt-2 text-4xl font-black">
                {moments.activeListingCount}
              </p>
              <p className="mt-1 text-sm text-white/65">
                active options across {moments.categoryCount || 1} planning lanes
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9EE8E3]">
                Designed for clarity
              </p>
              <p className="mt-2 text-4xl font-black">4</p>
              <p className="mt-1 text-sm text-white/65">
                steps from idea to trip-day confidence
              </p>
            </div>
          </div>
          {moments.moments.map((moment, index) => (
            <div
              key={moment.title}
              className="rounded-2xl border border-white/10 bg-white/[0.07] p-5"
            >
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D6B56D]">
                Step {index + 1}
              </p>
              <h3 className="mt-2 text-xl font-black">{moment.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/68">
                {moment.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
