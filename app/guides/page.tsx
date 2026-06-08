import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
import { roatanGuides } from "@/lib/roatan-guides";

export const metadata: Metadata = {
  title: "Roatan Travel Guides | RoatanIsland.life",
  description:
    "Concierge-style Roatan guides for cruise days, private boat days, airport pickup, family planning, and beach routes.",
};

export default function GuidesPage() {
  return (
    <main className="brand-page min-h-screen">
      <section className="px-4 py-6 text-white sm:px-6 sm:py-10">
        <div className="mx-auto max-w-7xl">
          <header className="grid gap-4 sm:flex sm:items-center sm:justify-between">
            <SiteLogo variant="light" />
            <div className="mobile-scroll-row sm:flex sm:flex-wrap sm:gap-2">
              <Link href="/" className="brand-button-secondary shrink-0">
                Home
              </Link>
              <Link href="/concierge" className="brand-button-ghost shrink-0">
                Ask Roa
              </Link>
            </div>
          </header>

          <div className="brand-hero-panel mt-6 px-5 py-10 sm:mt-8 sm:px-10 sm:py-16">
            <p className="brand-eyebrow-gold">Roatan planning library</p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-7xl">
              Calm, polished Roatan plans before you book.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
              Use these concierge-style guides to understand timing, pickup,
              trust signals, and the kind of experience that fits your day.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-5 md:grid-cols-2">
          {roatanGuides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guides/${guide.slug}`}
              className="brand-card-lift group p-5 sm:p-6"
            >
              <p className="brand-eyebrow">{guide.eyebrow}</p>
              <h2 className="mt-3 text-2xl font-black leading-tight text-[#0B3C5D] sm:text-3xl">
                {guide.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                {guide.summary}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {guide.bestFor.map((item) => (
                  <span key={item} className="brand-badge brand-badge-teal">
                    {item}
                  </span>
                ))}
              </div>
              <p className="mt-6 text-sm font-black text-[#007B7B]">
                Read guide
              </p>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
