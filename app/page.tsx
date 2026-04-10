"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [listings, setListings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    async function fetchListings() {
      const { data } = await supabase.from("listings").select("*");
      setListings(data || []);
    }

    fetchListings();
  }, []);

  const filteredListings = listings.filter((listing) => {
    const matchesSearch = `${listing.title} ${listing.location}`
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      category === "All" || listing.category === category;

    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen text-white">
      <section
        className="flex h-[60vh] items-center justify-center px-6 text-center"
        style={{
          backgroundImage: "url('/images/roatan.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="w-full max-w-3xl rounded-2xl bg-black/40 p-8">
          <h1 className="text-5xl font-bold leading-tight">
            Discover the Best of Roatán
          </h1>

          <p className="mt-4 text-lg text-gray-200">
            Book unforgettable tours, stays, and experiences all in one place.
          </p>

          <input
            type="text"
            placeholder="Search tours, locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-6 w-full rounded-xl px-5 py-3 text-black outline-none"
          />

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {["All", "Tours", "Hotels", "Transport"].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-4 py-2 text-sm font-medium ${
                  category === cat
                    ? "bg-[#00A8A8] text-white"
                    : "bg-white text-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {filteredListings.map((listing) => (
            <Link key={listing.id} href={`/listings/${listing.id}`}>
              <div className="cursor-pointer overflow-hidden rounded-2xl bg-white shadow transition hover:shadow-xl">
                {listing.image_url && (
                  <img
                    src={listing.image_url}
                    alt={listing.title}
                    className="h-48 w-full object-cover"
                  />
                )}

                <div className="p-5">
                  <h2 className="text-lg font-semibold">{listing.title}</h2>

                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <span className="text-yellow-500">⭐</span>
                    <span className="font-medium">
                      {listing.rating ?? 5}
                    </span>
                    <span className="text-gray-400">
                      ({listing.reviews_count ?? 0} reviews)
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                    {listing.description}
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-bold text-[#00A8A8]">
                      ${listing.price}
                    </span>

                    <span className="text-sm text-gray-400">
                      {listing.location}
                    </span>
                  </div>

                  {listing.category && (
                    <p className="mt-3 text-xs font-medium uppercase tracking-wide text-gray-400">
                      {listing.category}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}