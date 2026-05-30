import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("guest trip plan upgrade is wired through map, account, admin, and SQL", () => {
  assert.equal(existsSync("app/api/account/trip-plans/route.ts"), true);
  assert.equal(existsSync("app/api/account/trip-plans/[id]/route.ts"), true);
  assert.equal(
    existsSync("app/api/account/trip-plans/[id]/concierge/route.ts"),
    true,
  );
  assert.equal(existsSync("supabase/guest-trip-plans.sql"), true);

  const mapSource = read("app/map/MapBrowser.tsx");
  const accountSource = read("app/account/page.tsx");
  const adminSource = read("app/admin/page.tsx");
  const tripPlansApiSource = read("app/api/account/trip-plans/route.ts");
  const tripPlanConciergeApiSource = read(
    "app/api/account/trip-plans/[id]/concierge/route.ts",
  );
  const sqlSource = read("supabase/guest-trip-plans.sql");

  assert.match(mapSource, /\/api\/account\/trip-plans/);
  assert.match(accountSource, /Saved map plans/);
  assert.match(accountSource, /deleteTripPlan/);
  assert.match(accountSource, /requestConciergeForPlan/);
  assert.match(accountSource, /\/api\/account\/trip-plans\/\$\{planId\}\/concierge/);
  assert.match(adminSource, /Guest trip plans/);
  assert.doesNotMatch(tripPlansApiSource, /concierge_lead_id/);
  assert.doesNotMatch(adminSource, /concierge_lead_id/);
  assert.match(tripPlanConciergeApiSource, /legacyTripPlanSelect/);
  assert.match(tripPlanConciergeApiSource, /without concierge tracking/);
  assert.match(sqlSource, /create table if not exists public\.guest_trip_plans/);
  assert.match(sqlSource, /concierge_lead_id/);
  assert.match(sqlSource, /guest_trip_plans_concierge_lead_id_idx/);
  assert.match(sqlSource, /Guests can manage own trip plans/);
  assert.match(sqlSource, /Admins can view guest trip plans/);
});
