import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTripBoardCompareRows,
  buildTripBoardDays,
  getTripBoardSummary,
  mergeTripBoardSavedItems,
  moveListingBetweenTripDays,
  normalizeTripBoardItems,
} from "./trip-board.ts";

const savedItems = [
  {
    id: "sunset-sail",
    title: "Sunset Sail",
    priceLabel: "$125",
    location: "West Bay",
    category: "Private Charters",
  },
  {
    id: "reef-tour",
    title: "Reef Tour",
    priceLabel: "$85",
    location: "West End",
    category: "Tours",
  },
  {
    id: "airport-transfer",
    title: "Airport Transfer",
    priceLabel: "$40",
    location: "Airport",
    category: "Transport",
  },
];

test("normalizes saved listing objects and removes duplicates", () => {
  assert.deepEqual(
    normalizeTripBoardItems([
      savedItems[0],
      { id: " reef-tour ", title: "  Reef Tour  ", location: "West End" },
      { id: "reef-tour", title: "Duplicate" },
      { id: "", title: "Missing id" },
      "bad",
    ]),
    [
      savedItems[0],
      {
        id: "reef-tour",
        title: "Reef Tour",
        priceLabel: "",
        location: "West End",
        category: "Saved",
      },
    ],
  );
});

test("merges map saves, listing page saves, and loaded listing details", () => {
  const merged = mergeTripBoardSavedItems({
    tripPlanIds: ["map-only", "sunset-sail", "map-only"],
    savedItems,
    listingDetails: [
      {
        id: "map-only",
        title: "Map Saved Beach",
        category: "Beaches",
        location: "Sandy Bay",
        price: null,
      },
    ],
  });

  assert.deepEqual(merged.savedIds, [
    "map-only",
    "sunset-sail",
    "reef-tour",
    "airport-transfer",
  ]);
  assert.equal(merged.savedItems[0].title, "Map Saved Beach");
  assert.equal(merged.savedItems[1].priceLabel, "$125");
});

test("builds a usable default trip board and allows moving stops", () => {
  const days = buildTripBoardDays(savedItems);

  assert.deepEqual(
    days.map((day) => [day.id, day.listingIds]),
    [
      ["morning", ["sunset-sail"]],
      ["midday", ["reef-tour"]],
      ["afternoon", ["airport-transfer"]],
      ["sunset", []],
    ],
  );

  const moved = moveListingBetweenTripDays(days, "reef-tour", "sunset");

  assert.deepEqual(
    moved.map((day) => [day.id, day.listingIds]),
    [
      ["morning", ["sunset-sail"]],
      ["midday", []],
      ["afternoon", ["airport-transfer"]],
      ["sunset", ["reef-tour"]],
    ],
  );
});

test("keeps existing board assignments and removes deleted listings", () => {
  const days = buildTripBoardDays(savedItems.slice(0, 2), [
    {
      id: "morning",
      label: "Morning",
      description: "First stop",
      listingIds: ["deleted", "reef-tour"],
    },
    {
      id: "sunset",
      label: "Sunset",
      description: "Last stop",
      listingIds: ["sunset-sail"],
    },
  ]);

  assert.deepEqual(
    days.map((day) => [day.id, day.listingIds]),
    [
      ["morning", ["reef-tour"]],
      ["midday", []],
      ["afternoon", []],
      ["sunset", ["sunset-sail"]],
    ],
  );
});

test("builds compare rows and summary for the guest dashboard", () => {
  assert.deepEqual(buildTripBoardCompareRows(savedItems.slice(0, 2)), [
    { label: "Area", values: ["West Bay", "West End"] },
    { label: "Type", values: ["Private Charters", "Tours"] },
    { label: "Price", values: ["$125", "$85"] },
  ]);

  assert.deepEqual(
    getTripBoardSummary({
      savedItems,
      compareItems: savedItems.slice(0, 2),
      recentItems: savedItems.slice(1),
      days: buildTripBoardDays(savedItems),
    }),
    {
      savedCount: 3,
      compareCount: 2,
      recentCount: 2,
      plannedCount: 3,
      unplannedCount: 0,
      readyLabel: "Trip board ready",
    },
  );
});
