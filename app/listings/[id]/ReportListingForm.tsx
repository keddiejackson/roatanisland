"use client";

import { useState } from "react";

export default function ReportListingForm({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("Incorrect information");
  const [reporterEmail, setReporterEmail] = useState("");
  const [details, setDetails] = useState("");

  async function submitReport(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const response = await fetch("/api/listing-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, reason, reporterEmail, details }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || "Unable to report listing.");
      return;
    }
    alert("Thanks. We received the report.");
    setOpen(false);
    setDetails("");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 text-sm font-semibold text-red-600"
      >
        Report listing
      </button>
    );
  }

  return (
    <form onSubmit={submitReport} className="mt-4 grid gap-3 rounded-xl bg-red-50 p-4">
      <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2">
        <option>Incorrect information</option>
        <option>Unsafe or suspicious</option>
        <option>Duplicate listing</option>
        <option>Other</option>
      </select>
      <input value={reporterEmail} onChange={(e) => setReporterEmail(e.target.value)} placeholder="Your email optional" className="rounded-xl border border-gray-300 px-3 py-2" />
      <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Details" rows={3} className="rounded-xl border border-gray-300 px-3 py-2" />
      <button className="rounded-xl bg-red-500 px-4 py-2 font-semibold text-white">Send report</button>
    </form>
  );
}
