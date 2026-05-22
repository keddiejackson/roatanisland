const maxBrandingLogoFileSize = 5 * 1024 * 1024;

const allowedBrandingLogoTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function cleanBrandingLogoFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function validateBrandingLogoFile(logo: File) {
  if (!allowedBrandingLogoTypes.has(logo.type)) {
    return "Please upload a JPG, PNG, WebP, or GIF logo.";
  }

  if (logo.size > maxBrandingLogoFileSize) {
    return "Please upload a logo smaller than 5 MB.";
  }

  return null;
}
