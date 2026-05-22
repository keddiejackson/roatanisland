export type AvailabilityTone = "available" | "limited" | "full" | "blocked" | "choose";

export type AvailabilityBookingLike = {
  id: string;
  tour_date: string;
  tour_time: string;
  guests: number;
};

export function normalizeDateLines(value: string) {
  return Array.from(
    new Set(
      value
        .split(/\r?\n/)
        .map((date) => date.trim())
        .filter(Boolean),
    ),
  ).sort();
}

export function toggleDateLine(value: string, date: string) {
  const normalizedDate = date.trim();
  if (!normalizedDate) return value;

  const dates = normalizeDateLines(value);
  const nextDates = dates.includes(normalizedDate)
    ? dates.filter((item) => item !== normalizedDate)
    : [...dates, normalizedDate].sort();

  return nextDates.join("\n");
}

export function reservedGuestsForSlot({
  bookings,
  date,
  time,
}: {
  bookings: AvailabilityBookingLike[];
  date: string;
  time: string;
}) {
  return bookings
    .filter(
      (booking) =>
        booking.tour_date === date &&
        booking.tour_time === time,
    )
    .reduce((total, booking) => total + booking.guests, 0);
}

function timeSortValue(value: string) {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) return Number.MAX_SAFE_INTEGER;

  const hour = Number(match[1]);
  const minute = Number(match[2] || "0");
  const period = match[3].toUpperCase();
  const normalizedHour = hour === 12 ? 0 : hour;

  return normalizedHour * 60 + minute + (period === "PM" ? 12 * 60 : 0);
}

export function availabilitySummary({
  date,
  time,
  requestedGuests,
  maxGuests,
  reservedGuests,
  blockedDates,
}: {
  date: string;
  time: string;
  requestedGuests: number;
  maxGuests: number | null | undefined;
  reservedGuests: number;
  blockedDates: string[];
}) {
  if (!date || !time) {
    return {
      label: "Choose date and time",
      text: "Pick a date and time to check availability.",
      tone: "choose" as AvailabilityTone,
      remainingGuests: null,
    };
  }

  if (blockedDates.includes(date)) {
    return {
      label: "Not available",
      text: "This date is blocked by the vendor.",
      tone: "blocked" as AvailabilityTone,
      remainingGuests: 0,
    };
  }

  if (!maxGuests) {
    return {
      label: "Request available",
      text: "The operator will confirm capacity for this time.",
      tone: "available" as AvailabilityTone,
      remainingGuests: null,
    };
  }

  const remainingGuests = Math.max(maxGuests - reservedGuests, 0);

  if (remainingGuests <= 0 || requestedGuests > remainingGuests) {
    return {
      label: "Not enough spots",
      text:
        remainingGuests === 0
          ? "This time is currently full."
          : `${remainingGuests} spots left. Lower the guest count or choose another time.`,
      tone: "full" as AvailabilityTone,
      remainingGuests,
    };
  }

  if (remainingGuests <= Math.max(3, Math.ceil(maxGuests * 0.35))) {
    return {
      label: "Limited spots",
      text: `${remainingGuests} spots left for this time.`,
      tone: "limited" as AvailabilityTone,
      remainingGuests,
    };
  }

  return {
    label: "Available",
    text: `${remainingGuests} spots available for this time.`,
    tone: "available" as AvailabilityTone,
    remainingGuests,
  };
}

export function groupBookingsByDate<Booking extends AvailabilityBookingLike>(
  bookings: Booking[],
) {
  const groups = new Map<string, Booking[]>();

  bookings.forEach((booking) => {
    const dateBookings = groups.get(booking.tour_date) || [];
    dateBookings.push(booking);
    groups.set(booking.tour_date, dateBookings);
  });

  return [...groups.entries()]
    .map(([date, dateBookings]) => ({
      date,
      totalGuests: dateBookings.reduce((total, booking) => total + booking.guests, 0),
      bookings: dateBookings.sort(
        (first, second) =>
          timeSortValue(first.tour_time) - timeSortValue(second.tour_time) ||
          first.tour_time.localeCompare(second.tour_time),
      ),
    }))
    .sort((first, second) => first.date.localeCompare(second.date));
}
