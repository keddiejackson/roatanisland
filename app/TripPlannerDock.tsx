"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  COMPARE_LISTINGS_KEY,
  SAVED_LISTINGS_KEY,
  TRIP_PLAN_KEY,
  mergeTripBoardSavedItems,
  normalizeTripBoardItems,
} from "@/lib/trip-board";

export default function TripPlannerDock() {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [compareCount, setCompareCount] = useState(0);
  const [savedPlanCount, setSavedPlanCount] = useState(0);

  useEffect(() => {
    function loadSavedTrip() {
      try {
        const saved = JSON.parse(localStorage.getItem(TRIP_PLAN_KEY) || "[]");
        const savedListings = JSON.parse(
          localStorage.getItem(SAVED_LISTINGS_KEY) || "[]",
        );
        const merged = mergeTripBoardSavedItems({
          tripPlanIds: saved,
          savedItems: savedListings,
          limit: 12,
        });

        setSavedIds(merged.savedIds.slice(0, 8));
      } catch {
        setSavedIds([]);
      }

      try {
        const compared = JSON.parse(
          localStorage.getItem(COMPARE_LISTINGS_KEY) || "[]",
        );
        setCompareCount(normalizeTripBoardItems(compared, 4).length);
      } catch {
        setCompareCount(0);
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
  const plannerProgress = Math.min(
    100,
    savedIds.length * 16 + compareCount * 8 + savedPlanCount * 28,
  );
  const nextStep =
    savedIds.length === 0
      ? "Save stops from the map"
      : compareCount === 0
        ? "Compare your best options"
      : savedPlanCount === 0
        ? "Turn saved stops into a plan"
        : "Open your guest dashboard";

  return (
    <aside className="rounded-lg border border-[#00A8A8]/20 bg-[#EEF7F6] p-4 text-[#0B3C5D]">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
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
          <div className="mt-3 max-w-xl">
            <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
              <span>Planner progress</span>
              <span>{plannerProgress}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <span
                className="block h-full rounded-full bg-[#00A8A8]"
                style={{ width: `${plannerProgress}%` }}
              />
            </div>
            <p className="mt-2 text-sm font-semibold text-[#0B3C5D]/75">
              Next: {nextStep}
              {compareCount > 0 ? ` - ${compareCount} in compare` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={tripHref}
            className="rounded-lg bg-[#0B3C5D] px-4 py-3 text-center text-sm font-bold text-white"
          >
            {savedIds.length > 0 ? "Open saved plan" : "Start planning"}
          </Link>
          <Link
            href={savedIds.length > 0 ? "/account?tab=saved" : "/concierge"}
            className="rounded-lg bg-white px-4 py-3 text-center text-sm font-bold text-[#0B3C5D]"
          >
            {savedIds.length > 0 ? "My trips" : "Ask Roa"}
          </Link>
        </div>
      </div>
    </aside>
  );
}
