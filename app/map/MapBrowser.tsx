"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
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

const luxuryLayers = [
  "All",
  "Tours",
  "Hotels",
  "Transport",
  "Food",
  "Beaches",
  "Private Charters",
];
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
    label: "Coxen Hole Port",
    kind: "Cruise port",
    latitude: 16.317,
    longitude: -86.536,
    note: "Good for visitors arriving at the Port of Roatan in Coxen Hole.",
  },
  {
    id: "mahogany-bay",
    label: "Mahogany Bay",
    kind: "Cruise port",
    latitude: 16.325,
    longitude: -86.503,
    note: "Good for visitors arriving at the Mahogany Bay cruise terminal.",
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
    blurb: "Shorter-distance picks around Coxen Hole, Sandy Bay, and West Bay for guests watching the ship clock.",
    category: "All",
    area: "Coxen Hole",
    keywords: ["cruise", "port", "coxen", "mahogany", "west bay", "sandy"],
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
    collectionId: "",
    tripIds: [] as string[],
    pickupId: "",
  };
}

function readBrowserMapState(listings: MapListing[]) {
  const params = new URLSearchParams(window.location.search);
  const category = params.get("category");
  const location = params.get("area") || "All";
  const search = params.get("search") || "";
  const collectionId = params.get("collection") || "";
  const collection = mapCollections.find((item) => item.id === collectionId);
  const pickupId = params.get("pickup") || "";
  const selectedId = params.get("selected") || listings[0]?.id || "";
  const selectedListing = listings.find((listing) => listing.id === selectedId);
  const selectedPin = selectedListing ? listingToPin(selectedListing) : null;
  const requestedZoom = Number(params.get("zoom"));

  return {
    category: category && luxuryLayers.includes(category) ? category : "All",
    location: collection?.area || location,
    search,
    selectedId,
    center: selectedPin
      ? { latitude: selectedPin.latitudeValue, longitude: selectedPin.longitudeValue }
      : collection
        ? collection.center
      : location === "All"
        ? roatanCenter
        : findAreaPosition(location),
    zoom: zoomLevels.includes(requestedZoom) ? requestedZoom : 12,
    collectionId: collection?.id || "",
    tripIds: readSavedTripIds(listings),
    pickupId: pickupPoints.some((point) => point.id === pickupId)
      ? pickupId
      : "",
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
  const [activeCollectionId, setActiveCollectionId] = useState(
    initialMapState.collectionId,
  );
  const [savedTripIds, setSavedTripIds] = useState<string[]>(
    initialMapState.tripIds,
  );
  const [tripMessage, setTripMessage] = useState("");
  const [pickupId, setPickupId] = useState(initialMapState.pickupId);
  const [fullMap, setFullMap] = useState(false);
  const [browserStateLoaded, setBrowserStateLoaded] = useState(false);
  const [hoveredId, setHoveredId] = useState("");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
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
      setActiveCollectionId(browserMapState.collectionId);
      setSavedTripIds(browserMapState.tripIds);
      setPickupId(browserMapState.pickupId);
      setBrowserStateLoaded(true);
    });
  }, [listings]);

  useEffect(() => {
    if (!browserStateLoaded) return;

    const params = new URLSearchParams();
    if (activeCollectionId) params.set("collection", activeCollectionId);
    if (category !== "All") params.set("category", category);
    if (location !== "All") params.set("area", location);
    if (search.trim()) params.set("search", search.trim());
    if (selectedId) params.set("selected", selectedId);
    if (zoom !== 12) params.set("zoom", String(zoom));
    if (savedTripIds.length > 0) params.set("trip", savedTripIds.join(","));
    if (pickupId) params.set("pickup", pickupId);

    const query = params.toString();
    const nextUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [
    activeCollectionId,
    browserStateLoaded,
    category,
    location,
    pickupId,
    savedTripIds,
    search,
    selectedId,
    zoom,
  ]);

  useEffect(() => {
    if (!browserStateLoaded) return;

    localStorage.setItem("roatan-trip-plan", JSON.stringify(savedTripIds));
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

  const activeCollection =
    mapCollections.find((collection) => collection.id === activeCollectionId) ||
    null;
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

        return matchesCategory && matchesLocation && matchesSearch && matchesCollection;
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
    listings,
    location,
    search,
    selectedPickup,
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
  const centerWorld = latLonToWorld(center.latitude, center.longitude, zoom);
  const tiles = getTiles(center, zoom);
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
  const tripRoutePoints = useMemo(
    () =>
      savedTripPins.map((pin) => {
        const point = latLonToWorld(pin.latitudeValue, pin.longitudeValue, zoom);

        return {
          id: pin.id,
          x: point.x - centerWorld.x,
          y: point.y - centerWorld.y,
        };
      }),
    [centerWorld.x, centerWorld.y, savedTripPins, zoom],
  );
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

  useEffect(() => {
    if (!selectedId) return;

    listingRefs.current[selectedId]?.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedId]);

  function zoomMap(direction: 1 | -1) {
    const currentIndex = zoomLevels.indexOf(zoom);
    const nextIndex = Math.min(
      Math.max(currentIndex + direction, 0),
      zoomLevels.length - 1,
    );
    setZoom(zoomLevels[nextIndex]);
  }

  function focusArea(area: string) {
    setActiveCollectionId("");
    setLocation(area);
    const nextCenter = area === "All" ? roatanCenter : findAreaPosition(area);
    setCenter(nextCenter);
    setZoom(area === "All" ? 12 : 13);
  }

  function focusPin(pin: Pin) {
    setSelectedId(pin.id);
    setMobileDrawerOpen(true);
    setCenter({ latitude: pin.latitudeValue, longitude: pin.longitudeValue });
    setZoom((currentZoom) => Math.max(currentZoom, 13));
  }

  function applyCollection(collection: MapCollection) {
    setActiveCollectionId(collection.id);
    setCategory(collection.category);
    setLocation(collection.area);
    setSearch("");
    setCenter(collection.center);
    setZoom(collection.zoom);
    setSelectedId("");
  }

  function clearCollection() {
    setActiveCollectionId("");
    setCategory("All");
    setLocation("All");
    setSearch("");
    setCenter(roatanCenter);
    setZoom(12);
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

  return (
    <section
      className={
        fullMap
          ? "fixed inset-0 z-50 grid min-w-0 gap-4 overflow-auto bg-[#071F2F] p-3 text-[#17324D] sm:p-5 lg:grid-cols-[minmax(0,1fr)_420px]"
          : "grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]"
      }
    >
      <div className="min-w-0 overflow-hidden rounded-2xl border border-[#D6B56D]/35 bg-[#FFFDF7] p-4 shadow-2xl shadow-[#0B3C5D]/10 sm:p-5">
        <div className="mb-4 flex min-w-0 flex-col justify-between gap-3 rounded-2xl bg-[#071F2F] p-4 text-white sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D6B56D]">
              Roatan atlas
            </p>
            <h2 className="mt-1 text-2xl font-bold leading-tight">
              Explore by coast, cove, and crew
            </h2>
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
              onChange={(e) => {
                setActiveCollectionId("");
                setSearch(e.target.value);
              }}
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
            onChange={(e) => {
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
        {locationMessage ? (
          <p className="mt-3 rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] px-4 py-3 text-sm font-semibold text-[#0B3C5D]">
            {locationMessage}
          </p>
        ) : null}

        <div className="mt-4 rounded-2xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-3">
          <div className="grid gap-3 md:grid-cols-[1fr_240px_auto] md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#007B7B]">
                Pickup checker
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0B3C5D]">
                Sort the map by distance from a cruise port, hotel area, or the airport.
              </p>
            </div>
            <select
              value={pickupId}
              onChange={(event) => {
                const nextPickup =
                  pickupPoints.find((point) => point.id === event.target.value) ||
                  null;
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
                onClick={() => setPickupId("")}
                className="min-h-12 rounded-xl bg-white px-4 text-sm font-semibold text-[#0B3C5D] shadow-sm"
              >
                Clear
              </button>
            ) : null}
          </div>
          {selectedPickup ? (
            <div className="mt-3 rounded-xl bg-white p-4 text-sm text-[#0B3C5D]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">
                  {selectedPickup.label}{" "}
                  <span className="font-medium text-gray-500">
                    {selectedPickup.kind}
                  </span>
                </p>
                <p className="font-semibold text-[#007B7B]">
                  Closest listings shown first
                </p>
              </div>
              <p className="mt-2 leading-6 text-gray-600">
                {selectedPickup.note}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-2xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9C7A2F]">
                Curated map collections
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0B3C5D]">
                Tap a collection for a guided island view.
              </p>
            </div>
            {activeCollection ? (
              <button
                type="button"
                onClick={clearCollection}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow-sm"
              >
                Clear collection
              </button>
            ) : null}
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {mapCollections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => applyCollection(collection)}
                className={`shrink-0 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  activeCollectionId === collection.id
                    ? "bg-[#071F2F] text-[#FFF6DA] ring-1 ring-[#D6B56D]/70"
                    : "bg-white text-[#0B3C5D] shadow-sm hover:-translate-y-0.5"
                }`}
              >
                <span className="block">{collection.label}</span>
                <span
                  className={`mt-1 block text-xs ${
                    activeCollectionId === collection.id
                      ? "text-white/70"
                      : "text-gray-500"
                  }`}
                >
                  {collectionCounts[collection.id] || 0} match
                  {collectionCounts[collection.id] === 1 ? "" : "es"}
                </span>
              </button>
            ))}
          </div>
          {activeCollection ? (
            <p className="mt-3 rounded-xl bg-white px-4 py-3 text-sm leading-6 text-[#0B3C5D]">
              {activeCollection.blurb}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {luxuryLayers.map((layer) => (
            <button
              key={layer}
              type="button"
              onClick={() => {
                setActiveCollectionId("");
                setCategory(layer);
              }}
              className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                category === layer
                  ? "bg-[#071F2F] text-[#FFF6DA] ring-1 ring-[#D6B56D]/60"
                  : "border border-[#071F2F]/10 bg-white text-[#0B3C5D] hover:border-[#D6B56D]/60"
              }`}
            >
              {layer === "All" ? "All layers" : layer}
            </button>
          ))}
        </div>

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

          <div className="absolute left-4 top-4 z-20 grid gap-2">
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => zoomMap(1)}
              className="h-10 w-10 rounded-xl bg-white text-xl font-bold text-[#0B3C5D] shadow"
            >
              +
            </button>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
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

          {selectedPickup ? (
            <div
              style={{
                left: `calc(50% + ${
                  latLonToWorld(
                    selectedPickup.latitude,
                    selectedPickup.longitude,
                    zoom,
                  ).x - centerWorld.x
                }px)`,
                top: `calc(50% + ${
                  latLonToWorld(
                    selectedPickup.latitude,
                    selectedPickup.longitude,
                    zoom,
                  ).y - centerWorld.y
                }px)`,
              }}
              className="absolute z-20 -translate-x-1/2 -translate-y-full rounded-full bg-[#D6B56D] px-3 py-2 text-xs font-black text-[#071F2F] shadow-lg ring-4 ring-white"
              title={selectedPickup.label}
            >
              Pickup
            </div>
          ) : null}

          {tripRoutePoints.length > 1 ? (
            <div className="pointer-events-none absolute inset-0 z-[9]">
              {tripRoutePoints.slice(1).map((point, index) => {
                const previousPoint = tripRoutePoints[index];
                const deltaX = point.x - previousPoint.x;
                const deltaY = point.y - previousPoint.y;
                const length = Math.hypot(deltaX, deltaY);
                const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

                return (
                  <span
                    key={`${previousPoint.id}-${point.id}`}
                    style={{
                      left: `calc(50% + ${previousPoint.x}px)`,
                      top: `calc(50% + ${previousPoint.y}px)`,
                      width: `${length}px`,
                      transform: `rotate(${angle}deg)`,
                    }}
                    className="absolute h-1 origin-left rounded-full bg-[#D6B56D] shadow-[0_0_18px_rgba(214,181,109,0.65)]"
                  />
                );
              })}
            </div>
          ) : null}

          {tripRoutePoints.map((point, index) => (
            <button
              key={point.id}
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                const pin = savedTripPins[index];
                if (pin) focusPin(pin);
              }}
              style={{
                left: `calc(50% + ${point.x}px)`,
                top: `calc(50% + ${point.y}px)`,
              }}
              className="absolute z-[12] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#D6B56D] text-xs font-black text-[#071F2F] shadow-lg ring-4 ring-white"
            >
              {index + 1}
            </button>
          ))}

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
            const isHovered = cluster.pins.some((pin) => pin.id === hoveredId);

            return (
              <button
                key={cluster.id}
                type="button"
                onMouseEnter={() => setHoveredId(primaryPin.id)}
                onMouseLeave={() => setHoveredId("")}
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
                className={`absolute z-10 -translate-x-1/2 -translate-y-full rounded-full px-3 py-2 text-xs font-bold shadow-lg ring-4 transition hover:scale-105 ${
                  isSelected
                    ? "bg-[#00A8A8] text-white ring-[#D6B56D]"
                    : isHovered
                      ? "bg-[#D6B56D] text-[#071F2F] ring-white"
                    : primaryPin.hasExactPin
                      ? "bg-[#0B3C5D] text-white ring-white/80"
                      : "bg-white text-[#0B3C5D] ring-white/80"
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

      <aside className="grid min-w-0 gap-4 lg:max-h-[760px] lg:overflow-y-auto">
        <section className="min-w-0 rounded-2xl bg-[#071F2F] p-5 text-white shadow-2xl shadow-[#071F2F]/15">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#D6B56D]">
                Trip plan
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

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-white/60">Route distance</p>
              <p className="mt-1 font-bold text-[#FFF6DA]">
                {savedTripPins.length > 1
                  ? `${tripDistanceMiles.toFixed(1)} mi`
                  : "Add stops"}
              </p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="text-white/60">Drive estimate</p>
              <p className="mt-1 font-bold text-[#FFF6DA]">
                {savedTripPins.length > 1
                  ? `${Math.max(5, Math.round((tripDistanceMiles / 20) * 60))} min`
                  : "Pending"}
              </p>
            </div>
          </div>

          {savedTripPins.length === 0 ? (
            <p className="mt-4 rounded-xl bg-white/10 p-4 text-sm leading-6 text-white/75">
              Save places from the map to build a simple day plan. The numbered
              stops will appear on the map and stay shareable in the link.
            </p>
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

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={shareTripPlan}
              className="rounded-xl bg-[#D6B56D] px-4 py-3 text-sm font-bold text-[#071F2F]"
            >
              Share plan
            </button>
            <Link
              href={savedTripPins[0] ? `/book?listing=${savedTripPins[0].id}` : "/map"}
              className="rounded-xl border border-white/20 px-4 py-3 text-center text-sm font-bold text-white"
            >
              Book first stop
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
            className={`sticky bottom-3 z-30 overflow-hidden rounded-2xl bg-white shadow-2xl shadow-[#071F2F]/15 ring-2 ring-[#D6B56D]/35 lg:static ${
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
                className="rounded-xl bg-[#00A8A8] px-4 py-3 text-center text-sm font-semibold text-white"
              >
                View listing
              </Link>
              <Link
                href={`/book?listing=${selectedPin.id}`}
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

        {pins.map((pin) => (
          <button
            key={pin.id}
            ref={(element) => {
              listingRefs.current[pin.id] = element;
            }}
            type="button"
            onMouseEnter={() => setHoveredId(pin.id)}
            onMouseLeave={() => setHoveredId("")}
            onClick={() => focusPin(pin)}
            className={`rounded-2xl p-4 text-left shadow transition ${
              selectedPin?.id === pin.id
                ? "bg-[#0B3C5D] text-white"
                : hoveredId === pin.id
                  ? "bg-[#FFF3D2] text-[#17324D] ring-2 ring-[#D6B56D]"
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
                  {selectedPickup || userLocation
                    ? pinDistanceLabel(pin)
                    : formatPrice(pin.price)}
                </p>
                <p
                  className={`mt-1 text-xs font-semibold ${
                    selectedPin?.id === pin.id ? "text-[#9EE8E3]" : "text-[#007B7B]"
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
        ))}
      </aside>
    </section>
  );
}
