"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildPlanShareUrl,
  getGuestDashboardSummary,
  type ConciergePlan,
} from "@/lib/guest-concierge";

type Booking = {
  id: string;
  status: string | null;
  tour_date: string;
};

type GuestProfile = {
  name: string;
  phone: string;
  pickupArea: string;
  guests: string;
  budget: string;
  style: string;
  notes: string;
};

const profileDefaults: GuestProfile = {
  name: "",
  phone: "",
  pickupArea: "",
  guests: "",
  budget: "Moderate",
  style: "Family",
  notes: "",
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const value = JSON.parse(localStorage.getItem(key) || "");
    return value || fallback;
  } catch {
    return fallback;
  }
}

export default function GuestConciergePanel({
  bookings,
}: {
  bookings: Booking[];
}) {
  const [profile, setProfile] = useState(profileDefaults);
  const [plans, setPlans] = useState<ConciergePlan[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setProfile(readJson("roatan-guest-profile", profileDefaults));
      setPlans(readJson("roatan-concierge-plans", [] as ConciergePlan[]));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const profileComplete = Boolean(
    profile.name && profile.pickupArea && profile.guests,
  );
  const summary = useMemo(
    () => getGuestDashboardSummary({ bookings, plans, profileComplete }),
    [bookings, plans, profileComplete],
  );

  function updateProfile(field: keyof GuestProfile, value: string) {
    const nextProfile = { ...profile, [field]: value };
    setProfile(nextProfile);
    localStorage.setItem("roatan-guest-profile", JSON.stringify(nextProfile));
    setMessage("Travel profile saved.");
  }

  function removePlan(planId: string | undefined) {
    const nextPlans = plans.filter((plan) => plan.id !== planId);
    setPlans(nextPlans);
    localStorage.setItem("roatan-concierge-plans", JSON.stringify(nextPlans));
  }

  function openPlan(plan: ConciergePlan) {
    localStorage.setItem(
      "roatan-trip-plan",
      JSON.stringify(plan.stops.map((stop) => stop.listingId)),
    );
  }

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <div className="rounded-2xl bg-white p-6 shadow">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#00A8A8]">
          Concierge profile
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
          Save your travel defaults.
        </h2>
        <div className="mt-5 grid gap-3">
          <input
            value={profile.name}
            onChange={(event) => updateProfile("name", event.target.value)}
            placeholder="Traveler name"
            className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
          />
          <input
            value={profile.phone}
            onChange={(event) => updateProfile("phone", event.target.value)}
            placeholder="Phone"
            className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={profile.pickupArea}
              onChange={(event) => updateProfile("pickupArea", event.target.value)}
              placeholder="Pickup area"
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
            />
            <input
              value={profile.guests}
              onChange={(event) => updateProfile("guests", event.target.value)}
              placeholder="Guest count"
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={profile.budget}
              onChange={(event) => updateProfile("budget", event.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
            >
              <option>Budget</option>
              <option>Moderate</option>
              <option>Luxury</option>
            </select>
            <select
              value={profile.style}
              onChange={(event) => updateProfile("style", event.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
            >
              <option>Family</option>
              <option>Luxury</option>
              <option>Adventure</option>
              <option>Easy beach day</option>
            </select>
          </div>
          <textarea
            value={profile.notes}
            onChange={(event) => updateProfile("notes", event.target.value)}
            placeholder="Mobility needs, kids, ship times, food preferences..."
            rows={3}
            className="rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-[#00A8A8]"
          />
        </div>
        {message ? (
          <p className="mt-3 rounded-xl bg-[#EEF7F6] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
            {message}
          </p>
        ) : null}
      </div>

      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#D6B56D]">
              Guest trips pro
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
              Saved plans and next steps.
            </h2>
          </div>
          <Link
            href="/concierge"
            className="rounded-xl bg-[#00A8A8] px-4 py-3 text-center text-sm font-bold text-white"
          >
            Build new plan
          </Link>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {[
            ["Bookings", summary.bookingCount],
            ["Confirmed", summary.confirmedCount],
            ["Plans", summary.planCount],
            ["Stops", summary.savedStopCount],
            ["Profile", summary.profileLabel],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#F7F3EA] p-4">
              <p className="text-xs font-bold uppercase text-gray-500">{label}</p>
              <p className="mt-2 text-xl font-black text-[#0B3C5D]">{value}</p>
            </div>
          ))}
        </div>

        {plans.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-5 text-center">
            <p className="font-bold text-[#0B3C5D]">No saved plans yet.</p>
            <p className="mt-2 text-sm text-gray-600">
              Build a concierge plan or save stops from the map.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {plans.map((plan) => {
              const href = buildPlanShareUrl({
                origin: "",
                stopIds: plan.stops.map((stop) => stop.listingId),
              });

              return (
                <article
                  key={plan.id || plan.name}
                  className="rounded-xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-4"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9C7A2F]">
                        {plan.arrivalType || "Trip plan"} -{" "}
                        {plan.date || "Flexible"}
                      </p>
                      <h3 className="mt-1 text-xl font-black text-[#0B3C5D]">
                        {plan.name}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600">
                        {plan.stops.length} stop
                        {plan.stops.length === 1 ? "" : "s"} from{" "}
                        {plan.pickupArea || "Roatan"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={href}
                        onClick={() => openPlan(plan)}
                        className="rounded-lg bg-[#0B3C5D] px-3 py-2 text-xs font-bold text-white"
                      >
                        Open map
                      </Link>
                      <button
                        type="button"
                        onClick={() => removePlan(plan.id)}
                        className="rounded-lg bg-white px-3 py-2 text-xs font-bold text-[#7A5B12]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {plan.stops.slice(0, 4).map((stop) => (
                      <span
                        key={`${plan.id}-${stop.listingId}`}
                        className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0B3C5D]"
                      >
                        {stop.timeBlock}: {stop.title}
                      </span>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
