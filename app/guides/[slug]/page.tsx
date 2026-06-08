import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
import { getRoatanGuide, roatanGuides } from "@/lib/roatan-guides";

export function generateStaticParams() {
  return roatanGuides.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getRoatanGuide(slug);

  if (!guide) {
    return {
      title: "Roatan guide not found | RoatanIsland.life",
    };
  }

  return {
    title: `${guide.title} | RoatanIsland.life`,
    description: guide.summary,
  };
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getRoatanGuide(slug);

  if (!guide) {
    notFound();
  }

  return (
    <main className="brand-page min-h-screen">
      <section className="px-4 py-6 text-white sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <header className="grid gap-4 sm:flex sm:items-center sm:justify-between">
            <SiteLogo variant="light" />
            <div className="mobile-scroll-row sm:flex sm:flex-wrap sm:gap-2">
              <Link href="/guides" className="brand-button-secondary shrink-0">
                Guides
              </Link>
              <Link href="/concierge" className="brand-button-ghost shrink-0">
                Ask Roa
              </Link>
            </div>
          </header>

          <article className="brand-hero-panel mt-6 px-5 py-10 sm:mt-8 sm:px-10 sm:py-16">
            <p className="brand-eyebrow-gold">{guide.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-7xl">
              {guide.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
              {guide.summary}
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              {guide.bestFor.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black"
                >
                  {item}
                </span>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-5">
          {guide.sections.map((section, index) => (
            <article key={section.title} className="brand-card p-5 sm:p-7">
              <p className="brand-eyebrow">Step {index + 1}</p>
              <h2 className="mt-2 text-2xl font-black text-[#0B3C5D] sm:text-3xl">
                {section.title}
              </h2>
              <p className="mt-3 text-base leading-7 text-gray-600">
                {section.body}
              </p>
              <div className="mt-5 grid gap-3">
                {section.bullets.map((bullet) => (
                  <p
                    key={bullet}
                    className="rounded-2xl bg-[#EEF7F6] px-4 py-3 text-sm font-bold leading-6 text-[#0B3C5D]"
                  >
                    {bullet}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="brand-hero-panel mt-8 grid gap-5 p-5 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="brand-eyebrow-gold">Ready when you are</p>
            <h2 className="mt-2 text-3xl font-black">Turn this into a real plan.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-white/72">
              Roa can turn your date, guests, pickup area, and trip style into a
              clean request for the concierge dashboard.
            </p>
          </div>
          <Link href={guide.ctaHref} className="brand-button-primary justify-center">
            {guide.ctaLabel}
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
