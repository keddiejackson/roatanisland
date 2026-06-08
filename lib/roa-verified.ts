export type RoaVerifiedListing = {
  id?: string | null;
  vendor_id?: string | null;
  title?: string | null;
  description?: string | null;
  price?: number | null;
  location?: string | null;
  image_url?: string | null;
  gallery_image_urls?: string[] | null;
  tour_times?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  max_guests?: number | null;
  rating?: number | null;
  reviews_count?: number | null;
  is_active?: boolean | null;
};

export type RoaVerifiedVendor = {
  id?: string | null;
  business_name?: string | null;
  is_active?: boolean | null;
  is_verified?: boolean | null;
  profile_image_url?: string | null;
  website?: string | null;
};

export type RoaVerifiedSignal = {
  key: string;
  label: string;
  complete: boolean;
  guestText: string;
  action: string;
  weight: number;
};

export type RoaVerifiedStatus = {
  score: number;
  label: "Roa Verified" | "Almost verified" | "Concierge review";
  tone: "verified" | "watch" | "needs";
  summary: string;
  guestPromise: string;
  signals: RoaVerifiedSignal[];
  completedSignals: RoaVerifiedSignal[];
  missingSignals: RoaVerifiedSignal[];
  badges: string[];
};

function text(value: string | null | undefined) {
  return (value || "").trim();
}

function hasPhoto(listing: RoaVerifiedListing) {
  return Boolean(listing.image_url || (listing.gallery_image_urls || []).length > 0);
}

function hasPublicDescription(listing: RoaVerifiedListing) {
  return text(listing.description).length >= 60;
}

function hasOperator(listing: RoaVerifiedListing, vendor?: RoaVerifiedVendor | null) {
  return Boolean(vendor?.id || listing.vendor_id);
}

function hasActiveOperator(vendor?: RoaVerifiedVendor | null) {
  return !vendor || vendor.is_active !== false;
}

function signal(input: RoaVerifiedSignal) {
  return input;
}

export function getRoaVerifiedStatus(
  listing: RoaVerifiedListing,
  vendor?: RoaVerifiedVendor | null,
): RoaVerifiedStatus {
  const signals = [
    signal({
      key: "operator",
      label: "Local operator connected",
      complete: hasOperator(listing, vendor) && hasActiveOperator(vendor),
      guestText: "A real operator is attached to this experience.",
      action: "Attach this listing to the operator who will respond.",
      weight: 18,
    }),
    signal({
      key: "media",
      label: "Premium media ready",
      complete: hasPhoto(listing),
      guestText: "Guests can see what they are requesting.",
      action: "Add a strong cover photo or gallery image.",
      weight: 16,
    }),
    signal({
      key: "price",
      label: "Price clarity",
      complete: Boolean(listing.price && listing.price > 0 && listing.price <= 10000),
      guestText: "Pricing expectations are visible before the request.",
      action: "Add a realistic public price or quote-based price note.",
      weight: 14,
    }),
    signal({
      key: "location",
      label: "Pickup or area clarity",
      complete: Boolean(text(listing.location)),
      guestText: "The guest has enough area context to plan the day.",
      action: "Add a beach, town, marina, airport, or pickup area.",
      weight: 12,
    }),
    signal({
      key: "map",
      label: "Map context",
      complete: listing.latitude != null && listing.longitude != null,
      guestText: "The experience can be compared on the island map.",
      action: "Add exact coordinates when the location can be shown publicly.",
      weight: 10,
    }),
    signal({
      key: "times",
      label: "Time expectations",
      complete: (listing.tour_times || []).length > 0,
      guestText: "Guests can choose or understand likely timing.",
      action: "Add tour times or the most common request windows.",
      weight: 10,
    }),
    signal({
      key: "capacity",
      label: "Group size guidance",
      complete: Boolean(listing.max_guests),
      guestText: "Group fit is clear before guests send a request.",
      action: "Add the maximum guest count or group size guidance.",
      weight: 8,
    }),
    signal({
      key: "story",
      label: "Guest-facing description",
      complete: hasPublicDescription(listing),
      guestText: "The experience explains the day in plain language.",
      action: "Add a concise description with pickup, highlights, and pacing.",
      weight: 8,
    }),
    signal({
      key: "reviews",
      label: "Review or operator proof",
      complete:
        Boolean(vendor?.is_verified) ||
        Boolean((listing.rating || 0) >= 4.8) ||
        Boolean((listing.reviews_count || 0) > 0),
      guestText: "There is a trust signal behind the operator or experience.",
      action: "Verify the vendor, approve reviews, or mark the operator as trusted.",
      weight: 6,
    }),
  ];
  const totalWeight = signals.reduce((total, item) => total + item.weight, 0);
  const completedSignals = signals.filter((item) => item.complete);
  const missingSignals = signals.filter((item) => !item.complete);
  const score = Math.round(
    (completedSignals.reduce((total, item) => total + item.weight, 0) /
      totalWeight) *
      100,
  );
  const label =
    score >= 86 && missingSignals.length <= 1
      ? "Roa Verified"
      : score >= 68
        ? "Almost verified"
        : "Concierge review";
  const tone =
    label === "Roa Verified" ? "verified" : label === "Almost verified" ? "watch" : "needs";

  return {
    score,
    label,
    tone,
    summary:
      label === "Roa Verified"
        ? "This experience has the core details Roa expects before it appears as a premium guest option."
        : label === "Almost verified"
          ? "This experience is close. A small polish pass will make it feel more premium to guests."
          : "This experience needs concierge review before it should be treated as a premium recommendation.",
    guestPromise:
      label === "Roa Verified"
        ? "Roa checks operator, media, timing, price, and map context before presenting this as a trusted option."
        : "Roa can still help, but the concierge should confirm the missing details before a guest commits.",
    signals,
    completedSignals,
    missingSignals,
    badges: completedSignals
      .map((item) => item.label)
      .filter((item) => item !== "Guest-facing description")
      .slice(0, 5),
  };
}
