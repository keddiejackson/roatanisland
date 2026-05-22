"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useSiteBranding } from "@/app/SiteBrandingProvider";
import { logoShapeClasses, logoSizeClasses } from "@/lib/site-branding";

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
  const [failedLogoUrl, setFailedLogoUrl] = useState("");
  const variantClass =
    variant === "light"
      ? "rounded-xl bg-white/95 px-3 py-2 shadow-lg shadow-black/10"
      : "rounded-xl";
  const textClass =
    variant === "light" ? "text-[#082A44]" : "text-[#082A44]";
  const markClass = compact ? "h-11 w-11" : "h-12 w-12";
  const showCustomLogo =
    Boolean(branding.logoUrl) && failedLogoUrl !== branding.logoUrl;

  return (
    <Link
      href={href}
      aria-label="Roatan Island Life home"
      className={`inline-flex shrink-0 items-center gap-3 ${variantClass} ${className}`}
    >
      {showCustomLogo ? (
        // Uploaded logos can come from any public Supabase asset URL.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={branding.logoUrl}
          alt="Roatan Island Life"
          className={`${logoSizeClasses[branding.logoSize]} ${logoShapeClasses[branding.logoShape]}`}
          onError={() => setFailedLogoUrl(branding.logoUrl)}
        />
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
