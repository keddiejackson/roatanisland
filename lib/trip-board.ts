export const TRIP_PLAN_KEY = "roatan-trip-plan";
export const SAVED_LISTINGS_KEY = "roatan-saved-listings";
export const COMPARE_LISTINGS_KEY = "roatan-compare-listings";
export const RECENT_LISTINGS_KEY = "roatan-recent-listings";
export const TRIP_BOARD_DAYS_KEY = "roatan-trip-board-days";

export type TripBoardListingItem = {
  id: string;
  title: string;
  priceLabel: string;
  location: string;
  category: string;
  imageUrl?: string | null;
};

export type TripBoardListingDetail = {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  price: number | null;
};

export type TripBoardDay = {
  id: string;
  label: string;
  description: string;
  listingIds: string[];
};

export type TripBoardCompareRow = {
  label: string;
  values: string[];
};

export const defaultTripBoardDays: TripBoardDay[] = [
  {
    id: "morning",
    label: "Morning",
    description: "Start with pickup, beach, or the first tour window.",
    listingIds: [],
  },
  {
    id: "midday",
    label: "Midday",
    description: "Keep lunch, transfers, and easy second stops together.",
    listingIds: [],
  },
  {
    id: "afternoon",
    label: "Afternoon",
    description: "Plan the main activity or the return toward your pickup area.",
    listingIds: [],
  },
  {
    id: "sunset",
    label: "Sunset",
    description: "Save dinner, boat rides, or quiet end-of-day plans here.",
    listingIds: [],
  },
];

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function formatPriceLabel(price: number | null | undefined) {
  if (typeof price !== "number" || Number.isNaN(price)) return "";
  return `$${price.toLocaleString("en-US")}`;
}

function uniqueIds(raw: unknown, limit: number) {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const ids: string[] = [];

  for (const value of raw) {
    const id = cleanText(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
    if (ids.length >= limit) break;
  }

  return ids;
}

function itemFromDetail(detail: TripBoardListingDetail): TripBoardListingItem {
  return {
    id: detail.id,
    title: detail.title,
    priceLabel: formatPriceLabel(detail.price),
    location: detail.location || "Roatan",
    category: detail.category || "Saved",
  };
}

function fallbackItem(id: string, index: number): TripBoardListingItem {
  return {
    id,
    title: `Saved stop ${index + 1}`,
    priceLabel: "",
    location: "Open map for details",
    category: "Saved",
  };
}

export function normalizeTripBoardItems(raw: unknown, limit = 12) {
  if (!Array.isArray(raw)) return [] as TripBoardListingItem[];

  const seen = new Set<string>();
  const items: TripBoardListingItem[] = [];

  for (const value of raw) {
    if (!value || typeof value !== "object") continue;

    const candidate = value as Partial<TripBoardListingItem>;
    const id = cleanText(candidate.id);
    if (!id || seen.has(id)) continue;

    seen.add(id);
    items.push({
      id,
      title: cleanText(candidate.title) || "Saved listing",
      priceLabel: cleanText(candidate.priceLabel),
      location: cleanText(candidate.location) || "Roatan",
      category: cleanText(candidate.category) || "Saved",
      ...(candidate.imageUrl !== undefined
        ? { imageUrl: cleanText(candidate.imageUrl) || null }
        : {}),
    });

    if (items.length >= limit) break;
  }

  return items;
}

export function mergeTripBoardSavedItems({
  tripPlanIds,
  savedItems,
  listingDetails = [],
  limit = 12,
}: {
  tripPlanIds: unknown;
  savedItems: unknown;
  listingDetails?: TripBoardListingDetail[];
  limit?: number;
}) {
  const planIds = uniqueIds(tripPlanIds, limit);
  const normalizedItems = normalizeTripBoardItems(savedItems, limit);
  const detailsById = new Map(
    listingDetails.map((detail) => [detail.id, itemFromDetail(detail)]),
  );
  const itemsById = new Map(normalizedItems.map((item) => [item.id, item]));
  const savedIds = [
    ...planIds,
    ...normalizedItems.map((item) => item.id),
  ].filter((id, index, allIds) => allIds.indexOf(id) === index);

  return {
    savedIds: savedIds.slice(0, limit),
    savedItems: savedIds.slice(0, limit).map((id, index) => {
      return detailsById.get(id) || itemsById.get(id) || fallbackItem(id, index);
    }),
  };
}

function normalizeDays(days: unknown): TripBoardDay[] {
  if (!Array.isArray(days)) return [];

  return days
    .filter((day): day is Partial<TripBoardDay> => Boolean(day))
    .map((day) => ({
      id: cleanText(day.id),
      label: cleanText(day.label),
      description: cleanText(day.description),
      listingIds: Array.isArray(day.listingIds)
        ? uniqueIds(day.listingIds, 24)
        : [],
    }))
    .filter((day) => day.id && day.label);
}

export function buildTripBoardDays(
  savedItems: TripBoardListingItem[],
  existingDays?: unknown,
) {
  const savedIds = savedItems.map((item) => item.id);
  const savedIdSet = new Set(savedIds);
  const providedDays = normalizeDays(existingDays);
  const providedById = new Map(providedDays.map((day) => [day.id, day]));
  const existingAssigned = new Set(
    providedDays.flatMap((day) =>
      day.listingIds.filter((listingId) => savedIdSet.has(listingId)),
    ),
  );
  const hasExistingAssignments = existingAssigned.size > 0;
  const baseDays = defaultTripBoardDays.map((day) => {
    const provided = providedById.get(day.id);

    return {
      ...day,
      label: provided?.label || day.label,
      description: provided?.description || day.description,
      listingIds:
        provided?.listingIds.filter((listingId) => savedIdSet.has(listingId)) ||
        [],
    };
  });

  if (hasExistingAssignments) {
    const missingIds = savedIds.filter((id) => !existingAssigned.has(id));
    missingIds.forEach((id, index) => {
      baseDays[index % baseDays.length].listingIds.push(id);
    });
    return baseDays;
  }

  savedIds.forEach((id, index) => {
    baseDays[index % baseDays.length].listingIds.push(id);
  });

  return baseDays;
}

export function moveListingBetweenTripDays(
  days: TripBoardDay[],
  listingId: string,
  dayId: string,
) {
  return days.map((day) => {
    const withoutListing = day.listingIds.filter((id) => id !== listingId);

    return {
      ...day,
      listingIds:
        day.id === dayId ? [...withoutListing, listingId] : withoutListing,
    };
  });
}

export function buildTripBoardCompareRows(
  items: TripBoardListingItem[],
): TripBoardCompareRow[] {
  const compareItems = items.slice(0, 4);

  return [
    {
      label: "Area",
      values: compareItems.map((item) => item.location || "Ask operator"),
    },
    {
      label: "Type",
      values: compareItems.map((item) => item.category || "Listing"),
    },
    {
      label: "Price",
      values: compareItems.map((item) => item.priceLabel || "Ask operator"),
    },
  ];
}

export function getTripBoardSummary({
  savedItems,
  compareItems,
  recentItems,
  days,
}: {
  savedItems: TripBoardListingItem[];
  compareItems: TripBoardListingItem[];
  recentItems: TripBoardListingItem[];
  days: TripBoardDay[];
}) {
  const plannedIds = new Set(days.flatMap((day) => day.listingIds));
  const plannedCount = savedItems.filter((item) => plannedIds.has(item.id)).length;
  const unplannedCount = Math.max(0, savedItems.length - plannedCount);

  return {
    savedCount: savedItems.length,
    compareCount: compareItems.length,
    recentCount: recentItems.length,
    plannedCount,
    unplannedCount,
    readyLabel:
      savedItems.length === 0
        ? "Start saving listings"
        : unplannedCount > 0
          ? "Needs day planning"
          : compareItems.length > 0
            ? "Trip board ready"
            : "Ready to compare",
  };
}
