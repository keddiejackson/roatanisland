"use client";

import { useState } from "react";
import {
  buildSupportRequestPayload,
  getSupportCenterIntents,
} from "@/lib/platform-v2";

const supportIntents = getSupportCenterIntents();

export default function SupportRequestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [intent, setIntent] = useState(supportIntents[0]?.id || "urgent-help");
  const [bookingReference, setBookingReference] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submitSupportRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const payload = buildSupportRequestPayload({
      name,
      email,
      phone,
      intent,
      bookingReference,
      message,
    });
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        leadType: "support_request",
      }),
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error || "Unable to send support request.");
      return;
    }

    setSent(true);
    setName("");
    setEmail("");
    setPhone("");
    setBookingReference("");
    setMessage("");
  }

  if (sent) {
    return (
      <div className="rounded-[1.5rem] bg-[#EEF7F6] p-6">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#007B7B]">
          Request sent
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
          We received your support request.
        </h2>
        <p className="mt-3 leading-7 text-gray-600">
          Your message has been sent to the RoatanIsland.life team. Keep an eye
          on your email and your guest account messages.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-5 rounded-xl bg-[#071F2F] px-5 py-3 text-sm font-black text-white"
        >
          Send another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submitSupportRequest} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-bold text-[#0B3C5D]">Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="brand-input"
            required
          />
        </div>
        <div>
          <label className="mb-2 block font-bold text-[#0B3C5D]">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="brand-input"
            required
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-bold text-[#0B3C5D]">Phone</label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="brand-input"
          />
        </div>
        <div>
          <label className="mb-2 block font-bold text-[#0B3C5D]">
            Booking reference
          </label>
          <input
            value={bookingReference}
            onChange={(event) => setBookingReference(event.target.value)}
            className="brand-input"
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block font-bold text-[#0B3C5D]">
          Support type
        </label>
        <select
          value={intent}
          onChange={(event) => setIntent(event.target.value)}
          className="brand-input"
        >
          {supportIntents.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block font-bold text-[#0B3C5D]">Message</label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          className="brand-input"
          placeholder="Tell us what happened, what date this is for, and what help you need."
          required
        />
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-[#00A8A8] px-5 py-4 text-sm font-black text-white disabled:opacity-60"
      >
        {loading ? "Sending..." : "Send support request"}
      </button>
    </form>
  );
}
