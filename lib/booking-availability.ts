export type BookingAvailabilityTone =
  | "available"
  | "limited"
  | "full"
  | "blocked"
  | "choose";

export type BookingAvailabilityListing = {
  tour_times?: string[] | null;
  blocked_dates?: string[] | null;
  max_guests?: number | null;
  minimum_notice_hours?: number | null;
};

export type BookingAvailabilityCheck = {
  ok: boolean;
  label: string;
  text: string;
  tone: BookingAvailabilityTone;
  reasons: string[];
  allowedTourTimes: string[];
  blockedDates: string[];
  maxGuests: number | null;
  minimumNoticeHours: number | null;
  remainingGuests: number | null;
  requestedGuests: number;
};

const HOURS_TO_MS = 60 * 60 * 1000;

function uniqueTrimmed(values: string[] | null | undefined) {
  return Array.from(
    new Set((values || []).map((value) => String(value).trim()).filter(Boolean)),
  );
}

function normalizePositiveInteger(value: number | null | undefined) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
  return Math.floor(numberValue);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pluralizeHours(hours: number) {
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

export function normalizeTourTimes(values: string[] | null | undefined) {
  return uniqueTrimmed(values);
}

export function normalizeBlockedDates(values: string[] | null | undefined) {
  return uniqueTrimmed(values).map((date) => date.slice(0, 10));
}

export function getMinimumNoticeDateValue(hours: number, now = new Date()) {
  const normalizedHours = normalizePositiveInteger(hours) || 0;
  return formatDateValue(new Date(now.getTime() + normalizedHours * HOURS_TO_MS));
}

export function parseBookingDateTime(date: string, time: string) {
  const dateMatch = date.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1;
  const day = Number(dateMatch[3]);
  let hours = 23;
  let minutes = 59;
  const timeMatch = time
    .trim()
    .match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)\b/i);

  if (timeMatch) {
    const rawHour = Number(timeMatch[1]);
    const period = timeMatch[3].toUpperCase();
    minutes = Number(timeMatch[2] || "0");
    hours = rawHour % 12;
    if (period === "PM") hours += 12;
  }

  return new Date(year, month, day, hours, minutes, 0, 0);
}

export function checkBookingAvailability({
  listing,
  tourDate,
  tourTime,
  guests,
  reservedGuests = 0,
  now = new Date(),
}: {
  listing: BookingAvailabilityListing | null | undefined;
  tourDate: string;
  tourTime: string;
  guests: number;
  reservedGuests?: number;
  now?: Date;
}): BookingAvailabilityCheck {
  const allowedTourTimes = normalizeTourTimes(listing?.tour_times);
  const blockedDates = normalizeBlockedDates(listing?.blocked_dates);
  const maxGuests = normalizePositiveInteger(listing?.max_guests);
  const minimumNoticeHours = normalizePositiveInteger(
    listing?.minimum_notice_hours,
  );
  const requestedGuests =
    Number.isFinite(guests) && guests > 0 ? Math.floor(guests) : 1;
  const reserved = Math.max(0, Math.floor(Number(reservedGuests) || 0));
  const remainingGuests =
    maxGuests === null ? null : Math.max(maxGuests - reserved, 0);
  const reasons: string[] = [];

  if (!tourDate || !tourTime) {
    return {
      ok: false,
      label: "Choose date and time",
      text: "Pick a date and time to check availability.",
      tone: "choose",
      reasons,
      allowedTourTimes,
      blockedDates,
      maxGuests,
      minimumNoticeHours,
      remainingGuests,
      requestedGuests,
    };
  }

  if (blockedDates.includes(tourDate)) {
    reasons.push("That date is not available for this listing.");
  }

  if (allowedTourTimes.length > 0 && !allowedTourTimes.includes(tourTime)) {
    reasons.push("Please choose one of the available times for this listing.");
  }

  if (maxGuests !== null && requestedGuests > maxGuests) {
    reasons.push(`This listing allows up to ${maxGuests} guests per tour.`);
  } else if (remainingGuests !== null && requestedGuests > remainingGuests) {
    reasons.push(
      remainingGuests === 0
        ? "This time is currently full."
        : `Only ${remainingGuests} spots left for that date and time.`,
    );
  }

  if (minimumNoticeHours !== null) {
    const requestedAt = parseBookingDateTime(tourDate, tourTime);
    const earliestAllowed = new Date(
      now.getTime() + minimumNoticeHours * HOURS_TO_MS,
    );

    if (requestedAt && requestedAt.getTime() < earliestAllowed.getTime()) {
      reasons.push(
        `Please book at least ${pluralizeHours(minimumNoticeHours)} in advance.`,
      );
    }
  }

  if (reasons.length > 0) {
    const isCapacityIssue = reasons.some(
      (reason) => reason.includes("spots") || reason.includes("full"),
    );

    return {
      ok: false,
      label: isCapacityIssue ? "Not enough spots" : "Not available",
      text: reasons.join(" "),
      tone: isCapacityIssue ? "full" : "blocked",
      reasons,
      allowedTourTimes,
      blockedDates,
      maxGuests,
      minimumNoticeHours,
      remainingGuests,
      requestedGuests,
    };
  }

  if (remainingGuests === null) {
    return {
      ok: true,
      label: "Request available",
      text: "The operator will confirm capacity for this time.",
      tone: "available",
      reasons,
      allowedTourTimes,
      blockedDates,
      maxGuests,
      minimumNoticeHours,
      remainingGuests,
      requestedGuests,
    };
  }

  if (remainingGuests <= Math.max(3, Math.ceil((maxGuests ?? 0) * 0.35))) {
    return {
      ok: true,
      label: "Limited spots",
      text: `${remainingGuests} spots left for this time.`,
      tone: "limited",
      reasons,
      allowedTourTimes,
      blockedDates,
      maxGuests,
      minimumNoticeHours,
      remainingGuests,
      requestedGuests,
    };
  }

  return {
    ok: true,
    label: "Available",
    text: `${remainingGuests} spots available for this time.`,
    tone: "available",
    reasons,
    allowedTourTimes,
    blockedDates,
    maxGuests,
    minimumNoticeHours,
    remainingGuests,
    requestedGuests,
  };
}
