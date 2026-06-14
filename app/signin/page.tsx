import Link from "next/link";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
import { signInDestinations } from "@/lib/sign-in-destinations";

export const metadata = {
  title: "Sign in | Roatan Island Life",
  description:
    "Sign in as a guest, vendor, or admin on Roatan Island Life.",
};

const destinationStyles = {
  guest: {
    accent: "bg-[#00A8A8]",
    border: "border-[#00A8A8]/25",
    bg: "bg-[#ECFBFA]",
  },
  vendor: {
    accent: "bg-[#D6B56D]",
    border: "border-[#D6B56D]/35",
    bg: "bg-[#FFF8E8]",
  },
  admin: {
    accent: "bg-[#0B3C5D]",
    border: "border-[#0B3C5D]/20",
    bg: "bg-[#EEF7F6]",
  },
};

export default function SignInPage() {
  return (
    <main className="brand-page min-h-screen text-[#17324D]">
      <section className="brand-shell">
        <div>
          <header className="brand-topbar">
            <SiteLogo />
            <nav className="brand-nav-pills text-sm font-bold">
              <Link
                href="/"
                className="brand-button-secondary shrink-0"
              >
                Home
              </Link>
              <Link
                href="/vendor/signup"
                className="brand-button-primary shrink-0"
              >
                List your business
              </Link>
              <Link
                href="/concierge"
                className="brand-button-secondary shrink-0"
              >
                Concierge
              </Link>
            </nav>
          </header>

          <div className="grid gap-10 py-14 lg:grid-cols-[0.82fr_1fr] lg:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                Account access
              </p>
              <h1 className="mt-4 text-4xl font-black leading-tight text-[#0B3C5D] sm:text-6xl">
                Sign in to the right part of Roatan Island Life.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-[#466176]">
                Guests can check booking updates, vendors can manage their
                business, and admins can run the site from one clear starting
                point.
              </p>
            </div>

            <div className="grid gap-4">
              {signInDestinations.map((destination) => {
                const styles = destinationStyles[destination.kind];

                return (
                  <section
                    key={destination.kind}
                    className={`brand-auth-card p-5 ${styles.border}`}
                  >
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-4">
                        <span
                          className={`mt-1 h-3 w-3 shrink-0 rounded-full ${styles.accent}`}
                        />
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8A6F2A]">
                            {destination.role}
                          </p>
                          <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                            {destination.title}
                          </h2>
                          <p className="mt-2 max-w-xl leading-7 text-[#5A6E7E]">
                            {destination.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:min-w-44">
                        <Link
                          href={destination.href}
                          className="brand-button-primary"
                        >
                          {destination.cta}
                        </Link>
                        {destination.secondaryHref ? (
                          <Link
                            href={destination.secondaryHref}
                            className={`brand-button-secondary ${styles.bg}`}
                          >
                            {destination.secondaryLabel}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
