"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type ReviewRow = {
  id: string;
  listing_id: string;
  reviewer_name: string;
  reviewer_email: string | null;
  rating: number;
  comment: string;
  photo_urls: string[] | null;
  is_approved: boolean;
  created_at: string;
  listings: {
    title: string;
  } | null;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminReviewsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [setupMessage, setSetupMessage] = useState("");

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
    async function fetchReviews() {
      const { data, error } = await supabase
        .from("listing_reviews")
        .select("id, listing_id, reviewer_name, reviewer_email, rating, comment, photo_urls, is_approved, created_at, listings(title)")
        .order("created_at", { ascending: false });

      if (error) {
        setSetupMessage("Run the updated Supabase SQL setup to enable reviews.");
        setLoading(false);
        return;
      }

      setReviews((data as unknown as ReviewRow[]) || []);
      setLoading(false);
    }

    if (authorized) {
      fetchReviews();
    }
  }, [authorized]);

  const filteredReviews = useMemo(
    () =>
      reviews.filter((review) => {
        const matchesStatus =
          statusFilter === "All" ||
          (statusFilter === "Approved" && review.is_approved) ||
          (statusFilter === "Waiting" && !review.is_approved);
        const matchesSearch = [
          review.reviewer_name,
          review.reviewer_email || "",
          review.comment,
          review.listings?.title || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());

        return matchesStatus && matchesSearch;
      }),
    [reviews, search, statusFilter],
  );

  if (checkingAuth || !authorized) {
    return null;
  }

  async function updateReview(review: ReviewRow, isApproved: boolean) {
    const { data: sessionData } = await supabase.auth.getSession();
    setSavingReviewId(review.id);

    const response = await fetch(`/api/admin/reviews/${review.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ isApproved }),
    });
    const result = await response.json();
    setSavingReviewId(null);

    if (!response.ok) {
      alert(result.error || "Unable to update review.");
      return;
    }

    setReviews((currentReviews) =>
      currentReviews.map((currentReview) =>
        currentReview.id === review.id
          ? { ...currentReview, is_approved: isApproved }
          : currentReview,
      ),
    );
  }

  async function deleteReview(review: ReviewRow) {
    const confirmed = window.confirm(
      `Delete review from ${review.reviewer_name}? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    setSavingReviewId(review.id);

    const response = await fetch(`/api/admin/reviews/${review.id}`, {
      method: "DELETE",
      headers: {
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
    });
    const result = await response.json();
    setSavingReviewId(null);

    if (!response.ok) {
      alert(result.error || "Unable to delete review.");
      return;
    }

    setReviews((currentReviews) =>
      currentReviews.filter((currentReview) => currentReview.id !== review.id),
    );
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <section className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold text-[#0B3C5D]">Reviews</h1>
              <p className="mt-2 text-gray-600">
                Approve good customer reviews before they appear publicly.
              </p>
            </div>
            <p className="text-sm font-semibold text-[#0B3C5D]">
              {filteredReviews.length} shown
            </p>
          </div>

          {setupMessage ? (
            <div className="mt-6 rounded-xl bg-yellow-100 p-4 text-sm text-yellow-900">
              {setupMessage}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 rounded-2xl bg-[#F7F3EA] p-4 md:grid-cols-[1fr_180px_auto] md:items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reviews, names, listings"
              className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
            >
              <option value="All">All statuses</option>
              <option value="Waiting">Waiting</option>
              <option value="Approved">Approved</option>
            </select>
            <p className="text-sm font-semibold text-[#0B3C5D]">
              {reviews.filter((review) => !review.is_approved).length} waiting
            </p>
          </div>

          {loading ? (
            <p className="mt-8">Loading reviews...</p>
          ) : filteredReviews.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
              No reviews found.
            </p>
          ) : (
            <div className="mt-6 grid gap-4">
              {filteredReviews.map((review) => (
                <article
                  key={review.id}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-bold text-[#0B3C5D]">
                          {review.reviewer_name}
                        </h2>
                        <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-sm font-semibold text-[#0B3C5D]">
                          {review.rating}/5
                        </span>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            review.is_approved
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {review.is_approved ? "Approved" : "Waiting"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-gray-600">
                        {review.listings?.title || "Unknown listing"} -{" "}
                        {formatDate(review.created_at)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateReview(review, !review.is_approved)}
                        disabled={savingReviewId === review.id}
                        className="rounded-xl border border-[#00A8A8] px-4 py-2 text-sm font-semibold text-[#007B7B] disabled:opacity-50"
                      >
                        {review.is_approved ? "Hide" : "Approve"}
                      </button>
                      <button
                        onClick={() => deleteReview(review)}
                        disabled={savingReviewId === review.id}
                        className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="mt-4 rounded-xl bg-[#F7F3EA] p-4 leading-7 text-gray-700">
                    {review.comment}
                  </p>
                  {review.photo_urls && review.photo_urls.length > 0 ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {review.photo_urls.map((photoUrl, index) => (
                        <a
                          key={`${photoUrl}-${index}`}
                          href={photoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="relative h-32 overflow-hidden rounded-xl bg-[#D8EFEC]"
                        >
                          <Image
                            src={photoUrl}
                            alt={`${review.reviewer_name} review photo ${index + 1}`}
                            fill
                            sizes="160px"
                            unoptimized
                            className="object-cover"
                          />
                        </a>
                      ))}
                    </div>
                  ) : null}
                  {review.reviewer_email ? (
                    <p className="mt-3 text-sm text-gray-500">
                      {review.reviewer_email}
                    </p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
