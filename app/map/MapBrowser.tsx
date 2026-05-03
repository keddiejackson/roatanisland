"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { MapListing } from "@/app/map/page";

type Pin = MapListing & {
  left: number;
  top: number;
  hasExactPin: boolean;
};

const categories = ["All", "Tours", "Hotels", "Transport"];

const bounds = {
  north: 16.48,
  south: 16.22,
  west: -86.65,
  east: -86.25,
};

const areaPositions: Record<string, { latitude: number; longitude: number }> = {
  "west bay": { latitude: 16.274, longitude: -86.599 },
  "west end": { latitude: 16.305, longitude: -86.594 },
  sandy: { latitude: 16.329, longitude: -86.564 },
  "sandy bay": { latitude: 16.329, longitude: -86.564 },
  coxen: { latitude: 16.317, longitude: -86.536 },
  "coxen hole": { latitude: 16.317, longitude: -86.536 },
  flower: { latitude: 16.343, longitude: -86.515 },
  "flower bay": { latitude: 16.343, longitude: -86.515 },
  french: { latitude: 16.354, longitude: -86.455 },
  "french harbour": { latitude: 16.354, longitude: -86.455 },
  "french harbor": { latitude: 16.354, longitude: -86.455 },
  "first bight": { latitude: 16.371, longitude: -86.426 },
  "second bight": { latitude: 16.381, longitude: -86.397 },
  "parrot tree": { latitude: 16.369, longitude: -86.413 },
  "oak ridge": { latitude: 16.404, longitude: -86.346 },
  camp: { latitude: 16.413, longitude: -86.332 },
  "camp bay": { latitude: 16.413, longitude: -86.332 },
  "punta gorda": { latitude: 16.402, longitude: -86.377 },
  roatan: { latitude: 16.34, longitude: -86.48 },
};

function formatPrice(price: number | null) {
  if (!price) return "Ask";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function findAreaPosition(location: string | null) {
  const normalized = (location || "roatan").toLowerCase();
  const match = Object.entries(areaPositions).find(([area]) =>
    normalized.includes(area),
  );

  return match?.[1] || areaPositions.roatan;
}

function toPosition(latitude: number, longitude: number) {
  const left = ((longitude - bounds.west) / (bounds.east - bounds.west)) * 100;
  const top = ((bounds.north - latitude) / (bounds.north - bounds.south)) * 100;

  return {
    left: Math.min(Math.max(left, 5), 95),
    top: Math.min(Math.max(top, 7), 93),
  };
}

function pinForListing(listing: MapListing, index: number): Pin {
  const hasExactPin = listing.latitude !== null && listing.longitude !== null;
  const fallback = findAreaPosition(listing.location);
  const basePosition = hasExactPin
    ? toPosition(Number(listing.latitude), Number(listing.longitude))
    : toPosition(fallback.latitude, fallback.longitude);
  const offsetX = ((index % 3) - 1) * 2.5;
  const offsetY = (Math.floor(index / 3) % 3) * 2.2;

  return {
    ...listing,
    hasExactPin,
    left: Math.min(Math.max(basePosition.left + offsetX, 5), 95),
    top: Math.min(Math.max(basePosition.top + offsetY, 7), 93),
  };
}

export default function MapBrowser({ listings }: { listings: MapListing[] }) {
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(listings[0]?.id || "");

  const locations = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          listings
            .map((listing) => listing.location)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    ],
    [listings],
  );

  const filteredListings = useMemo(
    () =>
      listings.filter((listing) => {
        const matchesCategory =
          category === "All" || listing.category === category;
        const matchesLocation =
          location === "All" || listing.location === location;
        const matchesSearch = [
          listing.title,
          listing.location || "",
          listing.category || "",
          listing.description || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());

        return matchesCategory && matchesLocation && matchesSearch;
      }),
    [category, listings, location, search],
  );

  const pins = useMemo(
    () =>
      filteredListings.map((listing, index) => pinForListing(listing, index)),
    [filteredListings],
  );
  const selectedPin =
    pins.find((pin) => pin.id === selectedId) || pins[0] || null;

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="rounded-2xl bg-white p-4 shadow sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_150px_190px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search map"
            className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All categories" : item}
              </option>
            ))}
          </select>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
          >
            {locations.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All locations" : item}
              </option>
            ))}
          </select>
        </div>

        <div className="relative mt-5 min-h-[520px] overflow-hidden rounded-2xl bg-[#98D1CA] shadow-inner">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_82%,#0E6F69_0_10%,transparent_11%),linear-gradient(135deg,#5EB7AD_0%,#5EB7AD_22%,#F1DFA9_22%,#F1DFA9_35%,#2A8C76_35%,#2A8C76_68%,#69BEB7_68%,#69BEB7_100%)]" />
          <div className="absolute left-[6%] top-[38%] h-[15%] w-[88%] -rotate-6 rounded-full bg-[#F8E8B8]/90 shadow-lg" />
          <div className="absolute left-[12%] top-[33%] h-[8%] w-[70%] -rotate-6 rounded-full bg-[#D9A95E]/30 blur-sm" />
          <div className="absolute bottom-[18%] right-[10%] h-[14%] w-[22%] rounded-full bg-[#F8E8B8]/80" />

          {[
            ["West Bay", "8%", "49%"],
            ["West End", "16%", "42%"],
            ["Coxen Hole", "31%", "46%"],
            ["French Harbour", "52%", "41%"],
            ["Oak Ridge", "76%", "33%"],
            ["Camp Bay", "88%", "25%"],
          ].map(([label, left, top]) => (
            <span
              key={label}
              style={{ left, top }}
              className="absolute rounded-full bg-white/75 px-3 py-1 text-xs font-bold text-[#0B3C5D] shadow-sm"
            >
              {label}
            </span>
          ))}

          {pins.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center p-8 text-center">
              <div className="rounded-2xl bg-white/90 p-6 shadow">
                <p className="font-bold text-[#0B3C5D]">No matches here yet</p>
                <p className="mt-2 text-sm text-gray-600">
                  Try clearing the filters or searching another area.
                </p>
              </div>
            </div>
          ) : null}

          {pins.map((pin) => (
            <button
              key={pin.id}
              type="button"
              onClick={() => setSelectedId(pin.id)}
              style={{ left: `${pin.left}%`, top: `${pin.top}%` }}
              className={`absolute z-10 -translate-x-1/2 -translate-y-full rounded-full px-3 py-2 text-xs font-bold shadow-lg ring-4 ring-white/80 transition hover:scale-105 ${
                selectedPin?.id === pin.id
                  ? "bg-[#00A8A8] text-white"
                  : pin.hasExactPin
                    ? "bg-[#0B3C5D] text-white"
                    : "bg-white text-[#0B3C5D]"
              }`}
              title={pin.hasExactPin ? "Exact map pin" : "Area pin"}
            >
              {pin.category || "Listing"}
            </button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#0B3C5D]" />
            Exact coordinate
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border border-[#0B3C5D] bg-white" />
            Area estimate
          </span>
          <span className="font-semibold text-[#0B3C5D]">
            {filteredListings.length} listing
            {filteredListings.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <aside className="grid gap-4 lg:max-h-[680px] lg:overflow-y-auto">
        {selectedPin ? (
          <article className="rounded-2xl bg-white p-5 shadow ring-2 ring-[#00A8A8]/25">
            <div className="relative h-48 overflow-hidden rounded-xl bg-[#D8EFEC]">
              {selectedPin.image_url ? (
                <Image
                  src={selectedPin.image_url}
                  alt={selectedPin.title}
                  fill
                  sizes="380px"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-[#0B3C5D]/60">
                  No image yet
                </div>
              )}
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#00A8A8]">
              {selectedPin.category || "Listing"}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#0B3C5D]">
              {selectedPin.title}
            </h2>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
              {selectedPin.description || "Details coming soon."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-[#F7F3EA] p-3">
                <p className="text-gray-500">Area</p>
                <p className="font-bold text-[#0B3C5D]">
                  {selectedPin.location || "Roatan"}
                </p>
              </div>
              <div className="rounded-xl bg-[#F7F3EA] p-3">
                <p className="text-gray-500">Price</p>
                <p className="font-bold text-[#0B3C5D]">
                  {formatPrice(selectedPin.price)}
                </p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/listings/${selectedPin.id}`}
                className="flex-1 rounded-xl bg-[#00A8A8] px-4 py-3 text-center text-sm font-semibold text-white"
              >
                View listing
              </Link>
              <Link
                href={`/book?listing=${selectedPin.id}`}
                className="flex-1 rounded-xl border border-[#00A8A8] px-4 py-3 text-center text-sm font-semibold text-[#007B7B]"
              >
                Book
              </Link>
            </div>
          </article>
        ) : null}

        {pins.map((pin) => (
          <button
            key={pin.id}
            type="button"
            onClick={() => setSelectedId(pin.id)}
            className={`rounded-2xl p-4 text-left shadow transition ${
              selectedPin?.id === pin.id
                ? "bg-[#0B3C5D] text-white"
                : "bg-white text-[#17324D] hover:-translate-y-0.5"
            }`}
          >
            <div className="flex gap-3">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#D8EFEC]">
                {pin.image_url ? (
                  <Image
                    src={pin.image_url}
                    alt={pin.title}
                    fill
                    sizes="80px"
                    unoptimized
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div>
                <p className="font-bold">{pin.title}</p>
                <p
                  className={`mt-1 text-sm ${
                    selectedPin?.id === pin.id ? "text-white/75" : "text-gray-600"
                  }`}
                >
                  {pin.location || "Roatan"} - {formatPrice(pin.price)}
                </p>
                <p
                  className={`mt-1 text-xs font-semibold ${
                    selectedPin?.id === pin.id ? "text-[#9EE8E3]" : "text-[#007B7B]"
                  }`}
                >
                  {pin.hasExactPin ? "Exact pin" : "Area pin"}
                </p>
              </div>
            </div>
          </button>
        ))}
      </aside>
    </section>
  );
}
