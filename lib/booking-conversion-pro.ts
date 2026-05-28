export type ListingConversionLike = {
  id?: string | null;
  vendor_id?: string | null;
  title?: string | null;
  description?: string | null;
  price?: number | null;
  location?: string | null;
  category?: string | null;
  image_url?: string | null;
  gallery_image_urls?: string[] | null;
  tour_times?: string[] | null;
  latitude?: number | null;
  longitude?: number | null;
  max_guests?: number | null;
  availability_note?: string | null;
  minimum_notice_hours?: number | null;
  reviews_count?: number | null;
  rating?: number | null;
  is_active?: boolean | null;
};

export type ListingConversionItem = {
  label: string;
  complete: boolean;
  text: string;
  action: string;
};

export type ListingConversionScore = {
  score: number;
  label: "Conversion-ready" | "Almost ready" | "Needs attention";
  completeItems: ListingConversionItem[];
  incompleteItems: ListingConversionItem[];
  nextBestAction: string;
};

export type ListingTrustBadge = {
  label: string;
  text: string;
};

function hasText(value?: string | null) {
  return Boolean((value || "").trim());
}

function photoCount(listing: ListingConversionLike) {
  return (listing.image_url ? 1 : 0) + (listing.gallery_image_urls || []).length;
}

function formatPrice(price?: number | null) {
  if (!price) {
    return "Ask";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(price);
}

function conversionItems(listing: ListingConversionLike): ListingConversionItem[] {
  return [
    {
      label: "Photos",
      complete: photoCount(listing) > 0,
      text: "Travelers can see what they are booking.",
      action: "Add strong photos or a gallery.",
    },
    {
      label: "Description",
      complete: (listing.description || "").trim().length >= 60,
      text: "The listing explains the experience clearly.",
      action: "Add a fuller description with pickup, pace, and highlights.",
    },
    {
      label: "Price",
      complete: Boolean(listing.price && listing.price > 0),
      text: "Guests can compare the starting price.",
      action: "Add a starting price.",
    },
    {
      label: "Tour times",
      complete: Boolean((listing.tour_times || []).length),
      text: "Guests can choose a realistic time.",
      action: "Add at least one tour time.",
    },
    {
      label: "Capacity",
      complete: Boolean(listing.max_guests && listing.max_guests > 0),
      text: "Group size expectations are clear.",
      action: "Set the maximum guest count.",
    },
    {
      label: "Map pin",
      complete: listing.latitude != null && listing.longitude != null,
      text: "The listing appears in the right place on the map.",
      action: "Add an exact map pin.",
    },
    {
      label: "Availability",
      complete: hasText(listing.availability_note),
      text: "Travelers understand schedule limits before requesting.",
      action: "Add an availability note.",
    },
    {
      label: "Local vendor",
      complete: Boolean(listing.vendor_id),
      text: "The request connects to a real operator.",
      action: "Assign the listing to a vendor.",
    },
    {
      label: "Reviews",
      complete: Boolean((listing.reviews_count || 0) > 0),
      text: "Social proof helps travelers feel confident.",
      action: "Ask confirmed guests to leave reviews.",
    },
    {
      label: "Live status",
      complete: listing.is_active !== false,
      text: "The listing is visible to travelers.",
      action: "Turn the listing on when it is ready.",
    },
  ];
}

export function getListingConversionScore(
  listing: ListingConversionLike,
): ListingConversionScore {
  const items = conversionItems(listing);
  const completeItems = items.filter((item) => item.complete);
  const incompleteItems = items.filter((item) => !item.complete);
  const missingCriticalItems = ["Photos", "Tour times", "Capacity", "Map pin"].every(
    (label) => incompleteItems.some((item) => item.label === label),
  );
  const score = missingCriticalItems
    ? 0
    : Math.round((completeItems.length / items.length) * 100);

  return {
    score,
    label:
      score >= 90
        ? "Conversion-ready"
        : score >= 60
          ? "Almost ready"
          : "Needs attention",
    completeItems,
    incompleteItems,
    nextBestAction:
      incompleteItems[0]?.action ||
      "Keep photos, times, and response speed fresh.",
  };
}

export function getListingTrustBadges({
  listing,
  vendor,
}: {
  listing: ListingConversionLike;
  vendor?: { is_verified?: boolean | null; business_name?: string | null } | null;
}): ListingTrustBadge[] {
  const score = getListingConversionScore(listing);
  const badges: ListingTrustBadge[] = [];

  if (vendor?.is_verified) {
    badges.push({
      label: "Verified local operator",
      text: `${vendor.business_name || "This operator"} has been marked verified.`,
    });
  }

  if (score.score >= 90) {
    badges.push({
      label: "Guest-ready listing",
      text: "Photos, times, map, and booking details are in place.",
    });
  }

  if (
    (listing.tour_times || []).length > 0 &&
    Boolean(listing.max_guests) &&
    hasText(listing.availability_note)
  ) {
    badges.push({
      label: "Clear booking details",
      text: "Times, capacity, and availability notes are visible.",
    });
  }

  if (listing.latitude != null && listing.longitude != null) {
    badges.push({
      label: "Map-ready",
      text: "This listing has an exact map location.",
    });
  }

  badges.push({
    label: "Reviewed request flow",
    text: "Requests are checked before plans are finalized.",
  });

  return badges.slice(0, 5);
}

export function buildListingComparisonFacts(listing: ListingConversionLike) {
  const times = listing.tour_times || [];
  const reviewsCount = listing.reviews_count || 0;

  return [
    { label: "Area", value: listing.location || "Roatan" },
    { label: "Category", value: listing.category || "Experience" },
    { label: "Starting price", value: formatPrice(listing.price) },
    { label: "Times", value: times.length ? times.join(", ") : "Ask operator" },
    {
      label: "Capacity",
      value: listing.max_guests
        ? `Up to ${listing.max_guests} guests`
        : "Ask operator",
    },
    {
      label: "Rating",
      value: `${listing.rating ?? 5}/5 from ${reviewsCount} review${
        reviewsCount === 1 ? "" : "s"
      }`,
    },
  ];
}

export function getListingConversionSummary(listings: ListingConversionLike[]) {
  const scores = listings.map((listing) => getListingConversionScore(listing));
  const averageScore =
    scores.length > 0
      ? Math.round(
          scores.reduce((total, score) => total + score.score, 0) / scores.length,
        )
      : 0;
  const readyCount = scores.filter((score) => score.score >= 90).length;
  const needsAttentionCount = scores.filter((score) => score.score < 60).length;
  const missingCounts = new Map<string, number>();

  for (const score of scores) {
    for (const item of score.incompleteItems) {
      missingCounts.set(item.label, (missingCounts.get(item.label) || 0) + 1);
    }
  }

  const topActionLabel =
    [...missingCounts.entries()].sort((first, second) => {
      const countSort = second[1] - first[1];
      if (countSort !== 0) return countSort;

      const priority = conversionItems({}).map((item) => item.label);
      return priority.indexOf(first[0]) - priority.indexOf(second[0]);
    })[0]?.[0] || "Keep listings fresh";

  return {
    averageScore,
    readyCount,
    needsAttentionCount,
    topActionLabel,
  };
}

export function getVendorGrowthTasks({
  listings,
}: {
  listings: ListingConversionLike[];
}) {
  const tasks = [
    {
      label: "Upgrade listing photos",
      count: listings.filter((listing) => photoCount(listing) === 0).length,
      text: "Add at least one strong photo to every live listing.",
    },
    {
      label: "Add tour times",
      count: listings.filter((listing) => !(listing.tour_times || []).length).length,
      text: "Times reduce back-and-forth before guests request.",
    },
    {
      label: "Place exact map pins",
      count: listings.filter(
        (listing) => listing.latitude == null || listing.longitude == null,
      ).length,
      text: "Map-ready listings are easier to plan around.",
    },
    {
      label: "Set guest capacity",
      count: listings.filter((listing) => !listing.max_guests).length,
      text: "Capacity prevents requests that do not fit.",
    },
    {
      label: "Add availability notes",
      count: listings.filter((listing) => !hasText(listing.availability_note)).length,
      text: "Mention weather, season, or schedule limits.",
    },
  ];

  return tasks.filter((task) => task.count > 0);
}
