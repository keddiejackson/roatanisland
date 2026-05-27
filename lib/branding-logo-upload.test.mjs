import assert from "node:assert/strict";
import test from "node:test";
import {
  brandingLogoPathFromPublicUrl,
  formatBrandingMediaItems,
  getBrandingLogoStoragePath,
  cleanBrandingLogoFileName,
  validateBrandingLogoFile,
} from "./branding-logo-upload.ts";

test("accepts supported logo image files under the size limit", () => {
  const logo = new File(["logo"], "roatan-logo.png", { type: "image/png" });

  assert.equal(validateBrandingLogoFile(logo), null);
});

test("rejects unsupported logo files", () => {
  const logo = new File(["logo"], "roatan-logo.svg", {
    type: "image/svg+xml",
  });

  assert.equal(
    validateBrandingLogoFile(logo),
    "Please upload a JPG, PNG, WebP, or GIF logo.",
  );
});

test("rejects logos larger than five megabytes", () => {
  const logo = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", {
    type: "image/png",
  });

  assert.equal(
    validateBrandingLogoFile(logo),
    "Please upload a logo smaller than 5 MB.",
  );
});

test("cleans logo file names for storage paths", () => {
  assert.equal(
    cleanBrandingLogoFileName(" My Roatan Logo 2026!.PNG "),
    "my-roatan-logo-2026-.png",
  );
});

test("builds safe branding logo storage paths", () => {
  assert.equal(
    getBrandingLogoStoragePath("logo.png"),
    "site-branding/logo.png",
  );
  assert.equal(
    getBrandingLogoStoragePath("site-branding/logo.png"),
    "site-branding/logo.png",
  );
  assert.equal(getBrandingLogoStoragePath("../logo.png"), null);
  assert.equal(getBrandingLogoStoragePath(""), null);
});

test("extracts branding logo paths from Supabase public URLs", () => {
  assert.equal(
    brandingLogoPathFromPublicUrl(
      "https://example.supabase.co/storage/v1/object/public/listing-images/site-branding/abc-logo.png",
    ),
    "site-branding/abc-logo.png",
  );
  assert.equal(
    brandingLogoPathFromPublicUrl("https://example.com/not-a-logo.png"),
    null,
  );
});

test("formats branding media items with public URLs", () => {
  const items = formatBrandingMediaItems(
    [
      {
        name: "older.png",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-02T00:00:00Z",
        metadata: { size: 120 },
      },
      {
        name: "newer.png",
        created_at: "2026-02-01T00:00:00Z",
        updated_at: "2026-02-02T00:00:00Z",
        metadata: { size: 240 },
      },
    ],
    (path) => `https://cdn.example/${path}`,
  );

  assert.deepEqual(
    items.map((item) => [item.name, item.path, item.url, item.size]),
    [
      [
        "newer.png",
        "site-branding/newer.png",
        "https://cdn.example/site-branding/newer.png",
        240,
      ],
      [
        "older.png",
        "site-branding/older.png",
        "https://cdn.example/site-branding/older.png",
        120,
      ],
    ],
  );
});
