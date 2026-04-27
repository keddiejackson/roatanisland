import Link from "next/link";
import BookingForm from "./BookingForm";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ listing?: string }>;
}) {
  const { listing } = await searchParams;

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-10 text-[#1F2937]">
      <div className="mx-auto mb-8 flex max-w-5xl items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold text-[#0B3C5D]">
          RoatanIsland.life
        </Link>
        <Link
          href="/"
          className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow"
        >
          Home
        </Link>
      </div>
      <BookingForm listingId={listing} />
    </main>
  );
}
