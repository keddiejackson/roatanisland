"use client";

import Link from "next/link";

export default function RootError({ reset }: { reset: () => void }) {
  return (
    <main className="brand-page grid min-h-dvh place-items-center px-4 py-10 text-[#17324D]">
      <section className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl ring-1 ring-[#071F2F]/10 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#007B7B]">
          Connection interrupted
        </p>
        <h1 className="mt-3 text-3xl font-black text-[#071F2F]">
          Let us try that again.
        </h1>
        <p className="mt-4 leading-7 text-[#17324D]/70">
          Your plans are still safe. Retry this page, or return to the map and
          continue exploring.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={reset} className="brand-button-primary">
            Try again
          </button>
          <Link href="/map" className="brand-button-secondary text-center">
            Open the map
          </Link>
        </div>
      </section>
    </main>
  );
}

