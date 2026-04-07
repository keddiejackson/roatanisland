"use client";

import { useState } from "react";

export default function BookPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
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
                placeholder="Your full name"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Tour Date</label>
              <input
                type="date"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Time</label>
              <select
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                required
              >
                <option value="">Select a time</option>
                <option>10:30 AM</option>
                <option>4:30 PM Sunset Cruise</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block font-medium">Guests</label>
              <input
                type="number"
                min="1"
                placeholder="Number of guests"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#00A8A8] px-6 py-3 font-semibold text-white"
            >
              Continue Booking
            </button>
          </form>
        )}
      </div>
    </main>
  );
}