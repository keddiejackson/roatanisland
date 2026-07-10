import Link from "next/link";
import SiteLogo from "@/app/SiteLogo";

export default function NotFound() {
  return (
    <main className="brand-page grid min-h-dvh place-items-center px-4 py-10 text-[#17324D]">
      <section className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl ring-1 ring-[#071F2F]/10 sm:p-8">
        <SiteLogo />
        <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-[#00A8A8]">
          Page not found
        </p>
        <h1 className="mt-3 text-3xl font-black text-[#071F2F]">
          This route is not on the island map.
        </h1>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href="/" className="brand-button-primary text-center">Home</Link>
          <Link href="/map" className="brand-button-secondary text-center">Explore the map</Link>
        </div>
      </section>
    </main>
  );
}
