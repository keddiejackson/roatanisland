import type {
  BookingThreadSummary,
  BookingThreadViewerRole,
} from "@/lib/booking-communication";

export type GlobalBookingChatBooking = {
  id: string;
  full_name?: string | null;
  tour_date: string;
  tour_time: string;
  guests: number;
  status?: string | null;
  listing_name?: string | null;
};

const dedicatedChatPaths = ["/account", "/admin/bookings", "/vendor/dashboard"];

export function shouldShowGlobalBookingChat(pathname: string | null | undefined) {
  const currentPath = pathname || "";

  if (!currentPath) return true;

  return !dedicatedChatPaths.some(
    (path) => currentPath === path || currentPath.startsWith(`${path}/`),
  );
}

export function buildGlobalBookingChatThread(
  booking: GlobalBookingChatBooking,
  viewerRole: BookingThreadViewerRole,
  summary?: BookingThreadSummary,
) {
  const listingName = booking.listing_name || "Roatan booking";
  const status = booking.status || "new";
  const guests = `${booking.guests} guest${booking.guests === 1 ? "" : "s"}`;
  const apiPrefix =
    viewerRole === "admin"
      ? "/api/admin/bookings"
      : viewerRole === "vendor"
        ? "/api/vendor/bookings"
        : "/api/bookings";

  return {
    id: booking.id,
    title:
      viewerRole === "guest"
        ? `${booking.tour_date} at ${booking.tour_time}`
        : `${booking.full_name || "Guest"} - ${booking.tour_date}`,
    subtitle: `${listingName} - ${guests} - ${status}`,
    apiPath: `${apiPrefix}/${booking.id}/messages`,
    summary,
  };
}
