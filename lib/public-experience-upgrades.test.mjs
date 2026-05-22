import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("map listing cards expose quick trip and booking actions", () => {
  const source = readProjectFile("app/map/MapBrowser.tsx");

  assert.match(source, /Quick actions/);
  assert.match(source, /Save stop/);
  assert.match(source, /href=\{`\/book\?listing=\$\{pin\.id\}`\}/);
});

test("admin map cleanup includes priority filters", () => {
  const source = readProjectFile("app/admin/map-cleanup/page.tsx");

  assert.match(source, /Priority queue/);
  assert.match(source, /No photo/);
  assert.match(source, /No vendor/);
});

test("vendor profiles show stronger trust and listing context", () => {
  const source = readProjectFile("app/vendors/[id]/page.tsx");

  assert.match(source, /Vendor profile/);
  assert.match(source, /Profile at a glance/);
  assert.match(source, /Contact details shown/);
});

test("homepage and guest account surface clearer next steps", () => {
  const homepage = readProjectFile("app/page.tsx");
  const account = readProjectFile("app/account/page.tsx");

  assert.match(homepage, /Explore by category/);
  assert.match(account, /Trip dashboard/);
  assert.match(account, /Plan another trip/);
});
