"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import type { MapListing } from "@/app/map/page";

type Pin = MapListing & {
  latitudeValue: number;
  longitudeValue: number;
  hasExactPin: boolean;
};

type Cluster = {
  id: string;
  pins: Pin[];
  latitude: number;
  longitude: number;
};

const categories = ["All", "Tours", "Hotels", "Transport"];
const zoomLevels = [11, 12, 13, 14];
const roatanCenter = { latitude: 16.34, longitude: -86.48 };

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
  roatan: roatanCenter,
};

const areaButtons = [
  "All",
  "West Bay",
  "West End",
  "Sandy Bay",
  "Coxen Hole",
  "French Harbour",
  "Oak Ridge",
  "Camp Bay",
];

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

function listingToPin(listing: MapListing): Pin {
  const hasExactPin = listing.latitude !== null && listing.longitude !== null;
  const fallback = findAreaPosition(listing.location);

  return {
    ...listing,
    hasExactPin,
    latitudeValue: hasExactPin ? Number(listing.latitude) : fallback.latitude,
    longitudeValue: hasExactPin ? Number(listing.longitude) : fallback.longitude,
  };
}

function latLonToWorld(latitude: number, longitude: number, zoom: number) {
  const sinLatitude = Math.sin((latitude * Math.PI) / 180);
  const scale = 256 * 2 ** zoom;

  return {
    x: ((longitude + 180) / 360) * scale,
    y:
      (0.5 -
        Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) *
      scale,
  };
}

function worldToLatLon(x: number, y: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const latitude = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return { latitude, longitude };
}

function clusterPins(pins: Pin[], zoom: number) {
  const clusters: Cluster[] = [];
  const threshold = zoom >= 14 ? 34 : zoom >= 13 ? 44 : 58;

  pins.forEach((pin) => {
    const point = latLonToWorld(pin.latitudeValue, pin.longitudeValue, zoom);
    const match = clusters.find((cluster) => {
      const clusterPoint = latLonToWorld(
        cluster.latitude,
        cluster.longitude,
        zoom,
      );
      return (
        Math.hypot(point.x - clusterPoint.x, point.y - clusterPoint.y) < threshold
      );
    });

    if (match) {
      match.pins.push(pin);
      match.latitude =
        match.pins.reduce((total, item) => total + item.latitudeValue, 0) /
        match.pins.length;
      match.longitude =
        match.pins.reduce((total, item) => total + item.longitudeValue, 0) /
        match.pins.length;
      return;
    }

    clusters.push({
      id: pin.id,
      pins: [pin],
      latitude: pin.latitudeValue,
      longitude: pin.longitudeValue,
    });
  });

  return clusters;
}

function getTiles(center: typeof roatanCenter, zoom: number) {
  const centerWorld = latLonToWorld(center.latitude, center.longitude, zoom);
  const centerTileX = Math.floor(centerWorld.x / 256);
  const centerTileY = Math.floor(centerWorld.y / 256);
  const tiles: { x: number; y: number; left: number; top: number }[] = [];

  for (let x = centerTileX - 3; x <= centerTileX + 3; x += 1) {
    for (let y = centerTileY - 3; y <= centerTileY + 3; y += 1) {
      tiles.push({
        x,
        y,
        left: x * 256 - centerWorld.x,
        top: y * 256 - centerWorld.y,
      });
    }
  }

  return tiles;
}

export default function MapBrowser({ listings }: { listings: MapListing[] }) {
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("All");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(listings[0]?.id || "");
  const [center, setCenter] = useState(roatanCenter);
  const [zoom, setZoom] = useState(12);
  const dragRef = useRef<{
    x: number;
    y: number;
    centerWorld: { x: number; y: number };
  } | null>(null);

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
    () => filteredListings.map((listing) => listingToPin(listing)),
    [filteredListings],
  );
  const clusters = useMemo(() => clusterPins(pins, zoom), [pins, zoom]);
  const selectedPin =
    pins.find((pin) => pin.id === selectedId) || pins[0] || null;
  const selectedCluster = selectedPin
    ? clusters.find((cluster) =>
        cluster.pins.some((pin) => pin.id === selectedPin.id),
      )
    : null;
  const centerWorld = latLonToWorld(center.latitude, center.longitude, zoom);
  const tiles = getTiles(center, zoom);

  function zoomMap(direction: 1 | -1) {
    const currentIndex = zoomLevels.indexOf(zoom);
    const nextIndex = Math.min(
      Math.max(currentIndex + direction, 0),
      zoomLevels.length - 1,
    );
    setZoom(zoomLevels[nextIndex]);
  }

  function focusArea(area: string) {
    setLocation(area);
    const nextCenter = area === "All" ? roatanCenter : findAreaPosition(area);
    setCenter(nextCenter);
    setZoom(area === "All" ? 12 : 13);
  }

  function focusPin(pin: Pin) {
    setSelectedId(pin.id);
    setCenter({ latitude: pin.latitudeValue, longitude: pin.longitudeValue });
    setZoom((currentZoom) => Math.max(currentZoom, 13));
  }

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
            onChange={(e) => focusArea(e.target.value)}
            className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
          >
            {locations.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All locations" : item}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {areaButtons.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => focusArea(area)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                location === area || (area === "All" && location === "All")
                  ? "bg-[#0B3C5D] text-white"
                  : "bg-[#EEF7F6] text-[#0B3C5D]"
              }`}
            >
              {area}
            </button>
          ))}
        </div>

        <div
          className="relative mt-5 min-h-[560px] cursor-grab touch-none overflow-hidden rounded-2xl bg-[#98D1CA] shadow-inner active:cursor-grabbing"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = {
              x: event.clientX,
              y: event.clientY,
              centerWorld,
            };
          }}
          onPointerMove={(event) => {
            if (!dragRef.current) return;

            const deltaX = event.clientX - dragRef.current.x;
            const deltaY = event.clientY - dragRef.current.y;
            setCenter(
              worldToLatLon(
                dragRef.current.centerWorld.x - deltaX,
                dragRef.current.centerWorld.y - deltaY,
                zoom,
              ),
            );
          }}
          onPointerUp={() => {
            dragRef.current = null;
          }}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          {tiles.map((tile) => (
            <div
              key={`${zoom}-${tile.x}-${tile.y}`}
              style={{
                left: `calc(50% + ${tile.left}px)`,
                top: `calc(50% + ${tile.top}px)`,
                backgroundImage: `url(https://tile.openstreetmap.org/${zoom}/${tile.x}/${tile.y}.png)`,
              }}
              className="absolute h-64 w-64 bg-cover"
            />
          ))}
          <div className="absolute inset-0 bg-[#0B3C5D]/5" />

          <div className="absolute left-4 top-4 z-20 grid gap-2">
            <button
              type="button"
              onClick={() => zoomMap(1)}
              className="h-10 w-10 rounded-xl bg-white text-xl font-bold text-[#0B3C5D] shadow"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => zoomMap(-1)}
              className="h-10 w-10 rounded-xl bg-white text-xl font-bold text-[#0B3C5D] shadow"
            >
              -
            </button>
          </div>

          {pins.length === 0 ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-8 text-center">
              <div className="rounded-2xl bg-white/95 p-6 shadow">
                <p className="font-bold text-[#0B3C5D]">No matches here yet</p>
                <p className="mt-2 text-sm text-gray-600">
                  Try clearing the filters or searching another area.
                </p>
              </div>
            </div>
          ) : null}

          {clusters.map((cluster) => {
            const point = latLonToWorld(cluster.latitude, cluster.longitude, zoom);
            const left = point.x - centerWorld.x;
            const top = point.y - centerWorld.y;
            const primaryPin = cluster.pins[0];
            const isSelected = selectedCluster?.id === cluster.id;

            return (
              <button
                key={cluster.id}
                type="button"
                onClick={() => {
                  focusPin(primaryPin);
                  if (cluster.pins.length > 1) {
                    setZoom((currentZoom) => Math.min(currentZoom + 1, 14));
                  }
                }}
                style={{
                  left: `calc(50% + ${left}px)`,
                  top: `calc(50% + ${top}px)`,
                }}
                className={`absolute z-10 -translate-x-1/2 -translate-y-full rounded-full px-3 py-2 text-xs font-bold shadow-lg ring-4 ring-white/80 transition hover:scale-105 ${
                  isSelected
                    ? "bg-[#00A8A8] text-white"
                    : primaryPin.hasExactPin
                      ? "bg-[#0B3C5D] text-white"
                      : "bg-white text-[#0B3C5D]"
                }`}
                title={primaryPin.hasExactPin ? "Exact map pin" : "Area pin"}
              >
                {cluster.pins.length > 1
                  ? `${cluster.pins.length} places`
                  : primaryPin.category || "Listing"}
              </button>
            );
          })}
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

      <aside className="grid gap-4 lg:max-h-[730px] lg:overflow-y-auto">
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
            {selectedCluster && selectedCluster.pins.length > 1 ? (
              <div className="mt-4 rounded-xl bg-[#EEF7F6] p-3">
                <p className="text-sm font-bold text-[#0B3C5D]">
                  Same area
                </p>
                <div className="mt-2 grid gap-2">
                  {selectedCluster.pins.map((pin) => (
                    <button
                      key={pin.id}
                      type="button"
                      onClick={() => focusPin(pin)}
                      className="rounded-lg bg-white px-3 py-2 text-left text-sm font-semibold text-[#0B3C5D]"
                    >
                      {pin.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
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
            onClick={() => focusPin(pin)}
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
