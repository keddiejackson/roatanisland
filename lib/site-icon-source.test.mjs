import assert from "node:assert/strict";
import test from "node:test";
import { resolveBrandingIconSource } from "./site-icon-source.ts";

const fallbackLogoUrl = "https://www.roatanisland.life/images/fallback.svg";

test("uses the fallback icon source without an uploaded logo", async () => {
  const result = await resolveBrandingIconSource("", fallbackLogoUrl, async () => {
    throw new Error("fetch should not run");
  });

  assert.equal(result, fallbackLogoUrl);
});

test("converts an uploaded icon image to a data URL", async () => {
  const result = await resolveBrandingIconSource(
    "https://example.com/logo.png",
    fallbackLogoUrl,
    async () =>
      new Response(new Uint8Array([1, 2]), {
        headers: { "content-type": "image/png" },
      }),
  );

  assert.equal(result, "data:image/png;base64,AQI=");
});

test("uses the fallback when an uploaded icon cannot be loaded", async () => {
  const result = await resolveBrandingIconSource(
    "https://example.com/logo.png",
    fallbackLogoUrl,
    async () => new Response("not found", { status: 404 }),
  );

  assert.equal(result, fallbackLogoUrl);
});
