import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalsCss = readFileSync("app/globals.css", "utf8");
const homepage = readFileSync("app/page.tsx", "utf8");
const homeListingCard = readFileSync("app/HomeListingCard.tsx", "utf8");
const categoryPage = readFileSync("app/category-page.tsx", "utf8");
const emptyState = readFileSync("app/EmptyState.tsx", "utf8");
const mapPage = readFileSync("app/map/page.tsx", "utf8");
const signInPage = readFileSync("app/signin/page.tsx", "utf8");
const vendorLoginPage = readFileSync("app/vendor/login/page.tsx", "utf8");
const vendorSignupPage = readFileSync("app/vendor/signup/page.tsx", "utf8");
const adminLoginPage = readFileSync("app/admin/login/page.tsx", "utf8");
const conciergePage = readFileSync("app/concierge/page.tsx", "utf8");
const accountPage = readFileSync("app/account/page.tsx", "utf8");
const adminNav = readFileSync("app/admin/AdminNav.tsx", "utf8");

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
    ".brand-shell",
    ".brand-topbar",
    ".brand-nav-pills",
    ".brand-auth-card",
    ".brand-workspace-nav",
    ".brand-empty-state",
    ".brand-skeleton",
  ].forEach((selector) => {
    assert.match(globalsCss, new RegExp(selector.replace(".", "\\.")));
  });
});

test("public pages use shared brand-system classes", () => {
  assert.match(homepage, /brand-page/);
  assert.match(homepage, /brand-button-primary/);
  assert.match(homeListingCard, /brand-card-lift/);
  assert.match(categoryPage, /brand-hero-panel/);
  assert.match(categoryPage, /brand-card-lift/);
  assert.match(mapPage, /brand-badge/);
  assert.match(emptyState, /brand-empty-state/);
});

test("account, access, vendor, admin, and Roa pages share the luxury shell", () => {
  [signInPage, vendorLoginPage, vendorSignupPage, adminLoginPage, conciergePage].forEach(
    (page) => {
      assert.match(page, /brand-page/);
      assert.match(page, /brand-shell/);
      assert.match(page, /brand-topbar/);
      assert.match(page, /brand-auth-card|brand-hero-panel|brand-card/);
    },
  );

  assert.match(accountPage, /brand-page/);
  assert.match(accountPage, /brand-topbar/);
  assert.match(adminNav, /brand-workspace-nav/);
});
