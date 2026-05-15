import Link from "next/link";
import SiteLogo from "@/app/SiteLogo";
import BookingForm from "./BookingForm";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string }>;
}) {
  const { listing } = await searchParams;

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-10 text-[#1F2937]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <SiteLogo />
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow"
            >
              Home
            </Link>
            <Link
              href="/map"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow"
            >
              Map
            </Link>
          </div>
        </div>

        <section className="mb-8 rounded-2xl bg-[#071F2F] p-6 text-white shadow-2xl shadow-[#071F2F]/10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#9EE8E3]">
            Booking request
          </p>
          <h1 className="mt-2 text-3xl font-bold sm:text-5xl">
            Send the details. The operator confirms availability.
          </h1>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {["Preferred date", "Guest count", "Pickup notes"].map((item) => (
              <div
                key={item}
                className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold ring-1 ring-white/15"
              >
                {item}
              </div>
            ))}
          </div>
        </section>

        <BookingForm listingId={listing} />
      </div>
    </main>
  );
}
