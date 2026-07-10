"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ChangeRequest = {
  id: string;
  status: string | null;
  requested_tour_date: string | null;
  requested_tour_time: string | null;
  requested_guests: number | null;
  requested_pickup_note: string | null;
  reason: string | null;
  created_at: string;
};

type FormState = {
  tourDate: string;
  tourTime: string;
  guests: string;
  pickupNote: string;
  reason: string;
};

const emptyForm: FormState = {
  tourDate: "",
  tourTime: "",
  guests: "",
  pickupNote: "",
  reason: "",
};

function statusClass(status: string | null) {
  if (status === "approved") return "bg-green-100 text-green-800";
  if (status === "declined" || status === "cancelled") {
    return "bg-red-50 text-red-700";
  }
  if (status === "countered") return "bg-[#EEF7F6] text-[#007B7B]";
  return "bg-[#FFF3D2] text-[#7A5A00]";
}

export default function BookingChangeRequestForm({
  bookingId,
  accessToken,
  quoteToken,
  currentDate,
  currentTime,
  currentGuests,
}: {
  bookingId: string;
  accessToken: string;
  quoteToken?: string;
  currentDate: string;
  currentTime: string;
  currentGuests: number;
}) {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const endpoint = useMemo(() => {
    const params = new URLSearchParams({ access: accessToken });
    if (quoteToken) params.set("quote", quoteToken);
    return `/api/bookings/${bookingId}/change-requests?${params.toString()}`;
  }, [accessToken, bookingId, quoteToken]);

  useEffect(() => {
    let active = true;

    async function loadRequests() {
      const { data } = await supabase.auth.getSession();
      const response = await fetch(endpoint, {
        headers: data.session?.access_token
          ? { Authorization: `Bearer ${data.session.access_token}` }
          : undefined,
      });
      const result = (await response.json()) as {
        changeRequests?: ChangeRequest[];
        error?: string;
      };

      if (!active) return;
      setLoading(false);
      if (response.ok) {
        setRequests(result.changeRequests || []);
      } else {
        setMessage(result.error || "Unable to load change requests.");
      }
    }

    loadRequests();
    return () => {
      active = false;
    };
  }, [endpoint]);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    const { data } = await supabase.auth.getSession();
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(data.session?.access_token
          ? { Authorization: `Bearer ${data.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        requestedTourDate: form.tourDate || null,
        requestedTourTime: form.tourTime.trim() || null,
        requestedGuests: form.guests ? Number(form.guests) : null,
        requestedPickupNote: form.pickupNote.trim() || null,
        reason: form.reason.trim() || null,
      }),
    });
    const result = (await response.json()) as {
      changeRequest?: ChangeRequest;
      error?: string;
    };
    setSubmitting(false);

    if (!response.ok || !result.changeRequest) {
      setMessage(result.error || "Unable to send this change request.");
      return;
    }

    setRequests((current) => [result.changeRequest!, ...current]);
    setForm(emptyForm);
    setMessage("Change request sent. The operator can reply in your trip chat.");
  }

  return (
    <section className="mt-8 rounded-2xl border border-[#D6B56D]/25 bg-[#FFFDF7] p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#9C7A2F]">
            Trip changes
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
            Request a change
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
            Ask for a different date, time, group size, or pickup plan. Nothing
            changes until the operator approves it.
          </p>
        </div>
        <span className="rounded-xl bg-white px-4 py-3 text-xs font-black text-[#0B3C5D] shadow-sm">
          {currentDate} / {currentTime} / {currentGuests} guest
          {currentGuests === 1 ? "" : "s"}
        </span>
      </div>

      <details className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-[#071F2F]/8">
        <summary className="cursor-pointer list-none font-black text-[#007B7B]">
          Open change form
        </summary>
        <form onSubmit={submitChange} className="mt-5 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
              New date
              <input
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={form.tourDate}
                onChange={(event) => updateField("tourDate", event.target.value)}
                className="brand-input min-h-12"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
              New time
              <input
                value={form.tourTime}
                onChange={(event) => updateField("tourTime", event.target.value)}
                placeholder={currentTime}
                maxLength={120}
                className="brand-input min-h-12"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
              Guest count
              <input
                type="number"
                min="1"
                max="100"
                value={form.guests}
                onChange={(event) => updateField("guests", event.target.value)}
                placeholder={String(currentGuests)}
                className="brand-input min-h-12"
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
            Pickup change
            <input
              value={form.pickupNote}
              onChange={(event) => updateField("pickupNote", event.target.value)}
              placeholder="New hotel, port, airport, or meeting point"
              maxLength={500}
              className="brand-input min-h-12"
            />
          </label>
          <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
            Note for the operator
            <textarea
              value={form.reason}
              onChange={(event) => updateField("reason", event.target.value)}
              placeholder="Explain what changed or where you can be flexible."
              maxLength={1000}
              className="brand-input min-h-28 resize-y py-3"
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="brand-button-primary w-full justify-center sm:w-auto"
          >
            {submitting ? "Sending..." : "Send change request"}
          </button>
        </form>
      </details>

      <div className="mt-4" aria-live="polite">
        {message ? (
          <p className="rounded-xl bg-[#EEF7F6] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
            {message}
          </p>
        ) : null}
        {loading ? (
          <p className="text-sm text-gray-600">Checking previous requests...</p>
        ) : requests.length > 0 ? (
          <div className="grid gap-2">
            {requests.slice(0, 3).map((request) => (
              <div
                key={request.id}
                className="flex flex-col justify-between gap-2 rounded-xl bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="text-sm text-[#0B3C5D]">
                  <p className="font-black">
                    {request.requested_tour_date || request.requested_tour_time
                      ? [request.requested_tour_date, request.requested_tour_time]
                          .filter(Boolean)
                          .join(" at ")
                      : request.requested_pickup_note || "Trip detail change"}
                  </p>
                  <p className="mt-1 text-gray-500">
                    Sent {new Date(request.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`self-start rounded-full px-3 py-1 text-xs font-black uppercase ${statusClass(
                    request.status,
                  )}`}
                >
                  {request.status || "pending"}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
