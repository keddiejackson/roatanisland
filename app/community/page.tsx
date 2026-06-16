import GuestDesktopNav from "@/app/GuestDesktopNav";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
import CommunityForum from "@/app/community/CommunityForum";

export const metadata = {
  title: "The Roatan Circle | RoatanIsland.life",
  description:
    "Ask Roatan travelers, locals, operators, and Roa for island-specific advice on cruise timing, beaches, stays, transfers, and private days.",
};

export default function CommunityPage() {
  return (
    <main className="min-h-screen bg-[#F7F3EA] text-[#071F2F]">
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <SiteLogo />
          <GuestDesktopNav />
        </header>

        <section className="mb-6 overflow-hidden rounded-[2rem] bg-[#071F2F] p-6 text-white shadow-2xl shadow-[#071F2F]/10 sm:p-8">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-[#D6B56D]">
              The Roatan Circle
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight sm:text-6xl">
              Real island answers before you commit.
            </h1>
            <p className="mt-5 text-lg leading-8 text-white/75">
              Ask travelers, locals, operators, and Roa-backed planning threads
              about cruise timing, airport pickup, stays, beaches, private
              boats, food, and the small choices that make a Roatan day feel
              effortless.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Anonymous option", "Local context", "Roa-ready plans"].map(
                (label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-black text-white/80"
                  >
                    {label}
                  </span>
                ),
              )}
            </div>
          </div>
        </section>

        <CommunityForum />
      </div>
      <SiteFooter />
    </main>
  );
}
