import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

function read(path) {
  return readFileSync(path, "utf8");
}

test("booking status page is a private luxury trip lounge", () => {
  const source = read("app/book/status/[id]/page.tsx");

  assert.match(source, /Private trip lounge/);
  assert.match(source, /Everything you need before, during, and after your Roatan day/);
  assert.match(source, /Itinerary essentials/);
  assert.match(source, /Messages and concierge/);
  assert.match(source, /Travel confidence/);
  assert.match(source, /Need a change\?/);
  assert.match(source, /Open guest chat/);
  assert.match(source, /\/account#guest-plans/);
  assert.match(source, /\/support/);
  assert.doesNotMatch(source, /Trip command center/);
});

test("printable trip packet feels premium and travel ready", () => {
  const source = read("app/book/trip/[id]/page.tsx");

  assert.match(source, /Private day packet/);
  assert.match(source, /Luxury trip packet/);
  assert.match(source, /Open guest chat/);
  assert.match(source, /Travel confidence/);
  assert.match(source, /Save this page/);
});

test("trip packet helper uses better luxury fallback language", () => {
  const source = read("lib/trip-packet.ts");

  assert.match(source, /Your Roatan experience/);
  assert.match(source, /Private day notes/);
  assert.doesNotMatch(source, /Roatan booking trip packet/);
});
