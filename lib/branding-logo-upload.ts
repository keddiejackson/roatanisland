const maxBrandingLogoFileSize = 5 * 1024 * 1024;
export const brandingLogoBucketName = "listing-images";
export const brandingLogoFolder = "site-branding";

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

export type BrandingStorageFile = {
  name: string;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: { size?: number | null } | null;
};

export type BrandingMediaItem = {
  name: string;
  path: string;
  url: string;
  createdAt: string | null;
  updatedAt: string | null;
  size: number | null;
};

export function getBrandingLogoStoragePath(nameOrPath: string) {
  const value = nameOrPath.trim().replaceAll("\\", "/");

  if (!value || value.includes("..")) {
    return null;
  }

  if (value.startsWith(`${brandingLogoFolder}/`)) {
    return value;
  }

  if (value.includes("/")) {
    return null;
  }

  return `${brandingLogoFolder}/${value}`;
}

export function brandingLogoPathFromPublicUrl(value: string) {
  try {
    const url = new URL(value);
    const marker = `/storage/v1/object/public/${brandingLogoBucketName}/${brandingLogoFolder}/`;
    const markerIndex = url.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    const fileName = decodeURIComponent(
      url.pathname.slice(markerIndex + marker.length),
    );

    return getBrandingLogoStoragePath(fileName);
  } catch {
    return null;
  }
}

export function formatBrandingMediaItems(
  files: BrandingStorageFile[],
  getPublicUrl: (path: string) => string,
): BrandingMediaItem[] {
  return files
    .map((file) => {
      const path = getBrandingLogoStoragePath(file.name);

      if (!path) return null;

      return {
        name: file.name,
        path,
        url: getPublicUrl(path),
        createdAt: file.created_at || null,
        updatedAt: file.updated_at || null,
        size:
          typeof file.metadata?.size === "number" ? file.metadata.size : null,
      };
    })
    .filter((item): item is BrandingMediaItem => Boolean(item))
    .sort((first, second) =>
      (second.createdAt || "").localeCompare(first.createdAt || ""),
    );
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
