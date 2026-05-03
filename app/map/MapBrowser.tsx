"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { MapListing } from "@/app/map/page";
import {
  appleDirectionsUrl,
  appleMapsUrl,
  distanceMiles,
  googleDirectionsUrl,
  googleMapsUrl,
} from "@/lib/map";

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

const areaBoundaryStyles: Record<
  string,
  { left: string; top: string; width: string; height: string; rotate: string }
> = {
  "West Bay": { left: "13%", top: "56%", width: "17%", height: "14%", rotate: "-10deg" },
  "West End": { left: "22%", top: "46%", width: "18%", height: "14%", rotate: "-12deg" },
  "Sandy Bay": { left: "34%", top: "38%", width: "18%", height: "13%", rotate: "-8deg" },
  "Coxen Hole": { left: "43%", top: "43%", width: "17%", height: "13%", rotate: "-7deg" },
  "French Harbour": { left: "58%", top: "38%", width: "22%", height: "14%", rotate: "-6deg" },
  "Oak Ridge": { left: "74%", top: "35%", width: "16%", height: "13%", rotate: "-4deg" },
  "Camp Bay": { left: "83%", top: "25%", width: "14%", height: "12%", rotate: "4deg" },
};

function formatPrice(price: number | null) {
  if (!price) return "Ask";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function pinLabel(pin: Pin) {
  if (pin.price) {
    return formatPrice(pin.price);
  }

  return pin.category || "Listing";
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

function readInitialMapState(listings: MapListing[]) {
  if (typeof window === "undefined") {
    return {
      category: "All",
      location: "All",
      search: "",
      selectedId: listings[0]?.id || "",
      center: roatanCenter,
      zoom: 12,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");
  const location = params.get("area") || "All";
  const search = params.get("search") || "";
  const selectedId = params.get("selected") || listings[0]?.id || "";
  const selectedListing = listings.find((listing) => listing.id === selectedId);
  const selectedPin = selectedListing ? listingToPin(selectedListing) : null;
  const requestedZoom = Number(params.get("zoom"));

  return {
    category: category && categories.includes(category) ? category : "All",
    location,
    search,
    selectedId,
    center: selectedPin
      ? { latitude: selectedPin.latitudeValue, longitude: selectedPin.longitudeValue }
      : location === "All"
        ? roatanCenter
        : findAreaPosition(location),
    zoom: zoomLevels.includes(requestedZoom) ? requestedZoom : 12,
  };
}

export default function MapBrowser({ listings }: { listings: MapListing[] }) {
  const initialMapState = useMemo(() => readInitialMapState(listings), [listings]);
  const [category, setCategory] = useState(initialMapState.category);
  const [location, setLocation] = useState(initialMapState.location);
  const [search, setSearch] = useState(initialMapState.search);
  const [selectedId, setSelectedId] = useState(initialMapState.selectedId);
  const [center, setCenter] = useState(initialMapState.center);
  const [zoom, setZoom] = useState(initialMapState.zoom);
  const [fullMap, setFullMap] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
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
          [
            ...areaButtons.filter((area) => area !== "All"),
            ...listings
              .map((listing) => listing.location)
              .filter((value): value is string => Boolean(value)),
          ],
        ),
      ).sort(),
    ],
    [listings],
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (category !== "All") params.set("category", category);
    if (location !== "All") params.set("area", location);
    if (search.trim()) params.set("search", search.trim());
    if (selectedId) params.set("selected", selectedId);
    if (zoom !== 12) params.set("zoom", String(zoom));

    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [category, location, search, selectedId, zoom]);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const searchValue = search.toLowerCase();
    return Array.from(
      new Set(
        [
          ...areaButtons,
          ...locations,
          ...categories,
          ...listings.map((listing) => listing.title),
        ].filter((item) => item.toLowerCase().includes(searchValue)),
      ),
    )
      .filter((item) => item !== "All")
      .slice(0, 6);
  }, [listings, locations, search]);

  const areaCounts = useMemo(() => {
    return Object.fromEntries(
      areaButtons.map((area) => {
        if (area === "All") {
          return [area, listings.length];
        }

        const normalizedArea = area.toLowerCase();
        const count = listings.filter((listing) =>
          (listing.location || "").toLowerCase().includes(normalizedArea),
        ).length;

        return [area, count];
      }),
    ) as Record<string, number>;
  }, [listings]);

  const filteredListings = useMemo(() => {
    const rows = listings.filter((listing) => {
        const matchesCategory =
          category === "All" || listing.category === category;
        const matchesLocation =
          location === "All" ||
          listing.location === location ||
          (listing.location || "").toLowerCase().includes(location.toLowerCase());
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
      });

    if (!userLocation) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const firstPin = listingToPin(a);
      const secondPin = listingToPin(b);
      return (
        distanceMiles(userLocation, {
          latitude: firstPin.latitudeValue,
          longitude: firstPin.longitudeValue,
        }) -
        distanceMiles(userLocation, {
          latitude: secondPin.latitudeValue,
          longitude: secondPin.longitudeValue,
        })
      );
    });
  }, [category, listings, location, search, userLocation]);

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

  function useNearMe() {
    if (!navigator.geolocation) {
      setLocationMessage("Your browser does not support location sharing.");
      return;
    }

    setLocationMessage("Finding your location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setUserLocation(coords);
        setCenter(coords);
        setZoom(13);
        setLocationMessage("Showing closest listings first.");
      },
      () => {
        setLocationMessage("Location permission was not allowed.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function pinDistanceLabel(pin: Pin) {
    if (!userLocation) return pin.hasExactPin ? "Exact pin" : "Area pin";
    const miles = distanceMiles(userLocation, {
      latitude: pin.latitudeValue,
      longitude: pin.longitudeValue,
    });
    const minutes = Math.max(1, Math.round((miles / 20) * 60));
    return `${miles.toFixed(1)} mi - about ${minutes} min`;
  }

  return (
    <section
      className={
        fullMap
          ? "fixed inset-0 z-50 grid gap-4 overflow-auto bg-[#071F2F] p-3 text-[#17324D] sm:p-5 lg:grid-cols-[1fr_420px]"
          : "grid gap-6 lg:grid-cols-[1fr_380px]"
      }
    >
      <div className="rounded-2xl border border-[#D6B56D]/35 bg-[#FFFDF7] p-4 shadow-2xl shadow-[#0B3C5D]/10 sm:p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 rounded-2xl bg-[#071F2F] p-4 text-white sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D6B56D]">
              Roatan atlas
            </p>
            <h2 className="mt-1 text-2xl font-bold">Explore by coast, cove, and crew</h2>
          </div>
          <button
            type="button"
            onClick={() => setFullMap((current) => !current)}
            className="min-h-11 rounded-xl border border-[#D6B56D]/50 px-4 text-sm font-semibold text-[#FFF6DA] hover:bg-white/10"
          >
            {fullMap ? "Close full map" : "Open full map"}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_150px_190px_auto]">
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search map"
              className="min-h-12 w-full rounded-xl border border-[#D6B56D]/35 bg-white px-4 outline-none focus:border-[#00A8A8]"
            />
            {suggestions.length > 0 ? (
              <div className="absolute left-0 right-0 top-14 z-40 rounded-xl bg-white p-2 shadow-xl ring-1 ring-black/5">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => {
                      setSearch(suggestion);
                      if (areaButtons.includes(suggestion)) {
                        focusArea(suggestion);
                      }
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[#0B3C5D] hover:bg-[#F7F3EA]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-h-12 rounded-xl border border-[#D6B56D]/35 bg-white px-4 outline-none focus:border-[#00A8A8]"
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
            className="min-h-12 rounded-xl border border-[#D6B56D]/35 bg-white px-4 outline-none focus:border-[#00A8A8]"
          >
            {locations.map((item) => (
              <option key={item} value={item}>
                {item === "All" ? "All locations" : item}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={useNearMe}
            className="min-h-12 rounded-xl bg-[#0B3C5D] px-4 text-sm font-semibold text-white shadow-lg shadow-[#0B3C5D]/15"
          >
            Near me
          </button>
        </div>
        {locationMessage ? (
          <p className="mt-3 rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] px-4 py-3 text-sm font-semibold text-[#0B3C5D]">
            {locationMessage}
          </p>
        ) : null}

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {areaButtons.map((area) => (
            <button
              key={area}
              type="button"
              onClick={() => focusArea(area)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
                location === area || (area === "All" && location === "All")
                  ? "bg-[#0B3C5D] text-white shadow-lg shadow-[#0B3C5D]/15"
                  : "border border-[#D6B56D]/25 bg-[#FFF8E8] text-[#0B3C5D]"
              }`}
            >
              {area}
              <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-xs text-[#0B3C5D]">
                {areaCounts[area] || 0}
              </span>
            </button>
          ))}
        </div>

        <div
          className={`relative mt-5 cursor-grab touch-none overflow-hidden rounded-2xl bg-[#98D1CA] shadow-inner ring-1 ring-[#071F2F]/10 active:cursor-grabbing ${
            fullMap ? "min-h-[calc(100vh-260px)]" : "min-h-[560px]"
          }`}
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
          <div className="absolute inset-0 bg-[#071F2F]/10" />
          <div className="pointer-events-none absolute inset-0 z-[1]">
            {Object.entries(areaBoundaryStyles).map(([area, style]) => (
              <span
                key={area}
                style={{
                  left: style.left,
                  top: style.top,
                  width: style.width,
                  height: style.height,
                  transform: `rotate(${style.rotate})`,
                }}
                className="absolute rounded-[2rem] border border-[#D6B56D]/70 bg-[#D6B56D]/10 shadow-[0_0_35px_rgba(214,181,109,0.35)]"
              >
                <span className="absolute -top-8 left-3 rounded-full bg-[#071F2F]/90 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#FFF6DA]">
                  {area}
                </span>
              </span>
            ))}
          </div>

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
          {userLocation ? (
            <div
              style={{
                left: `calc(50% + ${
                  latLonToWorld(userLocation.latitude, userLocation.longitude, zoom)
                    .x - centerWorld.x
                }px)`,
                top: `calc(50% + ${
                  latLonToWorld(userLocation.latitude, userLocation.longitude, zoom)
                    .y - centerWorld.y
                }px)`,
              }}
              className="absolute z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600 ring-4 ring-white shadow"
              title="Your location"
            />
          ) : null}

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
                  : pinLabel(primaryPin)}
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
          <article className="sticky bottom-3 z-30 rounded-2xl bg-white p-5 shadow ring-2 ring-[#00A8A8]/25 lg:static">
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
                <p className="text-gray-500">
                  {userLocation ? "Distance" : "Price"}
                </p>
                <p className="font-bold text-[#0B3C5D]">
                  {userLocation
                    ? pinDistanceLabel(selectedPin)
                    : formatPrice(selectedPin.price)}
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
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={(userLocation ? googleDirectionsUrl : googleMapsUrl)({
                  latitude: selectedPin.latitudeValue,
                  longitude: selectedPin.longitudeValue,
                  location: selectedPin.location,
                  title: selectedPin.title,
                  originLatitude: userLocation?.latitude,
                  originLongitude: userLocation?.longitude,
                })}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#F7F3EA] px-4 py-3 text-center text-sm font-semibold text-[#0B3C5D]"
              >
                {userLocation ? "Directions" : "Google Maps"}
              </a>
              <a
                href={(userLocation ? appleDirectionsUrl : appleMapsUrl)({
                  latitude: selectedPin.latitudeValue,
                  longitude: selectedPin.longitudeValue,
                  location: selectedPin.location,
                  title: selectedPin.title,
                  originLatitude: userLocation?.latitude,
                  originLongitude: userLocation?.longitude,
                })}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#F7F3EA] px-4 py-3 text-center text-sm font-semibold text-[#0B3C5D]"
              >
                Apple Maps
              </a>
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
                  {pin.location || "Roatan"} -{" "}
                  {userLocation ? pinDistanceLabel(pin) : formatPrice(pin.price)}
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
