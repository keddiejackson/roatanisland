import Link from "next/link";

export default async function BookingPaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ booking?: string }>;
}) {
  const { booking } = await searchParams;

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-16 text-[#17324D]">
      <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8 shadow">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
          Deposit received
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
          Thanks, your deposit checkout is complete.
        </h1>
        <p className="mt-4 leading-7 text-gray-600">
          Your booking request is still reviewed by the local operator before it
          is final. You will hear back with the next steps.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={booking ? `/book/status/${booking}` : "/"}
            className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
          >
            View booking status
          </Link>
          <Link
            href="/#listings"
            className="rounded-xl border border-[#00A8A8] px-5 py-3 font-semibold text-[#007B7B]"
          >
            Browse listings
          </Link>
        </div>
      </div>
    </main>
  );
}
