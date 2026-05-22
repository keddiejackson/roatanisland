import Link from "next/link";
import SiteLogo from "@/app/SiteLogo";

const footerLinks = [
  { href: "/map", label: "Map" },
  { href: "/tours", label: "Tours" },
  { href: "/hotels", label: "Hotels" },
  { href: "/transport", label: "Transport" },
  { href: "/vendors", label: "Vendors" },
  { href: "/signin", label: "Sign in" },
  { href: "/vendor/signup", label: "List your business" },
];

export default function SiteFooter() {
  return (
    <footer className="bg-[#071F2F] px-5 py-10 text-white sm:px-6">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <SiteLogo variant="light" />
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">
            RoatanIsland.life helps travelers discover local operators, plan by
            island area, and request bookings with clearer expectations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl flex-wrap justify-between gap-3 border-t border-white/10 pt-6 text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
        <span>Roatan Island Life</span>
        <span>Built for travelers and local operators</span>
      </div>
    </footer>
  );
}
