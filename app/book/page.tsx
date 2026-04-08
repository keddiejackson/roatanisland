"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function BookPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [tourDate, setTourDate] = useState("");
  const [tourTime, setTourTime] = useState("");
  const [guests, setGuests] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("bookings").insert([
        {
          full_name: fullName,
          email: email,
          tour_date: tourDate,
          tour_time: tourTime,
          guests: Number(guests),
        },
      ]);

      if (error) {
        alert(`There was a problem saving the booking: ${error.message}`);
        console.error("Supabase error:", error);
        return;
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("Something unexpected went wrong while saving the booking.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold text-[#0B3C5D]">
          Book Satisfaction Pirate Tours
        </h1>

        <p className="mt-3 text-gray-600">
          Choose your date, time, and number of guests to request your booking.
        </p>

        {submitted ? (
          <div className="mt-8 rounded-xl bg-green-100 p-6 text-green-800">
            <h2 className="text-xl font-semibold">Booking Request Received</h2>
            <p className="mt-2">
              Thank you. Your booking request has been submitted successfully.
            </p>
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
                <option value="4:30 PM Sunset Cruise">4:30 PM Sunset Cruise</option>
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
              {loading ? "Submitting..." : "Continue Booking"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}