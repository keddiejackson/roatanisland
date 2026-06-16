export type GuestMenuItem = {
  href: string;
  label: string;
  description: string;
  group: "plan" | "account" | "business";
};

export const guestMenuItems: GuestMenuItem[] = [
  {
    href: "/tours",
    label: "Experiences",
    description: "Tours, beach days, private charters, and island plans.",
    group: "plan",
  },
  {
    href: "/hotels",
    label: "Hotels & Stays",
    description: "Places to stay, resort areas, and nearby options.",
    group: "plan",
  },
  {
    href: "/transport",
    label: "Transportation",
    description: "Airport pickup, cruise transfers, drivers, and island rides.",
    group: "plan",
  },
  {
    href: "/map",
    label: "Roatan Day Map",
    description: "Explore exact pins, pickup areas, and saved stops.",
    group: "plan",
  },
  {
    href: "/concierge",
    label: "Ask Roa",
    description: "Your personal Roatan concierge for smarter trip planning.",
    group: "plan",
  },
  {
    href: "/community",
    label: "Roatan Circle",
    description: "Ask travelers, locals, operators, and Roa for island advice.",
    group: "plan",
  },
  {
    href: "/account",
    label: "My Saved Plan",
    description: "Open bookings, saved plans, messages, and profile details.",
    group: "account",
  },
  {
    href: "/signin",
    label: "Sign in",
    description: "Access your guest profile and trip dashboard.",
    group: "account",
  },
  {
    href: "/vendor/signup",
    label: "List your business",
    description: "Create a vendor profile and add your listings.",
    group: "business",
  },
];

export function getGuestMenuGroupLabel(group: GuestMenuItem["group"]) {
  if (group === "account") return "Guest";
  if (group === "business") return "Operators";
  return "Plan";
}
