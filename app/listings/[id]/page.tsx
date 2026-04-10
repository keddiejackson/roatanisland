import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getListing(id: string) {
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  return data;
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);

  if (!listing) {
    return (
      <main className="min-h-screen bg-[#F4EBD0] px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
          <h1 className="text-2xl font-bold text-[#0B3C5D]">Listing not found</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            {listing.image_url ? (
              <img
                src={listing.image_url}
                alt={listing.title}
                className="h-[420px] w-full rounded-3xl object-cover shadow"
              />
            ) : (
              <div className="flex h-[420px] w-full items-center justify-center rounded-3xl bg-white shadow">
                <span className="text-gray-400">No image available</span>
              </div>
            )}
          </div>

          <div className="rounded-3xl bg-white p-8 shadow">
            <p className="text-sm font-medium uppercase tracking-wide text-[#00A8A8]">
              Roatán Experience
            </p>

            <h1 className="mt-2 text-4xl font-bold text-[#0B3C5D]">
              {listing.title}
            </h1>

            <p className="mt-4 text-lg leading-7 text-gray-600">
              {listing.description}
            </p>

            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-gray-500">Location</span>
                <span className="font-medium">{listing.location || "Roatán"}</span>
              </div>

              <div className="flex items-center justify-between border-b pb-3">
                <span className="text-gray-500">Price</span>
                <span className="text-2xl font-bold text-[#00A8A8]">
                  ${listing.price}
                </span>
              </div>
            </div>

            <Link href={`/book?listing=${listing.id}`}>
              <button className="mt-8 w-full rounded-2xl bg-[#00A8A8] px-6 py-4 text-lg font-semibold text-white transition hover:opacity-90">
                Book This Experience
              </button>
            </Link>

            <p className="mt-4 text-sm text-gray-400">
              Secure your spot and experience Roatán like never before.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}