"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMobileSiteControls } from "@/app/SiteBrandingProvider";
import { supabase } from "@/lib/supabase";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/reminders", label: "Reminders" },
  { href: "/admin/concierge", label: "Concierge" },
  { href: "/admin/community", label: "Circle" },
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

const mobilePrimaryItems = [
  { href: "/admin", label: "Today" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/support", label: "Inbox" },
];

export default function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();
  const mobileControls = useMobileSiteControls();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function close(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <>
      <nav
        aria-label="Admin navigation"
        className="brand-workspace-nav mb-8 hidden flex-wrap gap-3 sm:flex"
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
          className="rounded-xl bg-[#071F2F] px-4 py-2 text-center text-sm font-semibold text-white shadow"
        >
          Sign out
        </button>
      </nav>

      <div className="mb-6 sm:hidden">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-[#071F2F]/10">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#007B7B]">
              Admin workspace
            </p>
            <p className="truncate text-sm font-black text-[#071F2F]">
              {navItems.find((item) => item.href === pathname)?.label || "Today"}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="min-h-11 shrink-0 rounded-xl bg-[#071F2F] px-4 text-xs font-black text-white"
          >
            Sign out
          </button>
        </div>

        <nav
          aria-label="Admin mobile navigation"
          className="admin-mobile-nav fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[60] grid grid-cols-4 gap-1 rounded-2xl bg-[#071F2F]/96 p-1 shadow-2xl ring-1 ring-white/10 backdrop-blur"
        >
          {mobilePrimaryItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`grid min-h-12 place-items-center rounded-xl px-1 text-center text-[11px] font-black ${
                  active ? "bg-white text-[#071F2F]" : "text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-menu"
            className="grid min-h-12 place-items-center rounded-xl px-1 text-[11px] font-black text-white"
          >
            More
          </button>
        </nav>
      </div>

      {menuOpen ? (
        <div className="fixed inset-0 z-[100] bg-[#071F2F]/45 backdrop-blur-sm sm:hidden">
          <aside
            id="admin-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="All admin tools"
            className="ml-auto flex h-full w-full max-w-[420px] flex-col bg-[#FBFAF6] p-5 shadow-2xl"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#007B7B]">
                  Operations
                </p>
                <h2 className="mt-1 text-3xl font-black text-[#071F2F]">All admin tools</h2>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close admin menu"
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-white shadow ring-1 ring-[#071F2F]/10"
              >
                <span aria-hidden="true" className="relative block size-5">
                  <span className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 rotate-45 bg-current" />
                  <span className="absolute left-0 top-1/2 h-0.5 w-5 -translate-y-1/2 -rotate-45 bg-current" />
                </span>
              </button>
            </div>
            <div className={`mt-6 grid min-h-0 flex-1 auto-rows-min gap-2 overflow-y-auto pb-8 ${mobileControls.compactMobileAdminNav ? "grid-cols-2" : "grid-cols-1"}`}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`min-h-12 rounded-xl px-4 py-3 text-sm font-black ${
                    pathname === item.href
                      ? "bg-[#071F2F] text-white"
                      : "bg-white text-[#071F2F] shadow-sm ring-1 ring-[#071F2F]/8"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
