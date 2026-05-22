"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function TripPlannerDock() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [savedPlanCount, setSavedPlanCount] = useState(0);

  useEffect(() => {
    function loadSavedTrip() {
      try {
        const saved = JSON.parse(localStorage.getItem("roatan-trip-plan") || "[]");
        setSavedIds(
          Array.isArray(saved)
            ? saved.filter((id): id is string => typeof id === "string").slice(0, 8)
            : [],
        );
      } catch {
        setSavedIds([]);
      }

      try {
        const plans = JSON.parse(
          localStorage.getItem("roatan-concierge-plans") || "[]",
        );
        setSavedPlanCount(Array.isArray(plans) ? plans.length : 0);
      } catch {
        setSavedPlanCount(0);
      }
    }

    loadSavedTrip();
    window.addEventListener("storage", loadSavedTrip);
    return () => window.removeEventListener("storage", loadSavedTrip);
  }, []);

  const tripHref = useMemo(() => {
    if (savedIds.length === 0) return "/map";
    return `/map?trip=${encodeURIComponent(savedIds.join(","))}`;
  }, [savedIds]);

  return (
    <aside className="rounded-lg border border-[#00A8A8]/20 bg-[#EEF7F6] p-4 text-[#0B3C5D]">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#007B7B]">
            Saved trip planner
          </p>
          <p className="mt-1 font-bold">
            {savedIds.length > 0
              ? `${savedIds.length} saved stop${savedIds.length === 1 ? "" : "s"} ready on the map`
              : savedPlanCount > 0
                ? `${savedPlanCount} concierge plan${
                    savedPlanCount === 1 ? "" : "s"
                  } saved in My Trips`
              : "Save stops from the map and build a Roatan day plan"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={tripHref}
            className="rounded-lg bg-[#0B3C5D] px-4 py-3 text-center text-sm font-bold text-white"
          >
            {savedIds.length > 0 ? "Open saved plan" : "Start planning"}
          </Link>
          <Link
            href="/concierge"
            className="rounded-lg bg-white px-4 py-3 text-center text-sm font-bold text-[#0B3C5D]"
          >
            Concierge
          </Link>
        </div>
      </div>
    </aside>
  );
}
