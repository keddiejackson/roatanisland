"use client";

import Link from "next/link";

const items = [
  { href: "#vendor-today", label: "Today" },
  { href: "#vendor-calendar", label: "Calendar" },
  { href: "#vendor-listings", label: "Listings" },
  { href: "#vendor-inbox", label: "Inbox" },
  { href: "#vendor-business", label: "Business" },
];

export default function VendorMobileNav() {
  return (
    <nav
      aria-label="Vendor mobile navigation"
      className="fixed inset-x-2 bottom-[calc(0.65rem+env(safe-area-inset-bottom))] z-[60] grid grid-cols-5 gap-1 rounded-2xl bg-[#071F2F]/96 p-1 shadow-2xl ring-1 ring-white/10 backdrop-blur sm:hidden"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="grid min-h-12 place-items-center rounded-xl px-0.5 text-center text-[10px] font-black text-white transition focus:bg-white focus:text-[#071F2F]"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

