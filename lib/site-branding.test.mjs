import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultSiteBranding,
  logoShapeClasses,
  logoSizeClasses,
  normalizeSiteBranding,
} from "./site-branding.ts";

test("normalizes saved site branding settings", () => {
  assert.deepEqual(
    normalizeSiteBranding({
      logoUrl: " https://example.com/logo.png ",
      logoSize: "large",
      logoShape: "circle",
    }),
    {
      logoUrl: "https://example.com/logo.png",
      logoSize: "large",
      logoShape: "circle",
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
