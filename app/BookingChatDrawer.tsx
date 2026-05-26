"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  bookingChatQuickReplies,
  bookingDrawerStats,
  type BookingMessageLike,
  type BookingThreadSummary,
  type BookingThreadViewerRole,
} from "@/lib/booking-communication";
import { supabase } from "@/lib/supabase";

export type BookingChatThread = {
  id: string;
  title: string;
  subtitle: string;
  apiPath: string;
  summary?: BookingThreadSummary;
};

type BookingChatDrawerProps = {
  threads: BookingChatThread[];
  viewerRole: BookingThreadViewerRole;
  allowInternalNotes?: boolean;
  emptyText?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  selectedThreadId?: string;
  onSelectedThreadIdChange?: (threadId: string) => void;
};

type ConversationResponse = {
  messages?: BookingMessageLike[];
  error?: string;
};

function senderLabel(role: string) {
  if (role === "vendor") return "Vendor";
  if (role === "admin") return "Admin";
  if (role === "system") return "System";
  return "Guest";
}

function bubbleClass(
  message: BookingMessageLike,
  viewerRole: BookingThreadViewerRole,
) {
  if (message.is_internal) {
    return "ml-auto border border-[#D6B56D]/35 bg-[#FFF8E8] text-[#0B3C5D]";
  }

  const isMine = message.sender_role === viewerRole;
  return isMine
    ? "ml-auto bg-[#00A8A8] text-white"
    : "mr-auto bg-white text-[#17324D]";
}

function threadBadgeClass(summary?: BookingThreadSummary) {
  if (!summary || summary.messageCount === 0) {
    return "border border-[#0B3C5D]/10 bg-[#F7F3EA] text-[#466176]";
  }

  if (summary.needsResponse) {
    return "bg-[#D6B56D] text-[#071F2F]";
  }

  return "bg-[#EEF7F6] text-[#0B3C5D]";
}

export default function BookingChatDrawer({
  threads,
  viewerRole,
  allowInternalNotes = false,
  emptyText = "No booking conversations yet.",
  open,
  onOpenChange,
  selectedThreadId,
  onSelectedThreadIdChange,
}: BookingChatDrawerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [internalSelectedThreadId, setInternalSelectedThreadId] = useState("");
  const [messages, setMessages] = useState<BookingMessageLike[]>([]);
  const [draft, setDraft] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const drawerOpen = open ?? internalOpen;
  const activeThreadId = selectedThreadId ?? internalSelectedThreadId;
  const quickReplies = bookingChatQuickReplies(viewerRole);
  const threadSummaries = threads
    .map((thread) => thread.summary)
    .filter(Boolean) as BookingThreadSummary[];
  const stats = bookingDrawerStats(threadSummaries, threads.length);
  const selectedThread = useMemo(
    () =>
      threads.find((thread) => thread.id === activeThreadId) ||
      threads.find((thread) => thread.summary?.needsResponse) ||
      threads[0],
    [activeThreadId, threads],
  );
  const selectedApiPath = selectedThread?.apiPath;

  function changeOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
  }

  function changeSelectedThread(threadId: string) {
    if (threadId !== activeThreadId) {
      setDraft("");
      setError("");
      setIsInternal(false);
    }

    onSelectedThreadIdChange?.(threadId);
    if (selectedThreadId === undefined) {
      setInternalSelectedThreadId(threadId);
    }
  }

  useEffect(() => {
    if (!drawerOpen || !selectedApiPath) return;

    const controller = new AbortController();

    async function loadConversation() {
      setLoading(true);
      setError("");

      try {
        const { data } = await supabase.auth.getSession();
        const response = await fetch(selectedApiPath, {
          signal: controller.signal,
          headers: {
            ...(data.session?.access_token
              ? { Authorization: `Bearer ${data.session.access_token}` }
              : {}),
          },
        });
        const result = (await response.json()) as ConversationResponse;

        if (!response.ok) {
          setError(result.error || "Unable to load messages.");
          setMessages([]);
          return;
        }

        setMessages(result.messages || []);
      } catch {
        if (!controller.signal.aborted) {
          setError("Unable to load messages.");
          setMessages([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadConversation();
    return () => controller.abort();
  }, [drawerOpen, selectedApiPath]);

  useEffect(() => {
    if (!drawerOpen) return;

    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [drawerOpen, messages.length, selectedThread?.id]);

  useEffect(() => {
    if (!drawerOpen) return;

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange?.(false);
        if (open === undefined) {
          setInternalOpen(false);
        }
      }
    }

    window.addEventListener("keydown", closeWithEscape);
    return () => window.removeEventListener("keydown", closeWithEscape);
  }, [drawerOpen, open, onOpenChange]);

  async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedThread || !draft.trim()) return;

    setSending(true);
    setError("");

    const { data } = await supabase.auth.getSession();
    const response = await fetch(selectedThread.apiPath, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(data.session?.access_token
          ? { Authorization: `Bearer ${data.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        message: draft,
        isInternal,
      }),
    });
    const result = (await response.json()) as ConversationResponse & {
      message?: BookingMessageLike;
    };
    setSending(false);

    if (!response.ok) {
      setError(result.error || "Unable to send message.");
      return;
    }

    setDraft("");
    setIsInternal(false);
    setMessages((current) =>
      result.message ? [...current, result.message] : current,
    );
  }

  if (threads.length === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => changeOpen(true)}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-40 max-w-[calc(100vw-2rem)] rounded-2xl bg-[#071F2F] px-4 py-3 text-left font-bold text-white shadow-2xl shadow-[#071F2F]/25 ring-1 ring-white/10 transition hover:-translate-y-1 sm:right-5 sm:px-5 sm:py-4"
        aria-label="Open booking messages"
      >
        <span className="block text-sm leading-none">Messages</span>
        <span className="mt-1 block text-xs leading-tight text-white/70">
          {stats.needsResponseCount > 0
            ? `${stats.needsResponseCount} need response`
            : `${stats.threadCount} thread${stats.threadCount === 1 ? "" : "s"}`}
        </span>
      </button>

      {drawerOpen ? (
        <div
          className="fixed inset-0 z-50 bg-[#071F2F]/35 backdrop-blur-sm"
          onClick={() => changeOpen(false)}
        >
          <aside
            className="fixed inset-x-0 bottom-0 flex h-[min(100dvh,720px)] max-h-[100dvh] flex-col overflow-hidden rounded-t-2xl bg-[#F7F3EA] shadow-2xl ring-1 ring-[#071F2F]/10 md:inset-y-4 md:left-auto md:right-4 md:h-auto md:w-[min(540px,calc(100vw-2rem))] md:rounded-2xl xl:w-[560px]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="shrink-0 bg-[#071F2F] p-4 text-white sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D6B56D]">
                    Booking chat
                  </p>
                  <h2 className="mt-1 truncate text-2xl font-black leading-tight">
                    Messages
                  </h2>
                  <p className="mt-1 text-sm leading-5 text-white/70">
                    {stats.messageCount} message
                    {stats.messageCount === 1 ? "" : "s"} across{" "}
                    {stats.threadCount} thread
                    {stats.threadCount === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => changeOpen(false)}
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-xl font-black leading-none text-white transition hover:bg-white/20"
                  aria-label="Close booking messages"
                >
                  x
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-rows-[auto_auto_1fr_auto]">
              <div className="shrink-0 border-b border-[#D6B56D]/20 bg-white p-3">
                <div className="grid gap-2 sm:grid-cols-[auto_1fr] sm:items-center">
                  <label
                    htmlFor="booking-chat-thread"
                    className="text-[11px] font-black uppercase tracking-[0.14em] text-[#007B7B]"
                  >
                    Thread
                  </label>
                  <select
                    id="booking-chat-thread"
                    value={selectedThread?.id || ""}
                    onChange={(event) => changeSelectedThread(event.target.value)}
                    className="min-h-11 w-full min-w-0 rounded-xl border border-gray-200 bg-[#F7F3EA] px-3 py-2 text-sm font-bold text-[#0B3C5D] outline-none focus:border-[#00A8A8]"
                  >
                    {threads.map((thread) => (
                      <option key={thread.id} value={thread.id}>
                        {thread.title} - {thread.summary?.badgeLabel || "No messages"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedThread ? (
                <div className="shrink-0 border-b border-[#D6B56D]/20 bg-[#F7F3EA]/95 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#0B3C5D]">
                        {selectedThread.title}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-600">
                        {selectedThread.subtitle}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${threadBadgeClass(
                        selectedThread.summary,
                      )}`}
                    >
                      {selectedThread.summary?.badgeLabel || "No messages"}
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="min-h-0 overflow-y-auto px-3 py-4 sm:px-4">
                {!selectedThread ? (
                  <p className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-center text-sm leading-6 text-gray-600">
                    {emptyText}
                  </p>
                ) : loading ? (
                  <p className="rounded-xl bg-white p-5 text-center text-sm leading-6 text-gray-600">
                    Loading messages...
                  </p>
                ) : messages.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-center text-sm leading-6 text-gray-600">
                    No messages yet. Send the first update below.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {messages.map((message, index) => (
                      <div
                        key={`${message.created_at || index}-${message.sender_role}`}
                        className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${bubbleClass(
                          message,
                          viewerRole,
                        )}`}
                      >
                        <p className="text-[11px] font-black uppercase tracking-[0.06em] opacity-70">
                          {message.is_internal
                            ? "Internal admin note"
                            : senderLabel(message.sender_role)}
                        </p>
                        <p className="mt-1 whitespace-pre-line break-words">
                          {message.message}
                        </p>
                        {message.created_at ? (
                          <p className="mt-2 text-[11px] opacity-70">
                            {new Date(message.created_at).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <form
                onSubmit={sendMessage}
                className="shrink-0 border-t border-[#D6B56D]/20 bg-white p-3 sm:p-4"
              >
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      onClick={() => setDraft(reply)}
                      className="max-w-full rounded-full border border-[#00A8A8]/25 bg-[#EEF7F6] px-3 py-1.5 text-left text-[11px] font-bold leading-tight text-[#0B3C5D] transition hover:border-[#00A8A8]"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={2}
                  maxLength={1200}
                  placeholder="Write a message..."
                  className="max-h-24 min-h-20 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm leading-6 outline-none focus:border-[#00A8A8]"
                />
                {allowInternalNotes ? (
                  <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                    />
                    Internal admin note
                  </label>
                ) : null}
                {error ? (
                  <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold leading-5 text-red-700">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={sending || !draft.trim() || !selectedThread}
                  className="mt-3 w-full rounded-xl bg-[#00A8A8] px-5 py-3 text-sm font-black text-white transition hover:bg-[#008F8F] disabled:opacity-50"
                >
                  {sending ? "Sending..." : "Send message"}
                </button>
              </form>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
