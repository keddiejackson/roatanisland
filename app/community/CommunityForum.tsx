"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  communityCategories,
  communityThreadStats,
  sampleCommunityThreads,
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function readLocalThreads() {
  try {
    const stored = window.localStorage.getItem("roatan-community-threads");
    const parsed = stored ? JSON.parse(stored) : null;
    return Array.isArray(parsed) ? (parsed as CommunityThread[]) : [];
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

export default function CommunityForum() {
  const [threads, setThreads] = useState<CommunityThread[]>(sampleCommunityThreads);
  const [selectedCategory, setSelectedCategory] = useState<CommunityCategory | "All">(
    "All",
  );
  const [activeThreadId, setActiveThreadId] = useState(sampleCommunityThreads[0]?.id);
  const [signedIn, setSignedIn] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [status, setStatus] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [draft, setDraft] = useState({
    category: "Trip ideas" as CommunityCategory,
    title: "",
    body: "",
  });
  const [replyBody, setReplyBody] = useState("");

  useEffect(() => {
    async function loadCommunity() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || "";
      setAccessToken(token);
      setSignedIn(Boolean(token));

      const response = await fetch("/api/community/threads");
      const result = (await response.json()) as CommunityResponse;
      const localThreads = readLocalThreads();

      if (result.threads?.length) {
        setThreads([...localThreads, ...result.threads].slice(0, 60));
        setStatus(
          result.setupRequired
            ? "Community is using local fallback until the Supabase SQL is installed."
            : "",
        );
        return;
      }

      if (localThreads.length > 0) {
        setThreads(localThreads);
      }

      if (result.setupRequired) {
        setStatus("Run the community forum SQL to make posts save live.");
      }
    }

    loadCommunity();
  }, []);

  const filteredThreads = useMemo(() => {
    return selectedCategory === "All"
      ? threads
      : threads.filter((thread) => thread.category === selectedCategory);
  }, [selectedCategory, threads]);
  const activeThread =
    threads.find((thread) => thread.id === activeThreadId) ||
    filteredThreads[0] ||
    threads[0];
  const stats = communityThreadStats(threads);

  async function createThread() {
    if (!signedIn || !accessToken) {
      setStatus("Sign in or create a guest profile to post in the community.");
      return;
    }

    if (!draft.title.trim() || !draft.body.trim()) {
      setStatus("Add a title and a little context before posting.");
      return;
    }

    const optimisticThread: CommunityThread = {
      id: `local-${Date.now()}`,
      category: draft.category,
      title: draft.title.trim(),
      body: draft.body.trim(),
      displayName: anonymous ? "Anonymous traveler" : "Roatan traveler",
      profileImageUrl: null,
      anonymous,
      replyCount: 0,
      createdAt: new Date().toISOString(),
      lastReplyAt: new Date().toISOString(),
      replies: [],
    };

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
        anonymous,
      }),
    });
    const result = (await response.json()) as {
      thread?: CommunityThread;
      error?: string;
      setupRequired?: boolean;
    };
    const thread = result.thread || optimisticThread;
    const nextThreads = [thread, ...threads].slice(0, 60);

    setThreads(nextThreads);
    if (!result.thread) writeLocalThreads(nextThreads);
    setActiveThreadId(thread.id);
    setDraft({ category: draft.category, title: "", body: "" });
    setStatus(
      result.error
        ? "Saved locally for now. Run the community SQL to save posts live."
        : "Posted to the Roatan community.",
    );
  }

  async function addReply() {
    if (!activeThread) return;

    if (!signedIn || !accessToken) {
      setStatus("Sign in to reply.");
      return;
    }

    if (!replyBody.trim()) {
      setStatus("Write a reply first.");
      return;
    }

    const optimisticReply: CommunityReply = {
      id: `local-reply-${Date.now()}`,
      threadId: activeThread.id,
      body: replyBody.trim(),
      displayName: replyAnonymous ? "Anonymous traveler" : "Roatan traveler",
      profileImageUrl: null,
      anonymous: replyAnonymous,
      createdAt: new Date().toISOString(),
    };

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
    const reply = result.reply || optimisticReply;
    const nextThreads = threads.map((thread) =>
      thread.id === activeThread.id
        ? {
            ...thread,
            replies: [...thread.replies, reply].slice(-12),
            replyCount: thread.replyCount + 1,
            lastReplyAt: reply.createdAt,
          }
        : thread,
    );

    setThreads(nextThreads);
    if (!result.reply) writeLocalThreads(nextThreads);
    setReplyBody("");
    setStatus(result.error ? "Reply saved locally for now." : "Reply posted.");
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
      <div className="space-y-5">
        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-[#071F2F]/8 ring-1 ring-[#071F2F]/6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#00A8A8]">
            Community pulse
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              ["Threads", stats.threadCount],
              ["Replies", stats.replyCount],
              ["Topics", stats.activeCategoryCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#EEF7F6] p-4">
                <p className="text-2xl font-black text-[#071F2F]">{value}</p>
                <p className="mt-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#0B3C5D]/60">
                  {label}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["All", ...communityCategories] as const).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-4 py-2 text-sm font-black transition ${
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
            Start a thread
          </p>
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
              placeholder="Ask about a route, stay, pickup, beach, or local tip"
              className="min-h-12 rounded-2xl border border-[#071F2F]/10 px-4 text-sm font-bold text-[#0B3C5D] outline-none"
            />
            <textarea
              value={draft.body}
              onChange={(event) =>
                setDraft((current) => ({ ...current, body: event.target.value }))
              }
              rows={5}
              placeholder="Share your dates, area, group, or question..."
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
            Post to community
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

      <div className="space-y-5">
        <div className="grid gap-3">
          {filteredThreads.map((thread) => (
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
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#00A8A8]">
                    {thread.category}
                  </p>
                  <h2 className="mt-2 text-xl font-black">{thread.title}</h2>
                </div>
                <span className="rounded-full bg-[#D6B56D] px-3 py-1 text-xs font-black text-[#071F2F]">
                  {thread.replyCount} replies
                </span>
              </div>
              <p
                className={`mt-2 line-clamp-2 text-sm leading-6 ${
                  activeThread?.id === thread.id ? "text-white/70" : "text-gray-600"
                }`}
              >
                {thread.body}
              </p>
            </button>
          ))}
        </div>

        {activeThread ? (
          <article className="rounded-[2rem] bg-white p-5 shadow-2xl shadow-[#071F2F]/10 ring-1 ring-[#071F2F]/6">
            <div className="flex items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#EEF7F6] text-sm font-black text-[#007B7B]">
                {activeThread.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeThread.profileImageUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  initials(activeThread.displayName)
                )}
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#00A8A8]">
                  {activeThread.category}
                </p>
                <h2 className="mt-1 text-3xl font-black leading-tight text-[#071F2F]">
                  {activeThread.title}
                </h2>
                <p className="mt-2 text-sm font-semibold text-[#0B3C5D]/60">
                  {activeThread.displayName} / {displayTime(activeThread.createdAt)}
                </p>
              </div>
            </div>
            <p className="mt-5 rounded-3xl bg-[#F7F3EA] p-5 text-base font-semibold leading-7 text-[#0B3C5D]">
              {activeThread.body}
            </p>

            <div className="mt-5 grid gap-3">
              {activeThread.replies.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-[#071F2F]/15 p-5 text-center text-sm font-bold text-[#0B3C5D]/65">
                  No replies yet. Be the first to help.
                </div>
              ) : (
                activeThread.replies.map((reply) => (
                  <div key={reply.id} className="rounded-3xl bg-[#EEF7F6] p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-xs font-black text-[#007B7B]">
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
                      <div>
                        <p className="text-sm font-black text-[#071F2F]">
                          {reply.displayName}
                        </p>
                        <p className="text-xs font-semibold text-[#0B3C5D]/55">
                          {displayTime(reply.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-6 text-[#0B3C5D]">
                      {reply.body}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 rounded-3xl border border-[#00A8A8]/20 bg-[#FBF8EF] p-4">
              <textarea
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                rows={4}
                placeholder="Reply with a tip, question, or local context..."
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
          </article>
        ) : null}
      </div>
    </section>
  );
}
