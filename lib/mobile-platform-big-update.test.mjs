import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("guest mobile platform includes the full drawer and saved plan cart", () => {
  const navigation = read("lib/guest-navigation.ts");
  const platform = read("app/GuestMobilePlatform.tsx");
  const layout = read("app/layout.tsx");

  assert.match(navigation, /label: "Hotels & Stays"/);
  assert.match(navigation, /label: "Transportation"/);
  assert.match(navigation, /label: "Ask Roa"/);
  assert.match(navigation, /href: "\/community"/);
  assert.match(navigation, /href: "\/tours"/);
  assert.match(platform, /Saved Plan/);
  assert.match(platform, /roatan-trip-plan-change/);
  assert.match(layout, /<GuestMobilePlatform \/>/);
});

test("homepage uses drawer on mobile and sends experiences to tours", () => {
  const header = read("app/HomeHeroHeader.tsx");
  const accountButton = read("app/GlobalAccountButton.tsx");
  const footer = read("app/SiteFooter.tsx");
  const settings = read("lib/homepage-settings.ts");

  assert.match(header, /Mobile main navigation" className="hidden"/);
  assert.match(header, /href="\/tours"/);
  assert.match(header, /Ask Roa/);
  assert.match(accountButton, /hidden max-w-\[calc\(100vw-1rem\)\]/);
  assert.match(footer, /Hotels & Stays/);
  assert.match(footer, /Transportation/);
  assert.match(footer, /Community/);
  assert.match(settings, /secondaryCtaHref: "\/tours"/);
});

test("map and listing pin picker support precision zoom", () => {
  const mapBrowser = read("app/map/MapBrowser.tsx");
  const pinPicker = read("app/map/PinPicker.tsx");

  assert.match(mapBrowser, /const zoomLevels = \[11, 12, 13, 14, 15, 16, 17, 18\]/);
  assert.match(mapBrowser, /setZoom\(maxZoom\)/);
  assert.match(mapBrowser, /onWheel=/);
  assert.match(mapBrowser, /roatan-trip-plan-change/);
  assert.match(pinPicker, /const zoomLevels = \[11, 12, 13, 14, 15, 16, 17, 18\]/);
  assert.match(pinPicker, /Precision map pin picker/);
  assert.match(pinPicker, /Tap the map to place the exact guest meeting point/);
});

test("community forum route, API, and SQL are present", () => {
  assert.equal(existsSync("app/community/page.tsx"), true);
  assert.equal(existsSync("app/community/CommunityForum.tsx"), true);
  assert.equal(existsSync("app/api/community/threads/route.ts"), true);
  assert.equal(existsSync("app/api/community/threads/[id]/replies/route.ts"), true);
  assert.equal(existsSync("supabase/community-forum.sql"), true);

  const page = read("app/community/page.tsx");
  const forum = read("app/community/CommunityForum.tsx");
  const sql = read("supabase/community-forum.sql");

  assert.match(page, /Real island questions, answered together/);
  assert.match(forum, /Post anonymously/);
  assert.match(forum, /Reply anonymously/);
  assert.match(sql, /community_threads_status_last_reply_idx/);
  assert.match(sql, /enable row level security/);
});
