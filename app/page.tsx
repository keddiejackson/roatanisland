import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getListings() {
  const { data } = await supabase.from("listings").select("*");
  return data || [];
}

export default async function Home() {
  const listings = await getListings();

  return (
    <main className="min-h-screen bg-[#F4EBD0] text-[#1F2937] px-6 py-16">
      <h1 className="text-4xl font-bold text-[#0B3C5D] text-center">
        Explore Roatán
      </h1>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {listings.map((listing: any) => (
          <div key={listing.id} className="bg-white p-6 rounded-xl shadow">
            <h2 className="text-xl font-semibold">{listing.title}</h2>

            <p className="mt-2 text-gray-600">
              {listing.description}
            </p>

            <p className="mt-4 font-bold">${listing.price}</p>
          </div>
        ))}
      </div>
    </main>
  );
}