import assert from "node:assert/strict";
import test from "node:test";
import {
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
