import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase-server";

export const metadata: Metadata = {
  title: "Roatan Vendors | RoatanIsland.life",
  description: "Browse local Roatan operators listed on RoatanIsland.life.",
};

type Vendor = {
  id: string;
  business_name: string;
  notes: string | null;
  profile_image_url: string | null;
  is_verified: boolean | null;
};

export default async function VendorsPage() {
  const { data } = await supabaseServer
    .from("vendors")
    .select("id, business_name, notes, profile_image_url, is_verified")
    .eq("is_active", true)
    .order("business_name", { ascending: true });

  const vendors = (data as Vendor[]) || [];

  return (
    <main className="min-h-screen bg-[#F7F3EA] text-[#17324D]">
      <section className="bg-[#0B3C5D] px-6 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <Link href="/" className="text-xl font-bold">
              RoatanIsland.life
            </Link>
            <Link
              href="/"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D]"
            >
              Home
            </Link>
          </header>
          <div className="py-16">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9EE8E3]">
              Local operators
            </p>
            <h1 className="mt-3 text-4xl font-bold sm:text-6xl">
              Browse Roatan vendors
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/80">
              Find local tour, stay, and transport operators with active
              listings on RoatanIsland.life.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14">
        {vendors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#00A8A8]/40 bg-white p-10 text-center text-gray-600">
            No active vendors yet.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vendors.map((vendor) => (
              <Link
                key={vendor.id}
                href={`/vendors/${vendor.id}`}
                className="rounded-2xl bg-white p-6 shadow transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#D8EFEC] text-2xl font-bold text-[#0B3C5D]">
                    {vendor.profile_image_url ? (
                      <Image
                        src={vendor.profile_image_url}
                        alt={vendor.business_name}
                        fill
                        sizes="80px"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      vendor.business_name.slice(0, 1)
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#0B3C5D]">
                      {vendor.business_name}
                    </h2>
                    {vendor.is_verified ? (
                      <span className="mt-2 inline-block rounded-full bg-[#D8EFEC] px-3 py-1 text-xs font-bold text-[#0B3C5D]">
                        Verified vendor
                      </span>
                    ) : null}
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
                      {vendor.notes || "View active listings from this operator."}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
