"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildGuestChecklist,
  buildGuestNotifications,
  getBookingTimeline,
  getGuestCommandSummary,
  getGuestNextBestAction,
  getGuestProfileCompletion,
  getSavedListingCards,
  getGuestWalletSummary,
  normalizeSavedListingIds,
  type GuestCommandPlan,
  type GuestSavedListingSummary,
  type GuestTravelProfile,
} from "@/lib/guest-command-center";
import { buildPlanShareUrl, type ConciergePlan } from "@/lib/guest-concierge";
import { supabase } from "@/lib/supabase";

type Booking = {
  id: string;
  status: string | null;
  tour_date: string;
  tour_time: string;
  guests: number;
  deposit_status: string | null;
  listing_id: string | null;
};

type CommandTab =
  | "overview"
  | "bookings"
  | "saved"
  | "profile"
  | "wallet"
  | "alerts";

const tabs: { id: CommandTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "bookings", label: "Trips" },
  { id: "saved", label: "Saved" },
  { id: "profile", label: "Profile" },
  { id: "wallet", label: "Wallet" },
  { id: "alerts", label: "Alerts" },
];

const profileDefaults: GuestTravelProfile = {
  name: "",
  phone: "",
  pickupArea: "",
  guests: "",
  budget: "Moderate",
  style: "Family",
  notes: "",
  arrivalType: "Staying on island",
  arrivalName: "",
  arrivalTime: "",
  departureTime: "",
  lodging: "",
  adults: "",
  kids: "",
  mobility: "",
  dietary: "",
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

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("storage"));
}

function formatDeposit(status: string | null) {
  if (!status || status === "not_requested") return "Not requested";
  return status.replaceAll("_", " ");
}

function notificationClass(tone: "info" | "warning" | "success") {
  if (tone === "warning") return "border-[#D6B56D]/40 bg-[#FFF8E8]";
  if (tone === "success") return "border-green-200 bg-green-50";
  return "border-[#00A8A8]/20 bg-[#EEF7F6]";
}

export default function GuestTravelCommandCenter({
  bookings,
  email,
}: {
  bookings: Booking[];
  email: string;
}) {
  const [activeTab, setActiveTab] = useState<CommandTab>("overview");
  const [profile, setProfile] = useState(profileDefaults);
  const [savedListingIds, setSavedListingIds] = useState<string[]>([]);
  const [savedListingDetails, setSavedListingDetails] = useState<
    GuestSavedListingSummary[]
  >([]);
  const [plans, setPlans] = useState<GuestCommandPlan[]>([]);
  const [itineraryName, setItineraryName] = useState("Roatan day plan");
  const [itineraryDate, setItineraryDate] = useState("");
  const [itineraryNote, setItineraryNote] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    function loadStoredTravel() {
      const storedProfile = readJson("roatan-guest-profile", profileDefaults);
      const storedSavedIds = readJson("roatan-trip-plan", [] as unknown[]);
      const storedPlans = readJson(
        "roatan-concierge-plans",
        [] as GuestCommandPlan[],
      );

      setProfile({ ...profileDefaults, ...storedProfile });
      setSavedListingIds(normalizeSavedListingIds(storedSavedIds));
      setPlans(Array.isArray(storedPlans) ? storedPlans : []);
    }

    loadStoredTravel();
    window.addEventListener("storage", loadStoredTravel);
    return () => window.removeEventListener("storage", loadStoredTravel);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadSavedListingDetails() {
      if (savedListingIds.length === 0) {
        setSavedListingDetails([]);
        return;
      }

      const { data } = await supabase
        .from("listings")
        .select("id, title, category, location, price")
        .in("id", savedListingIds);

      if (isMounted) {
        setSavedListingDetails((data as GuestSavedListingSummary[]) || []);
      }
    }

    loadSavedListingDetails();

    return () => {
      isMounted = false;
    };
  }, [savedListingIds]);

  const summary = useMemo(
    () =>
      getGuestCommandSummary({
        bookings,
        plans,
        savedListingIds,
        profile,
      }),
    [bookings, plans, profile, savedListingIds],
  );
  const profileCompletion = useMemo(
    () => getGuestProfileCompletion(profile),
    [profile],
  );
  const checklist = useMemo(
    () => buildGuestChecklist({ bookings, plans, savedListingIds, profile }),
    [bookings, plans, profile, savedListingIds],
  );
  const notifications = useMemo(
    () => buildGuestNotifications({ bookings, plans, savedListingIds, profile }),
    [bookings, plans, profile, savedListingIds],
  );
  const nextBestAction = useMemo(
    () =>
      getGuestNextBestAction({
        bookings,
        plans,
        savedListingIds,
        profile,
      }),
    [bookings, plans, profile, savedListingIds],
  );
  const wallet = useMemo(() => getGuestWalletSummary(bookings), [bookings]);
  const savedListingCards = useMemo(
    () => getSavedListingCards(savedListingIds, savedListingDetails),
    [savedListingDetails, savedListingIds],
  );
  const mapHref = savedListingIds.length
    ? `/map?trip=${encodeURIComponent(savedListingIds.join(","))}`
    : "/map";

  function updateProfile(field: keyof GuestTravelProfile, value: string) {
    const nextProfile = { ...profile, [field]: value };
    setProfile(nextProfile);
    writeJson("roatan-guest-profile", nextProfile);
    setMessage("Travel details saved.");
  }

  function removeSavedListing(id: string) {
    const nextIds = savedListingIds.filter((savedId) => savedId !== id);
    setSavedListingIds(nextIds);
    writeJson("roatan-trip-plan", nextIds);
  }

  function clearSavedListings() {
    setSavedListingIds([]);
    writeJson("roatan-trip-plan", []);
  }

  function removePlan(planId: string | undefined) {
    const nextPlans = plans.filter((plan) => plan.id !== planId);
    setPlans(nextPlans);
    writeJson("roatan-concierge-plans", nextPlans);
  }

  function saveRouteAsPlan() {
    if (savedListingIds.length === 0) {
      setMessage("Save at least one stop from the map first.");
      return;
    }

    const nextPlan: ConciergePlan = {
      id: `guest-plan-${Date.now()}`,
      name: itineraryName || "Roatan day plan",
      date: itineraryDate,
      guests: profile.guests,
      pickupArea: profile.pickupArea,
      arrivalType: profile.arrivalType,
      notes: itineraryNote,
      stops: savedListingIds.map((id, index) => ({
        listingId: id,
        title:
          savedListingCards.find((listing) => listing.id === id)?.title ||
          `Saved stop ${index + 1}`,
        timeBlock: ["Morning", "Midday", "Afternoon", "Sunset"][index] || "Flexible",
      })),
    };
    const nextPlans = [nextPlan, ...plans].slice(0, 8);
    setPlans(nextPlans);
    writeJson("roatan-concierge-plans", nextPlans);
    setMessage("Itinerary saved to your dashboard.");
  }

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-[#D6B56D]/20 bg-white shadow-xl shadow-[#0B3C5D]/5">
      <div className="bg-[#071F2F] p-6 text-white">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#00A8A8]">
            Guest command center
          </p>
          <h2 className="mt-2 text-3xl font-black">
            Your trip board
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/72">
            Saved details, bookings, trip plans, payments, and reminders for{" "}
            {email}.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[420px]">
        <div className="rounded-2xl border border-white/15 bg-white/10 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D6B56D]">
            Trip readiness
          </p>
          <p className="mt-1 text-3xl font-black">{summary.tripScore}%</p>
        </div>
        <Link
          href={nextBestAction.href}
          className="rounded-2xl border border-white/15 bg-white px-5 py-4 text-[#0B3C5D] transition hover:-translate-y-0.5"
        >
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#007B7B]">
            Next best step
          </p>
          <p className="mt-1 text-lg font-black">{nextBestAction.label}</p>
          <p className="mt-1 text-xs font-bold leading-5 text-[#0B3C5D]/70">
            {nextBestAction.text}
          </p>
        </Link>
        </div>
      </div>
      </div>

      <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Bookings", summary.bookingCount],
          ["Saved", summary.savedListingCount],
          ["Plans", summary.planCount],
          ["Profile", `${summary.profilePercent}%`],
          ["Wallet", summary.walletLabel],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl bg-[#F7F3EA] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">
              {label}
            </p>
            <p className="mt-2 text-xl font-black text-[#0B3C5D]">{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 overflow-x-auto px-6 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 rounded-xl px-4 py-3 text-sm font-black transition ${
              activeTab === tab.id
                ? "bg-[#0B3C5D] text-white"
                : "bg-[#EEF7F6] text-[#0B3C5D] hover:bg-[#DFF3F1]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message ? (
        <p className="mx-6 mt-4 rounded-xl bg-[#EEF7F6] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
          {message}
        </p>
      ) : null}

      {activeTab === "overview" ? (
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_0.9fr]">
          <section>
            <h3 className="text-xl font-black text-[#0B3C5D]">
              Trip checklist
            </h3>
            <div className="mt-4 grid gap-3">
              {checklist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-gray-200 p-4"
                >
                  <span
                    className={`mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      item.done
                        ? "bg-[#00A8A8] text-white"
                        : "bg-[#FFF3D2] text-[#7A5A00]"
                    }`}
                  >
                    {item.done ? "✓" : "!"}
                  </span>
                  <div>
                    <p className="font-black text-[#0B3C5D]">{item.label}</p>
                    <p className="mt-1 text-sm text-gray-600">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-black text-[#0B3C5D]">
              Notifications
            </h3>
            <div className="mt-4 grid gap-3">
              {notifications.map((item) => (
                <div
                  key={item.title}
                  className={`rounded-xl border p-4 ${notificationClass(item.tone)}`}
                >
                  <p className="font-black text-[#0B3C5D]">{item.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Link
                href={mapHref}
                className="rounded-xl bg-[#00A8A8] px-4 py-3 text-center text-sm font-black text-white"
              >
                Open trip map
              </Link>
              <Link
                href="/concierge"
                className="rounded-xl bg-[#0B3C5D] px-4 py-3 text-center text-sm font-black text-white"
              >
                Request concierge help
              </Link>
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "bookings" ? (
        <div className="grid gap-6 p-6">
          <section>
            <h3 className="text-xl font-black text-[#0B3C5D]">
              Booking timeline
            </h3>
            <div className="mt-4 grid gap-3">
              {bookings.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm font-bold text-gray-600">
                  No booking requests yet.
                </p>
              ) : (
                bookings.map((booking) => (
                  <article
                    key={booking.id}
                    className="rounded-xl border border-gray-200 p-4"
                  >
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                      <div>
                        <p className="font-black text-[#0B3C5D]">
                          {booking.tour_date} at {booking.tour_time}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {booking.guests} guests - deposit{" "}
                          {formatDeposit(booking.deposit_status)}
                        </p>
                      </div>
                      <Link
                        href={`/book/status/${booking.id}`}
                        className="rounded-lg bg-[#EEF7F6] px-3 py-2 text-center text-xs font-black text-[#0B3C5D]"
                      >
                        Details
                      </Link>
                    </div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-4">
                      {getBookingTimeline(booking).map((step) => (
                        <div
                          key={`${booking.id}-${step.label}`}
                          className={`rounded-lg px-3 py-2 text-xs font-black ${
                            step.done
                              ? "bg-[#EEF7F6] text-[#007B7B]"
                              : "bg-[#F7F3EA] text-gray-500"
                          }`}
                        >
                          {step.label}
                        </div>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl bg-[#071F2F] p-5 text-white">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D6B56D]">
              Concierge quote center
            </p>
            <h3 className="mt-2 text-2xl font-black">Need a custom plan?</h3>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Send your saved route and travel profile to the concierge team for
              a custom quote or adjustment.
            </p>
            <Link
              href="/concierge"
              className="mt-4 inline-flex rounded-xl bg-[#D6B56D] px-4 py-3 text-sm font-black text-[#071F2F]"
            >
              Start quote request
            </Link>
          </section>
        </div>
      ) : null}

      {activeTab === "saved" ? (
        <div className="grid gap-6 p-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-xl font-black text-[#0B3C5D]">
                  Saved listings
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  These come from the map trip planner.
                </p>
              </div>
              <Link
                href={mapHref}
                className="rounded-xl bg-[#00A8A8] px-4 py-3 text-center text-sm font-black text-white"
              >
                Open map
              </Link>
            </div>
            <div className="mt-4 grid gap-2">
              {savedListingIds.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm font-bold text-gray-600">
                  No saved listings yet.
                </p>
              ) : (
                savedListingCards.map((listing, index) => (
                  <div
                    key={listing.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-4"
                  >
                    <div>
                      <p className="font-black text-[#0B3C5D]">
                        {index + 1}. {listing.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {listing.category} - {listing.location}
                        {listing.price ? ` - $${listing.price}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="rounded-lg bg-[#EEF7F6] px-3 py-2 text-xs font-black text-[#0B3C5D]"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeSavedListing(listing.id)}
                        className="rounded-lg bg-[#FFF3D2] px-3 py-2 text-xs font-black text-[#7A5A00]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {savedListingIds.length > 0 ? (
              <button
                type="button"
                onClick={clearSavedListings}
                className="mt-3 rounded-xl border border-[#0B3C5D]/20 px-4 py-3 text-sm font-black text-[#0B3C5D]"
              >
                Clear saved stops
              </button>
            ) : null}
          </section>

          <section>
            <h3 className="text-xl font-black text-[#0B3C5D]">
              Itinerary builder
            </h3>
            <div className="mt-4 grid gap-3">
              <input
                value={itineraryName}
                onChange={(event) => setItineraryName(event.target.value)}
                placeholder="Plan name"
                className="rounded-xl border border-gray-300 px-4 py-3"
              />
              <input
                type="date"
                value={itineraryDate}
                onChange={(event) => setItineraryDate(event.target.value)}
                className="rounded-xl border border-gray-300 px-4 py-3"
              />
              <textarea
                value={itineraryNote}
                onChange={(event) => setItineraryNote(event.target.value)}
                placeholder="Notes for this itinerary"
                rows={3}
                className="rounded-xl border border-gray-300 px-4 py-3"
              />
              <button
                type="button"
                onClick={saveRouteAsPlan}
                className="rounded-xl bg-[#0B3C5D] px-4 py-3 text-sm font-black text-white"
              >
                Save current map route
              </button>
            </div>
            <div className="mt-5 grid gap-3">
              {plans.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm font-bold text-gray-600">
                  No saved itineraries yet.
                </p>
              ) : (
                plans.map((plan) => (
                  <article
                    key={plan.id || plan.name}
                    className="rounded-xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9C7A2F]">
                          {plan.date || "Flexible"} -{" "}
                          {plan.pickupArea || "Roatan"}
                        </p>
                        <h4 className="mt-1 text-xl font-black text-[#0B3C5D]">
                          {plan.name}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600">
                          {plan.stops.length} stop
                          {plan.stops.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={buildPlanShareUrl({
                            origin: "",
                            stopIds: plan.stops.map((stop) => stop.listingId),
                          })}
                          className="rounded-lg bg-[#0B3C5D] px-3 py-2 text-xs font-black text-white"
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          onClick={() => removePlan(plan.id)}
                          className="rounded-lg bg-white px-3 py-2 text-xs font-black text-[#7A5A00]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "profile" ? (
        <div className="grid gap-6 p-6 lg:grid-cols-3">
          <section>
            <h3 className="text-xl font-black text-[#0B3C5D]">
              Guest profile
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              {profileCompletion.label} - {profileCompletion.completed}/
              {profileCompletion.total} details saved.
            </p>
            <div className="mt-4 grid gap-3">
              {[
                ["name", "Traveler name"],
                ["phone", "Phone"],
                ["pickupArea", "Pickup area"],
                ["guests", "Guest count"],
              ].map(([field, placeholder]) => (
                <input
                  key={field}
                  value={profile[field as keyof GuestTravelProfile]}
                  onChange={(event) =>
                    updateProfile(
                      field as keyof GuestTravelProfile,
                      event.target.value,
                    )
                  }
                  placeholder={placeholder}
                  className="rounded-xl border border-gray-300 px-4 py-3"
                />
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={profile.budget}
                  onChange={(event) => updateProfile("budget", event.target.value)}
                  className="rounded-xl border border-gray-300 px-4 py-3"
                >
                  <option>Budget</option>
                  <option>Moderate</option>
                  <option>Luxury</option>
                </select>
                <select
                  value={profile.style}
                  onChange={(event) => updateProfile("style", event.target.value)}
                  className="rounded-xl border border-gray-300 px-4 py-3"
                >
                  <option>Family</option>
                  <option>Luxury</option>
                  <option>Adventure</option>
                  <option>Easy beach day</option>
                </select>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-xl font-black text-[#0B3C5D]">
              Arrival details
            </h3>
            <div className="mt-4 grid gap-3">
              <select
                value={profile.arrivalType}
                onChange={(event) =>
                  updateProfile("arrivalType", event.target.value)
                }
                className="rounded-xl border border-gray-300 px-4 py-3"
              >
                <option>Cruise</option>
                <option>Airport</option>
                <option>Staying on island</option>
              </select>
              {[
                ["arrivalName", "Ship, flight, hotel, or Airbnb"],
                ["arrivalTime", "Arrival time"],
                ["departureTime", "Departure time"],
                ["lodging", "Lodging or pickup notes"],
              ].map(([field, placeholder]) => (
                <input
                  key={field}
                  value={profile[field as keyof GuestTravelProfile]}
                  onChange={(event) =>
                    updateProfile(
                      field as keyof GuestTravelProfile,
                      event.target.value,
                    )
                  }
                  placeholder={placeholder}
                  className="rounded-xl border border-gray-300 px-4 py-3"
                />
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-black text-[#0B3C5D]">
              Travel party
            </h3>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={profile.adults}
                  onChange={(event) => updateProfile("adults", event.target.value)}
                  placeholder="Adults"
                  className="rounded-xl border border-gray-300 px-4 py-3"
                />
                <input
                  value={profile.kids}
                  onChange={(event) => updateProfile("kids", event.target.value)}
                  placeholder="Kids"
                  className="rounded-xl border border-gray-300 px-4 py-3"
                />
              </div>
              <textarea
                value={profile.mobility}
                onChange={(event) => updateProfile("mobility", event.target.value)}
                placeholder="Mobility, accessibility, comfort level"
                rows={3}
                className="rounded-xl border border-gray-300 px-4 py-3"
              />
              <textarea
                value={profile.dietary}
                onChange={(event) => updateProfile("dietary", event.target.value)}
                placeholder="Dietary needs or allergies"
                rows={3}
                className="rounded-xl border border-gray-300 px-4 py-3"
              />
              <textarea
                value={profile.notes}
                onChange={(event) => updateProfile("notes", event.target.value)}
                placeholder="Anything else the concierge or operator should know"
                rows={3}
                className="rounded-xl border border-gray-300 px-4 py-3"
              />
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "wallet" ? (
        <div className="grid gap-6 p-6 lg:grid-cols-[0.75fr_1.25fr]">
          <section className="rounded-xl bg-[#F7F3EA] p-5">
            <h3 className="text-xl font-black text-[#0B3C5D]">Guest wallet</h3>
            <div className="mt-4 grid gap-3">
              {[
                ["Paid deposits", wallet.paidCount],
                ["Needs attention", wallet.dueCount],
                ["Checkout started", wallet.checkoutStartedCount],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                    {label}
                  </p>
                  <p className="mt-2 text-2xl font-black text-[#0B3C5D]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xl font-black text-[#0B3C5D]">
              Receipts and payment status
            </h3>
            <div className="mt-4 grid gap-3">
              {bookings.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm font-bold text-gray-600">
                  Payments will appear after booking requests.
                </p>
              ) : (
                bookings.map((booking) => (
                  <Link
                    key={`wallet-${booking.id}`}
                    href={`/book/status/${booking.id}`}
                    className="rounded-xl border border-gray-200 p-4 transition hover:border-[#00A8A8]"
                  >
                    <p className="font-black text-[#0B3C5D]">
                      {booking.tour_date} - {formatDeposit(booking.deposit_status)}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Open details for confirmation, deposit status, and next
                      steps.
                    </p>
                  </Link>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "alerts" ? (
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_0.9fr]">
          <section>
            <h3 className="text-xl font-black text-[#0B3C5D]">
              Notification center
            </h3>
            <div className="mt-4 grid gap-3">
              {notifications.map((item) => (
                <div
                  key={`alert-${item.title}`}
                  className={`rounded-xl border p-4 ${notificationClass(item.tone)}`}
                >
                  <p className="font-black text-[#0B3C5D]">{item.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-[#071F2F] p-5 text-white">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D6B56D]">
              Support
            </p>
            <h3 className="mt-2 text-2xl font-black">Need help?</h3>
            <p className="mt-2 text-sm leading-6 text-white/75">
              Send your saved profile and trip context to concierge support.
            </p>
            <Link
              href="/concierge"
              className="mt-4 inline-flex rounded-xl bg-white px-4 py-3 text-sm font-black text-[#0B3C5D]"
            >
              Contact concierge
            </Link>
          </section>
        </div>
      ) : null}
    </section>
  );
}
