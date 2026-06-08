"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GlobalRoaButton() {
  const pathname = usePathname();

  if (
    pathname?.startsWith("/admin") ||
    pathname === "/concierge" ||
    pathname?.startsWith("/concierge/quote") ||
    pathname === "/signin"
  ) {
    return null;
  }

  return (
    <Link
      href="/concierge"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-3 z-30 max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[#071F2F] px-4 py-3 text-sm font-black text-white shadow-2xl shadow-[#071F2F]/25 ring-1 ring-white/15 transition hover:-translate-y-0.5 sm:left-5"
    >
      <span className="block text-[0.65rem] uppercase tracking-[0.16em] text-[#D6B56D]">
        Roa
      </span>
      <span className="block leading-tight">Ask concierge</span>
    </Link>
  );
}
