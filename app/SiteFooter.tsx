import Link from "next/link";
import SiteLogo from "@/app/SiteLogo";

const footerLinks = [
  { href: "/tours", label: "Experiences" },
  { href: "/map", label: "Map" },
  { href: "/concierge", label: "Ask Roa" },
  { href: "/community", label: "Community" },
  { href: "/guides", label: "Guides" },
  { href: "/hotels", label: "Hotels & Stays" },
  { href: "/transport", label: "Transportation" },
  { href: "/vendors", label: "Vendors" },
  { href: "/support", label: "Support" },
  { href: "/signin", label: "Sign in" },
  { href: "/vendor/signup", label: "List your business" },
];

export default function SiteFooter() {
  return (
    <footer className="bg-[#071F2F] px-4 py-8 text-white sm:px-6 sm:py-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <SiteLogo variant="light" />
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">
            RoatanIsland.life helps travelers discover local operators, plan by
            island area, and request trusted experiences with clearer expectations.
          </p>
        </div>
        <div className="mobile-scroll-row lg:flex lg:flex-wrap lg:justify-end">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl flex-col gap-3 border-t border-white/10 pt-6 text-xs font-semibold uppercase tracking-[0.16em] text-white/45 sm:flex-row sm:flex-wrap sm:justify-between">
        <span>Roatan Island Life</span>
        <span>Built for travelers and local operators</span>
      </div>
    </footer>
  );
}
