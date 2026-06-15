import GuestDesktopNav from "@/app/GuestDesktopNav";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
import SupportRequestForm from "@/app/support/SupportRequestForm";
import {
  getSupportCenterIntents,
  getTrustSafetyChecklist,
} from "@/lib/platform-v2";

export const metadata = {
  title: "Support Center | RoatanIsland.life",
  description:
    "Get help with bookings, pickup timing, cancellation questions, weather concerns, vendor support, and Roatan trip issues.",
};

const supportIntents = getSupportCenterIntents();
const safetyChecklist = getTrustSafetyChecklist();

export default function SupportPage() {
  return (
    <main className="brand-page min-h-screen text-[#17324D]">
      <section className="px-5 py-6 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <SiteLogo />
            <GuestDesktopNav />
          </header>

          <section className="mt-8 grid gap-6 rounded-[2rem] bg-[#071F2F] p-6 text-white shadow-2xl shadow-[#071F2F]/12 lg:grid-cols-[1fr_0.72fr] lg:items-end sm:p-10">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#D6B56D]">
                Support Center
              </p>
              <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight sm:text-6xl">
                Help for bookings, trip day changes, and operator questions.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/76">
                Use this page when you need help with pickup timing, a booking
                issue, cancellation questions, weather concerns, vendor support,
                or anything that should be seen by the RoatanIsland.life team.
              </p>
            </div>
            <div className="grid gap-3">
              {["Urgent help", "Booking issue", "Safety or weather"].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/15 bg-white/10 p-4 font-bold"
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </section>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-6">
            <section className="brand-card p-6">
              <p className="brand-eyebrow">What can we help with?</p>
              <h2 className="brand-display mt-2 text-3xl">
                Choose the fastest lane.
              </h2>
              <div className="mt-5 grid gap-3">
                {supportIntents.map((intent) => (
                  <div
                    key={intent.id}
                    className="rounded-[1.25rem] border border-[#D6B56D]/20 bg-[#FBF7EC] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9C7A2F]">
                          {intent.label}
                        </p>
                        <h3 className="mt-1 text-lg font-black text-[#0B3C5D]">
                          {intent.title}
                        </h3>
                      </div>
                      <span className="brand-badge brand-badge-teal">
                        {intent.responsePromise}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {intent.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] bg-[#071F2F] p-6 text-white">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#D6B56D]">
                Travel safety and reliability
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Built for real trip-day clarity.
              </h2>
              <div className="mt-5 grid gap-3">
                {safetyChecklist.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-white/10 bg-white/10 p-4"
                  >
                    <p className="font-black">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-white/70">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="brand-card h-fit p-6 lg:sticky lg:top-6">
            <p className="brand-eyebrow-gold">Send a request</p>
            <h2 className="brand-display mt-2 text-3xl">
              Tell us what you need.
            </h2>
            <p className="mt-3 leading-7 text-gray-600">
              Add your booking reference if you have one. If this is urgent,
              choose urgent help and include your trip date, pickup area, and
              the best way to reach you.
            </p>
            <div className="mt-6">
              <SupportRequestForm />
            </div>
          </section>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
