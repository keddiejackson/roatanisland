"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  composeBookingGuestMessage,
  estimateBookingTotalCents,
  formatBookingCents,
} from "@/lib/booking-flow";
import { supabase } from "@/lib/supabase";

type BookingFormProps = {
  listingId?: string;
};

type ListingSummary = {
  id?: string;
  title: string;
  price: number | null;
  location: string | null;
  tour_times: string[] | null;
  blocked_dates: string[] | null;
  availability_note: string | null;
  max_guests: number | null;
  minimum_notice_hours: number | null;
};

type Addon = {
  id: string;
  name: string;
  price_cents: number;
};

const DEFAULT_TOUR_TIMES = ["10:30 AM", "4:30 PM Sunset Cruise"];
const PICKUP_OPTIONS = [
  "Hotel pickup",
  "Cruise port pickup",
  "Airport pickup",
  "Meet on site",
  "Not sure yet",
];

function dateValueFromOffset(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function BookingForm({ listingId }: BookingFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [listing, setListing] = useState<ListingSummary | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [tourDate, setTourDate] = useState("");
  const [tourTime, setTourTime] = useState("");
  const [guests, setGuests] = useState("");
  const [pickupPreference, setPickupPreference] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);

  useEffect(() => {
    async function fetchListing() {
      if (!listingId) {
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select(
          "title, price, location, tour_times, blocked_dates, availability_note, max_guests, minimum_notice_hours",
        )
        .eq("id", listingId)
        .single();

      if (!error && data) {
        setListing({ ...(data as ListingSummary), id: listingId });
        const addonsResult = await supabase
          .from("listing_addons")
          .select("id, name, price_cents")
          .eq("listing_id", listingId)
          .eq("is_active", true)
          .order("created_at", { ascending: true });
        setAddons((addonsResult.data as Addon[]) || []);
        return;
      }

      if (error?.code === "42703") {
        const fallback = await supabase
          .from("listings")
          .select("title, price, location")
          .eq("id", listingId)
          .single();

        if (!fallback.error && fallback.data) {
          setListing({
            ...(fallback.data as Omit<
              ListingSummary,
              | "tour_times"
              | "availability_note"
              | "max_guests"
              | "minimum_notice_hours"
            >),
            tour_times: DEFAULT_TOUR_TIMES,
            blocked_dates: [],
            availability_note: null,
            max_guests: null,
            minimum_notice_hours: null,
            id: listingId,
          });
        }
      }
    }

    fetchListing();
  }, [listingId]);

  const availableTourTimes =
    listing?.tour_times && listing.tour_times.length > 0
      ? listing.tour_times
      : DEFAULT_TOUR_TIMES;
  const minimumTourDate =
    listing?.minimum_notice_hours !== null &&
    listing?.minimum_notice_hours !== undefined
      ? dateValueFromOffset(listing.minimum_notice_hours)
      : undefined;
  const guestCount = Number(guests);
  const selectedAddons = useMemo(
    () => addons.filter((addon) => selectedAddonIds.includes(addon.id)),
    [addons, selectedAddonIds],
  );
  const previewGuestCount =
    Number.isFinite(guestCount) && guestCount > 0 ? guestCount : 1;
  const estimatedTotalCents = estimateBookingTotalCents({
    price: listing?.price,
    guests: previewGuestCount,
    selectedAddons,
  });
  const showEstimatedTotal = Boolean(listing?.price || selectedAddons.length > 0);
  const guestWarning =
    listing?.max_guests &&
    Number.isFinite(guestCount) &&
    guestCount > listing.max_guests
      ? `This listing allows up to ${listing.max_guests} guests per tour.`
      : "";
  const dateWarning =
    tourDate && listing?.blocked_dates?.includes(tourDate)
      ? "That date is not available for this listing."
      : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          tourDate,
          tourTime,
          guests,
          guestMessage: composeBookingGuestMessage({
            pickupPreference,
            guestMessage,
          }),
          promoCode,
          selectedAddonIds,
          listingId: listingId || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setSubmitError(result.error || "Please check the form and try again.");
        return;
      }

      setBookingId(result.bookingId || null);
      setSubmitted(true);
    } catch (err) {
      console.error("Unexpected error:", err);
      setSubmitError("Something unexpected went wrong while saving the booking.");
    } finally {
      setLoading(false);
    }
  }

  async function startDepositCheckout(paymentType: "deposit" | "full" = "deposit") {
    if (!bookingId) {
      return;
    }

    setDepositLoading(true);

    const response = await fetch("/api/payments/deposit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ bookingId, paymentType }),
    });

    const result = await response.json();
    setDepositLoading(false);

    if (!response.ok || !result.url) {
      setSubmitError(result.error || "Unable to start deposit checkout.");
      return;
    }

    window.location.href = result.url;
  }

  async function createBookingAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAccountLoading(true);
    setAccountMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password: accountPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });

    setAccountLoading(false);

    if (error) {
      setAccountMessage(error.message);
      return;
    }

    setAccountPassword("");
    setAccountMessage("Check your email to confirm your customer account.");
  }

  return (
    <div className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow ring-1 ring-black/5">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
        Booking request
      </p>
      <h1 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
        {listing ? `Book ${listing.title}` : "Request a Booking"}
      </h1>

      <p className="mt-3 text-gray-600">
        Choose your date, time, and number of guests. We will confirm
        availability after your request is received.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          ["1", "Request sent"],
          ["2", "Operator reviews"],
          ["3", "Plans confirmed"],
        ].map(([number, text]) => (
          <div
            key={number}
            className="rounded-xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-4"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9C7A2F]">
              Step {number}
            </p>
            <p className="mt-1 font-bold text-[#0B3C5D]">{text}</p>
          </div>
        ))}
      </div>

      {listing ? (
        <div className="mt-6 rounded-xl border border-[#00A8A8]/20 bg-[#00A8A8]/10 p-4">
          <p className="font-semibold text-[#0B3C5D]">{listing.title}</p>
          <p className="mt-1 text-sm text-gray-600">
            {listing.location || "Roatan"}
            {listing.price ? ` - From $${listing.price}` : ""}
          </p>
        </div>
      ) : null}

      <div className="mt-6 rounded-xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9C7A2F]">
              Request summary
            </p>
            <h2 className="mt-1 text-xl font-bold text-[#0B3C5D]">
              {listing?.title || "Roatan booking request"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Availability is reviewed before your plans are final.
            </p>
          </div>
          <div className="rounded-xl bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-xs font-semibold uppercase text-gray-500">
              Estimated total
            </p>
            <p className="mt-1 text-2xl font-black text-[#0B3C5D]">
              {showEstimatedTotal
                ? formatBookingCents(estimatedTotalCents)
                : "Pending"}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Date", tourDate || "Choose a date"],
            ["Time", tourTime || "Choose a time"],
            ["Guests", guests || "Add guests"],
            ["Pickup", pickupPreference || "Choose pickup"],
            [
              "Add-ons",
              selectedAddons.length > 0
                ? selectedAddons.map((addon) => addon.name).join(", ")
                : "None selected",
            ],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white p-4">
              <p className="text-xs font-semibold uppercase text-gray-500">
                {label}
              </p>
              <p className="mt-1 text-sm font-bold text-[#0B3C5D]">{value}</p>
            </div>
          ))}
        </div>
        {promoCode.trim() ? (
          <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#0B3C5D]">
            Promo code entered: {promoCode.trim().toUpperCase()}
          </p>
        ) : null}
      </div>

      {submitted ? (
        <div className="mt-8 rounded-xl border border-green-200 bg-green-50 p-6 text-green-900">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-green-700">
            Request received
          </p>
          <h2 className="mt-2 text-2xl font-black">
            Your booking request is in.
          </h2>
          <p className="mt-2">
            Thank you. The operator will review availability and follow up with
            next steps.
          </p>
          {bookingId ? (
            <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold">
              Booking ID: {bookingId}
            </p>
          ) : null}
          {submitError ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {submitError}
            </div>
          ) : null}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {["Request sent", "Operator reviews", "Plans confirmed"].map(
              (step, index) => (
                <div key={step} className="rounded-xl bg-white/80 p-4">
                  <p className="text-xs font-bold uppercase text-green-700">
                    Step {index + 1}
                  </p>
                  <p className="mt-1 font-bold">{step}</p>
                </div>
              ),
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            {process.env.NEXT_PUBLIC_STRIPE_DEPOSITS_ENABLED === "true" &&
            bookingId ? (
              <button
                type="button"
                onClick={() => startDepositCheckout("deposit")}
                disabled={depositLoading}
                className="rounded-xl bg-[#0B3C5D] px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {depositLoading ? "Opening checkout..." : "Pay deposit"}
              </button>
            ) : null}
            {process.env.NEXT_PUBLIC_STRIPE_DEPOSITS_ENABLED === "true" &&
            bookingId &&
            listing?.price ? (
              <button
                type="button"
                onClick={() => startDepositCheckout("full")}
                disabled={depositLoading}
                className="rounded-xl bg-[#0B3C5D] px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                Pay full amount
              </button>
            ) : null}
            <Link
              href={bookingId ? `/book/status/${bookingId}` : "/"}
              className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
            >
              View booking status
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-[#00A8A8] px-5 py-3 font-semibold text-[#007B7B]"
            >
              Browse more listings
            </Link>
            {listingId ? (
              <Link
                href={`/listings/${listingId}`}
                className="rounded-xl bg-white px-5 py-3 font-semibold text-green-800"
              >
                Back to listing
              </Link>
            ) : null}
          </div>
          <form
            onSubmit={createBookingAccount}
            className="mt-6 rounded-xl bg-white/70 p-5 text-green-900"
          >
            <h3 className="font-semibold">Create a customer account</h3>
            <p className="mt-2 text-sm">
              Use the same email to see your booking requests in My Bookings.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="password"
                minLength={6}
                value={accountPassword}
                onChange={(e) => setAccountPassword(e.target.value)}
                placeholder="Password"
                className="rounded-xl border border-green-200 px-4 py-3 outline-none"
                required
              />
              <button
                type="submit"
                disabled={accountLoading}
                className="rounded-xl bg-green-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {accountLoading ? "Creating..." : "Create account"}
              </button>
            </div>
            {accountMessage ? (
              <p className="mt-3 text-sm font-semibold">{accountMessage}</p>
            ) : null}
          </form>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 md:grid-cols-2">
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
              min={minimumTourDate}
              onChange={(e) => setTourDate(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              required
            />
            {listing?.minimum_notice_hours ? (
              <p className="mt-2 text-sm text-gray-500">
                Please book at least {listing.minimum_notice_hours} hours in
                advance.
              </p>
            ) : null}
            {dateWarning ? (
              <p className="mt-2 text-sm font-semibold text-red-600">
                {dateWarning}
              </p>
            ) : null}
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
              {availableTourTimes.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
            {listing?.availability_note ? (
              <p className="mt-2 text-sm text-gray-500">
                {listing.availability_note}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-2 block font-medium">Guests</label>
            <input
              type="number"
              min="1"
              max={listing?.max_guests || undefined}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              placeholder="Number of guests"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              required
            />
            {listing?.max_guests ? (
              <p className="mt-2 text-sm text-gray-500">
                Up to {listing.max_guests} guests per tour.
              </p>
            ) : null}
            {guestWarning ? (
              <p className="mt-2 text-sm font-semibold text-red-600">
                {guestWarning}
              </p>
            ) : null}
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block font-medium">Pickup preference</label>
            <div className="grid gap-2 sm:grid-cols-3">
              {PICKUP_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPickupPreference(option)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    pickupPreference === option
                      ? "border-[#00A8A8] bg-[#EEF7F6] text-[#0B3C5D]"
                      : "border-gray-300 bg-white text-gray-700 hover:border-[#00A8A8]"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-500">
              This helps the operator confirm pickup timing and any transfer
              details.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block font-medium">
              Message for the operator
            </label>
            <textarea
              value={guestMessage}
              onChange={(e) => setGuestMessage(e.target.value)}
              placeholder="Hotel pickup, kids, questions, flexible times..."
              rows={4}
              maxLength={1000}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
            />
            <p className="mt-2 text-sm text-gray-500">
              Optional. Share anything that helps the operator confirm your
              request.
            </p>
          </div>

          {addons.length > 0 ? (
            <div className="md:col-span-2">
              <p className="mb-2 block font-medium">Add-ons</p>
              <div className="grid gap-2">
                {addons.map((addon) => (
                  <label
                    key={addon.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-300 px-4 py-3"
                  >
                    <span>
                      <input
                        type="checkbox"
                        checked={selectedAddonIds.includes(addon.id)}
                        onChange={(e) =>
                          setSelectedAddonIds((current) =>
                            e.target.checked
                              ? [...current, addon.id]
                              : current.filter((id) => id !== addon.id),
                          )
                        }
                        className="mr-3"
                      />
                      {addon.name}
                    </span>
                    <span className="font-semibold text-[#0B3C5D]">
                      ${(addon.price_cents / 100).toFixed(2)}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="md:col-span-2">
            <label className="mb-2 block font-medium">Promo Code</label>
            <input
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Optional"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
            />
          </div>

          {submitError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 md:col-span-2">
              {submitError}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading || Boolean(guestWarning || dateWarning)}
            className="w-full rounded-xl bg-[#00A8A8] px-6 py-3 font-semibold text-white disabled:opacity-50 md:col-span-2"
          >
            {loading ? "Submitting..." : "Submit Booking Request"}
          </button>
        </form>
      )}
    </div>
  );
}
