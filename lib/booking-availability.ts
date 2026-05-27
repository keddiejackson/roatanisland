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
  booking_cutoff_hours?: number | null;
  auto_confirm_bookings?: boolean | null;
  private_booking_mode?: boolean | null;
  available_weekdays?: number[] | null;
  season_start_date?: string | null;
  season_end_date?: string | null;
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
  bookingCutoffHours: number | null;
  privateBookingMode: boolean;
  availableWeekdays: number[];
  seasonStartDate: string | null;
  seasonEndDate: string | null;
  remainingGuests: number | null;
  requestedGuests: number;
};

export type AvailabilityPreviewDay = {
  date: string;
  dayLabel: string;
  status: "available" | "limited" | "blocked";
  label: string;
  text: string;
  href: string;
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

function parseDateValue(value: string) {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function normalizeMonthDay(value: string | null | undefined) {
  const match = String(value || "")
    .trim()
    .match(/^(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return `${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function dateToMonthDay(date: string) {
  return date.slice(5, 10);
}

function isDateInSeason(
  date: string,
  start: string | null,
  end: string | null,
) {
  if (!start || !end) return true;

  const monthDay = dateToMonthDay(date);
  if (start <= end) {
    return monthDay >= start && monthDay <= end;
  }

  return monthDay >= start || monthDay <= end;
}

function addDays(date: Date, offset: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + offset);
  return next;
}

export function normalizeAvailableWeekdays(values: number[] | null | undefined) {
  const days = Array.from(
    new Set(
      (values || [])
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6),
    ),
  ).sort((first, second) => first - second);

  return days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6];
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
  const bookingCutoffHours =
    normalizePositiveInteger(listing?.booking_cutoff_hours) ?? minimumNoticeHours;
  const privateBookingMode = listing?.private_booking_mode === true;
  const availableWeekdays = normalizeAvailableWeekdays(listing?.available_weekdays);
  const seasonStartDate = normalizeMonthDay(listing?.season_start_date);
  const seasonEndDate = normalizeMonthDay(listing?.season_end_date);
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
      bookingCutoffHours,
      privateBookingMode,
      availableWeekdays,
      seasonStartDate,
      seasonEndDate,
      remainingGuests,
      requestedGuests,
    };
  }

  const parsedTourDate = parseDateValue(tourDate);

  if (blockedDates.includes(tourDate)) {
    reasons.push("That date is not available for this listing.");
  }

  if (parsedTourDate && !availableWeekdays.includes(parsedTourDate.getDay())) {
    reasons.push("This listing does not run on this day of the week.");
  }

  if (!isDateInSeason(tourDate, seasonStartDate, seasonEndDate)) {
    reasons.push("This date is outside this listing's season.");
  }

  if (allowedTourTimes.length > 0 && !allowedTourTimes.includes(tourTime)) {
    reasons.push("Please choose one of the available times for this listing.");
  }

  if (privateBookingMode && reserved > 0) {
    reasons.push("This private booking time is already reserved.");
  } else if (maxGuests !== null && requestedGuests > maxGuests) {
    reasons.push(`This listing allows up to ${maxGuests} guests per tour.`);
  } else if (remainingGuests !== null && requestedGuests > remainingGuests) {
    reasons.push(
      remainingGuests === 0
        ? "This time is currently full."
        : `Only ${remainingGuests} spots left for that date and time.`,
    );
  }

  if (bookingCutoffHours !== null) {
    const requestedAt = parseBookingDateTime(tourDate, tourTime);
    const earliestAllowed = new Date(
      now.getTime() + bookingCutoffHours * HOURS_TO_MS,
    );

    if (requestedAt && requestedAt.getTime() < earliestAllowed.getTime()) {
      reasons.push(
        `Please book at least ${pluralizeHours(bookingCutoffHours)} in advance.`,
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
      bookingCutoffHours,
      privateBookingMode,
      availableWeekdays,
      seasonStartDate,
      seasonEndDate,
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
      bookingCutoffHours,
      privateBookingMode,
      availableWeekdays,
      seasonStartDate,
      seasonEndDate,
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
      bookingCutoffHours,
      privateBookingMode,
      availableWeekdays,
      seasonStartDate,
      seasonEndDate,
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
    bookingCutoffHours,
    privateBookingMode,
    availableWeekdays,
    seasonStartDate,
    seasonEndDate,
    remainingGuests,
    requestedGuests,
  };
}

export function shouldAutoConfirmBooking({
  listing,
  availability,
}: {
  listing: BookingAvailabilityListing | null | undefined;
  availability: Pick<BookingAvailabilityCheck, "ok">;
}) {
  return listing?.auto_confirm_bookings === true && availability.ok;
}

export function getAvailabilityPreviewDays({
  listing,
  listingId,
  startDate,
  count = 14,
  now = new Date(),
}: {
  listing: BookingAvailabilityListing | null | undefined;
  listingId?: string;
  startDate?: string;
  count?: number;
  now?: Date;
}): AvailabilityPreviewDay[] {
  const start = startDate ? parseDateValue(startDate) : now;
  const normalizedStart = start || now;
  const times = normalizeTourTimes(listing?.tour_times);
  const previewTime = times[0] || "9:00 AM";

  return Array.from({ length: Math.max(1, count) }, (_, index) => {
    const date = formatDateValue(addDays(normalizedStart, index));
    const result = checkBookingAvailability({
      listing,
      tourDate: date,
      tourTime: previewTime,
      guests: 1,
      now,
    });
    const parsed = parseDateValue(date) || addDays(normalizedStart, index);
    const dayLabel = parsed.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const status =
      result.tone === "limited"
        ? "limited"
        : result.ok
          ? "available"
          : "blocked";
    const params = new URLSearchParams({ date, time: previewTime });
    if (listingId) params.set("listing", listingId);

    return {
      date,
      dayLabel,
      status,
      label: result.ok ? result.label : "Unavailable",
      text: result.text,
      href: `/book?${params.toString()}`,
    };
  });
}
