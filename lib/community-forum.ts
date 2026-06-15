export const communityCategories = [
  "Trip ideas",
  "Cruise timing",
  "Hotels & stays",
  "Transportation",
  "Food & beaches",
  "Local tips",
] as const;

export type CommunityCategory = (typeof communityCategories)[number];

export type CommunityReply = {
  id: string;
  threadId: string;
  body: string;
  displayName: string;
  profileImageUrl: string | null;
  anonymous: boolean;
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
  replyCount: number;
  createdAt: string;
  lastReplyAt: string;
  replies: CommunityReply[];
};

export const sampleCommunityThreads: CommunityThread[] = [
  {
    id: "sample-cruise-day",
    category: "Cruise timing",
    title: "Best low-stress cruise day if we dock in the morning?",
    body: "We want beach time, one memorable stop, and plenty of cushion before all-aboard.",
    displayName: "Anonymous traveler",
    profileImageUrl: null,
    anonymous: true,
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
        createdAt: "2026-05-25T15:35:00.000Z",
      },
      {
        id: "sample-cruise-day-reply-2",
        threadId: "sample-cruise-day",
        body: "Ask Roa for a port-aware plan. It can keep the route tight and still include pickup notes.",
        displayName: "Anonymous traveler",
        profileImageUrl: null,
        anonymous: true,
        createdAt: "2026-05-25T16:10:00.000Z",
      },
    ],
  },
  {
    id: "sample-family-day",
    category: "Trip ideas",
    title: "Family beach day without over-planning",
    body: "Looking for a calm day with kids, easy food, and not too much driving.",
    displayName: "Karla",
    profileImageUrl: null,
    anonymous: false,
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
        createdAt: "2026-05-24T18:25:00.000Z",
      },
    ],
  },
];

export function normalizeCommunityCategory(value: unknown): CommunityCategory {
  return typeof value === "string" &&
    communityCategories.includes(value as CommunityCategory)
    ? (value as CommunityCategory)
    : "Trip ideas";
}

export function cleanCommunityText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
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

  return {
    threadCount: threads.length,
    replyCount,
    activeCategoryCount: activeCategories.size,
  };
}
