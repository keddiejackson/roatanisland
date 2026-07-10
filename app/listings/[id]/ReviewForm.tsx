"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ReviewForm({ listingId }: { listingId: string }) {
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [authChecked, setAuthChecked] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;

      setSessionToken(data.session?.access_token || "");
      setReviewerEmail(data.session?.user.email || "");
      setReviewerName(
        String(
          data.session?.user.user_metadata?.display_name ||
            data.session?.user.user_metadata?.full_name ||
            "",
        ),
      );
      setAuthChecked(true);
    }

    loadSession();
    return () => {
      active = false;
    };
  }, []);

  async function submitReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!sessionToken) {
      setErrorMessage("Sign in before reviewing this experience.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    let photoUrls: string[] = [];

    if (photoFiles.length > 0) {
      const uploadForm = new FormData();
      photoFiles.forEach((file) => uploadForm.append("image", file));
      uploadForm.append("listingId", listingId);

      const uploadResponse = await fetch("/api/uploads/review-images", {
        method: "POST",
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: uploadForm,
      });
      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setLoading(false);
        setErrorMessage(uploadResult.error || "Unable to upload review photos.");
        return;
      }

      photoUrls = uploadResult.imageUrls || [];
    }

    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        listingId,
        reviewerName,
        reviewerEmail,
        rating,
        comment,
        photoUrls,
      }),
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setErrorMessage(result.error || "Unable to submit review.");
      return;
    }

    setSubmitted(true);
    setReviewerName("");
    setReviewerEmail("");
    setRating("5");
    setComment("");
    setPhotoFiles([]);
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-green-100 p-5 text-green-800">
        <h3 className="text-xl font-bold">Review submitted</h3>
        <p className="mt-2">
          Thank you. Your review will appear after it is approved.
        </p>
        <button
          type="button"
          onClick={() => setSubmitted(false)}
          className="mt-4 rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
        >
          Add another review
        </button>
      </div>
    );
  }

  if (!authChecked) {
    return <p className="text-sm text-gray-600">Checking review access...</p>;
  }

  if (!sessionToken) {
    return (
      <div className="rounded-2xl border border-[#D6B56D]/30 bg-[#FFF8E8] p-5">
        <h3 className="text-xl font-black text-[#0B3C5D]">Reviews from real trips</h3>
        <p className="mt-2 leading-7 text-gray-600">
          Sign in with the email used for your completed booking to leave a
          verified review and trip photos.
        </p>
        <Link href="/account" className="brand-button-primary mt-4">
          Sign in to review
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submitReview} className="grid gap-4 md:grid-cols-2">
      <div>
        <label htmlFor="reviewer-name" className="mb-2 block font-medium">Name</label>
        <input
          id="reviewer-name"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
          required
        />
      </div>

      <div>
        <label htmlFor="reviewer-email" className="mb-2 block font-medium">Email</label>
        <input
          id="reviewer-email"
          type="email"
          value={reviewerEmail}
          readOnly
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
        />
      </div>

      <div>
        <label htmlFor="review-rating" className="mb-2 block font-medium">Rating</label>
        <select
          id="review-rating"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
        >
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Good</option>
          <option value="3">3 - Okay</option>
          <option value="2">2 - Poor</option>
          <option value="1">1 - Bad</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <label htmlFor="review-comment" className="mb-2 block font-medium">Review</label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1500}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
          required
        />
      </div>

      <div className="md:col-span-2">
        <label htmlFor="review-photos" className="mb-2 block font-medium">Trip Photos</label>
        <input
          id="review-photos"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
        />
        {photoFiles.length > 0 ? (
          <p className="mt-2 text-sm text-gray-500">
            Selected: {photoFiles.map((file) => file.name).join(", ")}
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 md:col-span-2"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-[#00A8A8] px-6 py-3 font-semibold text-white disabled:opacity-50 md:col-span-2"
      >
        {loading ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  );
}
