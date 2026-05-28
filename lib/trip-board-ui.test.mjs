import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("trip board pro connects listing saves, compare, and day planning", () => {
  const guestDashboard = readProjectFile(
    "app/account/GuestTravelCommandCenter.tsx",
  );
  const listingTools = readProjectFile(
    "app/listings/[id]/ListingConversionTools.tsx",
  );
  const tripDock = readProjectFile("app/TripPlannerDock.tsx");
  const tripBoard = readProjectFile("lib/trip-board.ts");

  assert.match(guestDashboard, /Trip board pro/);
  assert.match(guestDashboard, /Compare board/);
  assert.match(guestDashboard, /Day-by-day plan/);
  assert.match(listingTools, /TRIP_PLAN_KEY/);
  assert.match(tripDock, /SAVED_LISTINGS_KEY/);
  assert.match(tripBoard, /buildTripBoardDays/);
});
