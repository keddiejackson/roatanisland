"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildCommunityMapHref,
  buildCommunityRoaPrompt,
  buildCommunityRoaSummary,
  communityArrivalTypes,
  communityCategories,
  communityThreadStats,
  getCommunityThreadBadges,
  normalizeCommunityArrivalType,
  normalizeCommunityAuthorRole,
  normalizeCommunityCategory,
  normalizeCommunityStatus,
  sampleCommunityThreads,
  type CommunityArrivalType,
  type CommunityCategory,
  type CommunityReply,
  type CommunityThread,
} from "@/lib/community-forum";
import { supabase } from "@/lib/supabase";

type CommunityResponse = {
  threads?: CommunityThread[];
  setupRequired?: boolean;
  error?: string;
};

const areaOptions = [
  "West Bay",
  "West End",
  "Sandy Bay",
  "Coxen Hole",
  "Isla Tropicale",
  "French Harbour",
  "Oak Ridge",
  "Camp Bay",
  "Airport",
  "Cruise Port",
  "Not sure",
];

const budgetOptions = ["Flexible", "Budget-aware", "Moderate", "Premium", "Private/VIP"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function displayTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Just now";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function readLocalThreads() {
  try {
    const stored = window.localStorage.getItem("roatan-community-threads");
    const parsed = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed)
      ? (parsed as CommunityThread[]).map(normalizeClientThread)
      : [];
  } catch {
    return [];
  }
}

function writeLocalThreads(threads: CommunityThread[]) {
  window.localStorage.setItem(
    "roatan-community-threads",
    JSON.stringify(threads.slice(0, 60)),
  );
}

function normalizeClientReply(reply: CommunityReply): CommunityReply {
  return {
    id: reply.id,
    threadId: reply.threadId,
    body: reply.body || "",
    displayName: reply.displayName || "Roatan traveler",
    profileImageUrl: reply.profileImageUrl || null,
    anonymous: Boolean(reply.anonymous),
    authorRole: normalizeCommunityAuthorRole(reply.authorRole),
    isVerifiedLocal: Boolean(reply.isVerifiedLocal),
    isVerifiedOperator: Boolean(reply.isVerifiedOperator),
    isBestAnswer: Boolean(reply.isBestAnswer),
    isConciergePick: Boolean(reply.isConciergePick),
    helpfulCount: reply.helpfulCount || 0,
    status: normalizeCommunityStatus(reply.status),
    createdAt: reply.createdAt || new Date().toISOString(),
  };
}

function normalizeClientThread(thread: CommunityThread): CommunityThread {
  const category = normalizeCommunityCategory(thread.category);
  const arrivalType = normalizeCommunityArrivalType(thread.arrivalType);

  return {
    id: thread.id,
    category,
    title: thread.title || "Roatan question",
    body: thread.body || "",
    displayName: thread.displayName || "Roatan traveler",
    profileImageUrl: thread.profileImageUrl || null,
    anonymous: Boolean(thread.anonymous),
    authorRole: normalizeCommunityAuthorRole(thread.authorRole),
    isVerifiedLocal: Boolean(thread.isVerifiedLocal),
    isVerifiedOperator: Boolean(thread.isVerifiedOperator),
    status: normalizeCommunityStatus(thread.status),
    tripDate: thread.tripDate || null,
    area: thread.area || null,
    groupSize: thread.groupSize || null,
    arrivalType,
    arrivalTime: thread.arrivalTime || null,
    budget: thread.budget || null,
    relatedListingId: thread.relatedListingId || null,
    relatedListingTitle: thread.relatedListingTitle || null,
    mapArea: thread.mapArea || thread.area || null,
    roaSummary: buildCommunityRoaSummary({
      roaSummary: thread.roaSummary,
      category,
      area: thread.area || thread.mapArea,
      arrivalType,
      groupSize: thread.groupSize,
    }),
    isPinned: Boolean(thread.isPinned),
    isFeatured: Boolean(thread.isFeatured),
    bestReplyId: thread.bestReplyId || null,
    conciergePickReplyId: thread.conciergePickReplyId || null,
    helpfulCount: thread.helpfulCount || 0,
    replyCount: thread.replyCount || thread.replies?.length || 0,
    createdAt: thread.createdAt || new Date().toISOString(),
    lastReplyAt: thread.lastReplyAt || thread.createdAt || new Date().toISOString(),
    replies: (thread.replies || []).map(normalizeClientReply),
  };
}

function threadContextLabels(thread: CommunityThread) {
  return [
    thread.arrivalType !== "Not sure" ? thread.arrivalType : "",
    thread.area || thread.mapArea || "",
    thread.tripDate || "",
    thread.groupSize ? `${thread.groupSize} guests` : "",
    thread.budget || "",
  ].filter(Boolean);
}

function replyBadges(reply: CommunityReply) {
  return [
    reply.isBestAnswer ? "Best answer" : "",
    reply.isConciergePick ? "Concierge pick" : "",
    reply.isVerifiedOperator ? "Verified operator" : "",
    reply.isVerifiedLocal ? "Local insight" : "",
  ].filter(Boolean);
}

function saveThreadForLater(thread: CommunityThread) {
  const key = "roatan-saved-community-threads";
  const item = {
    id: thread.id,
    title: thread.title,
    category: thread.category,
    href: `/community?thread=${encodeURIComponent(thread.id)}`,
    mapHref: buildCommunityMapHref(thread),
    savedAt: new Date().toISOString(),
  };

  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "[]");
    const current = Array.isArray(parsed) ? parsed : [];
    const next = [item, ...current.filter((entry) => entry?.id !== thread.id)];
    window.localStorage.setItem(key, JSON.stringify(next.slice(0, 24)));
    window.dispatchEvent(new Event("roatan-trip-plan-change"));
  } catch {
    window.localStorage.setItem(key, JSON.stringify([item]));
  }
}

function readSavedThreadIds() {
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem("roatan-saved-community-threads") || "[]",
    );

    return Array.isArray(parsed)
      ? parsed.map((item) => item?.id).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

export default function CommunityForum() {
  const [threads, setThreads] = useState<CommunityThread[]>(
    sampleCommunityThreads.map(normalizeClientThread),
  );
  const [selectedCategory, setSelectedCategory] = useState<
    CommunityCategory | "All"
  >("All");
  const [activeThreadId, setActiveThreadId] = useState(
    sampleCommunityThreads[0]?.id,
  );
  const [signedIn, setSignedIn] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [status, setStatus] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [savedThreadIds, setSavedThreadIds] = useState<string[]>([]);
  const [draft, setDraft] = useState({
    category: "Cruise Day Help" as CommunityCategory,
    title: "",
    body: "",
    tripDate: "",
    area: "Cruise Port",
    groupSize: "",
    arrivalType: "Cruise" as CommunityArrivalType,
    arrivalTime: "",
    budget: "Moderate",
  });
  const [replyBody, setReplyBody] = useState("");

  useEffect(() => {
    async function loadCommunity() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || "";
      setAccessToken(token);
      setSignedIn(Boolean(token));
      setSavedThreadIds(readSavedThreadIds());

      try {
        const response = await fetch("/api/community/threads");
        const result = (await response.json()) as CommunityResponse;
        const localThreads = readLocalThreads();

        if (result.threads?.length) {
          const nextThreads = [...localThreads, ...result.threads]
            .map(normalizeClientThread)
            .slice(0, 60);
          setThreads(nextThreads);
          setActiveThreadId(nextThreads[0]?.id);
          setStatus(
            result.setupRequired
              ? "The Circle is using local fallback until the Supabase SQL is installed."
              : "",
          );
          return;
        }

        if (localThreads.length > 0) {
          setThreads(localThreads);
          setActiveThreadId(localThreads[0]?.id);
        }

        if (result.setupRequired) {
          setStatus("Run the Roatan Circle SQL to make posts save live.");
        }
      } catch {
        setStatus("The Circle is using local fallback while the live feed loads.");
      }
    }

    loadCommunity();
  }, []);

  const filteredThreads = useMemo(() => {
    const visibleThreads = threads.filter((thread) => thread.status === "active");
    const categoryThreads =
      selectedCategory === "All"
        ? visibleThreads
        : visibleThreads.filter((thread) => thread.category === selectedCategory);

    return [...categoryThreads].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return (
        new Date(b.lastReplyAt).getTime() - new Date(a.lastReplyAt).getTime()
      );
    });
  }, [selectedCategory, threads]);
  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ||
    filteredThreads[0] ||
    threads[0];
  const stats = communityThreadStats(
    threads.filter((thread) => thread.status === "active"),
  );
  const featuredThreads = threads
    .filter((thread) => thread.status === "active" && thread.isFeatured)
    .slice(0, 3);

  async function createThread() {
    if (!signedIn || !accessToken) {
      setStatus("Sign in or create a guest profile to post in The Roatan Circle.");
      return;
    }

    if (!draft.title.trim() || !draft.body.trim()) {
      setStatus("Add a clear question and a little trip context first.");
      return;
    }

    const now = new Date().toISOString();
    const optimisticThread = normalizeClientThread({
      id: `local-${now}`,
      category: draft.category,
      title: draft.title.trim(),
      body: draft.body.trim(),
      displayName: anonymous ? "Anonymous traveler" : "Roatan traveler",
      profileImageUrl: null,
      anonymous,
      authorRole: "traveler",
      isVerifiedLocal: false,
      isVerifiedOperator: false,
      status: "active",
      tripDate: draft.tripDate || null,
      area: draft.area || null,
      groupSize: draft.groupSize ? Number(draft.groupSize) : null,
      arrivalType: draft.arrivalType,
      arrivalTime: draft.arrivalTime || null,
      budget: draft.budget || null,
      relatedListingId: null,
      relatedListingTitle: null,
      mapArea: draft.area || null,
      roaSummary: "",
      isPinned: false,
      isFeatured: false,
      bestReplyId: null,
      conciergePickReplyId: null,
      helpfulCount: 0,
      replyCount: 0,
      createdAt: now,
      lastReplyAt: now,
      replies: [],
    });

    const response = await fetch("/api/community/threads", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        category: draft.category,
        title: draft.title,
        body: draft.body,
        tripDate: draft.tripDate,
        area: draft.area,
        groupSize: draft.groupSize,
        arrivalType: draft.arrivalType,
        arrivalTime: draft.arrivalTime,
        budget: draft.budget,
        mapArea: draft.area,
        anonymous,
      }),
    });
    const result = (await response.json()) as {
      thread?: CommunityThread;
      error?: string;
      setupRequired?: boolean;
    };
    const thread = normalizeClientThread(result.thread || optimisticThread);
    const nextThreads = [thread, ...threads].slice(0, 60);

    setThreads(nextThreads);
    if (!result.thread) writeLocalThreads(nextThreads);
    setActiveThreadId(thread.id);
    setDraft({
      ...draft,
      title: "",
      body: "",
      arrivalTime: "",
    });
    setStatus(
      result.error
        ? "Saved locally for now. Run the Roatan Circle SQL to save posts live."
        : "Posted to The Roatan Circle.",
    );
  }

  async function addReply() {
    if (!activeThread) return;

    if (!signedIn || !accessToken) {
      setStatus("Sign in to reply in The Roatan Circle.");
      return;
    }

    if (!replyBody.trim()) {
      setStatus("Write a reply first.");
      return;
    }

    const now = new Date().toISOString();
    const optimisticReply = normalizeClientReply({
      id: `local-reply-${now}`,
      threadId: activeThread.id,
      body: replyBody.trim(),
      displayName: replyAnonymous ? "Anonymous traveler" : "Roatan traveler",
      profileImageUrl: null,
      anonymous: replyAnonymous,
      authorRole: "traveler",
      isVerifiedLocal: false,
      isVerifiedOperator: false,
      isBestAnswer: false,
      isConciergePick: false,
      helpfulCount: 0,
      status: "active",
      createdAt: now,
    });

    const response = await fetch(
      `/api/community/threads/${activeThread.id}/replies`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          body: replyBody,
          anonymous: replyAnonymous,
        }),
      },
    );
    const result = (await response.json()) as {
      reply?: CommunityReply;
      error?: string;
    };
    const reply = normalizeClientReply(result.reply || optimisticReply);
    const nextThreads = threads.map((thread) =>
      thread.id === activeThread.id
        ? normalizeClientThread({
            ...thread,
            replies: [...thread.replies, reply].slice(-12),
            replyCount: thread.replyCount + 1,
            lastReplyAt: reply.createdAt,
          })
        : thread,
    );

    setThreads(nextThreads);
    if (!result.reply) writeLocalThreads(nextThreads);
    setReplyBody("");
    setStatus(result.error ? "Reply saved locally for now." : "Reply posted.");
  }

  function handleSaveThread(thread: CommunityThread) {
    saveThreadForLater(thread);
    setSavedThreadIds((current) => [...new Set([thread.id, ...current])]);
    setStatus("Saved to your trip notes.");
  }

  return (
    <section className="grid min-w-0 gap-5 lg:grid-cols-[0.88fr_1.12fr]">
      <div className="min-w-0 space-y-5">
        <div className="overflow-hidden rounded-[1.75rem] bg-white p-5 shadow-xl shadow-[#071F2F]/8 ring-1 ring-[#071F2F]/6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00A8A8]">
                Circle pulse
              </p>
              <h2 className="mt-2 text-3xl font-black leading-tight text-[#071F2F]">
                Island answers with context.
              </h2>
            </div>
            <Link
              href="/concierge"
              className="rounded-2xl bg-[#071F2F] px-4 py-3 text-center text-sm font-black text-white"
            >
              Ask Roa privately
            </Link>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Threads", stats.threadCount],
              ["Replies", stats.replyCount],
              ["Open", stats.unansweredCount],
              ["Roa picks", stats.conciergePickCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#EEF7F6] p-4">
                <p className="text-2xl font-black text-[#071F2F]">{value}</p>
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#0B3C5D]/60">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <div className="mobile-scroll-row mt-4 pb-1">
            {(["All", ...communityCategories] as const).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                  selectedCategory === category
                    ? "bg-[#071F2F] text-white"
                    : "bg-[#F7F3EA] text-[#0B3C5D]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-[#071F2F]/8 ring-1 ring-[#071F2F]/6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D6B56D]">
            Ask with trip context
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#071F2F]">
            Get better answers faster.
          </h2>

          <div className="mt-4 grid gap-3">
            <select
              value={draft.category}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  category: event.target.value as CommunityCategory,
                }))
              }
              className="min-h-12 rounded-2xl border border-[#071F2F]/10 px-4 text-sm font-bold text-[#0B3C5D] outline-none"
            >
              {communityCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Example: Best beach plan after cruise arrival?"
              className="min-h-12 rounded-2xl border border-[#071F2F]/10 px-4 text-sm font-bold text-[#0B3C5D] outline-none"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="date"
                value={draft.tripDate}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    tripDate: event.target.value,
                  }))
                }
                className="min-h-12 rounded-2xl border border-[#071F2F]/10 px-4 text-sm font-bold text-[#0B3C5D] outline-none"
              />
              <input
                inputMode="numeric"
                value={draft.groupSize}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    groupSize: event.target.value,
                  }))
                }
                placeholder="Guests"
                className="min-h-12 rounded-2xl border border-[#071F2F]/10 px-4 text-sm font-bold text-[#0B3C5D] outline-none"
              />
              <select
                value={draft.arrivalType}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    arrivalType: event.target.value as CommunityArrivalType,
                  }))
                }
                className="min-h-12 rounded-2xl border border-[#071F2F]/10 px-4 text-sm font-bold text-[#0B3C5D] outline-none"
              >
                {communityArrivalTypes.map((arrivalType) => (
                  <option key={arrivalType} value={arrivalType}>
                    {arrivalType}
                  </option>
                ))}
              </select>
              <input
                value={draft.arrivalTime}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    arrivalTime: event.target.value,
                  }))
                }
                placeholder="Arrival / pickup time"
                className="min-h-12 rounded-2xl border border-[#071F2F]/10 px-4 text-sm font-bold text-[#0B3C5D] outline-none"
              />
              <select
                value={draft.area}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, area: event.target.value }))
                }
                className="min-h-12 rounded-2xl border border-[#071F2F]/10 px-4 text-sm font-bold text-[#0B3C5D] outline-none"
              >
                {areaOptions.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
              <select
                value={draft.budget}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    budget: event.target.value,
                  }))
                }
                className="min-h-12 rounded-2xl border border-[#071F2F]/10 px-4 text-sm font-bold text-[#0B3C5D] outline-none"
              >
                {budgetOptions.map((budget) => (
                  <option key={budget} value={budget}>
                    {budget}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              value={draft.body}
              onChange={(event) =>
                setDraft((current) => ({ ...current, body: event.target.value }))
              }
              rows={5}
              placeholder="Share what you care about: beaches, timing, kids, pickup, food, privacy, or anything that makes the day easier..."
              className="rounded-2xl border border-[#071F2F]/10 px-4 py-3 text-sm font-semibold leading-6 text-[#0B3C5D] outline-none"
            />
          </div>

          <label className="mt-4 flex items-center gap-3 text-sm font-bold text-[#0B3C5D]">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(event) => setAnonymous(event.target.checked)}
              className="size-5 accent-[#00A8A8]"
            />
            Post anonymously
          </label>
          <button
            type="button"
            onClick={createThread}
            className="mt-4 w-full rounded-2xl bg-[#00A8A8] px-5 py-4 text-sm font-black text-white shadow-xl shadow-[#00A8A8]/20"
          >
            Post to The Roatan Circle
          </button>
          {!signedIn ? (
            <Link
              href="/signin"
              className="mt-3 block rounded-2xl bg-[#071F2F] px-5 py-4 text-center text-sm font-black text-white"
            >
              Sign in to post
            </Link>
          ) : null}
          {status ? (
            <p className="mt-4 rounded-2xl bg-[#FFF6DA] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
              {status}
            </p>
          ) : null}
        </div>
      </div>

      <div className="min-w-0 space-y-5">
        {featuredThreads.length > 0 ? (
          <div className="rounded-[1.75rem] bg-[#071F2F] p-5 text-white shadow-2xl shadow-[#071F2F]/10">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D6B56D]">
              Concierge-selected
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {featuredThreads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className="rounded-2xl bg-white/10 p-4 text-left transition hover:bg-white/15"
                >
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#D6B56D]">
                    {thread.category}
                  </p>
                  <h3 className="mt-2 text-sm font-black leading-5">
                    {thread.title}
                  </h3>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-3">
          {filteredThreads.map((thread) => {
            const badges = getCommunityThreadBadges(thread);

            return (
              <button
                key={thread.id}
                type="button"
                onClick={() => setActiveThreadId(thread.id)}
                className={`rounded-[1.5rem] p-4 text-left shadow-sm ring-1 transition ${
                  activeThread?.id === thread.id
                    ? "bg-[#071F2F] text-white ring-[#071F2F]"
                    : "bg-white text-[#0B3C5D] ring-[#071F2F]/6 hover:-translate-y-0.5"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#00A8A8]">
                      {thread.category}
                    </p>
                    <h2 className="mt-2 text-xl font-black">{thread.title}</h2>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#D6B56D] px-3 py-1 text-xs font-black text-[#071F2F]">
                    {thread.replyCount} replies
                  </span>
                </div>
                {badges.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {badges.slice(0, 4).map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full bg-white/12 px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em]"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {threadContextLabels(thread).slice(0, 4).map((label) => (
                    <span
                      key={label}
                      className={`rounded-full px-3 py-1 text-xs font-black ${
                        activeThread?.id === thread.id
                          ? "bg-white/12 text-white/80"
                          : "bg-[#EEF7F6] text-[#007B7B]"
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <p
                  className={`mt-3 line-clamp-2 text-sm leading-6 ${
                    activeThread?.id === thread.id ? "text-white/70" : "text-gray-600"
                  }`}
                >
                  {thread.body}
                </p>
              </button>
            );
          })}
        </div>

        {activeThread ? (
          <article className="overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-[#071F2F]/10 ring-1 ring-[#071F2F]/6">
            <div className="bg-[#071F2F] p-5 text-white sm:p-6">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D6B56D]">
                    {activeThread.category}
                  </p>
                  <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
                    {activeThread.title}
                  </h2>
                  <p className="mt-3 text-sm font-semibold text-white/60">
                    {activeThread.displayName} / {displayTime(activeThread.createdAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={buildCommunityMapHref(activeThread)}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#071F2F]"
                  >
                    Open map
                  </Link>
                  <Link
                    href={`/concierge?prompt=${encodeURIComponent(
                      buildCommunityRoaPrompt(activeThread),
                    )}`}
                    className="rounded-2xl bg-[#00A8A8] px-4 py-3 text-sm font-black text-white"
                  >
                    Ask Roa
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 sm:p-6">
              <div className="flex flex-wrap gap-2">
                {threadContextLabels(activeThread).map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-black uppercase tracking-[0.1em] text-[#007B7B]"
                  >
                    {label}
                  </span>
                ))}
              </div>

              <p className="rounded-3xl bg-[#F7F3EA] p-5 text-base font-semibold leading-7 text-[#0B3C5D]">
                {activeThread.body}
              </p>

              <div className="rounded-3xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                  Roa summary
                </p>
                <p className="mt-3 text-sm font-bold leading-6 text-[#0B3C5D]">
                  {activeThread.roaSummary}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveThread(activeThread)}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#0B3C5D]"
                  >
                    {savedThreadIds.includes(activeThread.id)
                      ? "Saved"
                      : "Save to trip"}
                  </button>
                  <Link
                    href={`/account?community=${encodeURIComponent(activeThread.id)}`}
                    className="rounded-2xl bg-[#071F2F] px-4 py-3 text-sm font-black text-white"
                  >
                    Open my trips
                  </Link>
                </div>
              </div>

              <div className="grid gap-3">
                {activeThread.replies.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-[#071F2F]/15 p-5 text-center text-sm font-bold text-[#0B3C5D]/65">
                    No answers yet. Be the first to help, or ask Roa privately.
                  </div>
                ) : (
                  activeThread.replies.map((reply) => {
                    const badges = replyBadges(reply);

                    return (
                      <div
                        key={reply.id}
                        className={`rounded-3xl p-4 ${
                          reply.isBestAnswer || reply.isConciergePick
                            ? "bg-[#FFF6DA] ring-1 ring-[#D6B56D]/45"
                            : "bg-[#EEF7F6]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-xs font-black text-[#007B7B]">
                            {reply.profileImageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={reply.profileImageUrl}
                                alt=""
                                className="size-full object-cover"
                              />
                            ) : (
                              initials(reply.displayName)
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-[#071F2F]">
                              {reply.displayName}
                            </p>
                            <p className="text-xs font-semibold text-[#0B3C5D]/55">
                              {displayTime(reply.createdAt)}
                            </p>
                          </div>
                        </div>
                        {badges.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {badges.map((badge) => (
                              <span
                                key={badge}
                                className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-[#0B3C5D]"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <p className="mt-3 text-sm font-semibold leading-6 text-[#0B3C5D]">
                          {reply.body}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="rounded-3xl border border-[#00A8A8]/20 bg-[#FBF8EF] p-4">
                <textarea
                  value={replyBody}
                  onChange={(event) => setReplyBody(event.target.value)}
                  rows={4}
                  placeholder="Reply with a local tip, route idea, or timing note..."
                  className="w-full rounded-2xl border border-[#071F2F]/10 px-4 py-3 text-sm font-semibold leading-6 text-[#0B3C5D] outline-none"
                />
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-3 text-sm font-bold text-[#0B3C5D]">
                    <input
                      type="checkbox"
                      checked={replyAnonymous}
                      onChange={(event) => setReplyAnonymous(event.target.checked)}
                      className="size-5 accent-[#00A8A8]"
                    />
                    Reply anonymously
                  </label>
                  <button
                    type="button"
                    onClick={addReply}
                    className="rounded-2xl bg-[#071F2F] px-5 py-3 text-sm font-black text-white"
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
