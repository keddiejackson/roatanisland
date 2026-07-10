export type SignInRole = "guest" | "vendor" | "admin";

export type SignInDestination = {
  kind: SignInRole;
  role: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export const signInDestinations: readonly SignInDestination[] = [
  {
    kind: "guest",
    role: "Guests",
    title: "Guest Sign In",
    description:
      "View booking status, deposit updates, and trip details from one place.",
    href: "/account",
    cta: "Guest Sign In",
    secondaryHref: "/account?mode=signup",
    secondaryLabel: "Create guest account",
  },
  {
    kind: "vendor",
    role: "Vendors",
    title: "Vendor Sign In",
    description:
      "Manage listings, tour times, profile details, photos, and booking requests.",
    href: "/vendor/login",
    cta: "Vendor Sign In",
    secondaryHref: "/vendor/signup",
    secondaryLabel: "Create vendor account",
  },
  {
    kind: "admin",
    role: "Admin",
    title: "Admin Sign In",
    description:
      "Review vendors, listings, bookings, reports, and website settings.",
    href: "/admin/login",
    cta: "Admin Sign In",
  },
];

export function getPrimarySignInDestination(role: SignInRole) {
  return (
    signInDestinations.find((destination) => destination.kind === role) ||
    signInDestinations[0]
  );
}

export function safeInternalReturnPath(
  value: string | null | undefined,
  fallback = "/account",
) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const base = "https://www.roatanisland.life";
    const parsed = new URL(value, base);
    return parsed.origin === base
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
}
