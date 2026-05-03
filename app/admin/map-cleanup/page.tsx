"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import PinPicker from "@/app/map/PinPicker";
import { isAdminUser } from "@/lib/admin";
import { googleMapsUrl } from "@/lib/map";
import { supabase } from "@/lib/supabase";

type CleanupListing = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  category: string | null;
  price: number | null;
  image_url: string | null;
  gallery_image_urls: string[] | null;
  rating: number | null;
  reviews_count: number | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean | null;
  approval_status: string | null;
  vendor_id: string | null;
};

type PinDraft = {
  latitude: string;
  longitude: string;
};

function hasExactPin(listing: CleanupListing) {
  return listing.latitude !== null && listing.longitude !== null;
}

function qualityScore(listing: CleanupListing) {
  const checks = [
    hasExactPin(listing),
    Boolean(listing.image_url),
    (listing.gallery_image_urls || []).length > 0,
    Boolean(listing.price),
    Boolean(listing.vendor_id),
    (listing.description || "").trim().length >= 120,
    (listing.reviews_count || 0) > 0,
    listing.is_active !== false,
  ];

  return Math.round(
    (checks.filter(Boolean).length / checks.length) * 100,
  );
}

function qualityIssues(listing: CleanupListing) {
  return [
    !hasExactPin(listing) ? "Missing exact pin" : "",
    !listing.image_url ? "Missing main photo" : "",
    (listing.gallery_image_urls || []).length === 0 ? "No gallery" : "",
    !listing.price ? "Missing price" : "",
    !listing.vendor_id ? "No vendor linked" : "",
    (listing.description || "").trim().length < 120 ? "Short description" : "",
    (listing.reviews_count || 0) === 0 ? "No reviews" : "",
    listing.is_active === false ? "Not live" : "",
  ].filter(Boolean);
}

export default function AdminMapCleanupPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [listings, setListings] = useState<CleanupListing[]>([]);
  const [drafts, setDrafts] = useState<Record<string, PinDraft>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pinFilter, setPinFilter] = useState("Needs attention");
  const [statusMessage, setStatusMessage] = useState("");
  const [busyListingId, setBusyListingId] = useState<string | null>(null);

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
        .select("id, title, description, location, category, price, image_url, gallery_image_urls, rating, reviews_count, latitude, longitude, is_active, approval_status, vendor_id")
        .order("created_at", { ascending: false });

      if (error) {
        setStatusMessage(error.message);
        setLoading(false);
        return;
      }

      const rows = (data as CleanupListing[]) || [];
      setListings(rows);
      setDrafts(
        Object.fromEntries(
          rows.map((listing) => [
            listing.id,
            {
              latitude: listing.latitude === null ? "" : String(listing.latitude),
              longitude: listing.longitude === null ? "" : String(listing.longitude),
            },
          ]),
        ),
      );
      setLoading(false);
    }

    if (authorized) {
      fetchListings();
    }
  }, [authorized]);

  const filteredListings = useMemo(() => {
    return listings.filter((listing) => {
      const matchesSearch = [listing.title, listing.location || "", listing.category || ""]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
      const exactPin = hasExactPin(listing);
      const matchesFilter =
        pinFilter === "All" ||
        (pinFilter === "Needs attention" && qualityScore(listing) < 100) ||
        (pinFilter === "Needs pin" && !exactPin) ||
        (pinFilter === "Exact pins" && exactPin) ||
        (pinFilter === "Low score" && qualityScore(listing) < 70) ||
        (pinFilter === "Not live" && listing.is_active === false);

      return matchesSearch && matchesFilter;
    });
  }, [listings, pinFilter, search]);

  const needsPinCount = listings.filter((listing) => !hasExactPin(listing)).length;
  const exactPinCount = listings.length - needsPinCount;
  const lowScoreCount = listings.filter((listing) => qualityScore(listing) < 70).length;
  const averageScore =
    listings.length === 0
      ? 100
      : Math.round(
          listings.reduce((total, listing) => total + qualityScore(listing), 0) /
            listings.length,
        );

  async function findPin(listing: CleanupListing) {
    setBusyListingId(listing.id);
    setStatusMessage(`Finding a pin for ${listing.title}...`);

    const query = [listing.title, listing.location, "Roatan"].filter(Boolean).join(", ");
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    const result = await response.json();

    setBusyListingId(null);

    if (!response.ok) {
      setStatusMessage(result.error || "Unable to find a map pin.");
      return;
    }

    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [listing.id]: {
        latitude: String(result.latitude),
        longitude: String(result.longitude),
      },
    }));
    setStatusMessage(
      result.source === "area"
        ? "I used the closest known Roatan area. Move the pin if needed."
        : "Pin found. Save it when it looks right.",
    );
  }

  async function savePin(listing: CleanupListing) {
    const draft = drafts[listing.id];
    const latitude = draft?.latitude ? Number(draft.latitude) : null;
    const longitude = draft?.longitude ? Number(draft.longitude) : null;

    if (latitude === null || longitude === null) {
      setStatusMessage("Choose a pin before saving.");
      return;
    }

    setBusyListingId(listing.id);
    const { error } = await supabase
      .from("listings")
      .update({ latitude, longitude })
      .eq("id", listing.id);

    setBusyListingId(null);

    if (error) {
      setStatusMessage(error.message);
      return;
    }

    setListings((currentListings) =>
      currentListings.map((currentListing) =>
        currentListing.id === listing.id
          ? { ...currentListing, latitude, longitude }
          : currentListing,
      ),
    );
    setStatusMessage(`Saved the map pin for ${listing.title}.`);
  }

  if (checkingAuth || !authorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <section className="overflow-hidden rounded-2xl bg-[#071F2F] shadow-2xl shadow-[#0B3C5D]/20">
          <div className="border-b border-[#D6B56D]/25 p-8 text-white">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D6B56D]">
              Map concierge
            </p>
            <div className="mt-3 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
              <div>
                <h1 className="text-3xl font-bold">Map QA Dashboard</h1>
                <p className="mt-2 max-w-2xl text-white/70">
                  Find weak map data, fix exact pins, and spot listings that
                  need photos, prices, vendors, reviews, or stronger details.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-2xl font-bold">{listings.length}</p>
                  <p className="text-xs text-white/65">Listings</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-2xl font-bold">{needsPinCount}</p>
                  <p className="text-xs text-white/65">Need pins</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-2xl font-bold">{exactPinCount}</p>
                  <p className="text-xs text-white/65">Exact pins</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-2xl font-bold">{averageScore}%</p>
                  <p className="text-xs text-white/65">Avg score</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-[#FFFDF7] p-5 sm:p-8">
            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[#D6B56D]/25 bg-white p-4">
                <p className="text-sm text-gray-600">Needs exact pin</p>
                <p className="mt-1 text-3xl font-bold text-[#0B3C5D]">
                  {needsPinCount}
                </p>
              </div>
              <div className="rounded-2xl border border-[#D6B56D]/25 bg-white p-4">
                <p className="text-sm text-gray-600">Low score</p>
                <p className="mt-1 text-3xl font-bold text-[#0B3C5D]">
                  {lowScoreCount}
                </p>
              </div>
              <div className="rounded-2xl border border-[#D6B56D]/25 bg-white p-4">
                <p className="text-sm text-gray-600">Ready listings</p>
                <p className="mt-1 text-3xl font-bold text-[#0B3C5D]">
                  {listings.filter((listing) => qualityScore(listing) === 100).length}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_180px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search listings or areas"
                className="min-h-12 rounded-xl border border-[#D6B56D]/35 px-4 outline-none focus:border-[#00A8A8]"
              />
              <select
                value={pinFilter}
                onChange={(event) => setPinFilter(event.target.value)}
                className="min-h-12 rounded-xl border border-[#D6B56D]/35 px-4 outline-none focus:border-[#00A8A8]"
              >
                <option>Needs attention</option>
                <option>Needs pin</option>
                <option>Low score</option>
                <option>Not live</option>
                <option>Exact pins</option>
                <option>All</option>
              </select>
            </div>

            {statusMessage ? (
              <p className="mt-4 rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] px-4 py-3 text-sm font-semibold text-[#0B3C5D]">
                {statusMessage}
              </p>
            ) : null}

            {loading ? (
              <p className="mt-8 text-[#0B3C5D]">Loading map cleanup...</p>
            ) : filteredListings.length === 0 ? (
              <div className="mt-8 rounded-2xl border border-[#D6B56D]/25 bg-white p-8 text-center">
                <p className="text-xl font-bold text-[#0B3C5D]">Nothing to clean up here.</p>
                <p className="mt-2 text-gray-600">
                  Change the filter to see more listings.
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5">
                {filteredListings.map((listing) => {
                  const draft = drafts[listing.id] || { latitude: "", longitude: "" };
                  const exactPin = hasExactPin(listing);
                  const busy = busyListingId === listing.id;
                  const score = qualityScore(listing);
                  const issues = qualityIssues(listing);

                  return (
                    <article
                      key={listing.id}
                      className="grid gap-5 rounded-2xl border border-[#D6B56D]/25 bg-white p-4 shadow-lg shadow-[#0B3C5D]/5 lg:grid-cols-[280px_1fr]"
                    >
                      <div>
                        <div className="relative h-48 overflow-hidden rounded-xl bg-[#D8EFEC]">
                          {listing.image_url ? (
                            <Image
                              src={listing.image_url}
                              alt={listing.title}
                              fill
                              sizes="280px"
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-sm font-semibold text-[#0B3C5D]/50">
                              No image
                            </div>
                          )}
                        </div>
                        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-[#00A8A8]">
                          {listing.category || "Listing"}
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-[#0B3C5D]">
                          {listing.title}
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                          {listing.location || "Roatan"}
                        </p>
                        <span
                          className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            exactPin
                              ? "bg-[#EEF7F6] text-[#007B7B]"
                              : "bg-[#FFF3D2] text-[#7A5A00]"
                          }`}
                        >
                          {exactPin ? "Exact pin saved" : "Needs exact pin"}
                        </span>
                        <div className="mt-3 rounded-xl bg-[#F7F3EA] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-[#0B3C5D]">
                              Quality score
                            </p>
                            <p className="text-lg font-bold text-[#0B3C5D]">
                              {score}%
                            </p>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                            <div
                              style={{ width: `${score}%` }}
                              className={`h-full ${
                                score >= 90
                                  ? "bg-[#00A8A8]"
                                  : score >= 70
                                    ? "bg-[#D6B56D]"
                                    : "bg-red-500"
                              }`}
                            />
                          </div>
                          {issues.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {issues.map((issue) => (
                                <span
                                  key={issue}
                                  className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-[#0B3C5D]"
                                >
                                  {issue}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <PinPicker
                          latitude={draft.latitude}
                          longitude={draft.longitude}
                          onChange={(coords) =>
                            setDrafts((currentDrafts) => ({
                              ...currentDrafts,
                              [listing.id]: coords,
                            }))
                          }
                        />

                        <div className="grid gap-3 sm:grid-cols-2">
                          <input
                            value={draft.latitude}
                            onChange={(event) =>
                              setDrafts((currentDrafts) => ({
                                ...currentDrafts,
                                [listing.id]: {
                                  ...draft,
                                  latitude: event.target.value,
                                },
                              }))
                            }
                            placeholder="Latitude"
                            className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
                          />
                          <input
                            value={draft.longitude}
                            onChange={(event) =>
                              setDrafts((currentDrafts) => ({
                                ...currentDrafts,
                                [listing.id]: {
                                  ...draft,
                                  longitude: event.target.value,
                                },
                              }))
                            }
                            placeholder="Longitude"
                            className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
                          />
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => findPin(listing)}
                            disabled={busy}
                            className="rounded-xl bg-[#0B3C5D] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            {busy ? "Working..." : "Find map pin"}
                          </button>
                          <button
                            type="button"
                            onClick={() => savePin(listing)}
                            disabled={busy}
                            className="rounded-xl bg-[#00A8A8] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            Save pin
                          </button>
                          {draft.latitude && draft.longitude ? (
                            <a
                              href={googleMapsUrl({
                                latitude: Number(draft.latitude),
                                longitude: Number(draft.longitude),
                                title: listing.title,
                              })}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-xl border border-[#D6B56D]/45 px-5 py-3 text-sm font-semibold text-[#0B3C5D]"
                            >
                              Check in Google Maps
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
