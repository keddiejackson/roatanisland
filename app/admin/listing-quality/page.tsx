"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import {
  getListingQualitySummary,
  sortListingsByQuality,
  type ListingQualityListing,
} from "@/lib/listing-quality";
import { getPremiumListingCardPolish } from "@/lib/marketplace-upgrade";
import { getRoaVerifiedStatus } from "@/lib/roa-verified";
import { supabase } from "@/lib/supabase";

type QualityListing = ListingQualityListing & {
  created_at?: string | null;
};

const filterOptions = [
  "Needs attention",
  "Needs media",
  "Needs trust",
  "Keep off homepage",
  "Needs photo",
  "Extreme price",
  "Test-looking",
  "Showcase ready",
  "All",
];

const trustFlagCodes = ["pricing", "location", "map", "times"];

function hasTrustGap(flags: string[]) {
  return trustFlagCodes.some((flag) => flags.includes(flag));
}

export default function AdminListingQualityPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [listings, setListings] = useState<QualityListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Needs attention");
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    async function verifyAdminSession() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user || !(await isAdminUser(data.user.email))) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      setAuthorized(true);
      setCheckingAuth(false);
    }

    verifyAdminSession();
  }, [router]);

  useEffect(() => {
    async function fetchListings() {
      const { data, error } = await supabase
        .from("listings")
        .select(
          "id, vendor_id, title, description, price, location, category, image_url, gallery_image_urls, tour_times, latitude, longitude, is_active, created_at",
        )
        .order("created_at", { ascending: false });

      if (error) {
        setStatusMessage(error.message);
        setLoading(false);
        return;
      }

      setListings((data as QualityListing[]) || []);
      setLoading(false);
    }

    if (authorized) {
      fetchListings();
    }
  }, [authorized]);

  const summary = useMemo(() => {
    const scored = listings.map((listing) => ({
      listing,
      quality: getListingQualitySummary(listing),
      polish: getPremiumListingCardPolish(listing),
    }));

    return {
      total: scored.length,
      ready: scored.filter((item) => item.quality.label === "Showcase ready").length,
      offHomepage: scored.filter((item) => item.quality.label === "Keep off homepage")
        .length,
      needsPhoto: scored.filter((item) =>
        item.quality.issues.some((issue) => issue.code === "missing_photo"),
      ).length,
      needsTrust: scored.filter((item) => hasTrustGap(item.polish.adminFlags)).length,
    };
  }, [listings]);

  const filteredListings = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return sortListingsByQuality(listings).filter((listing) => {
      const quality = getListingQualitySummary(listing);
      const matchesSearch = [
        listing.title,
        listing.location,
        listing.category,
        listing.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
      const issueCodes = quality.issues.map((issue) => issue.code);
      const polish = getPremiumListingCardPolish(listing);
      const matchesFilter =
        filter === "All" ||
        (filter === "Needs attention" && quality.issues.length > 0) ||
        (filter === "Needs media" && polish.adminFlags.includes("media")) ||
        (filter === "Needs trust" && hasTrustGap(polish.adminFlags)) ||
        (filter === "Keep off homepage" && quality.label === "Keep off homepage") ||
        (filter === "Needs photo" && issueCodes.includes("missing_photo")) ||
        (filter === "Extreme price" && issueCodes.includes("extreme_price")) ||
        (filter === "Test-looking" && issueCodes.includes("test_like_title")) ||
        (filter === "Showcase ready" && quality.label === "Showcase ready");

      return matchesSearch && matchesFilter;
    });
  }, [filter, listings, search]);

  if (checkingAuth) {
    return (
      <main className="min-h-screen bg-[#F7F3EA] p-6 text-[#0B3C5D]">
        Checking admin access...
      </main>
    );
  }

  if (!authorized) return null;

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-5 py-10 text-[#0B3C5D]">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#00A8A8]">
                Marketplace polish queue
              </p>
              <h1 className="mt-2 text-4xl font-black">Guest-facing fixes</h1>
              <p className="mt-2 max-w-2xl text-gray-600">
                Keep rough listings off the luxury marketplace until media,
                price clarity, pickup details, map pins, and tour times feel
                ready for guests.
              </p>
            </div>
            <Link
              href="/admin/listings"
              className="rounded-xl bg-[#0B3C5D] px-5 py-3 text-sm font-black text-white"
            >
              Edit listings
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Total listings" value={summary.total} />
            <SummaryCard label="Showcase ready" value={summary.ready} />
            <SummaryCard label="Need media" value={summary.needsPhoto} />
            <SummaryCard label="Need trust" value={summary.needsTrust} />
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_280px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, location, category, or description"
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#00A8A8]"
            />
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold outline-none focus:border-[#00A8A8]"
            >
              {filterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {statusMessage ? (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              {statusMessage}
            </p>
          ) : null}

          <div className="mt-6 grid gap-4">
            {loading ? (
              <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm font-semibold text-gray-500">
                Loading listing quality...
              </p>
            ) : filteredListings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm font-semibold text-gray-500">
                No listings match this filter.
              </p>
            ) : (
              filteredListings.map((listing) => (
                <QualityRow key={listing.id} listing={listing} />
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#F7F3EA] p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-[#0B3C5D]">{value}</p>
    </div>
  );
}

function QualityRow({ listing }: { listing: QualityListing }) {
  const quality = getListingQualitySummary(listing);
  const polish = getPremiumListingCardPolish(listing);
  const verified = getRoaVerifiedStatus(listing);
  const tone =
    quality.label === "Showcase ready"
      ? "bg-emerald-50 text-emerald-700"
      : quality.label === "Keep off homepage"
        ? "bg-red-50 text-red-700"
        : "bg-amber-50 text-amber-700";

  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black ${tone}`}>
              {quality.label}
            </span>
            <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-black text-[#007B7B]">
              {quality.score}/100
            </span>
            <span className="rounded-full bg-[#FFF3D2] px-3 py-1 text-xs font-black text-[#0B3C5D]">
              {polish.primaryBadge}
            </span>
            <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-black text-[#007B7B]">
              {verified.label} - {verified.score}%
            </span>
          </div>
          <h2 className="mt-3 text-xl font-black">{listing.title || "Untitled listing"}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {listing.location || "No location"} - {listing.category || "No category"}
          </p>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-[#0B3C5D]">
            {polish.benefitLine}
          </p>
        </div>
        <Link
          href="/admin/listings"
          className="rounded-xl border border-[#00A8A8]/25 px-4 py-2 text-center text-sm font-black text-[#007B7B]"
        >
          Edit in listings
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {polish.trustBadges.map((badge) => (
          <span key={badge} className="brand-badge brand-badge-teal">
            {badge}
          </span>
        ))}
      </div>

      {polish.adminFlags.length > 0 ? (
        <div className="mt-4 rounded-xl border border-[#D6B56D]/30 bg-[#FFF8E6] p-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8A6A13]">
            Next polish pass
          </p>
          <p className="mt-1 text-sm font-semibold text-[#0B3C5D]">
            Fix {polish.adminFlags.join(", ")} before this feels premium.
          </p>
        </div>
      ) : null}

      {verified.missingSignals.length > 0 ? (
        <div className="mt-4 rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-3">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
            Roa verification checklist
          </p>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {verified.missingSignals.slice(0, 4).map((signal) => (
              <p
                key={signal.key}
                className="rounded-lg bg-white px-3 py-2 text-xs font-bold leading-5 text-[#0B3C5D]"
              >
                {signal.action}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {quality.issues.length > 0 ? (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {quality.issues.map((issue) => (
            <div key={issue.code} className="rounded-xl bg-[#F7F3EA] p-3">
              <p className="text-sm font-black text-[#0B3C5D]">{issue.label}</p>
              <p className="mt-1 text-xs leading-5 text-gray-600">{issue.help}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          This listing is ready for the public homepage.
        </p>
      )}
    </article>
  );
}
