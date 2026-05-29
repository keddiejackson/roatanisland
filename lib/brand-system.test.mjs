import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalsCss = readFileSync("app/globals.css", "utf8");
const homepage = readFileSync("app/page.tsx", "utf8");
const categoryPage = readFileSync("app/category-page.tsx", "utf8");
const emptyState = readFileSync("app/EmptyState.tsx", "utf8");
const mapPage = readFileSync("app/map/page.tsx", "utf8");

test("premium brand system exposes reusable public-site classes", () => {
  [
    ".brand-page",
    ".brand-eyebrow",
    ".brand-display",
    ".brand-button-primary",
    ".brand-button-secondary",
    ".brand-card",
    ".brand-card-lift",
    ".brand-badge",
    ".brand-input",
    ".brand-empty-state",
    ".brand-skeleton",
  ].forEach((selector) => {
    assert.match(globalsCss, new RegExp(selector.replace(".", "\\.")));
  });
});

test("public pages use shared brand-system classes", () => {
  assert.match(homepage, /brand-page/);
  assert.match(homepage, /brand-button-primary/);
  assert.match(homepage, /brand-card-lift/);
  assert.match(categoryPage, /brand-hero-panel/);
  assert.match(categoryPage, /brand-card-lift/);
  assert.match(mapPage, /brand-badge/);
  assert.match(emptyState, /brand-empty-state/);
});
