import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);

function readProjectFile(path) {
  return readFileSync(new URL(path, root), "utf8");
}

test("homepage uses premium Framer Motion travel-marketplace animations", () => {
  const source = readProjectFile("app/page.tsx");

  assert.match(source, /framer-motion/);
  assert.match(source, /useReducedMotion/);
  assert.match(source, /motion\.main/);
  assert.match(source, /heroContainerVariants/);
  assert.match(source, /marketplaceSearchVariants/);
  assert.match(source, /listingCardVariants/);
  assert.match(source, /categoryCardVariants/);
  assert.match(source, /viewport=\{\{ once: true/);
});

test("booking chat drawer has a smooth motion entrance", () => {
  const source = readProjectFile("app/BookingChatDrawer.tsx");

  assert.match(source, /AnimatePresence/);
  assert.match(source, /motion\.aside/);
  assert.match(source, /chatDrawerVariants/);
});
