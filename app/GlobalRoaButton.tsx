"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GlobalRoaButton() {
  const pathname = usePathname();

  if (
    pathname?.startsWith("/admin") ||
    pathname === "/" ||
    pathname === "/concierge" ||
    pathname?.startsWith("/concierge/quote") ||
    pathname === "/signin"
  ) {
    return null;
  }

  return (
    <Link
      href="/concierge"
      aria-label="Ask Roa concierge"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-3 z-30 grid size-14 place-items-center rounded-full bg-[#071F2F] text-sm font-black text-white shadow-2xl shadow-[#071F2F]/25 ring-1 ring-white/15 transition hover:-translate-y-0.5 sm:left-5 sm:w-auto sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl sm:px-4 sm:py-3"
    >
      <span className="block text-[0.72rem] uppercase tracking-[0.16em] text-[#D6B56D] sm:text-[0.65rem]">
        Roa
      </span>
      <span className="hidden leading-tight sm:block">Ask concierge</span>
    </Link>
  );
}
