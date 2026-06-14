"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  bookingConversionChecklist,
  composeBookingGuestMessage,
  estimateBookingTotalCents,
  formatBookingCents,
  getBookingConfidenceCommandCenter,
  getBookingPaymentClarityCards,
  getBookingCheckoutReadiness,
  getBookingRecoveryPrompt,
  getBookingSuccessNextSteps,
  getBookingTrustSteps,
  getLuxuryBookingFlowSteps,
  getMobileBookingCheckoutSteps,
  getMobileBookingStickyCta,
} from "@/lib/booking-flow";
import {
  checkBookingAvailability,
  getAvailabilityPreviewDays,
  getMinimumNoticeDateValue,
  normalizeTourTimes,
} from "@/lib/booking-availability";
import {
  buildGuestProfileBookingPrefill,
  type GuestTravelProfile,
} from "@/lib/guest-command-center";
import {
  defaultMobileSiteControls,
  type MobileSiteControls,
} from "@/lib/mobile-site-controls";
import { supabase } from "@/lib/supabase";

type BookingFormProps = {
  listingId?: string;
  initialDate?: string;
  initialTime?: string;
  initialGuests?: string;
  mobileControls?: MobileSiteControls;
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
  booking_cutoff_hours: number | null;
  auto_confirm_bookings: boolean | null;
  private_booking_mode: boolean | null;
  available_weekdays: number[] | null;
  season_start_date: string | null;
  season_end_date: string | null;
};

type Addon = {
  id: string;
  name: string;
  price_cents: number;
};

type AvailabilityStatus = {
  label: string;
  text: string;
  tone: "available" | "limited" | "full" | "blocked" | "choose";
  remainingGuests: number | null;
};

type BookingDraft = {
  listingId?: string;
  fullName?: string;
  email?: string;
  tourDate?: string;
  tourTime?: string;
  guests?: string;
  pickupPreference?: string;
  guestMessage?: string;
  promoCode?: string;
};

const DEFAULT_TOUR_TIMES = ["10:30 AM", "4:30 PM Sunset Cruise"];
const BOOKING_DRAFT_KEY = "roatan-booking-draft";
const PICKUP_OPTIONS = [
  "Hotel pickup",
  "Cruise port pickup",
  "Airport pickup",
  "Meet on site",
  "Not sure yet",
];

function availabilityToneClass(tone: AvailabilityStatus["tone"]) {
  if (tone === "blocked" || tone === "full") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (tone === "limited") {
    return "border-[#D6B56D]/40 bg-[#FFF8E8] text-[#7A5B12]";
  }

  return "border-[#00A8A8]/25 bg-[#EEF7F6] text-[#0B3C5D]";
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

function readBookingDraft(listingId?: string): BookingDraft | null {
  if (typeof window === "undefined") return null;

  try {
    const draft = JSON.parse(localStorage.getItem(BOOKING_DRAFT_KEY) || "");
    if (!draft || typeof draft !== "object") return null;
    if (draft.listingId && listingId && draft.listingId !== listingId) {
      return null;
    }
    return draft as BookingDraft;
  } catch {
    return null;
  }
}

function writeBookingDraft(draft: BookingDraft) {
  if (typeof window === "undefined") return;

  const hasAnyValue = Object.entries(draft).some(
    ([key, value]) => key !== "listingId" && Boolean(String(value || "").trim()),
  );

  if (hasAnyValue) {
    localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
  } else {
    localStorage.removeItem(BOOKING_DRAFT_KEY);
  }
}

export default function BookingForm({
  listingId,
  initialDate = "",
  initialTime = "",
  initialGuests = "",
  mobileControls = defaultMobileSiteControls,
}: BookingFormProps) {
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
  const [tourDate, setTourDate] = useState(initialDate);
  const [tourTime, setTourTime] = useState(initialTime);
  const [guests, setGuests] = useState(initialGuests);
  const [pickupPreference, setPickupPreference] = useState("");
  const [guestMessage, setGuestMessage] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] =
    useState<AvailabilityStatus | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [recoveredDraft, setRecoveredDraft] = useState<BookingDraft | null>(null);

  useEffect(() => {
    const profile = readGuestProfile();
    const draft = readBookingDraft(listingId);

    if (profile) {
      const prefill = buildGuestProfileBookingPrefill(profile);
      setFullName((current) => current || prefill.fullName);
      setGuests((current) => current || prefill.guests);
      setPickupPreference((current) => current || prefill.pickupPreference);
      setGuestMessage((current) => current || prefill.guestMessage);
    }

    if (draft) {
      setRecoveredDraft(draft);
      setFullName((current) => current || draft.fullName || "");
      setEmail((current) => current || draft.email || "");
      setTourDate((current) => current || draft.tourDate || "");
      setTourTime((current) => current || draft.tourTime || "");
      setGuests((current) => current || draft.guests || "");
      setPickupPreference((current) => current || draft.pickupPreference || "");
      setGuestMessage((current) => current || draft.guestMessage || "");
      setPromoCode((current) => current || draft.promoCode || "");
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) {
        setEmail((current) => current || data.user?.email || "");
      }
    });
  }, [listingId]);

  useEffect(() => {
    if (submitted) return;

    writeBookingDraft({
      listingId,
      fullName,
      email,
      tourDate,
      tourTime,
      guests,
      pickupPreference,
      guestMessage,
      promoCode,
    });
  }, [
    email,
    fullName,
    guestMessage,
    guests,
    listingId,
    pickupPreference,
    promoCode,
    submitted,
    tourDate,
    tourTime,
  ]);

  useEffect(() => {
    async function fetchListing() {
      if (!listingId) {
        return;
      }

      const { data, error } = await supabase
        .from("listings")
        .select(
          "title, price, location, tour_times, blocked_dates, availability_note, max_guests, minimum_notice_hours, booking_cutoff_hours, auto_confirm_bookings, private_booking_mode, available_weekdays, season_start_date, season_end_date",
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
              | "booking_cutoff_hours"
              | "auto_confirm_bookings"
              | "private_booking_mode"
              | "available_weekdays"
              | "season_start_date"
              | "season_end_date"
            >),
            tour_times: DEFAULT_TOUR_TIMES,
            blocked_dates: [],
            availability_note: null,
            max_guests: null,
            minimum_notice_hours: null,
            booking_cutoff_hours: null,
            auto_confirm_bookings: false,
            private_booking_mode: false,
            available_weekdays: null,
            season_start_date: null,
            season_end_date: null,
            id: listingId,
          });
        }
      }
    }

    fetchListing();
  }, [listingId]);

  useEffect(() => {
    if (!listingId || !tourDate || !tourTime) {
      setAvailabilityStatus(null);
      setCheckingAvailability(false);
      return;
    }

    const requestedGuests = Number(guests);
    const guestTotal =
      Number.isFinite(requestedGuests) && requestedGuests > 0
        ? requestedGuests
        : 1;
    const controller = new AbortController();
    const params = new URLSearchParams({
      listingId,
      date: tourDate,
      time: tourTime,
      guests: String(guestTotal),
    });

    async function checkAvailability() {
      setCheckingAvailability(true);

      try {
        const response = await fetch(`/api/availability?${params.toString()}`, {
          signal: controller.signal,
        });
        const result = await response.json();

        if (response.ok) {
          setAvailabilityStatus(result as AvailabilityStatus);
        } else {
          setAvailabilityStatus(null);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.error("Error checking availability:", err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCheckingAvailability(false);
        }
      }
    }

    checkAvailability();

    return () => controller.abort();
  }, [guests, listingId, tourDate, tourTime]);

  const availableTourTimes = listing
    ? normalizeTourTimes(listing.tour_times)
    : listingId
      ? []
      : DEFAULT_TOUR_TIMES;
  const hasListedTourTimes = availableTourTimes.length > 0;
  const guestCount = Number(guests);
  const selectedAddons = useMemo(
    () => addons.filter((addon) => selectedAddonIds.includes(addon.id)),
    [addons, selectedAddonIds],
  );
  const previewGuestCount =
    Number.isFinite(guestCount) && guestCount > 0 ? guestCount : 1;
  const localAvailabilityCheck = useMemo(
    () =>
      checkBookingAvailability({
        listing,
        tourDate,
        tourTime,
        guests: previewGuestCount,
      }),
    [listing, previewGuestCount, tourDate, tourTime],
  );
  const minimumTourDate =
    localAvailabilityCheck.bookingCutoffHours !== null
      ? getMinimumNoticeDateValue(localAvailabilityCheck.bookingCutoffHours)
      : undefined;
  const estimatedTotalCents = estimateBookingTotalCents({
    price: listing?.price,
    guests: previewGuestCount,
    selectedAddons,
  });
  const showEstimatedTotal = Boolean(listing?.price || selectedAddons.length > 0);
  const estimatedTotalLabel = showEstimatedTotal
    ? formatBookingCents(estimatedTotalCents)
    : "Pending";
  const depositsEnabled =
    process.env.NEXT_PUBLIC_STRIPE_DEPOSITS_ENABLED === "true";
  const paymentClarityCards = getBookingPaymentClarityCards({
    estimatedTotalLabel,
    depositsEnabled,
  });
  const guestWarning =
    localAvailabilityCheck.reasons.find((reason) =>
      reason.includes("guests per tour"),
    ) || "";
  const dateWarning =
    localAvailabilityCheck.reasons.find((reason) =>
      reason.includes("date is not available"),
    ) || "";
  const timeWarning =
    localAvailabilityCheck.reasons.find((reason) =>
      reason.includes("available times"),
    ) || "";
  const noticeWarning =
    localAvailabilityCheck.reasons.find((reason) =>
      reason.includes("in advance"),
    ) || "";
  const availabilityBlocksBooking =
    availabilityStatus?.tone === "blocked" ||
    availabilityStatus?.tone === "full" ||
    localAvailabilityCheck.reasons.length > 0;
  const bookingReadiness = getBookingCheckoutReadiness({
    fullName,
    email,
    tourDate,
    tourTime,
    guests,
    pickupPreference,
  });
  const mobileCheckoutSteps = getMobileBookingCheckoutSteps({
    fullName,
    email,
    tourDate,
    tourTime,
    guests,
    pickupPreference,
    availabilityBlocked: availabilityBlocksBooking,
  });
  const mobileCheckoutCta = getMobileBookingStickyCta({
    submitted,
    loading,
    availabilityBlocked: availabilityBlocksBooking,
    readinessScore: bookingReadiness.score,
    missingItems: bookingReadiness.missingItems,
    estimatedTotalLabel,
  });
  const conversionChecklist = bookingConversionChecklist({
    hasListing: Boolean(listingId || listing),
    hasAvailability: Boolean(availabilityStatus || !listingId),
    hasAddons: addons.length === 0 || selectedAddons.length > 0,
    hasEstimatedTotal: showEstimatedTotal,
  });
  const trustSteps = getBookingTrustSteps();
  const luxurySteps = getLuxuryBookingFlowSteps();
  const recoveryPrompt = getBookingRecoveryPrompt({
    fullName: recoveredDraft?.fullName || fullName,
    email: recoveredDraft?.email || email,
    tourDate: recoveredDraft?.tourDate || tourDate,
    tourTime: recoveredDraft?.tourTime || tourTime,
    guests: recoveredDraft?.guests || guests,
  });
  const bookingConfidence = getBookingConfidenceCommandCenter({
    fullName,
    email,
    tourDate,
    tourTime,
    guests,
    pickupPreference,
    guestMessage,
    estimatedTotalLabel,
    availabilityTone: availabilityStatus?.tone || "choose",
    hasListing: Boolean(listingId || listing),
    depositsEnabled,
  });
  const successNextSteps = getBookingSuccessNextSteps({
    bookingId,
    depositsEnabled,
    hasEmail: Boolean(email.trim()),
  });
  const availabilityPreviewDays = useMemo(
    () =>
      getAvailabilityPreviewDays({
        listing,
        listingId,
        startDate: minimumTourDate,
        count: 14,
      }),
    [listing, listingId, minimumTourDate],
  );

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
      localStorage.removeItem(BOOKING_DRAFT_KEY);
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
    <div className="mobile-no-overflow mx-auto grid w-full max-w-7xl gap-8 pb-28 lg:grid-cols-[minmax(0,1fr)_390px] lg:pb-0">
      <section className="mobile-no-overflow rounded-[2rem] bg-white p-5 shadow-2xl shadow-[#071F2F]/10 ring-1 ring-black/5 sm:p-8">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
          <span className="sm:hidden">{mobileControls.mobileBookingHeroEyebrow}</span>
          <span className="hidden sm:inline">Private booking request desk</span>
        </p>
        <h1 className="mt-2 text-3xl font-black leading-tight text-[#0B3C5D] sm:text-5xl">
          <span className="sm:hidden">
            {listing
              ? `${mobileControls.mobileBookingSubmitLabel} ${listing.title}`
              : mobileControls.mobileBookingHeroTitle}
          </span>
          <span className="hidden sm:inline">
            {listing
              ? `Request ${listing.title}`
              : "Request a Roatan experience"}
          </span>
        </h1>

        <p className="mt-3 max-w-3xl leading-7 text-gray-600">
          <span className="sm:hidden">{mobileControls.mobileBookingHeroBody}</span>
          <span className="hidden sm:inline">
            A guided booking flow with availability, pickup notes, payment
            expectations, and guest messaging all connected before the operator
            confirms your plans.
          </span>
        </p>

        <section
          aria-label="Mobile booking checkout"
          className="mt-6 rounded-[1.5rem] border border-[#00A8A8]/20 bg-[#EEF7F6] p-3 lg:hidden"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#007B7B]">
                {mobileControls.mobileBookingStepLabel}
              </p>
              <p className="mt-1 text-sm font-bold text-[#0B3C5D]">
                {mobileCheckoutCta.tone === "ready"
                  ? mobileControls.mobileBookingStickyReadyLabel
                  : mobileCheckoutCta.label}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-[#0B3C5D]">
              {bookingReadiness.score}%
            </span>
          </div>
          <div className="mobile-scroll-row mt-3 flex gap-2 overflow-x-auto pb-1">
            {mobileCheckoutSteps.map((step) => (
              <a
                key={step.key}
                href={step.href}
                className={`min-w-32 rounded-2xl border px-3 py-2 text-left transition ${
                  step.state === "complete"
                    ? "border-[#00A8A8]/20 bg-white text-[#0B3C5D]"
                    : step.state === "current"
                      ? "border-[#00A8A8] bg-[#071F2F] text-white"
                      : step.state === "blocked"
                        ? "border-red-200 bg-red-50 text-red-800"
                        : "border-white/80 bg-white/65 text-[#0B3C5D]/70"
                }`}
              >
                <span className="block text-xs font-black uppercase tracking-[0.12em]">
                  {step.state === "complete"
                    ? "Done"
                    : step.state === "current"
                      ? "Now"
                      : step.state === "blocked"
                        ? "Check"
                        : "Next"}
                </span>
                <span className="mt-1 block text-sm font-black">
                  {step.label}
                </span>
                <span className="mt-0.5 block text-xs opacity-75">
                  {step.text}
                </span>
              </a>
            ))}
          </div>
        </section>

        <div className="mobile-scroll-row mt-6 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 xl:grid-cols-5">
          {luxurySteps.map((step) => (
          <div
            key={step.label}
            className="min-w-64 rounded-2xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-4 sm:min-w-0"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9C7A2F]">
              Step {step.number}
            </p>
            <p className="mt-1 font-black text-[#0B3C5D]">{step.label}</p>
            <p className="mt-2 text-xs leading-5 text-gray-600">{step.text}</p>
          </div>
        ))}
        </div>

      {recoveryPrompt.shouldShow ? (
        <div className="mt-6 rounded-xl border border-[#D6B56D]/30 bg-[#FFF8E8] p-4">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[#9C7A2F]">
            Finish your request
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-[#0B3C5D]">
            {recoveryPrompt.text}
          </p>
        </div>
      ) : null}

      <section className="mt-6 rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#007B7B]">
              Booking readiness
            </p>
            <h2 className="mt-1 text-xl font-black text-[#0B3C5D]">
              {bookingReadiness.label} - {bookingReadiness.score}%
            </h2>
          </div>
          <div className="h-2 min-w-40 overflow-hidden rounded-full bg-white">
            <span
              className="block h-full rounded-full bg-[#00A8A8]"
              style={{ width: `${bookingReadiness.score}%` }}
            />
          </div>
        </div>
        {bookingReadiness.missingItems.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {bookingReadiness.missingItems.map((item) => (
              <span
                key={item}
                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0B3C5D]"
              >
                Needs {item.toLowerCase()}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm font-semibold text-[#0B3C5D]/70">
            The request has the details an operator needs to answer quickly.
          </p>
        )}
      </section>

      <section className="mt-4 rounded-[1.5rem] border border-[#D6B56D]/25 bg-[#FFFDF7] p-4 sm:hidden">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9C7A2F]">
          How the request works
        </p>
        <h2 className="mt-1 text-xl font-black text-[#0B3C5D]">
          Confidence and payment checks
        </h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          Add the basics, send the request, then we keep messages and payment
          notes attached to your booking.
        </p>
      </section>

      <section className="mt-6 hidden rounded-[1.5rem] border border-[#D6B56D]/25 bg-[#FFFDF7] p-5 sm:block">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9C7A2F]">
              Booking Confidence Command Center
            </p>
            <h2 className="mt-1 text-2xl font-black text-[#0B3C5D]">
              {bookingConfidence.headline}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              {bookingConfidence.primaryText}
            </p>
          </div>
          <div className="rounded-2xl bg-[#071F2F] px-5 py-4 text-white shadow-lg">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">
              Confidence
            </p>
            <p className="mt-1 text-3xl font-black">
              {bookingConfidence.score}%
            </p>
            <p className="mt-1 text-xs font-bold text-[#9EE8E3]">
              {bookingConfidence.label}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {bookingConfidence.signals.map((signal) => (
            <div
              key={signal.label}
              className={`rounded-2xl border p-4 ${
                signal.tone === "urgent"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : signal.tone === "watch"
                    ? "border-[#D6B56D]/35 bg-[#FFF8E8] text-[#0B3C5D]"
                    : "border-[#00A8A8]/20 bg-[#EEF7F6] text-[#0B3C5D]"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-[0.14em]">
                Smart trip signals
              </p>
              <p className="mt-1 font-black">{signal.label}</p>
              <p className="mt-1 text-sm leading-6 opacity-80">{signal.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-semibold leading-6 text-[#0B3C5D] shadow-sm">
          {bookingConfidence.guestPromise}
        </div>
      </section>

      {listing ? (
        <div className="mt-6 rounded-xl border border-[#00A8A8]/20 bg-[#00A8A8]/10 p-4">
          <p className="font-semibold text-[#0B3C5D]">{listing.title}</p>
          <p className="mt-1 text-sm text-gray-600">
            {listing.location || "Roatan"}
            {listing.price ? ` - From $${listing.price}` : ""}
          </p>
        </div>
      ) : null}

      <section className="mt-6 hidden gap-3 sm:grid md:grid-cols-4">
        {trustSteps.map((step, index) => (
          <div
            key={step.label}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#00A8A8]">
              {index + 1}
            </p>
            <p className="mt-1 font-black text-[#0B3C5D]">{step.label}</p>
            <p className="mt-1 text-xs leading-5 text-gray-600">{step.text}</p>
          </div>
        ))}
      </section>

      <div
        id="booking-review"
        className="mt-6 scroll-mt-24 rounded-xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-5"
      >
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
              {estimatedTotalLabel}
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
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {conversionChecklist.map((item) => (
            <div
              key={item.label}
              className={`rounded-xl px-4 py-3 ${
                item.done ? "bg-white text-[#0B3C5D]" : "bg-[#FFF3D2] text-[#7A5A00]"
              }`}
            >
              <p className="text-xs font-black uppercase tracking-[0.12em]">
                {item.done ? "Ready" : "Check"}
              </p>
              <p className="mt-1 font-black">{item.label}</p>
              <p className="mt-1 text-xs leading-5 opacity-75">{item.text}</p>
            </div>
          ))}
        </div>
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
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {successNextSteps.map((step) => (
              <Link
                key={step.label}
                href={step.href}
                className="rounded-xl bg-white/85 p-4 text-green-950 shadow-sm transition hover:bg-white"
              >
                <p className="text-sm font-black">{step.label}</p>
                <p className="mt-1 text-sm leading-6">{step.text}</p>
              </Link>
            ))}
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
              Browse more experiences
            </Link>
            {listingId ? (
              <Link
                href={`/listings/${listingId}`}
                className="rounded-xl bg-white px-5 py-3 font-semibold text-green-800"
              >
                Back to experience
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
        <form
          id="booking-request-form"
          onSubmit={handleSubmit}
          className="mobile-no-overflow mt-8 grid gap-6 md:grid-cols-2"
        >
          <div
            id="booking-guest"
            className="scroll-mt-24 rounded-2xl bg-[#F8F3EA] p-4 md:col-span-2"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#00A8A8]">
              Guest details
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Start with the traveler who should receive booking updates,
              payment links, and messages from the operator.
            </p>
          </div>

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

          <div
            id="booking-date"
            className="scroll-mt-24 rounded-2xl bg-[#F8F3EA] p-4 md:col-span-2"
          >
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#00A8A8]">
              Date and availability
            </p>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Pick the day, time, and group size you want. We check experience
              limits before the request can be sent.
            </p>
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
            {localAvailabilityCheck.bookingCutoffHours ? (
              <p className="mt-2 text-sm text-gray-500">
                Please book at least{" "}
                {localAvailabilityCheck.bookingCutoffHours}{" "}
                hours in advance.
              </p>
            ) : null}
            {dateWarning ? (
              <p className="mt-2 text-sm font-semibold text-red-600">
                {dateWarning}
              </p>
            ) : null}
            {noticeWarning ? (
              <p className="mt-2 text-sm font-semibold text-red-600">
                {noticeWarning}
              </p>
            ) : null}
          </div>

          {listing ? (
            <section className="rounded-xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-4 md:col-span-2">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9C7A2F]">
                    Availability calendar
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[#0B3C5D]">
                    Pick an open day.
                  </h3>
                </div>
                {listing.auto_confirm_bookings ? (
                  <span className="rounded-full bg-[#00A8A8] px-3 py-1 text-xs font-black uppercase tracking-wide text-white">
                    Auto-confirm eligible
                  </span>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {availabilityPreviewDays.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => {
                      if (day.status !== "blocked") {
                        setTourDate(day.date);
                        if (!tourTime && availableTourTimes[0]) {
                          setTourTime(availableTourTimes[0]);
                        }
                      }
                    }}
                    disabled={day.status === "blocked"}
                    className={`min-h-20 rounded-xl border p-3 text-left text-xs transition ${
                      day.status === "blocked"
                        ? "border-red-100 bg-red-50 text-red-700 opacity-70"
                        : day.status === "limited"
                          ? "border-[#D6B56D]/40 bg-white text-[#7A5B12] hover:border-[#D6B56D]"
                          : "border-[#00A8A8]/25 bg-white text-[#0B3C5D] hover:border-[#00A8A8]"
                    }`}
                  >
                    <span className="block font-black">{day.dayLabel}</span>
                    <span className="mt-1 block font-semibold">{day.label}</span>
                  </button>
                ))}
              </div>
              {listing.private_booking_mode ? (
                <p className="mt-3 text-sm font-semibold text-[#0B3C5D]">
                  Private booking mode: once a time is reserved, that time closes
                  for other guests.
                </p>
              ) : null}
            </section>
          ) : null}

          <div>
            <label className="mb-2 block font-medium">
              {hasListedTourTimes ? "Available times" : "Preferred time"}
            </label>
            {hasListedTourTimes ? (
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
            ) : (
              <input
                value={tourTime}
                onChange={(e) => setTourTime(e.target.value)}
                placeholder="Example: 9:00 AM"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                required
              />
            )}
            {listing?.availability_note ? (
              <p className="mt-2 text-sm text-gray-500">
                {listing.availability_note}
              </p>
            ) : null}
            {!hasListedTourTimes && listing ? (
              <p className="mt-2 text-sm text-gray-500">
                This operator has not listed fixed times, so request the time
                you prefer.
              </p>
            ) : null}
            {timeWarning ? (
              <p className="mt-2 text-sm font-semibold text-red-600">
                {timeWarning}
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

          {availabilityStatus ? (
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-semibold md:col-span-2 ${availabilityToneClass(
                availabilityStatus.tone,
              )}`}
            >
              <p>{availabilityStatus.label}</p>
              <p className="mt-1 font-normal">
                {checkingAvailability ? "Checking the latest availability..." : availabilityStatus.text}
              </p>
            </div>
          ) : null}

          <div id="booking-pickup" className="scroll-mt-24 md:col-span-2">
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
              <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.14em] text-[#00A8A8]">
                    Optional upgrades
                  </p>
                  <p className="mt-1 font-medium text-[#0B3C5D]">
                    Add-ons can improve pickup, food, privacy, or comfort.
                  </p>
                </div>
                <p className="text-sm font-bold text-gray-500">
                  {selectedAddons.length} selected
                </p>
              </div>
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
            disabled={
              loading ||
              Boolean(guestWarning || dateWarning || availabilityBlocksBooking)
            }
            className="w-full rounded-xl bg-[#00A8A8] px-6 py-3 font-semibold text-white disabled:opacity-50 md:col-span-2"
          >
            {loading ? "Submitting..." : mobileControls.mobileBookingSubmitLabel}
          </button>
        </form>
      )}
      </section>

      <aside className="hidden h-fit rounded-[2rem] border border-white/70 bg-white p-5 shadow-2xl shadow-[#071F2F]/10 lg:sticky lg:top-6 lg:block">
        <div className="rounded-[1.5rem] bg-[#071F2F] p-5 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9EE8E3]">
            Trip summary
          </p>
          <h2 className="mt-2 text-2xl font-black">
            {listing?.title || "Roatan experience"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/70">
            {listing?.location || "Roatan"}
            {tourDate ? ` - ${tourDate}` : ""}
            {tourTime ? ` at ${tourTime}` : ""}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-white/55">
                Guests
              </p>
              <p className="mt-1 text-xl font-black">
                {guests || "Add"}
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.14em] text-white/55">
                Total
              </p>
              <p className="mt-1 text-xl font-black">{estimatedTotalLabel}</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/15 bg-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D6B56D]">
              Request readiness
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
              <span
                className="block h-full rounded-full bg-[#00A8A8]"
                style={{ width: `${bookingReadiness.score}%` }}
              />
            </div>
            <p className="mt-3 text-sm font-semibold text-white/75">
              {bookingReadiness.label} - {bookingReadiness.score}%
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-[#D6B56D]/25 bg-[#FBF7EC] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#9C7A2F]">
            Payment clarity
          </p>
          <div className="mt-4 grid gap-3">
            {paymentClarityCards.map((card) => (
              <div key={card.label} className="rounded-2xl bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-black text-[#0B3C5D]">{card.label}</p>
                  <p className="text-right text-sm font-black text-[#007B7B]">
                    {card.value}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {card.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-[#00A8A8]/20 bg-[#EEF7F6] p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#007B7B]">
            After you send
          </p>
          <div className="mt-4 grid gap-3 text-sm leading-6 text-[#0B3C5D]">
            <p>The request appears on your status page and guest dashboard.</p>
            <p>Messages stay attached to this booking, so pickup and payment notes are easy to find.</p>
            <p>Deposit or full payment is offered only when the booking is ready for the next step.</p>
          </div>
        </div>
      </aside>
      {!submitted ? (
        <div className="mobile-safe-bottom mobile-no-overflow fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/95 px-3 pt-3 shadow-2xl shadow-[#071F2F]/20 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
                {mobileCheckoutCta.priceLabel}
              </p>
              <p className="truncate text-sm font-black text-[#0B3C5D]">
                {mobileCheckoutCta.tone === "ready"
                  ? mobileControls.mobileBookingStickyReadyLabel
                  : mobileCheckoutCta.label}
              </p>
              <p className="truncate text-xs font-semibold text-gray-500">
                {mobileCheckoutCta.text}
              </p>
            </div>
            {mobileCheckoutCta.canSubmit ? (
              <button
                type="submit"
                form="booking-request-form"
                disabled={loading}
                className="shrink-0 rounded-2xl bg-[#00A8A8] px-4 py-3 text-sm font-black text-white shadow-lg shadow-[#00A8A8]/20 disabled:opacity-50"
              >
                {mobileControls.mobileBookingSubmitLabel}
              </button>
            ) : (
              <a
                href={mobileCheckoutCta.href}
                className={`shrink-0 rounded-2xl px-4 py-3 text-sm font-black shadow-lg ${
                  mobileCheckoutCta.tone === "blocked"
                    ? "bg-red-600 text-white shadow-red-200"
                    : "bg-[#071F2F] text-white shadow-[#071F2F]/20"
                }`}
              >
                {mobileCheckoutCta.actionLabel}
              </a>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
