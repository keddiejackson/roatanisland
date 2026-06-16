export const communityVerificationTypes = [
  "admin",
  "vendor",
  "local",
  "traveler",
  "unverified",
] as const;

export const communityVerificationRequestStatuses = [
  "pending",
  "needs_info",
  "approved",
  "denied",
] as const;

export type CommunityVerificationType =
  (typeof communityVerificationTypes)[number];
export type CommunityVerificationRequestStatus =
  (typeof communityVerificationRequestStatuses)[number];

export function normalizeCommunityVerificationType(
  value: unknown,
): CommunityVerificationType {
  if (typeof value !== "string") return "unverified";

  const clean = value.trim().toLowerCase();
  if (clean === "operator") return "vendor";
  if (clean === "guide" || clean === "resident") return "local";

  return communityVerificationTypes.includes(clean as CommunityVerificationType)
    ? (clean as CommunityVerificationType)
    : "unverified";
}

export function normalizeCommunityVerificationRequestStatus(
  value: unknown,
): CommunityVerificationRequestStatus {
  return typeof value === "string" &&
    communityVerificationRequestStatuses.includes(
      value as CommunityVerificationRequestStatus,
    )
    ? (value as CommunityVerificationRequestStatus)
    : "pending";
}

export function communityVerificationBadge(
  value: unknown,
): { label: string; className: string } {
  const type = normalizeCommunityVerificationType(value);

  if (type === "admin") {
    return {
      label: "Admin",
      className: "bg-red-100 text-red-700 ring-red-200",
    };
  }

  if (type === "vendor") {
    return {
      label: "Vendor",
      className: "bg-blue-100 text-blue-700 ring-blue-200",
    };
  }

  if (type === "local") {
    return {
      label: "Local",
      className: "bg-green-100 text-green-700 ring-green-200",
    };
  }

  if (type === "traveler") {
    return {
      label: "Traveler",
      className: "bg-yellow-100 text-yellow-800 ring-yellow-200",
    };
  }

  return {
    label: "Unverified",
    className: "bg-orange-100 text-orange-700 ring-orange-200",
  };
}

export function verificationStatusLabel(
  value: unknown,
): "Pending" | "Needs info" | "Approved" | "Denied" {
  const status = normalizeCommunityVerificationRequestStatus(value);

  if (status === "needs_info") return "Needs info";
  if (status === "approved") return "Approved";
  if (status === "denied") return "Denied";
  return "Pending";
}

export function normalizeVerificationSocialLinks(value: unknown): string[] {
  const entries = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/\r?\n|,/)
      : [];

  const links = entries
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .map((entry) =>
      /^https?:\/\//i.test(entry) ? entry : `https://${entry}`,
    )
    .filter((entry) => {
      try {
        const url = new URL(entry);
        return Boolean(url.hostname.includes("."));
      } catch {
        return false;
      }
    });

  return [...new Set(links)].slice(0, 8);
}

export function canReplyToCommunityThread(thread: {
  status?: string | null;
  isLocked?: boolean | null;
}) {
  return thread.status === "active" && !thread.isLocked;
}

export function communityVerificationTypeFromFlags({
  authorRole,
  isVerifiedLocal,
  isVerifiedOperator,
  verificationType,
}: {
  authorRole?: string | null;
  isVerifiedLocal?: boolean | null;
  isVerifiedOperator?: boolean | null;
  verificationType?: string | null;
}): CommunityVerificationType {
  const normalized = normalizeCommunityVerificationType(verificationType);
  if (normalized !== "unverified") return normalized;

  if (authorRole === "concierge") return "admin";
  if (isVerifiedOperator) return "vendor";
  if (isVerifiedLocal) return "local";
  if (authorRole === "traveler") return "traveler";
  return "unverified";
}
