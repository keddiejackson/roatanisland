"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildConciergePlan,
  buildPlanShareUrl,
  getConciergeMatches,
  serializePlanForConciergeLead,
  type ConciergeListing,
  type ConciergePlan,
} from "@/lib/guest-concierge";
import {
  buildGuestProfileConciergePrefill,
  type GuestTravelProfile,
} from "@/lib/guest-command-center";
import { supabase } from "@/lib/supabase";

const interestOptions = [
  "beach",
  "cruise",
  "airport",
  "private",
  "snorkel",
  "food",
  "wildlife",
  "sunset",
];

function readPlans() {
  try {
    const saved = JSON.parse(localStorage.getItem("roatan-concierge-plans") || "[]");
    return Array.isArray(saved) ? (saved as ConciergePlan[]) : [];
  } catch {
    return [];
  }
}

function savePlan(plan: ConciergePlan) {
  const plans = readPlans();
  localStorage.setItem(
    "roatan-concierge-plans",
    JSON.stringify([plan, ...plans].slice(0, 12)),
  );
  localStorage.setItem(
    "roatan-trip-plan",
    JSON.stringify(plan.stops.map((stop) => stop.listingId)),
  );
}

function readGuestProfile(): GuestTravelProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const profile = JSON.parse(localStorage.getItem("roatan-guest-profile") || "");
    return profile || null;
  } catch {
    return null;
  }
}

function getInitialGuestValues() {
  const profile = readGuestProfile();

  if (!profile) {
    return {
      guests: "2",
      arrivalType: "Cruise",
      pickupArea: "Coxen Hole",
      tripStyle: "Family",
      budget: "Moderate",
      guestName: "",
      guestPhone: "",
      notes: "",
    };
  }

  const prefill = buildGuestProfileConciergePrefill(profile);

  return {
    guests: prefill.guests || "2",
    arrivalType: prefill.arrivalType || "Cruise",
    pickupArea: prefill.pickupArea || "Coxen Hole",
    tripStyle: prefill.tripStyle || "Family",
    budget: prefill.budget || "Moderate",
    guestName: prefill.guestName,
    guestPhone: prefill.guestPhone,
    notes: prefill.notes,
  };
}

export default function ConciergePlanner({
  listings,
}: {
  listings: ConciergeListing[];
}) {
  const [initialGuestValues] = useState(getInitialGuestValues);
  const [name, setName] = useState("My Roatan Day");
  const [date, setDate] = useState("");
  const [guests, setGuests] = useState(initialGuestValues.guests);
  const [arrivalType, setArrivalType] = useState(
    initialGuestValues.arrivalType,
  );
  const [pickupArea, setPickupArea] = useState(initialGuestValues.pickupArea);
  const [tripStyle, setTripStyle] = useState(initialGuestValues.tripStyle);
  const [budget, setBudget] = useState(initialGuestValues.budget);
  const [interests, setInterests] = useState(["beach", "cruise"]);
  const [guestName, setGuestName] = useState(initialGuestValues.guestName);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState(initialGuestValues.guestPhone);
  const [notes, setNotes] = useState(initialGuestValues.notes);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setGuestEmail((current) => current || data.user?.email || "");
      }
    });
  }, []);

  const matches = useMemo(
    () =>
      getConciergeMatches(listings, {
        arrivalType,
        pickupArea,
        tripStyle,
        budget,
        guests,
        interests,
      }),
    [arrivalType, budget, guests, interests, listings, pickupArea, tripStyle],
  );

  const plan = useMemo(
    () =>
      buildConciergePlan({
        name,
        date,
        guests,
        pickupArea,
        arrivalType,
        matches,
      }),
    [arrivalType, date, guests, matches, name, pickupArea],
  );

  const shareUrl = buildPlanShareUrl({
    origin: "",
    stopIds: plan.stops.map((stop) => stop.listingId),
  });

  function toggleInterest(interest: string) {
    setInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest],
    );
  }

  function saveCurrentPlan() {
    savePlan({ ...plan, notes });
    setMessage("Plan saved to your guest dashboard.");
  }

  async function requestHelp() {
    if (!guestName || !guestEmail) {
      setMessage("Add your name and email first.");
      return;
    }

    setSending(true);
    setMessage("");
    savePlan({ ...plan, notes });

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: guestName,
        email: guestEmail,
        phone: guestPhone,
        interest: "Concierge trip plan",
        message: serializePlanForConciergeLead({ ...plan, notes }),
        leadType: "concierge_plan",
        travelDate: date,
        guests,
        pickupArea,
        arrivalType,
        tripStyle,
        budget,
        plan: { ...plan, notes },
        sourcePath: "/concierge",
      }),
    });
    const result = await response.json();
    setSending(false);

    if (!response.ok) {
      setMessage(result.error || "Unable to send this plan.");
      return;
    }

    setMessage("Plan sent. We will follow up with next steps.");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-2xl bg-white p-6 shadow">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#00A8A8]">
          Concierge builder
        </p>
        <h2 className="mt-2 text-3xl font-black text-[#0B3C5D]">
          Tell us what kind of day you want.
        </h2>
        <div className="mt-6 grid gap-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
            placeholder="Plan name"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
            />
            <input
              type="number"
              min="1"
              value={guests}
              onChange={(event) => setGuests(event.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
              placeholder="Guests"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={arrivalType}
              onChange={(event) => setArrivalType(event.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
            >
              {["Cruise", "Airport", "Staying on island", "Local"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <input
              value={pickupArea}
              onChange={(event) => setPickupArea(event.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
              placeholder="Pickup area"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={tripStyle}
              onChange={(event) => setTripStyle(event.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
            >
              {["Family", "Luxury", "Adventure", "Easy beach day"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
            >
              {["Budget", "Moderate", "Luxury"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold text-[#0B3C5D]">Interests</p>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${
                    interests.includes(interest)
                      ? "bg-[#0B3C5D] text-white"
                      : "bg-[#F7F3EA] text-[#0B3C5D]"
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Cruise deadline, mobility needs, food preferences, kids, luggage..."
            className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
          />
        </div>
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#D6B56D]">
              Recommended itinerary
            </p>
            <h2 className="mt-2 text-3xl font-black text-[#0B3C5D]">
              {plan.name}
            </h2>
          </div>
          <Link
            href={shareUrl}
            className="rounded-xl bg-[#0B3C5D] px-4 py-3 text-center text-sm font-bold text-white"
          >
            View route map
          </Link>
        </div>

        <div className="mt-6 grid gap-3">
          {plan.stops.map((stop, index) => {
            const match = matches.find((item) => item.listing.id === stop.listingId);

            return (
              <article
                key={`${stop.listingId}-${stop.timeBlock}`}
                className="rounded-xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-4"
              >
                <div className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D6B56D] text-sm font-black text-[#071F2F]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9C7A2F]">
                      {stop.timeBlock}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-[#0B3C5D]">
                      {stop.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {match?.reasons.slice(0, 3).join(" - ") || stop.note}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/listings/${stop.listingId}`}
                        className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#0B3C5D]"
                      >
                        View listing
                      </Link>
                      <Link
                        href={`/book?listing=${stop.listingId}&date=${encodeURIComponent(
                          date,
                        )}&guests=${encodeURIComponent(guests)}`}
                        className="rounded-lg bg-[#00A8A8] px-3 py-2 text-xs font-bold text-white"
                      >
                        Book stop
                      </Link>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl bg-[#F7F3EA] p-4">
          <p className="font-bold text-[#0B3C5D]">Request help with this plan</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              value={guestName}
              onChange={(event) => setGuestName(event.target.value)}
              placeholder="Name"
              className="rounded-lg border border-gray-300 px-3 py-2 outline-none"
            />
            <input
              type="email"
              value={guestEmail}
              onChange={(event) => setGuestEmail(event.target.value)}
              placeholder="Email"
              className="rounded-lg border border-gray-300 px-3 py-2 outline-none"
            />
            <input
              value={guestPhone}
              onChange={(event) => setGuestPhone(event.target.value)}
              placeholder="Phone"
              className="rounded-lg border border-gray-300 px-3 py-2 outline-none"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={saveCurrentPlan}
              className="rounded-xl bg-[#0B3C5D] px-4 py-3 text-sm font-bold text-white"
            >
              Save to dashboard
            </button>
            <button
              type="button"
              onClick={requestHelp}
              disabled={sending}
              className="rounded-xl bg-[#00A8A8] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {sending ? "Sending..." : "Ask concierge to help"}
            </button>
          </div>
          {message ? (
            <p className="mt-3 rounded-lg bg-white px-4 py-3 text-sm font-bold text-[#0B3C5D]">
              {message}
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
