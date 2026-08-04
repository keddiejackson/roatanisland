"use client";

import Image from "next/image";
import Link from "next/link";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  CircleMarker,
  LayerGroup,
  Map as LeafletMap,
  Marker,
  Polyline,
} from "leaflet";
import type { MapListing } from "@/app/map/page";
import {
  getListingTrustBadges,
  listingMatchesAvailability,
} from "@/lib/marketplace-upgrade";
import type { ConciergePlan } from "@/lib/guest-concierge";
import {
  appleDirectionsUrl,
  appleMapsUrl,
  distanceMiles,
  googleDirectionsUrl,
  googleMapsUrl,
} from "@/lib/map";
import { supabase } from "@/lib/supabase";

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

type MapCollection = {
  id: string;
  label: string;
  blurb: string;
  category: string;
  area: string;
  keywords: string[];
  center: { latitude: number; longitude: number };
  zoom: number;
};

type PickupPoint = {
  id: string;
  label: string;
  kind: string;
  latitude: number;
  longitude: number;
  note: string;
};

type MapConciergeMode = {
  id: string;
  label: string;
  eyebrow: string;
  description: string;
  pickupId: string;
  collectionId: string;
  category: string;
  area: string;
  search: string;
  center: { latitude: number; longitude: number };
  zoom: number;
};

const luxuryLayers = [
  "All",
  "Tours",
  "Hotels",
  "Transport",
  "Food",
  "Beaches",
  "Private Charters",
];
const zoomLevels = [11, 12, 13, 14, 15, 16, 17, 18, 19];
const maxZoom = zoomLevels[zoomLevels.length - 1];
const roatanCenter = { latitude: 16.34, longitude: -86.48 };

const areaPositions: Record<string, { latitude: number; longitude: number }> = {
  "west bay": { latitude: 16.274, longitude: -86.599 },
  "west end": { latitude: 16.305, longitude: -86.594 },
  sandy: { latitude: 16.329, longitude: -86.564 },
  "sandy bay": { latitude: 16.329, longitude: -86.564 },
  coxen: { latitude: 16.317, longitude: -86.536 },
  "coxen hole": { latitude: 16.317, longitude: -86.536 },
  "isla tropicale": { latitude: 16.325, longitude: -86.503 },
  "isla tropicale cruise port": { latitude: 16.325, longitude: -86.503 },
  "dixon cove": { latitude: 16.325, longitude: -86.503 },
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
  "Isla Tropicale",
  "French Harbour",
  "Oak Ridge",
  "Camp Bay",
];

const pickupPoints: PickupPoint[] = [
  {
    id: "airport",
    label: "Roatan Airport",
    kind: "Airport",
    latitude: 16.3169,
    longitude: -86.5229,
    note: "Best for arrival-day plans and quick transfers after landing.",
  },
  {
    id: "coxen-hole",
    label: "Port of Roatan / Coxen Hole",
    kind: "Cruise port",
    latitude: 16.317,
    longitude: -86.536,
    note: "Good for visitors arriving at the Port of Roatan in Coxen Hole.",
  },
  {
    id: "isla-tropicale",
    label: "Isla Tropicale",
    kind: "Cruise port",
    latitude: 16.325,
    longitude: -86.503,
    note: "Good for visitors arriving at the Isla Tropicale cruise terminal in Dixon Cove.",
  },
  {
    id: "west-bay",
    label: "West Bay",
    kind: "Hotel area",
    latitude: 16.274,
    longitude: -86.599,
    note: "Useful for beach resorts and guests staying around West Bay.",
  },
  {
    id: "west-end",
    label: "West End",
    kind: "Hotel area",
    latitude: 16.305,
    longitude: -86.594,
    note: "Useful for West End stays, restaurants, dive shops, and nightlife.",
  },
  {
    id: "french-harbour",
    label: "French Harbour",
    kind: "Hotel area",
    latitude: 16.354,
    longitude: -86.455,
    note: "Helpful for mid-island and east-side pickup planning.",
  },
];

const mapCollections: MapCollection[] = [
  {
    id: "cruise-port",
    label: "Cruise Port Friendly",
    blurb: "Shorter-distance picks from Coxen Hole or Isla Tropicale for guests watching the ship clock.",
    category: "All",
    area: "Coxen Hole",
    keywords: ["cruise", "port", "coxen", "isla", "tropicale", "dixon", "west bay", "sandy"],
    center: { latitude: 16.315, longitude: -86.548 },
    zoom: 13,
  },
  {
    id: "sunset",
    label: "Best Sunset Spots",
    blurb: "West-facing tours, beach time, and private charters built around golden-hour plans.",
    category: "All",
    area: "West End",
    keywords: ["sunset", "west end", "west bay", "boat", "charter", "beach"],
    center: { latitude: 16.296, longitude: -86.596 },
    zoom: 13,
  },
  {
    id: "west-bay",
    label: "West Bay Beach Day",
    blurb: "Easy beach-day planning around West Bay with tours, stays, food, and transport close by.",
    category: "All",
    area: "West Bay",
    keywords: ["west bay", "beach", "snorkel", "resort", "food"],
    center: { latitude: 16.274, longitude: -86.599 },
    zoom: 13,
  },
  {
    id: "family",
    label: "Family Friendly",
    blurb: "Lower-friction options for groups, kids, and visitors who want a smooth island day.",
    category: "All",
    area: "All",
    keywords: ["family", "kids", "private", "beach", "transport", "snorkel"],
    center: roatanCenter,
    zoom: 12,
  },
  {
    id: "private-charter",
    label: "Private Charter Day",
    blurb: "Premium boat, driver, and custom-day style listings for a more private Roatan plan.",
    category: "Private Charters",
    area: "All",
    keywords: ["private", "charter", "boat", "driver", "custom", "luxury"],
    center: roatanCenter,
    zoom: 12,
  },
  {
    id: "east-end",
    label: "East End Adventure",
    blurb: "A guided look east toward French Harbour, Oak Ridge, Punta Gorda, and Camp Bay.",
    category: "All",
    area: "French Harbour",
    keywords: ["east", "french", "oak ridge", "camp bay", "punta gorda", "adventure"],
    center: { latitude: 16.385, longitude: -86.39 },
    zoom: 12,
  },
];

const mapConciergeModes: MapConciergeMode[] = [
  {
    id: "cruise-day",
    label: "Cruise day",
    eyebrow: "Port timing",
    description:
      "Focuses the map around cruise-friendly areas with pickup context already set.",
    pickupId: "coxen-hole",
    collectionId: "cruise-port",
    category: "All",
    area: "Coxen Hole",
    search: "",
    center: { latitude: 16.315, longitude: -86.548 },
    zoom: 13,
  },
  {
    id: "airport-arrival",
    label: "Airport arrival",
    eyebrow: "Landing day",
    description:
      "Starts from the airport and brings transport, easy transfers, and nearby plans forward.",
    pickupId: "airport",
    collectionId: "",
    category: "All",
    area: "All",
    search: "",
    center: { latitude: 16.3169, longitude: -86.5229 },
    zoom: 13,
  },
  {
    id: "west-bay-day",
    label: "West Bay beach day",
    eyebrow: "Beach first",
    description:
      "Centers the map on West Bay for beach time, nearby food, charters, and easy pickups.",
    pickupId: "west-bay",
    collectionId: "west-bay",
    category: "All",
    area: "West Bay",
    search: "",
    center: { latitude: 16.274, longitude: -86.599 },
    zoom: 13,
  },
  {
    id: "east-end-adventure",
    label: "East End adventure",
    eyebrow: "Longer route",
    description:
      "Sets up an east-side view for French Harbour, Oak Ridge, Camp Bay, and custom days.",
    pickupId: "french-harbour",
    collectionId: "east-end",
    category: "All",
    area: "French Harbour",
    search: "",
    center: { latitude: 16.385, longitude: -86.39 },
    zoom: 12,
  },
];

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

function driveEstimateLabel(miles: number) {
  const minutes = Math.max(3, Math.round((miles / 18) * 60));
  return `${miles.toFixed(1)} mi - about ${minutes} min`;
}

function pickupFitLabel(miles: number) {
  if (miles <= 4) return "Easy pickup";
  if (miles <= 10) return "Good pickup range";
  if (miles <= 18) return "Plan extra drive time";
  return "Longer island transfer";
}

function findAreaPosition(location: string | null) {
  const normalized = (location || "roatan").toLowerCase();
  const match = Object.entries(areaPositions).find(([area]) =>
    normalized.includes(area),
  );

  return match?.[1] || areaPositions.roatan;
}

function collectionMatches(listing: MapListing, collection: MapCollection) {
  const listingText = [
    listing.title,
    listing.location || "",
    listing.category || "",
    listing.description || "",
  ]
    .join(" ")
    .toLowerCase();
  const matchesCategory =
    collection.category === "All" || listing.category === collection.category;
  const matchesArea =
    collection.area === "All" ||
    (listing.location || "").toLowerCase().includes(collection.area.toLowerCase());
  const matchesKeyword = collection.keywords.some((keyword) =>
    listingText.includes(keyword),
  );

  return matchesCategory && (matchesArea || matchesKeyword);
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

function clusterPins(pins: Pin[], zoom: number) {
  const clusters: Cluster[] = [];
  const threshold =
    zoom >= 17 ? 16 : zoom >= 15 ? 24 : zoom >= 14 ? 34 : zoom >= 13 ? 44 : 58;

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

type LeafletRuntime = typeof import("leaflet");

type LeafletLayerStore = {
  clusters: LayerGroup;
  route: LayerGroup;
  routeStops: LayerGroup;
  points: LayerGroup;
};

type MapPoint = { latitude: number; longitude: number };

type LeafletMapSurfaceProps = {
  center: MapPoint;
  zoom: number;
  fullMap: boolean;
  clusters: Cluster[];
  selectedClusterId: string;
  hoveredId: string;
  savedTripPins: Pin[];
  selectedPickup: PickupPoint | null;
  userLocation: MapPoint | null;
  onViewChange: (center: MapPoint, zoom: number) => void;
  onClusterClick: (cluster: Cluster) => void;
  onPinFocus: (pin: Pin) => void;
  onHoverPin: (pinId: string) => void;
  onExactZoom: () => void;
  children?: ReactNode;
};

const leafletTileUrl =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
const leafletTileAttribution =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return character;
    }
  });
}

function leafletPinHtml(label: string, state: string) {
  return `<span class="leaflet-roatan-pin leaflet-roatan-pin--${state}">${escapeHtml(
    label,
  )}</span>`;
}

function leafletRouteStopHtml(index: number) {
  return `<span class="leaflet-roatan-route-stop">${index}</span>`;
}

function leafletPickupHtml(label: string) {
  return `<span class="leaflet-roatan-pickup">${escapeHtml(label)}</span>`;
}

function LeafletMapSurface({
  center,
  zoom,
  fullMap,
  clusters,
  selectedClusterId,
  hoveredId,
  savedTripPins,
  selectedPickup,
  userLocation,
  onViewChange,
  onClusterClick,
  onPinFocus,
  onHoverPin,
  onExactZoom,
  children,
}: LeafletMapSurfaceProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletRuntime | null>(null);
  const layersRef = useRef<LeafletLayerStore | null>(null);
  const initialCenterRef = useRef(center);
  const initialZoomRef = useRef(zoom);
  const onViewChangeRef = useRef(onViewChange);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);

  useEffect(() => {
    let cancelled = false;

    async function loadLeaflet() {
      const Leaflet = await import("leaflet");

      if (cancelled || !mapElementRef.current) return;

      leafletRef.current = Leaflet;
      const map = Leaflet.map(mapElementRef.current, {
        attributionControl: true,
        maxZoom,
        minZoom: zoomLevels[0],
        scrollWheelZoom: true,
        zoomControl: false,
      }).setView(
        [initialCenterRef.current.latitude, initialCenterRef.current.longitude],
        initialZoomRef.current,
      );

      Leaflet.tileLayer(leafletTileUrl, {
        attribution: leafletTileAttribution,
        maxZoom,
        detectRetina: true,
        subdomains: "abcd",
      }).addTo(map);

      layersRef.current = {
        clusters: Leaflet.layerGroup().addTo(map),
        route: Leaflet.layerGroup().addTo(map),
        routeStops: Leaflet.layerGroup().addTo(map),
        points: Leaflet.layerGroup().addTo(map),
      };

      const handleViewChange = () => {
        const nextCenter = map.getCenter();
        onViewChangeRef.current(
          { latitude: nextCenter.lat, longitude: nextCenter.lng },
          map.getZoom(),
        );
      };

      map.on("moveend", handleViewChange);
      map.on("zoomend", handleViewChange);
      mapRef.current = map;
      setMapReady(true);

      window.setTimeout(() => map.invalidateSize(), 0);
    }

    loadLeaflet();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const currentCenter = map.getCenter();
    const centerChanged =
      Math.abs(currentCenter.lat - center.latitude) > 0.00001 ||
      Math.abs(currentCenter.lng - center.longitude) > 0.00001;

    if (centerChanged || map.getZoom() !== zoom) {
      map.setView([center.latitude, center.longitude], zoom, { animate: true });
    }
  }, [center.latitude, center.longitude, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    window.setTimeout(() => map.invalidateSize(), 80);
  }, [fullMap]);

  useEffect(() => {
    const Leaflet = leafletRef.current;
    const layers = layersRef.current;
    if (!mapReady || !Leaflet || !layers) return;

    layers.clusters.clearLayers();
    layers.route.clearLayers();
    layers.routeStops.clearLayers();
    layers.points.clearLayers();

    if (savedTripPins.length > 1) {
      const routeLine: Polyline = Leaflet.polyline(
        savedTripPins.map((pin) => [pin.latitudeValue, pin.longitudeValue]),
        {
          color: "#D6B56D",
          lineCap: "round",
          lineJoin: "round",
          opacity: 0.92,
          weight: 5,
        },
      );
      routeLine.addTo(layers.route);
    }

    clusters.forEach((cluster) => {
      const primaryPin = cluster.pins[0];
      const selected = selectedClusterId === cluster.id;
      const hovered = cluster.pins.some((pin) => pin.id === hoveredId);
      const state = selected
        ? "selected"
        : hovered
          ? "hovered"
          : primaryPin.hasExactPin
            ? "exact"
            : "area";
      const label =
        cluster.pins.length > 1
          ? `${cluster.pins.length} places`
          : pinLabel(primaryPin);
      const marker: Marker = Leaflet.marker([cluster.latitude, cluster.longitude], {
        icon: Leaflet.divIcon({
          className: "leaflet-roatan-div-icon",
          html: leafletPinHtml(label, state),
          iconAnchor: [58, 36],
          iconSize: [116, 36],
        }),
        keyboard: true,
        title: primaryPin.hasExactPin ? "Exact map pin" : "Area pin",
      });

      marker.on("click", () => onClusterClick(cluster));
      marker.on("mouseover", () => onHoverPin(primaryPin.id));
      marker.on("mouseout", () => onHoverPin(""));
      marker.addTo(layers.clusters);
    });

    savedTripPins.forEach((pin, index) => {
      const marker: Marker = Leaflet.marker(
        [pin.latitudeValue, pin.longitudeValue],
        {
          icon: Leaflet.divIcon({
            className: "leaflet-roatan-div-icon",
            html: leafletRouteStopHtml(index + 1),
            iconAnchor: [16, 16],
            iconSize: [32, 32],
          }),
          keyboard: true,
          title: `Stop ${index + 1}: ${pin.title}`,
        },
      );

      marker.on("click", () => onPinFocus(pin));
      marker.addTo(layers.routeStops);
    });

    if (selectedPickup) {
      const marker: Marker = Leaflet.marker(
        [selectedPickup.latitude, selectedPickup.longitude],
        {
          icon: Leaflet.divIcon({
            className: "leaflet-roatan-div-icon",
            html: leafletPickupHtml("Pickup"),
            iconAnchor: [48, 34],
            iconSize: [96, 34],
          }),
          keyboard: true,
          title: selectedPickup.label,
        },
      );
      marker.addTo(layers.points);
    }

    if (userLocation) {
      const userDot: CircleMarker = Leaflet.circleMarker(
        [userLocation.latitude, userLocation.longitude],
        {
          color: "#ffffff",
          fillColor: "#2563eb",
          fillOpacity: 1,
          radius: 8,
          weight: 4,
        },
      );
      userDot.bindTooltip("Your location");
      userDot.addTo(layers.points);
    }
  }, [
    clusters,
    hoveredId,
    mapReady,
    onClusterClick,
    onHoverPin,
    onPinFocus,
    savedTripPins,
    selectedClusterId,
    selectedPickup,
    userLocation,
  ]);

  return (
    <div
      className={`relative mt-5 overflow-hidden rounded-2xl bg-[#98D1CA] shadow-inner ring-1 ring-[#071F2F]/10 ${
        fullMap ? "min-h-[calc(100vh-220px)]" : "min-h-[460px] sm:min-h-[560px]"
      }`}
    >
      <div
        ref={mapElementRef}
        role="application"
        aria-label="Interactive Roatan day map. Drag to pan, pinch or use the controls to zoom."
        tabIndex={0}
        className="absolute inset-0 leaflet-container leaflet-roatan-map"
      />

      {!mapReady ? (
        <div className="absolute inset-0 z-[450] grid place-items-center bg-[#98D1CA] text-sm font-black uppercase tracking-[0.16em] text-[#0B3C5D]">
          Loading map
        </div>
      ) : null}

      <div className="absolute left-4 top-4 z-[650] grid gap-2">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="h-10 w-10 rounded-xl bg-white text-xl font-bold text-[#0B3C5D] shadow"
          aria-label="Zoom map in"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="h-10 w-10 rounded-xl bg-white text-xl font-bold text-[#0B3C5D] shadow"
          aria-label="Zoom map out"
        >
          -
        </button>
        <button
          type="button"
          onClick={onExactZoom}
          aria-label="Zoom to maximum precision"
          className="rounded-xl bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#0B3C5D] shadow"
        >
          Exact
        </button>
      </div>

      {children}
    </div>
  );
}

function readSavedTripIds(listings: MapListing[]) {
  if (typeof window === "undefined") return [];

  const validIds = new Set(listings.map((listing) => listing.id));
  const params = new URLSearchParams(window.location.search);
  const tripFromUrl = params
    .get("trip")
    ?.split(",")
    .map((id) => id.trim())
    .filter((id) => validIds.has(id));

  if (tripFromUrl?.length) {
    return Array.from(new Set(tripFromUrl)).slice(0, 8);
  }

  try {
    const saved = JSON.parse(localStorage.getItem("roatan-trip-plan") || "[]");
    if (!Array.isArray(saved)) return [];

    return Array.from(
      new Set(
        saved
          .filter((id): id is string => typeof id === "string")
          .filter((id) => validIds.has(id)),
      ),
    ).slice(0, 8);
  } catch {
    return [];
  }
}

function defaultMapState(listings: MapListing[]) {
  return {
    category: "All",
    location: "All",
    search: "",
    selectedId: listings[0]?.id || "",
    center: roatanCenter,
    zoom: 12,
    modeId: "",
    collectionId: "",
    tripIds: [] as string[],
    pickupId: "",
    date: "",
    time: "",
    guests: "",
    availableOnly: false,
  };
}

function readBrowserMapState(listings: MapListing[]) {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");
  const location = params.get("area") || "All";
  const search = params.get("search") || "";
  const collectionId = params.get("collection") || "";
  const collection = mapCollections.find((item) => item.id === collectionId);
  const modeId = params.get("mode") || "";
  const mode = mapConciergeModes.find((item) => item.id === modeId);
  const pickupId = params.get("pickup") || "";
  const date = params.get("date") || "";
  const time = params.get("time") || "";
  const guests = params.get("guests") || "";
  const availableOnly = params.get("available") === "1";
  const selectedId = params.get("selected") || listings[0]?.id || "";
  const selectedListing = listings.find((listing) => listing.id === selectedId);
  const selectedPin = selectedListing ? listingToPin(selectedListing) : null;
  const requestedZoom = Number(params.get("zoom"));

  return {
    category:
      mode?.category ||
      (category && luxuryLayers.includes(category) ? category : "All"),
    location: mode?.area || collection?.area || location,
    search: mode?.search || search,
    selectedId,
    center: selectedPin
      ? { latitude: selectedPin.latitudeValue, longitude: selectedPin.longitudeValue }
      : mode
        ? mode.center
      : collection
        ? collection.center
      : location === "All"
        ? roatanCenter
        : findAreaPosition(location),
    zoom: mode?.zoom || (zoomLevels.includes(requestedZoom) ? requestedZoom : 12),
    modeId: mode?.id || "",
    collectionId: mode?.collectionId || collection?.id || "",
    tripIds: readSavedTripIds(listings),
    pickupId:
      mode?.pickupId ||
      (pickupPoints.some((point) => point.id === pickupId) ? pickupId : ""),
    date,
    time,
    guests,
    availableOnly,
  };
}

export default function MapBrowser({ listings }: { listings: MapListing[] }) {
  const initialMapState = useMemo(() => defaultMapState(listings), [listings]);
  const [category, setCategory] = useState(initialMapState.category);
  const [location, setLocation] = useState(initialMapState.location);
  const [search, setSearch] = useState(initialMapState.search);
  const [selectedId, setSelectedId] = useState(initialMapState.selectedId);
  const [center, setCenter] = useState(initialMapState.center);
  const [zoom, setZoom] = useState(initialMapState.zoom);
  const [activeModeId, setActiveModeId] = useState(initialMapState.modeId);
  const [activeCollectionId, setActiveCollectionId] = useState(
    initialMapState.collectionId,
  );
  const [savedTripIds, setSavedTripIds] = useState<string[]>(
    initialMapState.tripIds,
  );
  const [tripMessage, setTripMessage] = useState("");
  const [pickupId, setPickupId] = useState(initialMapState.pickupId);
  const [dateFilter, setDateFilter] = useState(initialMapState.date);
  const [timeFilter, setTimeFilter] = useState(initialMapState.time);
  const [guestFilter, setGuestFilter] = useState(initialMapState.guests);
  const [availableOnly, setAvailableOnly] = useState(
    initialMapState.availableOnly,
  );
  const [fullMap, setFullMap] = useState(false);
  const [browserStateLoaded, setBrowserStateLoaded] = useState(false);
  const [hoveredId, setHoveredId] = useState("");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [savingTripPlan, setSavingTripPlan] = useState(false);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const listingRefs = useRef<Record<string, HTMLButtonElement | null>>({});

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
    startTransition(() => {
      const browserMapState = readBrowserMapState(listings);
      setCategory(browserMapState.category);
      setLocation(browserMapState.location);
      setSearch(browserMapState.search);
      setSelectedId(browserMapState.selectedId);
      setCenter(browserMapState.center);
      setZoom(browserMapState.zoom);
      setActiveModeId(browserMapState.modeId);
      setActiveCollectionId(browserMapState.collectionId);
      setSavedTripIds(browserMapState.tripIds);
      setPickupId(browserMapState.pickupId);
      setDateFilter(browserMapState.date);
      setTimeFilter(browserMapState.time);
      setGuestFilter(browserMapState.guests);
      setAvailableOnly(browserMapState.availableOnly);
      setBrowserStateLoaded(true);
    });
  }, [listings]);

  useEffect(() => {
    if (!browserStateLoaded) return;

    const params = new URLSearchParams();
    if (activeModeId) params.set("mode", activeModeId);
    if (activeCollectionId) params.set("collection", activeCollectionId);
    if (category !== "All") params.set("category", category);
    if (location !== "All") params.set("area", location);
    if (search.trim()) params.set("search", search.trim());
    if (selectedId) params.set("selected", selectedId);
    if (zoom !== 12) params.set("zoom", String(zoom));
    if (savedTripIds.length > 0) params.set("trip", savedTripIds.join(","));
    if (pickupId) params.set("pickup", pickupId);
    if (dateFilter) params.set("date", dateFilter);
    if (timeFilter) params.set("time", timeFilter);
    if (guestFilter) params.set("guests", guestFilter);
    if (availableOnly) params.set("available", "1");

    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [
    activeCollectionId,
    activeModeId,
    browserStateLoaded,
    category,
    dateFilter,
    availableOnly,
    guestFilter,
    location,
    pickupId,
    savedTripIds,
    search,
    selectedId,
    timeFilter,
    zoom,
  ]);

  useEffect(() => {
    if (!browserStateLoaded) return;

    localStorage.setItem("roatan-trip-plan", JSON.stringify(savedTripIds));
    window.dispatchEvent(new Event("roatan-trip-plan-change"));
  }, [browserStateLoaded, savedTripIds]);

  const suggestions = useMemo(() => {
    if (!search.trim()) return [];
    const searchValue = search.toLowerCase();
    return Array.from(
      new Set(
        [
          ...areaButtons,
          ...locations,
          ...luxuryLayers,
          ...listings.map((listing) => listing.title),
        ].filter((item) => item.toLowerCase().includes(searchValue)),
      ),
    )
      .filter((item) => item !== "All")
      .slice(0, 6);
  }, [listings, locations, search]);

  const activeCollection =
    mapCollections.find((collection) => collection.id === activeCollectionId) ||
    null;
  const activeConciergeMode =
    mapConciergeModes.find((mode) => mode.id === activeModeId) || null;
  const selectedPickup =
    pickupPoints.find((point) => point.id === pickupId) || null;
  const directionsOrigin = userLocation || selectedPickup;
  const collectionCounts = useMemo(() => {
    return Object.fromEntries(
      mapCollections.map((collection) => [
        collection.id,
        listings.filter((listing) => collectionMatches(listing, collection)).length,
      ]),
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

        const matchesCollection = activeCollection
          ? collectionMatches(listing, activeCollection)
          : true;

        const matchesAvailability = listingMatchesAvailability(listing, {
          date: dateFilter,
          time: timeFilter,
          guests: guestFilter,
          availableOnly,
        });

        return (
          matchesCategory &&
          matchesLocation &&
          matchesSearch &&
          matchesCollection &&
          matchesAvailability
        );
      });

    if (selectedPickup) {
      return [...rows].sort((a, b) => {
        const firstPin = listingToPin(a);
        const secondPin = listingToPin(b);
        return (
          distanceMiles(selectedPickup, {
            latitude: firstPin.latitudeValue,
            longitude: firstPin.longitudeValue,
          }) -
          distanceMiles(selectedPickup, {
            latitude: secondPin.latitudeValue,
            longitude: secondPin.longitudeValue,
          })
        );
      });
    }

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
  }, [
    activeCollection,
    category,
    dateFilter,
    availableOnly,
    guestFilter,
    listings,
    location,
    search,
    selectedPickup,
    timeFilter,
    userLocation,
  ]);

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
  const savedTripPins = useMemo(
    () =>
      savedTripIds
        .map((id) => listings.find((listing) => listing.id === id))
        .filter((listing): listing is MapListing => Boolean(listing))
        .map((listing) => listingToPin(listing)),
    [listings, savedTripIds],
  );
  const tripDistanceMiles = useMemo(() => {
    return savedTripPins.reduce((total, pin, index) => {
      const previousPin = savedTripPins[index - 1];
      if (!previousPin) return total;

      return (
        total +
        distanceMiles(
          {
            latitude: previousPin.latitudeValue,
            longitude: previousPin.longitudeValue,
          },
          { latitude: pin.latitudeValue, longitude: pin.longitudeValue },
        )
      );
    }, 0);
  }, [savedTripPins]);
  const nearbyPins = useMemo(() => {
    if (!selectedPin) return [];

    return pins
      .filter((pin) => pin.id !== selectedPin.id)
      .map((pin) => ({
        pin,
        miles: distanceMiles(
          {
            latitude: selectedPin.latitudeValue,
            longitude: selectedPin.longitudeValue,
          },
          { latitude: pin.latitudeValue, longitude: pin.longitudeValue },
        ),
      }))
      .sort((a, b) => a.miles - b.miles)
      .slice(0, 3);
  }, [pins, selectedPin]);
  const routeReadinessItems = [
    {
      label: "Pickup",
      done: Boolean(selectedPickup),
      detail: selectedPickup?.label || "Choose pickup first",
    },
    {
      label: "Stops",
      done: savedTripPins.length > 0,
      detail:
        savedTripPins.length > 0
          ? `${savedTripPins.length} saved stop${savedTripPins.length === 1 ? "" : "s"}`
          : "Save a stop",
    },
    {
      label: "Date",
      done: Boolean(dateFilter),
      detail: dateFilter || "Add travel date",
    },
    {
      label: "Group",
      done: Boolean(guestFilter),
      detail: guestFilter ? `${guestFilter} guest${guestFilter === "1" ? "" : "s"}` : "Add guests",
    },
  ];
  const routeReadyCount = routeReadinessItems.filter((item) => item.done).length;
  const bestNextStep = !selectedPickup
    ? "Choose pickup first"
    : savedTripPins.length === 0
      ? "Save your first stop"
      : !dateFilter
        ? "Add travel date"
        : !guestFilter
          ? "Add guest count"
          : "Book first stop";

  useEffect(() => {
    if (!selectedId) return;

    listingRefs.current[selectedId]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedId]);

  function focusArea(area: string) {
    setActiveModeId("");
    setActiveCollectionId("");
    setLocation(area);
    const nextCenter = area === "All" ? roatanCenter : findAreaPosition(area);
    setCenter(nextCenter);
    setZoom(area === "All" ? 12 : 13);
  }

  const focusPin = useCallback((pin: Pin) => {
    setSelectedId(pin.id);
    setMobileDrawerOpen(true);
    setCenter({ latitude: pin.latitudeValue, longitude: pin.longitudeValue });
    setZoom((currentZoom) => Math.max(currentZoom, 13));
  }, []);

  function applyCollection(collection: MapCollection) {
    setActiveModeId("");
    setActiveCollectionId(collection.id);
    setCategory(collection.category);
    setLocation(collection.area);
    setSearch("");
    setCenter(collection.center);
    setZoom(collection.zoom);
    setSelectedId("");
  }

  function clearCollection() {
    setActiveModeId("");
    setActiveCollectionId("");
    setCategory("All");
    setLocation("All");
    setSearch("");
    setCenter(roatanCenter);
    setZoom(12);
  }

  function applyMapConciergeMode(mode: MapConciergeMode) {
    setActiveModeId(mode.id);
    setActiveCollectionId(mode.collectionId);
    setCategory(mode.category);
    setLocation(mode.area);
    setSearch(mode.search);
    setPickupId(mode.pickupId);
    setCenter(mode.center);
    setZoom(mode.zoom);
    setSelectedId("");
    setLocationMessage(`${mode.label} mode is ready.`);
  }

  function toggleTripStop(pin: Pin) {
    setTripMessage("");
    if (savedTripIds.includes(pin.id)) {
      setSavedTripIds((currentIds) => currentIds.filter((id) => id !== pin.id));
      return;
    }

    if (savedTripIds.length >= 8) {
      setTripMessage("Trip plan can hold up to 8 stops.");
      return;
    }

    setSavedTripIds((currentIds) => [...currentIds, pin.id]);
  }

  function moveTripStop(pinId: string, direction: -1 | 1) {
    setSavedTripIds((currentIds) => {
      const currentIndex = currentIds.indexOf(pinId);
      const nextIndex = currentIndex + direction;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= currentIds.length) {
        return currentIds;
      }

      const nextIds = [...currentIds];
      [nextIds[currentIndex], nextIds[nextIndex]] = [
        nextIds[nextIndex],
        nextIds[currentIndex],
      ];
      return nextIds;
    });
  }

  async function shareTripPlan() {
    if (savedTripIds.length === 0) {
      setTripMessage("Save at least one place first.");
      return;
    }

    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setTripMessage("Trip link copied.");
    } catch {
      setTripMessage(url);
    }
  }

  async function saveTripToDashboard() {
    if (savedTripPins.length === 0) {
      setTripMessage("Save at least one place first.");
      return;
    }

    setSavingTripPlan(true);
    const plan: ConciergePlan = {
      id: `map-plan-${Date.now()}`,
      name: `Roatan map plan (${savedTripPins.length} stops)`,
      pickupArea: selectedPickup?.label || location,
      arrivalType: selectedPickup?.kind || activeConciergeMode?.label || "Map plan",
      stops: savedTripPins.map((pin, index) => ({
        listingId: pin.id,
        title: pin.title,
        timeBlock: ["Morning", "Midday", "Afternoon", "Sunset"][index] || "Flexible",
        note: pin.location || pin.category || "",
      })),
    };

    try {
      const saved = JSON.parse(localStorage.getItem("roatan-concierge-plans") || "[]");
      const plans = Array.isArray(saved) ? (saved as ConciergePlan[]) : [];
      localStorage.setItem(
        "roatan-concierge-plans",
        JSON.stringify([plan, ...plans].slice(0, 12)),
      );
    } catch {
      setSavingTripPlan(false);
      setTripMessage("Unable to save this plan in your browser.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setSavingTripPlan(false);
      setTripMessage("Saved in this browser. Sign in to keep it across devices.");
      return;
    }

    const response = await fetch("/api/account/trip-plans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...plan,
        tripDate: dateFilter,
        tripTime: timeFilter,
        guestCount: guestFilter,
        source: "map",
        stops: savedTripPins.map((pin, index) => ({
          listingId: pin.id,
          title: pin.title,
          timeBlock:
            ["Morning", "Midday", "Afternoon", "Sunset"][index] || "Flexible",
          note: pin.location || pin.category || "",
          location: pin.location || "",
          category: pin.category || "",
          price: pin.price,
        })),
      }),
    });
    const result = await response.json();
    setSavingTripPlan(false);

    if (!response.ok) {
      setTripMessage(result.error || "Saved in this browser, but not your account yet.");
      return;
    }

    setTripMessage("Saved to your guest dashboard.");
  }

  function useNearMe() {
    setActiveModeId("");
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
    if (selectedPickup) {
      const miles = distanceMiles(selectedPickup, {
        latitude: pin.latitudeValue,
        longitude: pin.longitudeValue,
      });
      return driveEstimateLabel(miles);
    }

    if (!userLocation) return pin.hasExactPin ? "Exact pin" : "Area pin";
    const miles = distanceMiles(userLocation, {
      latitude: pin.latitudeValue,
      longitude: pin.longitudeValue,
    });
    return driveEstimateLabel(miles);
  }

  function pickupNoteForPin(pin: Pin) {
    if (!selectedPickup) return "";

    const miles = distanceMiles(selectedPickup, {
      latitude: pin.latitudeValue,
      longitude: pin.longitudeValue,
    });

    return `${pickupFitLabel(miles)} from ${selectedPickup.label}.`;
  }

  function bookingUrl(listingId: string) {
    const params = new URLSearchParams({ listing: listingId });
    if (dateFilter) params.set("date", dateFilter);
    if (timeFilter) params.set("time", timeFilter);
    if (guestFilter) params.set("guests", guestFilter);

    return `/book?${params.toString()}`;
  }

  const handleMapViewChange = useCallback(
    (nextCenter: MapPoint, nextZoom: number) => {
      setCenter((currentCenter) => {
        const centerChanged =
          Math.abs(currentCenter.latitude - nextCenter.latitude) > 0.00001 ||
          Math.abs(currentCenter.longitude - nextCenter.longitude) > 0.00001;

        return centerChanged ? nextCenter : currentCenter;
      });
      setZoom((currentZoom) =>
        currentZoom === nextZoom ? currentZoom : nextZoom,
      );
    },
    [],
  );

  const handleClusterClick = useCallback(
    (cluster: Cluster) => {
      const primaryPin = cluster.pins[0];
      if (!primaryPin) return;

      focusPin(primaryPin);
      if (cluster.pins.length > 1) {
        setZoom((currentZoom) => Math.min(currentZoom + 1, maxZoom));
      }
    },
    [focusPin],
  );

  const handleExactZoom = useCallback(() => {
    setZoom(maxZoom);
  }, []);

  return (
    <section
      className={
        fullMap
          ? "fixed inset-0 z-50 flex min-w-0 flex-col gap-3 overflow-y-auto bg-[#071F2F] p-2 pb-[calc(6.75rem+env(safe-area-inset-bottom))] text-[#17324D] sm:gap-4 sm:p-5 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start lg:overflow-hidden lg:pb-5"
          : "grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start"
      }
    >
      <div
        className={`min-w-0 overflow-hidden rounded-2xl border border-[#D6B56D]/35 bg-[#FFFDF7] p-3 shadow-2xl shadow-[#0B3C5D]/10 sm:p-5 ${
          fullMap ? "flex shrink-0 flex-col" : ""
        }`}
      >
        <div
          className={`mb-3 flex min-w-0 flex-col justify-between gap-3 rounded-2xl bg-[#071F2F] px-4 py-3 text-white sm:flex-row sm:items-center ${
            fullMap ? "order-1" : ""
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D6B56D]">
              Island Planner
            </p>
            <h2 className="mt-1 text-xl font-bold leading-tight">
              Roatan Day Map
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white">
              {filteredListings.length > 0
                ? `${filteredListings.length} option${filteredListings.length === 1 ? "" : "s"}`
                : "Pre-launch"}
            </span>
            <button
              type="button"
              onClick={() => setFullMap((current) => !current)}
              className="min-h-10 rounded-xl border border-[#D6B56D]/50 px-4 text-sm font-semibold text-[#FFF6DA] hover:bg-white/10"
            >
              {fullMap ? "Close map" : "Open map"}
            </button>
          </div>
        </div>

        <div
          className={`mb-3 rounded-2xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-3 ${
            fullMap ? "order-3 lg:order-2" : ""
          }`}
        >
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007B7B]">
              Start point
            </p>
            <p className="rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-[#0B3C5D]">
              {selectedPickup?.label || activeConciergeMode?.label || "Choose one"}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
            {mapConciergeModes.slice(0, 4).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => applyMapConciergeMode(mode)}
                aria-pressed={activeModeId === mode.id}
                className={`rounded-xl px-3 py-3 text-left text-sm font-black transition ${
                  activeModeId === mode.id
                    ? "bg-[#071F2F] text-white shadow-lg shadow-[#071F2F]/15"
                    : "bg-white text-[#0B3C5D] shadow-sm"
                }`}
              >
                <span className="block text-[10px] uppercase tracking-[0.14em] opacity-70">
                  {mode.eyebrow}
                </span>
                <span className="mt-1 block leading-tight">{mode.label}</span>
              </button>
            ))}
          </div>
          <div className="mobile-scroll-row mt-3 hidden pb-1 sm:flex">
            {mapConciergeModes.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => applyMapConciergeMode(mode)}
                aria-pressed={activeModeId === mode.id}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                  activeModeId === mode.id
                    ? "bg-[#071F2F] text-white shadow-lg shadow-[#071F2F]/15"
                    : "bg-white text-[#0B3C5D] shadow-sm hover:bg-[#FFFDF7]"
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`rounded-2xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-3 ${
            fullMap ? "order-4 lg:order-3" : ""
          }`}
        >
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9C7A2F]">
              Day style
            </p>
            <div className="flex flex-wrap gap-2">
              {activeCollection ? (
                <button
                  type="button"
                  onClick={clearCollection}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow-sm"
                >
                  Clear style
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setShowAdvancedFilters((current) => !current)}
                className="rounded-full bg-[#071F2F] px-4 py-2 text-sm font-semibold text-white"
              >
                {showAdvancedFilters ? "Hide filters" : "More filters"}
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 sm:hidden">
            <select
              aria-label="Choose day style"
              value={activeCollectionId}
              onChange={(event) => {
                const collection = mapCollections.find(
                  (item) => item.id === event.target.value,
                );
                if (collection) {
                  applyCollection(collection);
                } else {
                  clearCollection();
                }
              }}
              className="min-h-12 rounded-xl border border-[#D6B56D]/35 bg-white px-4 text-sm font-black text-[#0B3C5D] outline-none focus:border-[#00A8A8]"
            >
              <option value="">Choose a day style</option>
              {mapCollections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.label}
                </option>
              ))}
            </select>
          </div>
          <div className="mobile-scroll-row mt-3 hidden pb-1 sm:flex">
            {mapCollections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => applyCollection(collection)}
                aria-pressed={activeCollectionId === collection.id}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeCollectionId === collection.id
                    ? "bg-[#071F2F] text-[#FFF6DA] ring-1 ring-[#D6B56D]/70"
                    : "bg-white text-[#0B3C5D] shadow-sm hover:bg-[#FFFDF7]"
                }`}
              >
                {collection.label}
              </button>
            ))}
          </div>
          {activeCollection ? (
            <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-[#0B3C5D]">
              {activeCollection.blurb} {collectionCounts[activeCollection.id] || 0} match
              {collectionCounts[activeCollection.id] === 1 ? "" : "es"} ready.
            </div>
          ) : null}

          {showAdvancedFilters ? (
            <div className="mt-3 grid gap-3 rounded-2xl border border-[#D6B56D]/25 bg-white p-3">
              <div className="grid gap-3 md:grid-cols-[1fr_150px_190px_auto]">
                <div className="relative">
                  <input
                    value={search}
                    onChange={(e) => {
                      setActiveModeId("");
                      setActiveCollectionId("");
                      setSearch(e.target.value);
                    }}
                    placeholder="Search map"
                    role="combobox"
                    aria-expanded={suggestions.length > 0}
                    aria-controls="map-search-suggestions"
                    aria-autocomplete="list"
                    className="min-h-12 w-full rounded-xl border border-[#D6B56D]/35 bg-white px-4 outline-none focus:border-[#00A8A8]"
                  />
                  {suggestions.length > 0 ? (
                    <div
                      id="map-search-suggestions"
                      role="listbox"
                      className="absolute left-0 right-0 top-14 z-40 rounded-xl bg-white p-2 shadow-xl ring-1 ring-black/5"
                    >
                      {suggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          role="option"
                          aria-selected={search === suggestion}
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
                  onChange={(e) => {
                    setActiveModeId("");
                    setActiveCollectionId("");
                    setCategory(e.target.value);
                  }}
                  className="min-h-12 rounded-xl border border-[#D6B56D]/35 bg-white px-4 outline-none focus:border-[#00A8A8]"
                >
                  {luxuryLayers.map((item) => (
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

              <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px_auto]">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="min-h-12 rounded-xl border border-[#D6B56D]/35 bg-white px-4 outline-none focus:border-[#00A8A8]"
                />
                <input
                  value={timeFilter}
                  onChange={(event) => setTimeFilter(event.target.value)}
                  placeholder="Preferred time"
                  className="min-h-12 rounded-xl border border-[#D6B56D]/35 bg-white px-4 outline-none focus:border-[#00A8A8]"
                />
                <input
                  type="number"
                  min="1"
                  value={guestFilter}
                  onChange={(event) => setGuestFilter(event.target.value)}
                  placeholder="Guests"
                  className="min-h-12 rounded-xl border border-[#D6B56D]/35 bg-white px-4 outline-none focus:border-[#00A8A8]"
                />
                <label className="flex min-h-12 items-center gap-3 rounded-xl border border-[#00A8A8]/20 bg-white px-4 text-sm font-bold text-[#0B3C5D]">
                  <input
                    type="checkbox"
                    checked={availableOnly}
                    onChange={(event) => setAvailableOnly(event.target.checked)}
                  />
                  Available only
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_240px_auto] md:items-end">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007B7B]">
                    Pickup
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#0B3C5D]">
                    Optional sorting by cruise port, hotel area, or airport.
                  </p>
                </div>
                <select
                  value={pickupId}
                  onChange={(event) => {
                    const nextPickup =
                      pickupPoints.find((point) => point.id === event.target.value) ||
                      null;
                    setActiveModeId("");
                    setPickupId(event.target.value);
                    if (nextPickup) {
                      setCenter({
                        latitude: nextPickup.latitude,
                        longitude: nextPickup.longitude,
                      });
                      setZoom(13);
                    }
                  }}
                  className="min-h-12 rounded-xl border border-[#00A8A8]/25 bg-white px-4 outline-none focus:border-[#00A8A8]"
                >
                  <option value="">Choose pickup point</option>
                  {pickupPoints.map((point) => (
                    <option key={point.id} value={point.id}>
                      {point.label}
                    </option>
                  ))}
                </select>
                {selectedPickup ? (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModeId("");
                      setPickupId("");
                    }}
                    className="min-h-12 rounded-xl bg-[#EEF7F6] px-4 text-sm font-semibold text-[#0B3C5D] shadow-sm"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {locationMessage ? (
          <p
            className={`mt-3 rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] px-4 py-3 text-sm font-semibold text-[#0B3C5D] ${
              fullMap ? "order-5 lg:order-4" : ""
            }`}
          >
            {locationMessage}
          </p>
        ) : null}

        <div className={fullMap ? "order-2 lg:order-5" : ""}>
          <LeafletMapSurface
            center={center}
            zoom={zoom}
            fullMap={fullMap}
            clusters={clusters}
            selectedClusterId={selectedCluster?.id || ""}
            hoveredId={hoveredId}
            savedTripPins={savedTripPins}
            selectedPickup={selectedPickup}
            userLocation={userLocation}
            onViewChange={handleMapViewChange}
            onClusterClick={handleClusterClick}
            onPinFocus={focusPin}
            onHoverPin={setHoveredId}
            onExactZoom={handleExactZoom}
          >
            {pins.length === 0 ? (
              <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] sm:inset-0 sm:flex sm:items-center sm:justify-center sm:p-8 sm:text-center">
                <div className="pointer-events-auto max-w-md rounded-2xl bg-white/95 p-4 shadow sm:p-6">
                  <p className="font-bold text-[#0B3C5D]">No matches here yet</p>
                  <p className="mt-2 hidden text-sm text-gray-600 sm:block">
                    Try a guest-ready mode, clear the filters, or ask Roa while
                    local operators keep joining.
                  </p>
                  <div className="mt-3 flex gap-2 overflow-x-auto sm:mt-4 sm:grid sm:grid-cols-3">
                    {mapConciergeModes.slice(0, 3).map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => applyMapConciergeMode(mode)}
                        className="shrink-0 rounded-xl bg-[#EEF7F6] px-3 py-2 text-xs font-bold text-[#0B3C5D]"
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </LeafletMapSurface>
        </div>

        <div
          className={`mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600 ${
            fullMap ? "order-6" : ""
          }`}
        >
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#0B3C5D]" />
            Exact coordinate
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full border border-[#0B3C5D] bg-white" />
            Area estimate
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#D6B56D]" />
            Pickup / hovered
          </span>
          <span className="font-semibold text-[#0B3C5D]">
            {filteredListings.length} listing
            {filteredListings.length === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <aside
        className={`grid min-w-0 gap-4 self-start lg:max-h-[760px] lg:overflow-y-auto ${
          fullMap ? "shrink-0" : ""
        }`}
      >
        <section className="min-w-0 rounded-2xl bg-[#071F2F] p-5 text-white shadow-2xl shadow-[#071F2F]/15">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D6B56D]">
                Plan your day
              </p>
              <h2 className="mt-1 text-xl font-bold">
                {savedTripPins.length} saved stop
                {savedTripPins.length === 1 ? "" : "s"}
              </h2>
            </div>
            {savedTripPins.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSavedTripIds([]);
                  setTripMessage("");
                }}
                className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
              >
                Clear
              </button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-white/10 p-3">
            <p className="mr-auto text-xs font-bold uppercase tracking-[0.16em] text-[#D6B56D]">
              Plan status
            </p>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#071F2F]">
              {routeReadyCount}/{routeReadinessItems.length} ready
            </span>
            {routeReadinessItems
              .filter((item) => !item.done)
              .slice(0, 2)
              .map((item) => (
                <span
                  key={item.label}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/72"
                  title={item.detail}
                >
                  {item.label}
                </span>
              ))}
          </div>

          <div className="mt-4 rounded-xl border border-[#D6B56D]/35 bg-[#FFF6DA] p-4 text-[#071F2F]">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9C7A2F]">
              Best next step
            </p>
            <p className="mt-1 text-lg font-black">{bestNextStep}</p>
            <p className="mt-1 text-sm leading-6 text-[#0B3C5D]/75">
              {savedTripPins.length > 1
                ? `${tripDistanceMiles.toFixed(1)} mi route estimate.`
                : activeConciergeMode
                  ? `${activeConciergeMode.label} is shaping the map.`
                  : "Choose a start point to let the map guide you."}
            </p>
          </div>

          {savedTripPins.length === 0 ? (
            <div className="mt-4 rounded-xl bg-white/10 p-4 text-sm leading-6 text-white/78">
              <p className="font-bold text-[#FFF6DA]">
                Save a stop to build your day.
              </p>
              <p className="mt-1">
                Open a listing on the map and save the places you want to compare.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-2">
              {savedTripPins.map((pin, index) => (
                <div
                  key={pin.id}
                  className="rounded-xl bg-white p-3 text-[#0B3C5D]"
                >
                  <div className="flex gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D6B56D] text-sm font-black text-[#071F2F]">
                      {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => focusPin(pin)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="block truncate text-sm font-bold">
                        {pin.title}
                      </span>
                      <span className="text-xs text-gray-500">
                        {pin.location || "Roatan"} - {formatPrice(pin.price)}
                      </span>
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => moveTripStop(pin.id, -1)}
                      disabled={index === 0}
                      className="rounded-lg bg-[#F7F3EA] px-2 py-2 text-xs font-semibold disabled:opacity-40"
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      onClick={() => moveTripStop(pin.id, 1)}
                      disabled={index === savedTripPins.length - 1}
                      className="rounded-lg bg-[#F7F3EA] px-2 py-2 text-xs font-semibold disabled:opacity-40"
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleTripStop(pin)}
                      className="rounded-lg bg-[#FFF3D2] px-2 py-2 text-xs font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={shareTripPlan}
              disabled={savedTripPins.length === 0}
              className="rounded-xl bg-[#D6B56D] px-4 py-3 text-sm font-bold text-[#071F2F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Share plan
            </button>
            <button
              type="button"
              onClick={saveTripToDashboard}
              disabled={savedTripPins.length === 0 || savingTripPlan}
              className="rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {savingTripPlan ? "Saving..." : "Save plan"}
            </button>
            <Link
              href={
                savedTripPins[0]
                  ? bookingUrl(savedTripPins[0].id)
                  : selectedPin
                    ? `/listings/${selectedPin.id}`
                    : "/map"
              }
              className="rounded-xl border border-white/20 px-4 py-3 text-center text-sm font-bold text-white"
            >
              {savedTripPins[0] ? "Book first stop" : "Explore listings"}
            </Link>
          </div>
          {tripMessage ? (
            <p className="mt-3 break-words rounded-xl bg-white/10 p-3 text-sm text-white/80">
              {tripMessage}
            </p>
          ) : null}
        </section>

        {selectedPin ? (
          <article
            className={`sticky bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-30 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-[#071F2F]/15 ring-2 ring-[#D6B56D]/35 sm:bottom-3 lg:static ${
              mobileDrawerOpen ? "max-h-[82vh]" : "max-h-28"
            } transition-[max-height] duration-300 lg:max-h-none`}
          >
            <button
              type="button"
              onClick={() => setMobileDrawerOpen((current) => !current)}
              className="flex w-full items-center justify-center bg-[#071F2F] py-2 lg:hidden"
              aria-label={mobileDrawerOpen ? "Collapse listing drawer" : "Open listing drawer"}
            >
              <span className="h-1.5 w-16 rounded-full bg-[#D6B56D]" />
            </button>
            <div className="max-h-[calc(82vh-44px)] overflow-y-auto p-5 lg:max-h-none lg:overflow-visible">
            <div className="relative h-48 overflow-hidden rounded-xl bg-[#D8EFEC]">
              {selectedPin.image_url ? (
                <Image
                  src={selectedPin.image_url}
                  alt={selectedPin.title}
                  fill
                  sizes="380px"
                  loading="eager"
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-center text-xs font-black uppercase tracking-[0.14em] text-[#0B3C5D]/65">
                  Premium photo pending
                </div>
              )}
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#007B7B]">
              {selectedPin.category || "Listing"}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-[#0B3C5D]">
              {selectedPin.title}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-[#0B3C5D]">
              <span className="rounded-full bg-[#FFF3D2] px-3 py-1">
                {formatPrice(selectedPin.price)}
              </span>
              <span className="rounded-full bg-[#EEF7F6] px-3 py-1">
                {selectedPin.rating ? `${selectedPin.rating.toFixed(1)} rated` : "New listing"}
              </span>
              <span className="rounded-full bg-[#F7F3EA] px-3 py-1">
                {selectedPin.reviews_count || 0} reviews
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {getListingTrustBadges(selectedPin).map((badge) => (
                <span
                  key={badge}
                  className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-bold text-[#0B3C5D]"
                >
                  {badge}
                </span>
              ))}
            </div>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-gray-600">
              {selectedPin.description ||
                "Concierge can confirm timing and pickup before you commit."}
            </p>
            <div className="mt-4 rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-3 text-sm text-[#0B3C5D]">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#007B7B]">
                Planner fit
              </p>
              <p className="mt-1 font-bold">
                {activeConciergeMode
                  ? `${activeConciergeMode.label} candidate`
                  : "Flexible island stop"}
              </p>
              <p className="mt-1 leading-6 text-gray-600">
                {selectedPickup
                  ? pickupNoteForPin(selectedPin)
                  : "Add a pickup point to see whether this stop fits your day."}
              </p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-[#F7F3EA] p-3">
                <p className="text-gray-500">Area</p>
                <p className="font-bold text-[#0B3C5D]">
                  {selectedPin.location || "Roatan"}
                </p>
              </div>
              <div className="rounded-xl bg-[#F7F3EA] p-3">
                <p className="text-gray-500">
                  {selectedPickup
                    ? "From pickup"
                    : userLocation
                      ? "Distance"
                      : "Price"}
                </p>
                <p className="font-bold text-[#0B3C5D]">
                  {selectedPickup || userLocation
                    ? pinDistanceLabel(selectedPin)
                    : formatPrice(selectedPin.price)}
                </p>
              </div>
            </div>
            {selectedPickup ? (
              <div className="mt-4 rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-3 text-sm text-[#0B3C5D]">
                <p className="font-bold">Pickup logistics</p>
                <p className="mt-1 leading-6 text-gray-600">
                  {pickupNoteForPin(selectedPin)} Confirm exact pickup with the
                  vendor before booking.
                </p>
              </div>
            ) : null}
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
            {nearbyPins.length > 0 ? (
              <div className="mt-4 rounded-xl border border-[#D6B56D]/25 bg-[#FFFDF7] p-3">
                <p className="text-sm font-bold text-[#0B3C5D]">
                  Nearby picks
                </p>
                <div className="mt-2 grid gap-2">
                  {nearbyPins.map(({ pin, miles }) => (
                    <button
                      key={pin.id}
                      type="button"
                      onMouseEnter={() => setHoveredId(pin.id)}
                      onMouseLeave={() => setHoveredId("")}
                      onClick={() => focusPin(pin)}
                      className="rounded-lg bg-white px-3 py-2 text-left text-sm font-semibold text-[#0B3C5D] shadow-sm"
                    >
                      <span className="block">{pin.title}</span>
                      <span className="text-xs font-medium text-gray-500">
                        {miles.toFixed(1)} mi away
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => toggleTripStop(selectedPin)}
                className={`rounded-xl px-4 py-3 text-center text-sm font-semibold ${
                  savedTripIds.includes(selectedPin.id)
                    ? "bg-[#FFF3D2] text-[#0B3C5D]"
                    : "bg-[#071F2F] text-white"
                }`}
              >
                {savedTripIds.includes(selectedPin.id) ? "Saved" : "Save"}
              </button>
              <Link
                href={`/listings/${selectedPin.id}`}
                className="rounded-xl bg-[#00A8A8] px-4 py-3 text-center text-sm font-semibold text-[#071F2F]"
              >
                View listing
              </Link>
              <Link
                href={bookingUrl(selectedPin.id)}
                className="rounded-xl border border-[#00A8A8] px-4 py-3 text-center text-sm font-semibold text-[#007B7B]"
              >
                Book
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={(directionsOrigin ? googleDirectionsUrl : googleMapsUrl)({
                  latitude: selectedPin.latitudeValue,
                  longitude: selectedPin.longitudeValue,
                  location: selectedPin.location,
                  title: selectedPin.title,
                  originLatitude: directionsOrigin?.latitude,
                  originLongitude: directionsOrigin?.longitude,
                })}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#F7F3EA] px-4 py-3 text-center text-sm font-semibold text-[#0B3C5D]"
              >
                {directionsOrigin ? "Directions" : "Google Maps"}
              </a>
              <a
                href={(directionsOrigin ? appleDirectionsUrl : appleMapsUrl)({
                  latitude: selectedPin.latitudeValue,
                  longitude: selectedPin.longitudeValue,
                  location: selectedPin.location,
                  title: selectedPin.title,
                  originLatitude: directionsOrigin?.latitude,
                  originLongitude: directionsOrigin?.longitude,
                })}
                target="_blank"
                rel="noreferrer"
                className="rounded-xl bg-[#F7F3EA] px-4 py-3 text-center text-sm font-semibold text-[#0B3C5D]"
              >
                Apple Maps
              </a>
            </div>
            </div>
          </article>
        ) : null}

        {pins.map((pin) => {
          const isSelected = selectedPin?.id === pin.id;
          const isSaved = savedTripIds.includes(pin.id);

          return (
            <article
              key={pin.id}
              onMouseEnter={() => setHoveredId(pin.id)}
              onMouseLeave={() => setHoveredId("")}
              className={`rounded-2xl p-4 shadow transition ${
                isSelected
                  ? "bg-[#0B3C5D] text-white"
                  : hoveredId === pin.id
                    ? "bg-[#FFF3D2] text-[#17324D] ring-2 ring-[#D6B56D]"
                    : "bg-white text-[#17324D] hover:-translate-y-0.5"
              }`}
            >
              <button
                ref={(element) => {
                  listingRefs.current[pin.id] = element;
                }}
                type="button"
                onClick={() => focusPin(pin)}
                className="block w-full text-left"
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
                        isSelected ? "text-white/75" : "text-gray-600"
                      }`}
                    >
                      {pin.location || "Roatan"} -{" "}
                      {selectedPickup || userLocation
                        ? pinDistanceLabel(pin)
                        : formatPrice(pin.price)}
                    </p>
                    <p
                      className={`mt-1 text-xs font-semibold ${
                        isSelected ? "text-[#9EE8E3]" : "text-[#007B7B]"
                      }`}
                    >
                      {selectedPickup
                        ? pickupNoteForPin(pin)
                        : pin.hasExactPin
                          ? "Exact pin"
                          : "Area pin"}
                    </p>
                  </div>
                </div>
              </button>

              <div
                className={`mt-3 border-t pt-3 ${
                  isSelected ? "border-white/15" : "border-[#D6B56D]/20"
                }`}
              >
                <p
                  className={`text-xs font-bold uppercase tracking-wide ${
                    isSelected ? "text-white/60" : "text-[#7A6A43]"
                  }`}
                >
                  Quick actions
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleTripStop(pin)}
                    className={`rounded-xl px-3 py-2 text-xs font-bold ${
                      isSaved
                        ? "bg-[#FFF3D2] text-[#0B3C5D]"
                        : isSelected
                          ? "bg-white/10 text-white ring-1 ring-white/15"
                          : "bg-[#071F2F] text-white"
                    }`}
                  >
                    {isSaved ? "Saved" : "Save stop"}
                  </button>
                  <Link
                    href={`/listings/${pin.id}`}
                    className={`rounded-xl px-3 py-2 text-center text-xs font-bold ${
                      isSelected
                        ? "bg-white/10 text-white ring-1 ring-white/15"
                        : "bg-[#EEF7F6] text-[#007B7B]"
                    }`}
                  >
                    View
                  </Link>
                  <Link
                    href={`/book?listing=${pin.id}`}
                    className="rounded-xl bg-[#D6B56D] px-3 py-2 text-center text-xs font-bold text-[#071F2F]"
                  >
                    Book
                  </Link>
                </div>
              </div>
            </article>
          );
        })}
      </aside>
    </section>
  );
}
