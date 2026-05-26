import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { resolveBrandingIconSource } from "@/lib/site-icon-source";
import {
  brandingForPlacement,
  logoIconFrameStyle,
  logoIconImageStyle,
  logoUrlForPlacement,
  shouldUseCustomLogo,
} from "@/lib/site-branding";
import { getSiteBranding } from "@/lib/site-branding-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

async function getFallbackLogoSource() {
  const fallbackLogo = await readFile(
    join(process.cwd(), "public", "images", "roatan-island-life-mark.svg"),
  );

  return `data:image/svg+xml;base64,${fallbackLogo.toString("base64")}`;
}

async function getLogoIconData() {
  const fallbackLogoSource = await getFallbackLogoSource();
  const branding = await getSiteBranding();
  const faviconBranding = brandingForPlacement(branding, "favicon");
  const logoSource = await resolveBrandingIconSource(
    shouldUseCustomLogo(branding, "favicon")
      ? logoUrlForPlacement(branding, "favicon")
      : "",
    fallbackLogoSource,
    (url) => fetch(url, { cache: "no-store" }),
  );

  return { branding: faviconBranding, logoSource };
}

export default async function Icon() {
  const { branding, logoSource } = await getLogoIconData();

  return new ImageResponse(
    (
      <div style={logoIconFrameStyle(branding)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSource} alt="" style={logoIconImageStyle(branding)} />
      </div>
    ),
    size,
  );
}
