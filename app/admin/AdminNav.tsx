"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMobileSiteControls } from "@/app/SiteBrandingProvider";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/reminders", label: "Reminders" },
  { href: "/admin/concierge", label: "Concierge" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/listings", label: "Listings" },
  { href: "/admin/listing-quality", label: "Quality" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/map-cleanup", label: "Map QA" },
  { href: "/admin/listing-review", label: "Review" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/vendor-documents", label: "Vendor Docs" },
  { href: "/admin/promos", label: "Promos" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/activity", label: "Activity" },
  { href: "/admin/errors", label: "Errors" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/vendor/add-listing", label: "Add Listing" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const mobileControls = useMobileSiteControls();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <nav
      className={`brand-workspace-nav mb-8 grid gap-2 sm:flex sm:flex-wrap sm:gap-3 ${
        mobileControls.compactMobileAdminNav
          ? "grid-cols-3"
          : "grid-cols-2"
      }`}
    >
      {navItems.map((item) => {
        const active = item.href !== "/" && pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-3 py-2 text-center text-xs font-semibold sm:px-4 sm:text-sm ${
              active
                ? "bg-[#0B3C5D] text-white"
                : "bg-white text-[#0B3C5D] shadow-sm"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={signOut}
        className="rounded-xl bg-[#071F2F] px-3 py-2 text-center text-xs font-semibold text-white shadow sm:px-4 sm:text-sm"
      >
        Sign out
      </button>
    </nav>
  );
}
