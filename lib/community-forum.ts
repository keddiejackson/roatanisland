export const communityCategories = [
  "Cruise Day Help",
  "Beaches & Areas",
  "Airport & Transfers",
  "Private Boats",
  "Hotels & Stays",
  "Food & Nightlife",
  "Family Travel",
  "Local Tips",
  "Safety & Weather",
  "Ask Locals",
] as const;

export const communityArrivalTypes = [
  "Cruise",
  "Airport",
  "Staying on island",
  "Not sure",
] as const;

export const communityAuthorRoles = [
  "traveler",
  "local",
  "operator",
  "concierge",
] as const;

export const communityStatuses = ["active", "hidden", "removed"] as const;

export type CommunityCategory = (typeof communityCategories)[number];
export type CommunityArrivalType = (typeof communityArrivalTypes)[number];
export type CommunityAuthorRole = (typeof communityAuthorRoles)[number];
export type CommunityStatus = (typeof communityStatuses)[number];

export type CommunityReply = {
  id: string;
  threadId: string;
  body: string;
  displayName: string;
  profileImageUrl: string | null;
  anonymous: boolean;
  authorRole: CommunityAuthorRole;
  isVerifiedLocal: boolean;
  isVerifiedOperator: boolean;
  isBestAnswer: boolean;
  isConciergePick: boolean;
  helpfulCount: number;
  status: CommunityStatus;
  createdAt: string;
};

export type CommunityThread = {
  id: string;
  category: CommunityCategory;
  title: string;
  body: string;
  displayName: string;
  profileImageUrl: string | null;
  anonymous: boolean;
  authorRole: CommunityAuthorRole;
  isVerifiedLocal: boolean;
  isVerifiedOperator: boolean;
  status: CommunityStatus;
  tripDate: string | null;
  area: string | null;
  groupSize: number | null;
  arrivalType: CommunityArrivalType;
  arrivalTime: string | null;
  budget: string | null;
  relatedListingId: string | null;
  relatedListingTitle: string | null;
  mapArea: string | null;
  roaSummary: string;
  isPinned: boolean;
  isFeatured: boolean;
  bestReplyId: string | null;
  conciergePickReplyId: string | null;
  helpfulCount: number;
  replyCount: number;
  createdAt: string;
  lastReplyAt: string;
  replies: CommunityReply[];
};

const categoryAliases: Record<string, CommunityCategory> = {
  "trip ideas": "Ask Locals",
  "cruise timing": "Cruise Day Help",
  "hotels & stays": "Hotels & Stays",
  transportation: "Airport & Transfers",
  "food & beaches": "Beaches & Areas",
  "local tips": "Local Tips",
};

export const sampleCommunityThreads: CommunityThread[] = [
  {
    id: "sample-cruise-day",
    category: "Cruise Day Help",
    title: "Best low-stress cruise day if we dock at 9?",
    body: "We want beach time, one memorable stop, and plenty of cushion before all-aboard.",
    displayName: "Anonymous traveler",
    profileImageUrl: null,
    anonymous: true,
    authorRole: "traveler",
    isVerifiedLocal: false,
    isVerifiedOperator: false,
    status: "active",
    tripDate: null,
    area: "Coxen Hole",
    groupSize: 4,
    arrivalType: "Cruise",
    arrivalTime: "9:00 AM",
    budget: "Moderate",
    relatedListingId: null,
    relatedListingTitle: null,
    mapArea: "Coxen Hole",
    roaSummary:
      "Keep the route tight around Coxen Hole, West Bay, or West End so beach time stays relaxed and the return window stays protected.",
    isPinned: true,
    isFeatured: true,
    bestReplyId: "sample-cruise-day-reply-1",
    conciergePickReplyId: "sample-cruise-day-reply-2",
    helpfulCount: 12,
    replyCount: 2,
    createdAt: "2026-05-25T15:00:00.000Z",
    lastReplyAt: "2026-05-25T16:10:00.000Z",
    replies: [
      {
        id: "sample-cruise-day-reply-1",
        threadId: "sample-cruise-day",
        body: "West Bay or West End usually keeps the day simple. I would save anything farther east for a longer island day.",
        displayName: "Roatan regular",
        profileImageUrl: null,
        anonymous: false,
        authorRole: "local",
        isVerifiedLocal: true,
        isVerifiedOperator: false,
        isBestAnswer: true,
        isConciergePick: false,
        helpfulCount: 8,
        status: "active",
        createdAt: "2026-05-25T15:35:00.000Z",
      },
      {
        id: "sample-cruise-day-reply-2",
        threadId: "sample-cruise-day",
        body: "Ask Roa for a port-aware plan. It can keep the route tight and still include pickup notes.",
        displayName: "RoatanIsland.life",
        profileImageUrl: null,
        anonymous: false,
        authorRole: "concierge",
        isVerifiedLocal: true,
        isVerifiedOperator: false,
        isBestAnswer: false,
        isConciergePick: true,
        helpfulCount: 6,
        status: "active",
        createdAt: "2026-05-25T16:10:00.000Z",
      },
    ],
  },
  {
    id: "sample-family-day",
    category: "Family Travel",
    title: "Family beach day without over-planning",
    body: "Looking for a calm day with kids, easy food, and not too much driving.",
    displayName: "Karla",
    profileImageUrl: null,
    anonymous: false,
    authorRole: "traveler",
    isVerifiedLocal: false,
    isVerifiedOperator: false,
    status: "active",
    tripDate: null,
    area: "West Bay",
    groupSize: 5,
    arrivalType: "Staying on island",
    arrivalTime: null,
    budget: "Flexible",
    relatedListingId: null,
    relatedListingTitle: null,
    mapArea: "West Bay",
    roaSummary:
      "Start beach-first, keep one optional second stop, and choose operators that can flex around kids and food timing.",
    isPinned: false,
    isFeatured: true,
    bestReplyId: "sample-family-day-reply-1",
    conciergePickReplyId: null,
    helpfulCount: 5,
    replyCount: 1,
    createdAt: "2026-05-24T18:00:00.000Z",
    lastReplyAt: "2026-05-24T18:25:00.000Z",
    replies: [
      {
        id: "sample-family-day-reply-1",
        threadId: "sample-family-day",
        body: "Start with a beach-first plan and add only one extra stop. Roatan days feel better when the route breathes.",
        displayName: "Island helper",
        profileImageUrl: null,
        anonymous: false,
        authorRole: "local",
        isVerifiedLocal: true,
        isVerifiedOperator: false,
        isBestAnswer: true,
        isConciergePick: false,
        helpfulCount: 4,
        status: "active",
        createdAt: "2026-05-24T18:25:00.000Z",
      },
    ],
  },
];

export function normalizeCommunityCategory(value: unknown): CommunityCategory {
  if (typeof value !== "string") return "Ask Locals";
  const clean = value.trim();
  const alias = categoryAliases[clean.toLowerCase()];

  if (alias) return alias;
  return communityCategories.includes(clean as CommunityCategory)
    ? (clean as CommunityCategory)
    : "Ask Locals";
}

export function normalizeCommunityArrivalType(
  value: unknown,
): CommunityArrivalType {
  return typeof value === "string" &&
    communityArrivalTypes.includes(value as CommunityArrivalType)
    ? (value as CommunityArrivalType)
    : "Not sure";
}

export function normalizeCommunityAuthorRole(
  value: unknown,
): CommunityAuthorRole {
  return typeof value === "string" &&
    communityAuthorRoles.includes(value as CommunityAuthorRole)
    ? (value as CommunityAuthorRole)
    : "traveler";
}

export function normalizeCommunityStatus(value: unknown): CommunityStatus {
  return typeof value === "string" &&
    communityStatuses.includes(value as CommunityStatus)
    ? (value as CommunityStatus)
    : "active";
}

export function cleanCommunityText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function cleanCommunityNumber(value: unknown, max = 99) {
  const numberValue =
    typeof value === "number" ? value : Number.parseInt(String(value || ""), 10);

  if (!Number.isFinite(numberValue) || numberValue <= 0) return null;
  return Math.min(Math.round(numberValue), max);
}

export function communityDisplayName({
  anonymous,
  displayName,
  email,
}: {
  anonymous: boolean;
  displayName?: string | null;
  email?: string | null;
}) {
  if (anonymous) return "Anonymous traveler";
  const cleanName = displayName?.trim();
  if (cleanName) return cleanName.slice(0, 60);
  return email?.split("@")[0]?.slice(0, 60) || "Roatan traveler";
}

export function communityThreadStats(threads: CommunityThread[]) {
  const replyCount = threads.reduce(
    (total, thread) => total + thread.replyCount,
    0,
  );
  const activeCategories = new Set(threads.map((thread) => thread.category));
  const unansweredCount = threads.filter((thread) => thread.replyCount === 0).length;
  const conciergePickCount = threads.filter(
    (thread) => thread.conciergePickReplyId || thread.roaSummary,
  ).length;

  return {
    threadCount: threads.length,
    replyCount,
    activeCategoryCount: activeCategories.size,
    unansweredCount,
    conciergePickCount,
  };
}

export function buildCommunityMapHref(thread: Pick<CommunityThread, "mapArea" | "area" | "relatedListingId">) {
  if (thread.relatedListingId) {
    return `/map?listing=${encodeURIComponent(thread.relatedListingId)}`;
  }

  const area = thread.mapArea || thread.area;
  return area ? `/map?area=${encodeURIComponent(area)}` : "/map";
}

export function buildCommunityRoaPrompt(thread: CommunityThread) {
  const context = [
    thread.category,
    thread.arrivalType !== "Not sure" ? thread.arrivalType : "",
    thread.area || thread.mapArea || "",
    thread.groupSize ? `${thread.groupSize} guests` : "",
    thread.tripDate || "",
  ]
    .filter(Boolean)
    .join(", ");

  return `Build a Roatan plan from this community question: ${thread.title}. Context: ${context}.`;
}

export function buildCommunityRoaSummary(thread: {
  roaSummary?: string | null;
  category: CommunityCategory;
  area?: string | null;
  arrivalType?: CommunityArrivalType | null;
  groupSize?: number | null;
}) {
  const existing = thread.roaSummary?.trim();
  if (existing) return existing.slice(0, 360);

  const area = thread.area ? ` around ${thread.area}` : "";
  const group = thread.groupSize ? ` for ${thread.groupSize} guests` : "";
  const arrival =
    thread.arrivalType && thread.arrivalType !== "Not sure"
      ? ` with ${thread.arrivalType.toLowerCase()} timing in mind`
      : "";

  return `Roa would start with ${thread.category.toLowerCase()}${area}${group}${arrival}, then compare nearby map options before sending a request.`;
}

export function getCommunityThreadBadges(thread: CommunityThread) {
  const badges: string[] = [];

  if (thread.isPinned) badges.push("Pinned");
  if (thread.isFeatured) badges.push("Featured");
  if (thread.conciergePickReplyId || thread.roaSummary) badges.push("Roa summary");
  if (thread.bestReplyId) badges.push("Best answer");
  if (thread.isVerifiedOperator) badges.push("Operator");
  if (thread.isVerifiedLocal) badges.push("Local insight");

  return badges;
}
