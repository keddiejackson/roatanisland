"use client";

import Link from "next/link";
import { useState } from "react";

type QuoteActionsProps = {
  token: string;
  status: string;
  bookingId: string | null;
  expired: boolean;
};

export default function QuoteActions({
  token,
  status,
  bookingId,
  expired,
}: QuoteActionsProps) {
  const [message, setMessage] = useState("");
  const [changeRequest, setChangeRequest] = useState("");
  const [currentBookingId, setCurrentBookingId] = useState(bookingId);
  const [busy, setBusy] = useState<"approve" | "change" | "pay" | null>(null);

  async function startDepositCheckout(nextBookingId: string) {
    const response = await fetch("/api/payments/deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: nextBookingId, paymentType: "deposit" }),
    });
    const result = await response.json();

    if (!response.ok) {
      setMessage(
        result.error ||
          "Your quote is approved. We could not open deposit checkout yet.",
      );
      setCurrentBookingId(nextBookingId);
      return;
    }

    window.location.href = result.url;
  }

  async function approveQuote() {
    setBusy("approve");
    setMessage("");

    const response = await fetch(`/api/concierge-quotes/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    const result = await response.json();

    if (!response.ok) {
      setBusy(null);
      setMessage(result.error || "Unable to approve this quote.");
      return;
    }

    setCurrentBookingId(result.bookingId);
    setBusy("pay");
    await startDepositCheckout(result.bookingId);
    setBusy(null);
  }

  async function requestChanges() {
    setBusy("change");
    setMessage("");

    const response = await fetch(`/api/concierge-quotes/${token}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "request_changes", message: changeRequest }),
    });
    const result = await response.json();
    setBusy(null);

    if (!response.ok) {
      setMessage(result.error || "Unable to send your change request.");
      return;
    }

    setMessage("Your change request was sent. We will update the quote.");
  }

  if (expired || ["expired", "cancelled"].includes(status)) {
    return (
      <p className="rounded-2xl bg-[#FFF8E8] p-5 font-bold text-[#0B3C5D]">
        This quote is not active. Please request an updated concierge quote.
      </p>
    );
  }

  if (status === "paid") {
    return (
      <div className="rounded-2xl bg-green-50 p-5 text-green-900">
        <p className="font-black">Deposit received</p>
        <p className="mt-2 text-sm">
          Your concierge plan is moving forward. Keep your booking status page
          for updates.
        </p>
        {currentBookingId ? (
          <Link
            href={`/book/status/${currentBookingId}`}
            className="mt-4 inline-block rounded-xl bg-green-700 px-5 py-3 font-bold text-white"
          >
            View booking status
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={approveQuote}
          disabled={Boolean(busy)}
          className="rounded-xl bg-[#00A8A8] px-5 py-4 font-black text-white disabled:opacity-50"
        >
          {busy === "approve" || busy === "pay"
            ? "Opening deposit..."
            : "Approve plan and pay deposit"}
        </button>
        {currentBookingId ? (
          <button
            type="button"
            onClick={() => startDepositCheckout(currentBookingId)}
            disabled={Boolean(busy)}
            className="rounded-xl bg-[#0B3C5D] px-5 py-4 font-black text-white disabled:opacity-50"
          >
            Pay deposit
          </button>
        ) : null}
      </div>

      <div className="rounded-2xl bg-[#F7F3EA] p-5">
        <p className="font-bold text-[#0B3C5D]">Need something changed?</p>
        <textarea
          value={changeRequest}
          onChange={(event) => setChangeRequest(event.target.value)}
          rows={4}
          placeholder="Tell us what you would like adjusted..."
          className="mt-3 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#00A8A8]"
        />
        <button
          type="button"
          onClick={requestChanges}
          disabled={Boolean(busy)}
          className="mt-3 rounded-xl border border-[#0B3C5D] px-5 py-3 font-bold text-[#0B3C5D] disabled:opacity-50"
        >
          {busy === "change" ? "Sending..." : "Request changes"}
        </button>
      </div>

      {message ? (
        <p className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#0B3C5D] shadow">
          {message}
          {currentBookingId ? (
            <Link
              href={`/book/status/${currentBookingId}`}
              className="ml-2 underline"
            >
              View booking status
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
