import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("listing detail page has luxury booking sections", () => {
  const source = readProjectFile("app/listings/[id]/page.tsx");

  assert.match(source, /Luxury booking page/);
  assert.match(source, /Private island booking desk/);
  assert.match(source, /Price, deposit, and payment clarity/);
  assert.match(source, /What&apos;s included/);
  assert.match(source, /Guest messages/);
  assert.match(source, /Related island experiences/);
});

test("listing gallery uses premium image presentation", () => {
  const source = readProjectFile("app/listings/[id]/ListingGallery.tsx");

  assert.match(source, /Premium gallery/);
  assert.match(source, /View every detail/);
  assert.match(source, /rounded-\[1\.75rem\]/);
  assert.match(source, /group-hover:scale-105/);
});
