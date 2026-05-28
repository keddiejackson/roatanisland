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
  getGuestWalletSummary,
  type GuestCommandPlan,
  type GuestSavedListingSummary,
  type GuestTravelProfile,
} from "@/lib/guest-command-center";
import { buildPlanShareUrl, type ConciergePlan } from "@/lib/guest-concierge";
import { supabase } from "@/lib/supabase";
import {
  COMPARE_LISTINGS_KEY,
  RECENT_LISTINGS_KEY,
  SAVED_LISTINGS_KEY,
  TRIP_BOARD_DAYS_KEY,
  TRIP_PLAN_KEY,
  buildTripBoardCompareRows,
  buildTripBoardDays,
  getTripBoardSummary,
  mergeTripBoardSavedItems,
  moveListingBetweenTripDays,
  normalizeTripBoardItems,
  type TripBoardDay,
  type TripBoardListingItem,
} from "@/lib/trip-board";

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
  const [savedShortlistItems, setSavedShortlistItems] = useState<
    TripBoardListingItem[]
  >([]);
  const [compareItems, setCompareItems] = useState<TripBoardListingItem[]>([]);
  const [recentItems, setRecentItems] = useState<TripBoardListingItem[]>([]);
  const [tripBoardDays, setTripBoardDays] = useState<TripBoardDay[]>(() =>
    buildTripBoardDays([]),
  );
  const [savedListingDetails, setSavedListingDetails] = useState<
    GuestSavedListingSummary[]
  >([]);
  const [plans, setPlans] = useState<GuestCommandPlan[]>([]);
  const [itineraryName, setItineraryName] = useState("Roatan day plan");
  const [itineraryDate, setItineraryDate] = useState("");
  const [itineraryNote, setItineraryNote] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    const tabFrame = window.requestAnimationFrame(() => {
      if (tabs.some((tab) => tab.id === requestedTab)) {
        setActiveTab(requestedTab as CommandTab);
      }
    });

    function loadStoredTravel() {
      const storedProfile = readJson("roatan-guest-profile", profileDefaults);
      const storedSavedIds = readJson(TRIP_PLAN_KEY, [] as unknown[]);
      const storedSavedItems = readJson(SAVED_LISTINGS_KEY, [] as unknown[]);
      const storedCompareItems = readJson(COMPARE_LISTINGS_KEY, [] as unknown[]);
      const storedRecentItems = readJson(RECENT_LISTINGS_KEY, [] as unknown[]);
      const mergedSaved = mergeTripBoardSavedItems({
        tripPlanIds: storedSavedIds,
        savedItems: storedSavedItems,
      });
      const storedPlans = readJson(
        "roatan-concierge-plans",
        [] as GuestCommandPlan[],
      );
      const storedDays = readJson(TRIP_BOARD_DAYS_KEY, [] as TripBoardDay[]);

      setProfile({ ...profileDefaults, ...storedProfile });
      setSavedListingIds(mergedSaved.savedIds);
      setSavedShortlistItems(mergedSaved.savedItems);
      setCompareItems(normalizeTripBoardItems(storedCompareItems, 4));
      setRecentItems(normalizeTripBoardItems(storedRecentItems, 6));
      setTripBoardDays(buildTripBoardDays(mergedSaved.savedItems, storedDays));
      setPlans(Array.isArray(storedPlans) ? storedPlans : []);
    }

    loadStoredTravel();
    window.addEventListener("storage", loadStoredTravel);
    return () => {
      window.cancelAnimationFrame(tabFrame);
      window.removeEventListener("storage", loadStoredTravel);
    };
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
  const savedBoardItems = useMemo(
    () =>
      mergeTripBoardSavedItems({
        tripPlanIds: savedListingIds,
        savedItems: savedShortlistItems,
        listingDetails: savedListingDetails,
      }).savedItems,
    [savedListingDetails, savedListingIds, savedShortlistItems],
  );
  const compareBoardItems = useMemo(
    () =>
      mergeTripBoardSavedItems({
        tripPlanIds: compareItems.map((item) => item.id),
        savedItems: compareItems,
        listingDetails: savedListingDetails,
        limit: 4,
      }).savedItems,
    [compareItems, savedListingDetails],
  );
  const compareRows = useMemo(
    () => buildTripBoardCompareRows(compareBoardItems),
    [compareBoardItems],
  );
  const tripBoardSummary = useMemo(
    () =>
      getTripBoardSummary({
        savedItems: savedBoardItems,
        compareItems: compareBoardItems,
        recentItems,
        days: tripBoardDays,
      }),
    [compareBoardItems, recentItems, savedBoardItems, tripBoardDays],
  );
  const boardItemsById = useMemo(
    () => new Map(savedBoardItems.map((item) => [item.id, item])),
    [savedBoardItems],
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

  function persistSavedBoard(nextItems: TripBoardListingItem[]) {
    const nextIds = nextItems.map((item) => item.id);
    const nextDays = buildTripBoardDays(nextItems, tripBoardDays);

    setSavedListingIds(nextIds);
    setSavedShortlistItems(nextItems);
    setTripBoardDays(nextDays);
    writeJson(TRIP_PLAN_KEY, nextIds);
    writeJson(SAVED_LISTINGS_KEY, nextItems);
    writeJson(TRIP_BOARD_DAYS_KEY, nextDays);
  }

  function removeSavedListing(id: string) {
    persistSavedBoard(savedBoardItems.filter((item) => item.id !== id));
    setMessage("Saved listing removed.");
  }

  function clearSavedListings() {
    persistSavedBoard([]);
    setMessage("Saved trip board cleared.");
  }

  function moveSavedListing(listingId: string, dayId: string) {
    const nextDays = moveListingBetweenTripDays(tripBoardDays, listingId, dayId);
    setTripBoardDays(nextDays);
    writeJson(TRIP_BOARD_DAYS_KEY, nextDays);
    setMessage("Trip board updated.");
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
          savedBoardItems.find((listing) => listing.id === id)?.title ||
          `Saved stop ${index + 1}`,
        timeBlock:
          tripBoardDays.find((day) => day.listingIds.includes(id))?.label ||
          ["Morning", "Midday", "Afternoon", "Sunset"][index] ||
          "Flexible",
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
        <div className="grid gap-6 p-6">
          <section className="rounded-2xl bg-[#071F2F] p-5 text-white">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D6B56D]">
                  Trip board pro
                </p>
                <h3 className="mt-2 text-2xl font-black">
                  Saved, compared, and planned in one place.
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/72">
                  Listings saved from the map or any listing page now land here,
                  then flow into your route, compare board, and itinerary.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[430px]">
                {[
                  ["Saved", tripBoardSummary.savedCount],
                  ["Compare", tripBoardSummary.compareCount],
                  ["Recent", tripBoardSummary.recentCount],
                  ["Status", tripBoardSummary.readyLabel],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-white/15 bg-white/10 p-3"
                  >
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-white/55">
                      {label}
                    </p>
                    <p className="mt-1 text-sm font-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href={mapHref}
                className="rounded-xl bg-[#00A8A8] px-4 py-3 text-center text-sm font-black text-white"
              >
                Open trip map
              </Link>
              <Link
                href="/listings"
                className="rounded-xl bg-white px-4 py-3 text-center text-sm font-black text-[#0B3C5D]"
              >
                Add more listings
              </Link>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <section>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-xl font-black text-[#0B3C5D]">
                    Saved listings
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Organize each saved stop into a rough part of the day.
                  </p>
                </div>
                {savedBoardItems.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearSavedListings}
                    className="rounded-xl border border-[#0B3C5D]/20 px-4 py-3 text-sm font-black text-[#0B3C5D]"
                  >
                    Clear saved stops
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-2">
                {savedBoardItems.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm font-bold text-gray-600">
                    No saved listings yet.
                  </p>
                ) : (
                  savedBoardItems.map((listing, index) => {
                    const currentDay =
                      tripBoardDays.find((day) =>
                        day.listingIds.includes(listing.id),
                      )?.id || "morning";

                    return (
                      <div
                        key={listing.id}
                        className="grid gap-3 rounded-xl border border-gray-200 p-4 sm:grid-cols-[1fr_auto]"
                      >
                        <div className="min-w-0">
                          <p className="font-black text-[#0B3C5D]">
                            {index + 1}. {listing.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {listing.category} - {listing.location}
                            {listing.priceLabel
                              ? ` - ${listing.priceLabel}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label={`Plan time for ${listing.title}`}
                            value={currentDay}
                            onChange={(event) =>
                              moveSavedListing(listing.id, event.target.value)
                            }
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-black text-[#0B3C5D]"
                          >
                            {tripBoardDays.map((day) => (
                              <option key={day.id} value={day.id}>
                                {day.label}
                              </option>
                            ))}
                          </select>
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
                    );
                  })
                )}
              </div>
            </section>

            <section>
              <h3 className="text-xl font-black text-[#0B3C5D]">
                Day-by-day plan
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                A simple board for shaping the order before you request help or
                book.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {tripBoardDays.map((day) => (
                  <article
                    key={day.id}
                    className="rounded-xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-4"
                  >
                    <p className="font-black text-[#0B3C5D]">{day.label}</p>
                    <p className="mt-1 min-h-10 text-sm leading-5 text-gray-600">
                      {day.description}
                    </p>
                    <div className="mt-3 grid gap-2">
                      {day.listingIds.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-[#D6B56D]/40 bg-white/70 px-3 py-2 text-xs font-bold text-gray-500">
                          No stop planned here yet.
                        </p>
                      ) : (
                        day.listingIds.map((listingId) => {
                          const listing = boardItemsById.get(listingId);

                          return (
                            <Link
                              key={`${day.id}-${listingId}`}
                              href={`/listings/${listingId}`}
                              className="rounded-lg bg-white px-3 py-2 text-sm font-black text-[#0B3C5D]"
                            >
                              {listing?.title || "Saved stop"}
                            </Link>
                          );
                        })
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
            <section>
              <h3 className="text-xl font-black text-[#0B3C5D]">
                Compare board
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Compare up to four listings saved from listing detail pages.
              </p>
              {compareBoardItems.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm font-bold text-gray-600">
                  No compare listings yet. Open a listing and tap Compare.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-[#EEF7F6] text-[#0B3C5D]">
                      <tr>
                        <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.12em]">
                          Detail
                        </th>
                        {compareBoardItems.map((item) => (
                          <th key={item.id} className="px-4 py-3 font-black">
                            {item.title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {compareRows.map((row) => (
                        <tr key={row.label} className="border-t border-gray-100">
                          <td className="px-4 py-3 font-black text-[#0B3C5D]">
                            {row.label}
                          </td>
                          {row.values.map((value, index) => (
                            <td
                              key={`${row.label}-${compareBoardItems[index]?.id}`}
                              className="px-4 py-3 text-gray-600"
                            >
                              {value}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-xl font-black text-[#0B3C5D]">
                Recently viewed
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Quick return links from your last listing visits.
              </p>
              <div className="mt-4 grid gap-2">
                {recentItems.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-300 p-5 text-center text-sm font-bold text-gray-600">
                    Recently viewed listings will appear here.
                  </p>
                ) : (
                  recentItems.map((item) => (
                    <Link
                      key={`recent-${item.id}`}
                      href={`/listings/${item.id}`}
                      className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-black text-[#0B3C5D] transition hover:border-[#00A8A8]"
                    >
                      {item.title}
                    </Link>
                  ))
                )}
              </div>
            </section>
          </div>

          <section>
            <h3 className="text-xl font-black text-[#0B3C5D]">
              Itinerary builder
            </h3>
            <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.2fr_auto]">
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
              <input
                value={itineraryNote}
                onChange={(event) => setItineraryNote(event.target.value)}
                placeholder="Notes for this itinerary"
                className="rounded-xl border border-gray-300 px-4 py-3"
              />
              <button
                type="button"
                onClick={saveRouteAsPlan}
                className="rounded-xl bg-[#0B3C5D] px-4 py-3 text-sm font-black text-white"
              >
                Save route
              </button>
            </div>
            <div className="mt-5 grid gap-3 lg:grid-cols-2">
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
