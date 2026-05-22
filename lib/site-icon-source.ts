type IconSourceFetcher = (url: string) => Promise<Response>;

export async function resolveBrandingIconSource(
  logoUrl: string,
  fallbackLogoUrl: string,
  fetcher: IconSourceFetcher,
) {
  if (!logoUrl) {
    return fallbackLogoUrl;
  }

  try {
    const response = await fetcher(logoUrl);
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok || !contentType.startsWith("image/")) {
      return fallbackLogoUrl;
    }

    const bytes = Buffer.from(await response.arrayBuffer()).toString("base64");
    return `data:${contentType};base64,${bytes}`;
  } catch {
    return fallbackLogoUrl;
  }
}
