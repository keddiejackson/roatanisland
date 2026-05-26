export const logoSizes = ["small", "medium", "large"] as const;
export const logoShapes = ["original", "rounded", "circle", "square"] as const;
export const logoFits = ["contain", "cover", "fill"] as const;
export const logoPositions = ["center", "top", "bottom", "left", "right"] as const;
export const logoShadows = ["none", "soft", "strong"] as const;

export type LogoSize = (typeof logoSizes)[number];
export type LogoShape = (typeof logoShapes)[number];
export type LogoFit = (typeof logoFits)[number];
export type LogoPosition = (typeof logoPositions)[number];
export type LogoShadow = (typeof logoShadows)[number];
export type LogoPlacement = "site" | "chat" | "email" | "favicon";

export type SiteBranding = {
  logoUrl: string;
  logoSize: LogoSize;
  logoShape: LogoShape;
  logoWidthPx: number;
  logoHeightPx: number;
  logoFit: LogoFit;
  logoPosition: LogoPosition;
  logoPaddingPx: number;
  logoRadiusPx: number;
  logoBackgroundColor: string;
  logoBorderColor: string;
  logoBorderWidthPx: number;
  logoShadow: LogoShadow;
  logoOpacity: number;
  logoRotateDeg: number;
  logoScale: number;
  showCustomLogoOnSite: boolean;
  showCustomLogoInChat: boolean;
  showCustomLogoInEmail: boolean;
  showCustomLogoAsFavicon: boolean;
};

export const defaultSiteBranding: SiteBranding = {
  logoUrl: "",
  logoSize: "medium",
  logoShape: "original",
  logoWidthPx: 240,
  logoHeightPx: 72,
  logoFit: "contain",
  logoPosition: "center",
  logoPaddingPx: 0,
  logoRadiusPx: 0,
  logoBackgroundColor: "#ffffff",
  logoBorderColor: "#ffffff",
  logoBorderWidthPx: 0,
  logoShadow: "none",
  logoOpacity: 1,
  logoRotateDeg: 0,
  logoScale: 1,
  showCustomLogoOnSite: true,
  showCustomLogoInChat: true,
  showCustomLogoInEmail: true,
  showCustomLogoAsFavicon: true,
};

const logoSizeDefaults: Record<
  LogoSize,
  Pick<SiteBranding, "logoWidthPx" | "logoHeightPx">
> = {
  small: { logoWidthPx: 160, logoHeightPx: 52 },
  medium: { logoWidthPx: 240, logoHeightPx: 72 },
  large: { logoWidthPx: 340, logoHeightPx: 96 },
};

const logoShapeDefaults: Record<
  LogoShape,
  Pick<SiteBranding, "logoFit" | "logoRadiusPx">
> = {
  original: { logoFit: "contain", logoRadiusPx: 0 },
  rounded: { logoFit: "contain", logoRadiusPx: 18 },
  circle: { logoFit: "cover", logoRadiusPx: 999 },
  square: { logoFit: "contain", logoRadiusPx: 14 },
};

const logoPositionValues: Record<LogoPosition, string> = {
  center: "center center",
  top: "center top",
  bottom: "center bottom",
  left: "left center",
  right: "right center",
};

const logoShadowValues: Record<LogoShadow, string> = {
  none: "none",
  soft: "0 18px 45px rgba(8, 42, 68, 0.16)",
  strong: "0 26px 70px rgba(8, 42, 68, 0.28)",
};

function isLogoSize(value: unknown): value is LogoSize {
  return typeof value === "string" && logoSizes.includes(value as LogoSize);
}

function isLogoShape(value: unknown): value is LogoShape {
  return typeof value === "string" && logoShapes.includes(value as LogoShape);
}

function isLogoFit(value: unknown): value is LogoFit {
  return typeof value === "string" && logoFits.includes(value as LogoFit);
}

function isLogoPosition(value: unknown): value is LogoPosition {
  return (
    typeof value === "string" && logoPositions.includes(value as LogoPosition)
  );
}

function isLogoShadow(value: unknown): value is LogoShadow {
  return typeof value === "string" && logoShadows.includes(value as LogoShadow);
}

function normalizeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, numericValue));
}

function normalizeWholeNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  return Math.round(normalizeNumber(value, fallback, min, max));
}

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const color = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(color) ? color : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeSiteBranding(value: unknown): SiteBranding {
  if (!value || typeof value !== "object") {
    return defaultSiteBranding;
  }

  const settings = value as Record<string, unknown>;
  const logoSize = isLogoSize(settings.logoSize)
    ? settings.logoSize
    : defaultSiteBranding.logoSize;
  const logoShape = isLogoShape(settings.logoShape)
    ? settings.logoShape
    : defaultSiteBranding.logoShape;
  const sizeDefaults = logoSizeDefaults[logoSize];
  const shapeDefaults = logoShapeDefaults[logoShape];

  return {
    logoUrl: typeof settings.logoUrl === "string" ? settings.logoUrl.trim() : "",
    logoSize,
    logoShape,
    logoWidthPx: normalizeWholeNumber(
      settings.logoWidthPx,
      sizeDefaults.logoWidthPx,
      24,
      2400,
    ),
    logoHeightPx: normalizeWholeNumber(
      settings.logoHeightPx,
      sizeDefaults.logoHeightPx,
      24,
      1200,
    ),
    logoFit: isLogoFit(settings.logoFit)
      ? settings.logoFit
      : shapeDefaults.logoFit,
    logoPosition: isLogoPosition(settings.logoPosition)
      ? settings.logoPosition
      : defaultSiteBranding.logoPosition,
    logoPaddingPx: normalizeWholeNumber(
      settings.logoPaddingPx,
      defaultSiteBranding.logoPaddingPx,
      0,
      240,
    ),
    logoRadiusPx: normalizeWholeNumber(
      settings.logoRadiusPx,
      shapeDefaults.logoRadiusPx,
      0,
      2000,
    ),
    logoBackgroundColor: normalizeHexColor(
      settings.logoBackgroundColor,
      defaultSiteBranding.logoBackgroundColor,
    ),
    logoBorderColor: normalizeHexColor(
      settings.logoBorderColor,
      defaultSiteBranding.logoBorderColor,
    ),
    logoBorderWidthPx: normalizeWholeNumber(
      settings.logoBorderWidthPx,
      defaultSiteBranding.logoBorderWidthPx,
      0,
      80,
    ),
    logoShadow: isLogoShadow(settings.logoShadow)
      ? settings.logoShadow
      : defaultSiteBranding.logoShadow,
    logoOpacity: normalizeNumber(
      settings.logoOpacity,
      defaultSiteBranding.logoOpacity,
      0.25,
      1,
    ),
    logoRotateDeg: normalizeWholeNumber(
      settings.logoRotateDeg,
      defaultSiteBranding.logoRotateDeg,
      -180,
      180,
    ),
    logoScale: normalizeNumber(
      settings.logoScale,
      defaultSiteBranding.logoScale,
      0.1,
      4,
    ),
    showCustomLogoOnSite: normalizeBoolean(
      settings.showCustomLogoOnSite,
      defaultSiteBranding.showCustomLogoOnSite,
    ),
    showCustomLogoInChat: normalizeBoolean(
      settings.showCustomLogoInChat,
      defaultSiteBranding.showCustomLogoInChat,
    ),
    showCustomLogoInEmail: normalizeBoolean(
      settings.showCustomLogoInEmail,
      defaultSiteBranding.showCustomLogoInEmail,
    ),
    showCustomLogoAsFavicon: normalizeBoolean(
      settings.showCustomLogoAsFavicon,
      defaultSiteBranding.showCustomLogoAsFavicon,
    ),
  };
}

export const logoSizeClasses: Record<LogoSize, string> = {
  small: "h-10 max-w-[180px]",
  medium: "h-14 max-w-[260px]",
  large: "h-20 max-w-[360px]",
};

export const logoShapeClasses: Record<LogoShape, string> = {
  original: "w-auto object-contain",
  rounded: "w-auto rounded-xl object-contain",
  circle: "aspect-square w-auto rounded-full object-cover",
  square: "aspect-square w-auto rounded-lg bg-white object-contain",
};

export function logoFrameStyle(branding: SiteBranding) {
  return {
    alignItems: "center",
    backgroundColor: branding.logoBackgroundColor,
    border: `${branding.logoBorderWidthPx}px solid ${branding.logoBorderColor}`,
    borderRadius: `${branding.logoRadiusPx}px`,
    boxShadow: logoShadowValues[branding.logoShadow],
    display: "inline-flex",
    flexShrink: 0,
    height: `${branding.logoHeightPx}px`,
    justifyContent: "center",
    overflow: "hidden",
    padding: `${branding.logoPaddingPx}px`,
    transform: `rotate(${branding.logoRotateDeg}deg) scale(${branding.logoScale})`,
    width: `${branding.logoWidthPx}px`,
  };
}

export function logoImageStyle(branding: SiteBranding) {
  return {
    display: "block",
    height: "100%",
    objectFit: branding.logoFit,
    objectPosition: logoPositionValues[branding.logoPosition],
    opacity: branding.logoOpacity,
    width: "100%",
  };
}

export function shouldUseCustomLogo(
  branding: SiteBranding,
  placement: LogoPlacement,
) {
  if (!branding.logoUrl) {
    return false;
  }

  if (placement === "site") return branding.showCustomLogoOnSite;
  if (placement === "chat") return branding.showCustomLogoInChat;
  if (placement === "email") return branding.showCustomLogoInEmail;
  return branding.showCustomLogoAsFavicon;
}

export function logoIconFrameStyle(branding: SiteBranding) {
  const iconRadius =
    branding.logoRadiusPx >= 999
      ? branding.logoRadiusPx
      : Math.min(branding.logoRadiusPx, 24);

  return {
    alignItems: "center",
    backgroundColor: branding.logoBackgroundColor,
    border: `${Math.min(branding.logoBorderWidthPx, 4)}px solid ${
      branding.logoBorderColor
    }`,
    borderRadius: `${iconRadius}px`,
    display: "flex",
    height: "100%",
    justifyContent: "center",
    overflow: "hidden",
    padding: `${Math.min(branding.logoPaddingPx, 10)}px`,
    width: "100%",
  };
}

export function logoIconImageStyle(branding: SiteBranding) {
  return {
    height: "100%",
    objectFit: branding.logoFit,
    objectPosition: logoPositionValues[branding.logoPosition],
    opacity: branding.logoOpacity,
    transform: `rotate(${branding.logoRotateDeg}deg) scale(${branding.logoScale})`,
    width: "100%",
  };
}
