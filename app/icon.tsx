import { ImageResponse } from "next/og";
import { resolveBrandingIconSource } from "@/lib/site-icon-source";
import { normalizeSiteBranding } from "@/lib/site-branding";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.roatanisland.life";
const fallbackLogoSource = `${siteUrl}/images/roatan-island-life-mark.svg`;

async function getLogoSource() {
  const { data } = await supabaseServer
    .from("site_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();
  const branding = normalizeSiteBranding(data?.value);

  return resolveBrandingIconSource(
    branding.logoUrl,
    fallbackLogoSource,
    (url) => fetch(url, { cache: "no-store" }),
  );
}

export default async function Icon() {
  const logoSource = await getLogoSource();

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#ffffff",
          borderRadius: 16,
          display: "flex",
          height: "100%",
          justifyContent: "center",
          overflow: "hidden",
          width: "100%",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSource}
          alt=""
          style={{
            height: "100%",
            objectFit: "contain",
            width: "100%",
          }}
        />
      </div>
    ),
    size,
  );
}
