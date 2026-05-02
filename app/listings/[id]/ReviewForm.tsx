"use client";

import { useState } from "react";

export default function ReviewForm({ listingId }: { listingId: string }) {
  const [reviewerName, setReviewerName] = useState("");
  const [reviewerEmail, setReviewerEmail] = useState("");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submitReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        listingId,
        reviewerName,
        reviewerEmail,
        rating,
        comment,
      }),
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      alert(result.error || "Unable to submit review.");
      return;
    }

    setSubmitted(true);
    setReviewerName("");
    setReviewerEmail("");
    setRating("5");
    setComment("");
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

  return (
    <form onSubmit={submitReview} className="grid gap-4 md:grid-cols-2">
      <div>
        <label className="mb-2 block font-medium">Name</label>
        <input
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
          required
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">Email</label>
        <input
          type="email"
          value={reviewerEmail}
          onChange={(e) => setReviewerEmail(e.target.value)}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
        />
      </div>

      <div>
        <label className="mb-2 block font-medium">Rating</label>
        <select
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
        <label className="mb-2 block font-medium">Review</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={1500}
          className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
          required
        />
      </div>

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
