"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/errors", label: "Errors" },
  { href: "/vendor/add-listing", label: "Add Listing" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-8 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
      {navItems.map((item) => {
        const active = item.href !== "/" && pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-4 py-2 text-center text-sm font-semibold ${
              active
                ? "bg-[#0B3C5D] text-white"
                : "bg-white text-[#0B3C5D] shadow"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
