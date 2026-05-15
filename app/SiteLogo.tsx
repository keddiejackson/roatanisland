import Image from "next/image";
import Link from "next/link";

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
  const variantClass =
    variant === "light"
      ? "rounded-lg bg-white/95 px-3 py-2 shadow-lg shadow-black/10"
      : "rounded-lg";
  const imageClass = compact ? "h-11 w-11" : "h-12 w-auto";

  return (
    <Link
      href={href}
      aria-label="Roatan Island Life home"
      className={`inline-flex shrink-0 items-center ${variantClass} ${className}`}
    >
      <Image
        src={
          compact
            ? "/images/roatan-island-life-mark.svg"
            : "/images/roatan-island-life-logo.svg"
        }
        alt="Roatan Island Life"
        width={compact ? 48 : 210}
        height={compact ? 48 : 64}
        priority={priority}
        className={imageClass}
      />
    </Link>
  );
}
