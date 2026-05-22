export const logoSizes = ["small", "medium", "large"] as const;
export const logoShapes = ["original", "rounded", "circle", "square"] as const;

export type LogoSize = (typeof logoSizes)[number];
export type LogoShape = (typeof logoShapes)[number];

export type SiteBranding = {
  logoUrl: string;
  logoSize: LogoSize;
  logoShape: LogoShape;
};

export const defaultSiteBranding: SiteBranding = {
  logoUrl: "",
  logoSize: "medium",
  logoShape: "original",
};

function isLogoSize(value: unknown): value is LogoSize {
  return typeof value === "string" && logoSizes.includes(value as LogoSize);
}

function isLogoShape(value: unknown): value is LogoShape {
  return typeof value === "string" && logoShapes.includes(value as LogoShape);
}

export function normalizeSiteBranding(value: unknown): SiteBranding {
  if (!value || typeof value !== "object") {
    return defaultSiteBranding;
  }

  const settings = value as Record<string, unknown>;

  return {
    logoUrl: typeof settings.logoUrl === "string" ? settings.logoUrl.trim() : "",
    logoSize: isLogoSize(settings.logoSize)
      ? settings.logoSize
      : defaultSiteBranding.logoSize,
    logoShape: isLogoShape(settings.logoShape)
      ? settings.logoShape
      : defaultSiteBranding.logoShape,
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
