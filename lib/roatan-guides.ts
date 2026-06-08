export type RoatanGuideSection = {
  title: string;
  body: string;
  bullets: string[];
};

export type RoatanGuide = {
  slug: string;
  eyebrow: string;
  title: string;
  summary: string;
  bestFor: string[];
  ctaLabel: string;
  ctaHref: string;
  sections: RoatanGuideSection[];
};

export const roatanGuides: RoatanGuide[] = [
  {
    slug: "roatan-cruise-day",
    eyebrow: "Cruise guest guide",
    title: "Plan a polished Roatan cruise day.",
    summary:
      "A simple guide for guests arriving by ship who need timing, pickup, and return-to-port confidence before choosing an experience.",
    bestFor: ["Cruise arrivals", "Short island days", "Easy return timing"],
    ctaLabel: "Ask Roa to plan it",
    ctaHref: "/concierge",
    sections: [
      {
        title: "Start with timing",
        body: "Cruise guests need a day that works around ship arrival, pickup, activity time, and return.",
        bullets: [
          "Share ship arrival and departure times before requesting.",
          "Choose operators who understand cruise-port timing.",
          "Leave a return buffer instead of planning every minute.",
        ],
      },
      {
        title: "Choose fewer, better stops",
        body: "A luxury cruise day should feel calm, not rushed.",
        bullets: [
          "Pick one main experience and one easy backup stop.",
          "Use the map to compare beach, port, and pickup distance.",
          "Ask concierge to confirm weather and traffic considerations.",
        ],
      },
    ],
  },
  {
    slug: "private-boat-day",
    eyebrow: "Private charter guide",
    title: "Build a private Roatan boat day.",
    summary:
      "A premium day on the water starts with privacy, pacing, pickup clarity, and a clear conversation with the operator.",
    bestFor: ["Private charters", "VIP groups", "Sunset plans"],
    ctaLabel: "Find private options",
    ctaHref: "/?style=private",
    sections: [
      {
        title: "Confirm the style first",
        body: "Private does not always mean the same thing. The best request explains the kind of day you want.",
        bullets: [
          "Mention snorkeling, beach time, food, sunset, or celebration needs.",
          "Share group size and comfort level.",
          "Ask whether pickup, gear, and refreshments are included.",
        ],
      },
      {
        title: "Keep the request clean",
        body: "Operators respond faster when the basics are easy to review.",
        bullets: [
          "Date, time, guests, pickup, and special notes should be in one request.",
          "Use guest messages for food, kids, mobility, and weather questions.",
          "Keep payment and cancellation questions connected to the booking.",
        ],
      },
    ],
  },
  {
    slug: "roatan-airport-pickup",
    eyebrow: "Arrival guide",
    title: "Make airport pickup feel effortless.",
    summary:
      "Arrival days should be simple: luggage-aware, flexible, and clear about who meets you and where.",
    bestFor: ["Airport arrivals", "Transfers", "First-day planning"],
    ctaLabel: "Plan arrival with Roa",
    ctaHref: "/concierge",
    sections: [
      {
        title: "Give the right arrival details",
        body: "The operator needs enough context to adjust if flights or luggage timing changes.",
        bullets: [
          "Share flight time and pickup area.",
          "Mention luggage count if your group has a lot of bags.",
          "Ask whether the transfer can include a simple first stop.",
        ],
      },
      {
        title: "Avoid over-planning the first day",
        body: "A first day should create calm, not pressure.",
        bullets: [
          "Choose a flexible transfer or light experience.",
          "Save bigger excursions for the next day.",
          "Use the trip dashboard to keep arrival messages organized.",
        ],
      },
    ],
  },
  {
    slug: "roatan-family-day",
    eyebrow: "Family guide",
    title: "Plan a family-friendly Roatan day.",
    summary:
      "Family trips work best when pacing, pickup, shade, food, and flexibility are clear before the request is sent.",
    bestFor: ["Families", "Mixed ages", "Gentle pacing"],
    ctaLabel: "Build a family day",
    ctaHref: "/concierge",
    sections: [
      {
        title: "Tell the operator who is traveling",
        body: "Family-friendly can mean very different things depending on ages and comfort level.",
        bullets: [
          "Share ages, mobility needs, and food preferences.",
          "Ask about shade, bathroom access, and easy pickup.",
          "Choose a day with room to slow down.",
        ],
      },
      {
        title: "Prioritize comfort over quantity",
        body: "One great stop is better than four rushed ones.",
        bullets: [
          "Use the map to avoid unnecessary transfers.",
          "Ask Roa for nearby backup ideas.",
          "Keep messages with the booking so details do not get lost.",
        ],
      },
    ],
  },
  {
    slug: "west-bay-beach-guide",
    eyebrow: "Beach guide",
    title: "Use West Bay as a calm beach anchor.",
    summary:
      "West Bay works well as a beach anchor when guests want clear area context, easy pacing, and nearby options.",
    bestFor: ["Beach days", "Snorkel plans", "Relaxed pacing"],
    ctaLabel: "See beach options",
    ctaHref: "/map?area=West%20Bay",
    sections: [
      {
        title: "Anchor the day around the beach",
        body: "A beach anchor makes the rest of the day easier to understand.",
        bullets: [
          "Choose the main beach area first.",
          "Compare nearby experiences on the map.",
          "Ask about pickup timing and what to bring.",
        ],
      },
      {
        title: "Let concierge handle the details",
        body: "A premium beach day should feel easy from pickup to return.",
        bullets: [
          "Send your preferred pace and group size.",
          "Ask for a weather backup if the day depends on water conditions.",
          "Keep the final plan in your guest dashboard.",
        ],
      },
    ],
  },
];

export function getRoatanGuide(slug: string) {
  return roatanGuides.find((guide) => guide.slug === slug) || null;
}
