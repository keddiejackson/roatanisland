export type ListingQualityListing = {
  id: string;
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
  is_active?: boolean | null;
};

export type ListingQualityIssue = {
  code:
    | "inactive"
    | "test_like_title"
    | "short_description"
    | "missing_price"
    | "extreme_price"
    | "missing_location"
    | "coordinate_location"
    | "missing_photo"
    | "missing_vendor"
    | "missing_category"
    | "missing_times"
    | "missing_map_pin";
  label: string;
  help: string;
  severity: "critical" | "warning";
};

export type ListingQualitySummary = {
  score: number;
  label: "Showcase ready" | "Needs polish" | "Keep off homepage";
  issues: ListingQualityIssue[];
  nextBestAction: string;
};

const placeholderTitlePattern =
  /^(t\d*|test|tester|demo|sample|asdf|untitled|show me the money)$/i;
const coordinateTextPattern =
  /\u00b0|[0-9]{1,2}\s*['"]?\s*[NS]\b.*[0-9]{2,3}\s*['"]?\s*[EW]\b|^-?\d{1,2}\.\d+\s*,\s*-?\d{1,3}\.\d+$/i;

function text(value: string | null | undefined) {
  return (value || "").trim();
}

function hasPhoto(listing: ListingQualityListing) {
  return Boolean(listing.image_url || (listing.gallery_image_urls || []).length > 0);
}

function hasMapPin(listing: ListingQualityListing) {
  return listing.latitude != null && listing.longitude != null;
}

function isTestLikeTitle(title: string) {
  const normalized = title.trim();
  return (
    normalized.length < 4 ||
    placeholderTitlePattern.test(normalized) ||
    /\b(test|demo|sample)\b/i.test(normalized)
  );
}

function issue(input: ListingQualityIssue): ListingQualityIssue {
  return input;
}

export function getListingQualityIssues(
  listing: ListingQualityListing,
): ListingQualityIssue[] {
  const title = text(listing.title);
  const description = text(listing.description);
  const location = text(listing.location);
  const issues: ListingQualityIssue[] = [];

  if (listing.is_active === false) {
    issues.push(
      issue({
        code: "inactive",
        label: "Listing is not live",
        help: "Turn the listing on only when it is ready for guests.",
        severity: "critical",
      }),
    );
  }

  if (!title || isTestLikeTitle(title)) {
    issues.push(
      issue({
        code: "test_like_title",
        label: "Replace test-looking title",
        help: "Use a guest-facing name like Private West Bay Snorkel.",
        severity: "critical",
      }),
    );
  }

  if (description.length < 45 || description.toLowerCase() === title.toLowerCase()) {
    issues.push(
      issue({
        code: "short_description",
        label: "Add a stronger description",
        help: "Explain pickup, timing, highlights, and who this is best for.",
        severity: "critical",
      }),
    );
  }

  if (listing.price == null || listing.price <= 0) {
    issues.push(
      issue({
        code: "missing_price",
        label: "Add price clarity",
        help: "Add a public price or make the request flow clearly quote-based.",
        severity: "warning",
      }),
    );
  } else if (listing.price > 10000) {
    issues.push(
      issue({
        code: "extreme_price",
        label: "Review unusually high price",
        help: "Large test prices make the marketplace feel unfinished.",
        severity: "critical",
      }),
    );
  }

  if (!location) {
    issues.push(
      issue({
        code: "missing_location",
        label: "Add guest-friendly location",
        help: "Use a town, beach, marina, airport, or pickup area.",
        severity: "warning",
      }),
    );
  } else if (coordinateTextPattern.test(location)) {
    issues.push(
      issue({
        code: "coordinate_location",
        label: "Replace coordinates with a place name",
        help: "Keep exact pins on the map, but show guests a readable area.",
        severity: "critical",
      }),
    );
  }

  if (!hasPhoto(listing)) {
    issues.push(
      issue({
        code: "missing_photo",
        label: "Add a real photo",
        help: "A real image is the fastest way to make the card feel bookable.",
        severity: "warning",
      }),
    );
  }

  if (!listing.vendor_id) {
    issues.push(
      issue({
        code: "missing_vendor",
        label: "Link a vendor",
        help: "Attach the listing to the operator who will respond.",
        severity: "warning",
      }),
    );
  }

  if (!text(listing.category)) {
    issues.push(
      issue({
        code: "missing_category",
        label: "Choose a category",
        help: "Categories help guests scan and filter quickly.",
        severity: "warning",
      }),
    );
  }

  if ((listing.tour_times || []).length === 0) {
    issues.push(
      issue({
        code: "missing_times",
        label: "Add available times",
        help: "Tour times reduce back-and-forth before booking.",
        severity: "warning",
      }),
    );
  }

  if (!hasMapPin(listing)) {
    issues.push(
      issue({
        code: "missing_map_pin",
        label: "Add map coordinates",
        help: "Exact pins make the map and nearby planning more useful.",
        severity: "warning",
      }),
    );
  }

  return issues;
}

export function getListingQualitySummary(
  listing: ListingQualityListing,
): ListingQualitySummary {
  const issues = getListingQualityIssues(listing);
  const score = Math.max(
    0,
    100 -
      issues.reduce(
        (total, item) => total + (item.severity === "critical" ? 25 : 12),
        0,
      ),
  );
  const hasCriticalIssue = issues.some((item) => item.severity === "critical");
  const label = hasCriticalIssue
    ? "Keep off homepage"
    : score >= 88
      ? "Showcase ready"
      : "Needs polish";

  return {
    score,
    label,
    issues,
    nextBestAction:
      issues[0]?.help || "Keep photos, prices, map pins, and times fresh.",
  };
}

export function isShowcaseReadyListing(listing: ListingQualityListing) {
  const summary = getListingQualitySummary(listing);
  return summary.label === "Showcase ready" && summary.score >= 88;
}

export function sortListingsByQuality<Listing extends ListingQualityListing>(
  listings: Listing[],
) {
  return [...listings].sort(
    (first, second) =>
      getListingQualitySummary(first).score - getListingQualitySummary(second).score,
  );
}
