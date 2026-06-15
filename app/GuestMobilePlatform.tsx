"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import SiteLogo from "@/app/SiteLogo";
import {
  getGuestMenuGroupLabel,
  guestMenuItems,
  type GuestMenuItem,
} from "@/lib/guest-navigation";
import {
  SAVED_LISTINGS_KEY,
  TRIP_PLAN_KEY,
  mergeTripBoardSavedItems,
  type TripBoardListingItem,
} from "@/lib/trip-board";

function isGuestSurface(pathname: string | null) {
  if (!pathname) return true;
  if (pathname.startsWith("/admin")) return false;
  if (pathname === "/vendor" || pathname.startsWith("/vendor/")) {
    if (pathname === "/vendor/signup") return true;
    return false;
  }
  if (pathname.startsWith("/api")) return false;
  return true;
}

function readJson(key: string, fallback: unknown) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function groupItems(group: GuestMenuItem["group"]) {
  return guestMenuItems.filter((item) => item.group === group);
}

export default function GuestMobilePlatform() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [savedItems, setSavedItems] = useState<TripBoardListingItem[]>([]);
  const [savedPlanCount, setSavedPlanCount] = useState(0);

  useEffect(() => {
    if (!isGuestSurface(pathname)) return;

    function loadSavedPlan() {
      const tripIds = readJson(TRIP_PLAN_KEY, []);
      const savedListingItems = readJson(SAVED_LISTINGS_KEY, []);
      const merged = mergeTripBoardSavedItems({
        tripPlanIds: tripIds,
        savedItems: savedListingItems,
        limit: 12,
      });
      const localPlans = readJson("roatan-concierge-plans", []);

      setSavedItems(merged.savedItems);
      setSavedPlanCount(Array.isArray(localPlans) ? localPlans.length : 0);
    }

    loadSavedPlan();
    window.addEventListener("storage", loadSavedPlan);
    window.addEventListener("roatan-trip-plan-change", loadSavedPlan);
    return () => {
      window.removeEventListener("storage", loadSavedPlan);
      window.removeEventListener("roatan-trip-plan-change", loadSavedPlan);
    };
  }, [pathname]);

  const tripHref = useMemo(() => {
    const ids = savedItems.map((item) => item.id).filter(Boolean);
    return ids.length > 0
      ? `/map?trip=${encodeURIComponent(ids.join(","))}`
      : "/map";
  }, [savedItems]);

  if (!isGuestSurface(pathname)) {
    return null;
  }

  const savedCount = savedItems.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        className="fixed right-4 top-[calc(0.85rem+env(safe-area-inset-top))] z-[70] grid h-12 w-12 place-items-center rounded-2xl bg-white/92 text-[#071F2F] shadow-2xl shadow-[#071F2F]/15 ring-1 ring-[#071F2F]/10 backdrop-blur sm:hidden"
        aria-label="Open menu"
      >
        <span className="grid gap-1.5">
          <span className="h-0.5 w-6 rounded-full bg-current" />
          <span className="h-0.5 w-6 rounded-full bg-current" />
          <span className="h-0.5 w-6 rounded-full bg-current" />
        </span>
      </button>

      <nav
        aria-label="Mobile quick actions"
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-[55] grid grid-cols-4 gap-1 rounded-[1.35rem] border border-white/16 bg-[#071F2F]/94 p-1 text-center text-[11px] font-black text-white shadow-2xl shadow-[#071F2F]/24 backdrop-blur-xl sm:hidden"
      >
        <Link
          href="/tours"
          className="rounded-2xl px-2 py-3 text-white/86 hover:bg-white/10"
        >
          <span className="block text-[10px] uppercase tracking-[0.12em] text-[#D6B56D]">
            Browse
          </span>
          <span className="mt-0.5 block">Explore</span>
        </Link>
        <Link
          href="/map"
          className="rounded-2xl px-2 py-3 text-white/86 hover:bg-white/10"
        >
          <span className="block text-[10px] uppercase tracking-[0.12em] text-[#D6B56D]">
            Island
          </span>
          <span className="mt-0.5 block">Map</span>
        </Link>
        <button
          type="button"
          onClick={() => setPlanOpen(true)}
          className="rounded-2xl bg-white px-2 py-3 text-[#071F2F] shadow-lg shadow-black/10"
          aria-label="Open saved plan"
        >
          <span className="block text-[10px] uppercase tracking-[0.12em] text-[#9C7A2F]">
            Saved Plan
          </span>
          <span className="mt-0.5 block truncate">
            {savedCount > 0
              ? `${savedCount} stop${savedCount === 1 ? "" : "s"}`
              : savedPlanCount > 0
                ? `${savedPlanCount} plan${savedPlanCount === 1 ? "" : "s"}`
                : "Saved"}
          </span>
        </button>
        <Link
          href="/concierge"
          className="rounded-2xl px-2 py-3 text-white/86 hover:bg-white/10"
        >
          <span className="block text-[10px] uppercase tracking-[0.12em] text-[#D6B56D]">
            Roa
          </span>
          <span className="mt-0.5 block">Ask</span>
        </Link>
      </nav>

      {menuOpen ? (
        <div className="fixed inset-0 z-[90] bg-[#071F2F]/45 backdrop-blur-sm sm:hidden">
          <aside className="ml-auto flex h-full w-full max-w-[420px] flex-col bg-[#FBF8EF] text-[#071F2F] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#D6B56D]/25 px-5 py-4">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-2xl font-black shadow ring-1 ring-[#071F2F]/10"
                aria-label="Close menu"
              >
                x
              </button>
              <SiteLogo variant="dark" compact />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00A8A8]">
                Roatan Island Life
              </p>
              <h2 className="mt-3 text-4xl font-black leading-none">
                Where should we take you?
              </h2>

              {(["plan", "account", "business"] as const).map((group) => (
                <section key={group} className="mt-8">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-[#9C7A2F]">
                    {getGuestMenuGroupLabel(group)}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {groupItems(group).map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-[#071F2F]/8 transition hover:-translate-y-0.5 hover:shadow-lg"
                      >
                        <span className="block text-xl font-black">
                          {item.label}
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-[#0B3C5D]/68">
                          {item.description}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </aside>
        </div>
      ) : null}

      {planOpen ? (
        <div className="fixed inset-0 z-[88] bg-[#071F2F]/45 backdrop-blur-sm sm:hidden">
          <aside className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-hidden rounded-t-[2rem] bg-[#FBF8EF] text-[#071F2F] shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-[#D6B56D]/25 px-5 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00A8A8]">
                  Trip cart
                </p>
                <h2 className="mt-1 text-3xl font-black">My saved plan</h2>
              </div>
              <button
                type="button"
                onClick={() => setPlanOpen(false)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-2xl font-black shadow ring-1 ring-[#071F2F]/10"
                aria-label="Close saved plan"
              >
                x
              </button>
            </div>

            <div className="max-h-[calc(86vh-104px)] overflow-y-auto px-5 py-5">
              {savedItems.length === 0 ? (
                <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#071F2F]/8">
                  <p className="text-lg font-black">No saved stops yet.</p>
                  <p className="mt-2 text-sm leading-6 text-[#0B3C5D]/70">
                    Save listings from the map, then open this cart anywhere to
                    compare your Roatan day.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {savedItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-[#071F2F]/8"
                    >
                      <div className="flex gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#D6B56D] text-sm font-black">
                          {index + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-lg font-black">
                            {item.title}
                          </p>
                          <p className="mt-1 text-sm font-semibold text-[#0B3C5D]/65">
                            {item.location} / {item.category}
                            {item.priceLabel ? ` / ${item.priceLabel}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-5 grid gap-2">
                <Link
                  href={tripHref}
                  onClick={() => setPlanOpen(false)}
                  className="rounded-2xl bg-[#071F2F] px-5 py-4 text-center text-sm font-black text-white"
                >
                  Open on map
                </Link>
                <Link
                  href="/concierge"
                  onClick={() => setPlanOpen(false)}
                  className="rounded-2xl bg-[#00A8A8] px-5 py-4 text-center text-sm font-black text-white"
                >
                  Ask Roa to improve it
                </Link>
                <Link
                  href="/account?tab=saved"
                  onClick={() => setPlanOpen(false)}
                  className="rounded-2xl bg-white px-5 py-4 text-center text-sm font-black text-[#071F2F] shadow ring-1 ring-[#071F2F]/10"
                >
                  Open my trips
                </Link>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
