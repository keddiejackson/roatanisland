"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  useMobileSiteControls,
  useSiteBranding,
} from "@/app/SiteBrandingProvider";
import {
  brandingForPlacement,
  logoFrameStyle,
  logoImageStyle,
  shouldUseCustomLogo,
  type SiteBranding,
} from "@/lib/site-branding";

type SiteLogoProps = {
  href?: string;
  variant?: "light" | "dark";
  compact?: boolean;
  priority?: boolean;
  className?: string;
};

export default function SiteLogo({
  href = "/",
  variant = "dark",
  compact = false,
  priority = false,
  className = "",
}: SiteLogoProps) {
  const branding = useSiteBranding();
  const mobileControls = useMobileSiteControls();
  const siteBranding = brandingForPlacement(branding, "site");
  const mobileLogoBranding: SiteBranding = mobileControls.useMobileLogoOverrides
    ? {
        ...siteBranding,
        logoWidthPx: mobileControls.mobileLogoWidthPx,
        logoHeightPx: mobileControls.mobileLogoHeightPx,
        logoPaddingPx: mobileControls.mobileLogoPaddingPx,
        logoRadiusPx: mobileControls.mobileLogoRadiusPx,
        logoBorderWidthPx: mobileControls.mobileLogoBorderWidthPx,
        logoOpacity: mobileControls.mobileLogoOpacity,
        logoRotateDeg: mobileControls.mobileLogoRotateDeg,
        logoScale: mobileControls.mobileLogoScale,
        logoFit: mobileControls.mobileLogoFit,
        logoPosition: mobileControls.mobileLogoPosition,
        logoShadow: mobileControls.mobileLogoShadow,
        logoBackgroundColor: mobileControls.mobileLogoBackgroundColor,
        logoBorderColor: mobileControls.mobileLogoBorderColor,
      }
    : siteBranding;
  const [failedLogoUrl, setFailedLogoUrl] = useState("");
  const showCustomLogo =
    shouldUseCustomLogo(branding, "site") &&
    failedLogoUrl !== siteBranding.logoUrl;
  const variantClass =
    showCustomLogo
      ? "rounded-xl"
      : variant === "light"
      ? "rounded-xl bg-white/95 px-3 py-2 shadow-lg shadow-black/10"
      : "rounded-xl";
  const textClass =
    variant === "light" ? "text-[#082A44]" : "text-[#082A44]";
  const markClass = compact ? "h-11 w-11" : "h-12 w-12";
  const renderCustomLogo = (logoBranding: SiteBranding) => (
    <span style={logoFrameStyle(logoBranding)}>
      {/* Uploaded logos can come from any public Supabase asset URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoBranding.logoUrl}
        alt="Roatan Island Life"
        style={logoImageStyle(logoBranding)}
        onError={() => setFailedLogoUrl(siteBranding.logoUrl)}
      />
    </span>
  );

  return (
    <Link
      href={href}
      aria-label="Roatan Island Life home"
      className={`inline-flex shrink-0 items-center gap-3 ${variantClass} ${className}`}
    >
      {showCustomLogo ? (
        <>
          <span
            className={
              mobileControls.useMobileLogoOverrides ? "hidden sm:inline" : ""
            }
          >
            {renderCustomLogo(siteBranding)}
          </span>
          {mobileControls.useMobileLogoOverrides ? (
            <span className="sm:hidden">
              {renderCustomLogo(mobileLogoBranding)}
            </span>
          ) : null}
        </>
      ) : (
        <>
          <Image
            src="/images/roatan-island-life-mark.svg"
            alt="Roatan Island Life"
            width={48}
            height={48}
            priority={priority}
            className={markClass}
          />
          {!compact && (
            <span className="leading-none">
              <span
                className={`block text-lg font-black tracking-tight ${textClass}`}
              >
                Roatan
              </span>
              <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.28em] text-[#C29414]">
                Island Life
              </span>
            </span>
          )}
        </>
      )}
    </Link>
  );
}
