import Link from "next/link";

type GuestDesktopNavProps = {
  variant?: "light" | "solid";
  includeHome?: boolean;
  includeAccount?: boolean;
  includeBusiness?: boolean;
  className?: string;
};

const mainItems = [
  { href: "/tours", label: "Experiences" },
  { href: "/map", label: "Map" },
  { href: "/concierge", label: "Ask Roa" },
  { href: "/community", label: "Community" },
];

const moreItems = [
  { href: "/hotels", label: "Hotels & Stays" },
  { href: "/transport", label: "Transportation" },
  { href: "/vendors", label: "Vendors" },
  { href: "/support", label: "Support" },
];

export default function GuestDesktopNav({
  variant = "solid",
  includeHome = true,
  includeAccount = true,
  includeBusiness = true,
  className = "",
}: GuestDesktopNavProps) {
  const isLight = variant === "light";
  const linkClass = isLight
    ? "rounded-full border border-white/12 bg-white/[0.1] px-3 py-2 text-white shadow-lg shadow-black/10 backdrop-blur transition hover:bg-white/15"
    : "rounded-xl bg-white px-4 py-2 text-[#0B3C5D] shadow transition hover:bg-[#EEF7F6]";
  const primaryClass = isLight
    ? "rounded-full bg-white px-4 py-2 text-[#071F2F] shadow-lg shadow-black/10 transition hover:bg-[#EEF7F6]"
    : "rounded-xl bg-[#00A8A8] px-4 py-2 text-white shadow transition hover:bg-[#078E8E]";
  const menuClass = isLight
    ? "absolute right-0 z-50 mt-2 grid min-w-56 gap-1 rounded-2xl border border-white/20 bg-[#071F2F] p-2 text-white shadow-2xl shadow-black/20"
    : "absolute right-0 z-50 mt-2 grid min-w-56 gap-1 rounded-2xl border border-[#071F2F]/10 bg-white p-2 text-[#071F2F] shadow-2xl shadow-[#071F2F]/15";
  const menuItemClass = isLight
    ? "rounded-xl px-3 py-2 hover:bg-white/10"
    : "rounded-xl px-3 py-2 hover:bg-[#EEF7F6]";

  return (
    <nav
      aria-label="Guest desktop navigation"
      className={`hidden flex-wrap items-center justify-end gap-2 text-sm font-bold sm:flex ${className}`}
    >
      {includeHome ? (
        <Link href="/" className={linkClass}>
          Home
        </Link>
      ) : null}
      {mainItems.map((item) => (
        <Link key={item.href} href={item.href} className={linkClass}>
          {item.label}
        </Link>
      ))}
      <details className="group relative">
        <summary className={`${linkClass} block cursor-pointer list-none`}>
          More
        </summary>
        <div className={menuClass}>
          {moreItems.map((item) => (
            <Link key={item.href} href={item.href} className={menuItemClass}>
              {item.label}
            </Link>
          ))}
        </div>
      </details>
      {includeAccount ? (
        <Link href="/account" className={linkClass}>
          My trips
        </Link>
      ) : null}
      {includeBusiness ? (
        <Link href="/vendor/signup" className={primaryClass}>
          List your business
        </Link>
      ) : null}
    </nav>
  );
}
