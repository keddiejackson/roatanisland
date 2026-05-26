import assert from "node:assert/strict";
import test from "node:test";
import * as branding from "./site-branding.ts";

const {
  defaultSiteBranding,
  logoShapeClasses,
  logoSizeClasses,
  normalizeSiteBranding,
} = branding;

test("normalizes saved site branding settings", () => {
  assert.deepEqual(
    normalizeSiteBranding({
      logoUrl: " https://example.com/logo.png ",
      logoSize: "large",
      logoShape: "circle",
    }),
    {
      logoUrl: "https://example.com/logo.png",
      siteLogoUrl: "",
      chatLogoUrl: "",
      emailLogoUrl: "",
      faviconLogoUrl: "",
      logoSize: "large",
      logoShape: "circle",
      logoWidthPx: 340,
      logoHeightPx: 96,
      logoFit: "cover",
      logoPosition: "center",
      logoPaddingPx: 0,
      logoRadiusPx: 999,
      logoBackgroundColor: "#ffffff",
      logoBorderColor: "#ffffff",
      logoBorderWidthPx: 0,
      logoShadow: "none",
      logoOpacity: 1,
      logoRotateDeg: 0,
      logoScale: 1,
      showCustomLogoOnSite: true,
      showCustomLogoInChat: true,
      showCustomLogoInEmail: true,
      showCustomLogoAsFavicon: true,
    },
  );
});

test("falls back when saved branding choices are invalid", () => {
  assert.deepEqual(
    normalizeSiteBranding({
      logoUrl: 123,
      logoSize: "huge",
      logoShape: "triangle",
    }),
    defaultSiteBranding,
  );
});

test("provides display classes for every saved logo choice", () => {
  assert.match(logoSizeClasses.small, /h-10/);
  assert.match(logoSizeClasses.medium, /h-14/);
  assert.match(logoSizeClasses.large, /h-20/);
  assert.match(logoShapeClasses.original, /object-contain/);
  assert.match(logoShapeClasses.rounded, /rounded-xl/);
  assert.match(logoShapeClasses.circle, /rounded-full/);
  assert.match(logoShapeClasses.square, /aspect-square/);
});

test("normalizes advanced logo editing controls safely", () => {
  assert.deepEqual(
    normalizeSiteBranding({
      logoUrl: "https://example.com/logo.png",
      logoSize: "small",
      logoShape: "rounded",
      logoWidthPx: 9999,
      logoHeightPx: "12",
      logoFit: "cover",
      logoPosition: "top",
      logoPaddingPx: -8,
      logoRadiusPx: 27,
      logoBackgroundColor: "transparent",
      logoBorderColor: "#123abc",
      logoBorderWidthPx: 99,
      logoShadow: "strong",
      logoOpacity: 2,
      logoRotateDeg: -99,
      logoScale: 0.1,
      showCustomLogoOnSite: false,
      showCustomLogoInChat: "yes",
      showCustomLogoInEmail: false,
      showCustomLogoAsFavicon: false,
    }),
    {
      logoUrl: "https://example.com/logo.png",
      siteLogoUrl: "",
      chatLogoUrl: "",
      emailLogoUrl: "",
      faviconLogoUrl: "",
      logoSize: "small",
      logoShape: "rounded",
      logoWidthPx: 2400,
      logoHeightPx: 24,
      logoFit: "cover",
      logoPosition: "top",
      logoPaddingPx: 0,
      logoRadiusPx: 27,
      logoBackgroundColor: "transparent",
      logoBorderColor: "#123abc",
      logoBorderWidthPx: 80,
      logoShadow: "strong",
      logoOpacity: 1,
      logoRotateDeg: -99,
      logoScale: 0.1,
      showCustomLogoOnSite: false,
      showCustomLogoInChat: true,
      showCustomLogoInEmail: false,
      showCustomLogoAsFavicon: false,
    },
  );
});

test("controls where the custom logo is used", () => {
  assert.equal(typeof branding.shouldUseCustomLogo, "function");

  const savedBranding = normalizeSiteBranding({
    logoUrl: "https://example.com/logo.png",
    showCustomLogoOnSite: false,
    showCustomLogoInChat: true,
    showCustomLogoInEmail: false,
    showCustomLogoAsFavicon: true,
  });

  assert.equal(branding.shouldUseCustomLogo(savedBranding, "site"), false);
  assert.equal(branding.shouldUseCustomLogo(savedBranding, "chat"), true);
  assert.equal(branding.shouldUseCustomLogo(savedBranding, "email"), false);
  assert.equal(branding.shouldUseCustomLogo(savedBranding, "favicon"), true);
});

test("uses location logo overrides before the main logo", () => {
  assert.equal(typeof branding.logoUrlForPlacement, "function");

  const savedBranding = normalizeSiteBranding({
    logoUrl: "https://example.com/main.png",
    siteLogoUrl: " https://example.com/site.png ",
    chatLogoUrl: "https://example.com/chat.png",
    emailLogoUrl: "https://example.com/email.png",
    faviconLogoUrl: "https://example.com/favicon.png",
  });

  assert.equal(
    branding.logoUrlForPlacement(savedBranding, "site"),
    "https://example.com/site.png",
  );
  assert.equal(
    branding.logoUrlForPlacement(savedBranding, "chat"),
    "https://example.com/chat.png",
  );
  assert.equal(
    branding.logoUrlForPlacement(savedBranding, "email"),
    "https://example.com/email.png",
  );
  assert.equal(
    branding.logoUrlForPlacement(savedBranding, "favicon"),
    "https://example.com/favicon.png",
  );
});

test("falls back to the main logo when a location logo is empty", () => {
  const savedBranding = normalizeSiteBranding({
    logoUrl: "https://example.com/main.png",
    chatLogoUrl: " ",
  });

  assert.equal(
    branding.logoUrlForPlacement(savedBranding, "chat"),
    "https://example.com/main.png",
  );
});

test("can use a location logo even when the main logo is empty", () => {
  const savedBranding = normalizeSiteBranding({
    logoUrl: "",
    chatLogoUrl: "https://example.com/chat.png",
    showCustomLogoInChat: true,
  });

  assert.equal(branding.shouldUseCustomLogo(savedBranding, "chat"), true);
  assert.equal(
    branding.logoUrlForPlacement(savedBranding, "chat"),
    "https://example.com/chat.png",
  );
});

test("builds logo frame and image styles from saved controls", () => {
  assert.equal(typeof branding.logoFrameStyle, "function");
  assert.equal(typeof branding.logoImageStyle, "function");

  const savedBranding = normalizeSiteBranding({
    logoUrl: "https://example.com/logo.png",
    logoWidthPx: 280,
    logoHeightPx: 92,
    logoFit: "cover",
    logoPosition: "left",
    logoPaddingPx: 10,
    logoRadiusPx: 22,
    logoBackgroundColor: "#f8fbff",
    logoBorderColor: "#0b3c5d",
    logoBorderWidthPx: 2,
    logoShadow: "soft",
    logoOpacity: 0.75,
    logoRotateDeg: 4,
    logoScale: 1.15,
  });

  assert.deepEqual(branding.logoFrameStyle(savedBranding), {
    alignItems: "center",
    backgroundColor: "#f8fbff",
    border: "2px solid #0b3c5d",
    borderRadius: "22px",
    boxShadow: "0 18px 45px rgba(8, 42, 68, 0.16)",
    display: "inline-flex",
    flexShrink: 0,
    height: "92px",
    justifyContent: "center",
    overflow: "hidden",
    padding: "10px",
    transform: "rotate(4deg) scale(1.15)",
    width: "280px",
  });

  assert.deepEqual(branding.logoImageStyle(savedBranding), {
    display: "block",
    height: "100%",
    objectFit: "cover",
    objectPosition: "left center",
    opacity: 0.75,
    width: "100%",
  });
});
