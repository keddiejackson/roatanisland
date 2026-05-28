"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export type ListingShortlistItem = {
  id: string;
  title: string;
  priceLabel: string;
  location: string;
  category: string;
  imageUrl?: string | null;
};

const SAVED_KEY = "roatan-saved-listings";
const COMPARE_KEY = "roatan-compare-listings";
const RECENT_KEY = "roatan-recent-listings";

function readItems(key: string): ListingShortlistItem[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeItems(key: string, items: ListingShortlistItem[]) {
  window.localStorage.setItem(key, JSON.stringify(items));
}

function upsertItem(
  items: ListingShortlistItem[],
  item: ListingShortlistItem,
  limit: number,
) {
  return [item, ...items.filter((current) => current.id !== item.id)].slice(
    0,
    limit,
  );
}

export default function ListingConversionTools({
  listing,
  relatedListings,
}: {
  listing: ListingShortlistItem;
  relatedListings: ListingShortlistItem[];
}) {
  const [savedItems, setSavedItems] = useState<ListingShortlistItem[]>([]);
  const [compareItems, setCompareItems] = useState<ListingShortlistItem[]>([]);
  const [recentItems, setRecentItems] = useState<ListingShortlistItem[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = readItems(SAVED_KEY);
      const compared = readItems(COMPARE_KEY);
      const recent = upsertItem(readItems(RECENT_KEY), listing, 6);

      writeItems(RECENT_KEY, recent);
      setSavedItems(saved);
      setCompareItems(compared);
      setRecentItems(recent);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [listing]);

  const isSaved = savedItems.some((item) => item.id === listing.id);
  const isCompared = compareItems.some((item) => item.id === listing.id);
  const visibleRecentItems = useMemo(
    () => recentItems.filter((item) => item.id !== listing.id).slice(0, 3),
    [listing.id, recentItems],
  );

  function toggleSaved() {
    const nextItems = isSaved
      ? savedItems.filter((item) => item.id !== listing.id)
      : upsertItem(savedItems, listing, 12);

    writeItems(SAVED_KEY, nextItems);
    setSavedItems(nextItems);
  }

  function toggleCompare() {
    const nextItems = isCompared
      ? compareItems.filter((item) => item.id !== listing.id)
      : upsertItem(compareItems, listing, 4);

    writeItems(COMPARE_KEY, nextItems);
    setCompareItems(nextItems);
  }

  return (
    <section className="rounded-lg border border-[#00A8A8]/20 bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
            Trip shortlist
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
            Save, compare, and come back.
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Keep this listing handy while you compare Roatan areas, prices, and
            tour times.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleSaved}
            className={`rounded-lg px-4 py-3 text-sm font-black ${
              isSaved
                ? "bg-[#071F2F] text-white"
                : "bg-[#EEF7F6] text-[#0B3C5D]"
            }`}
          >
            {isSaved ? "Saved" : "Save listing"}
          </button>
          <button
            type="button"
            onClick={toggleCompare}
            className={`rounded-lg px-4 py-3 text-sm font-black ${
              isCompared
                ? "bg-[#D6B56D] text-[#071F2F]"
                : "bg-[#F7F3EA] text-[#0B3C5D]"
            }`}
          >
            {isCompared ? "Comparing" : "Compare"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-[#F7F3EA] p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
            Saved
          </p>
          <p className="mt-2 text-2xl font-black text-[#0B3C5D]">
            {savedItems.length}
          </p>
        </div>
        <div className="rounded-lg bg-[#F7F3EA] p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
            Compare
          </p>
          <p className="mt-2 text-2xl font-black text-[#0B3C5D]">
            {compareItems.length}/4
          </p>
        </div>
        <div className="rounded-lg bg-[#F7F3EA] p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
            Recently viewed
          </p>
          <p className="mt-2 text-2xl font-black text-[#0B3C5D]">
            {recentItems.length}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-gray-200 p-4">
          <p className="font-black text-[#0B3C5D]">Compare quickly</p>
          <div className="mt-3 grid gap-2">
            {[listing, ...compareItems.filter((item) => item.id !== listing.id)]
              .slice(0, 4)
              .map((item) => (
                <Link
                  key={item.id}
                  href={`/listings/${item.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-[#F7F3EA] px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate font-bold text-[#0B3C5D]">
                    {item.title}
                  </span>
                  <span className="shrink-0 text-xs font-black text-[#007B7B]">
                    {item.priceLabel}
                  </span>
                </Link>
              ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 p-4">
          <p className="font-black text-[#0B3C5D]">Recently viewed</p>
          <div className="mt-3 grid gap-2">
            {(visibleRecentItems.length ? visibleRecentItems : relatedListings)
              .slice(0, 3)
              .map((item) => (
                <Link
                  key={item.id}
                  href={`/listings/${item.id}`}
                  className="rounded-lg bg-[#F7F3EA] px-3 py-2 text-sm font-bold text-[#0B3C5D]"
                >
                  {item.title}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
