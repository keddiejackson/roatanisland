"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type BookingFormProps = {
  listingId?: string;
};

type ListingSummary = {
  title: string;
  price: number | null;
  location: string | null;
};

export default function BookingForm({ listingId }: BookingFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [listing, setListing] = useState<ListingSummary | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [tourDate, setTourDate] = useState("");
  const [tourTime, setTourTime] = useState("");
  const [guests, setGuests] = useState("");

  useEffect(() => {
    async function fetchListing() {
      if (!listingId) {
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select("title, price, location")
        .eq("id", listingId)
        .single();

      if (!error && data) {
        setListing(data as ListingSummary);
      }
    }

    fetchListing();
  }, [listingId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          tourDate,
          tourTime,
          guests,
          listingId: listingId || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(
          `There was a problem saving the booking: ${
            result.error || "Please try again."
          }`,
        );
        return;
      }

      setBookingId(result.bookingId || null);
      setSubmitted(true);
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Something unexpected went wrong while saving the booking.");
    } finally {
      setLoading(false);
    }
  }

  async function startDepositCheckout() {
    if (!bookingId) {
      return;
    }

    setDepositLoading(true);

    const response = await fetch("/api/payments/deposit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookingId }),
    });

    const result = await response.json();
    setDepositLoading(false);

    if (!response.ok || !result.url) {
      alert(result.error || "Unable to start deposit checkout.");
      return;
    }

    window.location.href = result.url;
  }

  return (
    <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow ring-1 ring-black/5">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
        Booking request
      </p>
      <h1 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
        {listing ? `Book ${listing.title}` : "Request a Booking"}
      </h1>

      <p className="mt-3 text-gray-600">
        Choose your date, time, and number of guests. We will confirm
        availability after your request is received.
      </p>

      {listing ? (
        <div className="mt-6 rounded-xl border border-[#00A8A8]/20 bg-[#00A8A8]/10 p-4">
          <p className="font-semibold text-[#0B3C5D]">{listing.title}</p>
          <p className="mt-1 text-sm text-gray-600">
            {listing.location || "Roatan"}
            {listing.price ? ` - From $${listing.price}` : ""}
          </p>
        </div>
      ) : null}

      {submitted ? (
        <div className="mt-8 rounded-xl bg-green-100 p-6 text-green-800">
          <h2 className="text-xl font-semibold">Booking Request Received</h2>
          <p className="mt-2">
            Thank you. Your request has been sent, and you will hear back after
            availability is reviewed.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {process.env.NEXT_PUBLIC_STRIPE_DEPOSITS_ENABLED === "true" &&
            bookingId ? (
              <button
                type="button"
                onClick={startDepositCheckout}
                disabled={depositLoading}
                className="rounded-xl bg-[#0B3C5D] px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {depositLoading ? "Opening checkout..." : "Pay deposit"}
              </button>
            ) : null}
            <Link
              href="/"
              className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
            >
              Browse more listings
            </Link>
            {listingId ? (
              <Link
                href={`/listings/${listingId}`}
                className="rounded-xl bg-white px-5 py-3 font-semibold text-green-800"
              >
                Back to listing
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label className="mb-2 block font-medium">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Tour Date</label>
            <input
              type="date"
              value={tourDate}
              onChange={(e) => setTourDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">Time</label>
            <select
              value={tourTime}
              onChange={(e) => setTourTime(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              required
            >
              <option value="">Select a time</option>
              <option value="10:30 AM">10:30 AM</option>
              <option value="4:30 PM Sunset Cruise">
                4:30 PM Sunset Cruise
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block font-medium">Guests</label>
            <input
              type="number"
              min="1"
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              placeholder="Number of guests"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-[#00A8A8] px-6 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Submitting..." : "Submit Booking Request"}
          </button>
        </form>
      )}
    </div>
  );
}
