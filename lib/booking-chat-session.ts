import type { BookingThreadViewerRole } from "@/lib/booking-communication";

export function bookingChatStatusLabel(viewerRole: BookingThreadViewerRole) {
  if (viewerRole === "admin") return "Admin signed in";
  if (viewerRole === "vendor") return "Vendor signed in";
  return "Guest signed in";
}

export function bookingChatAccountPath(viewerRole: BookingThreadViewerRole) {
  if (viewerRole === "admin") return "/admin";
  if (viewerRole === "vendor") return "/vendor/dashboard";
  return "/account";
}

export function bookingChatSignInPath(viewerRole: BookingThreadViewerRole) {
  if (viewerRole === "admin") return "/admin/login";
  if (viewerRole === "vendor") return "/vendor/login";
  return "/signin";
}
