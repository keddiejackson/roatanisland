"use client";

import { useEffect, useMemo, useState } from "react";
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
    return "bg-white/10 text-white/70";
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
  const drawerOpen = open ?? internalOpen;
  const activeThreadId = selectedThreadId ?? internalSelectedThreadId;
  const quickReplies = bookingChatQuickReplies(viewerRole);
  const stats = bookingDrawerStats(
    threads.map((thread) => thread.summary).filter(Boolean) as BookingThreadSummary[],
  );
  const selectedThread = useMemo(
    () =>
      threads.find((thread) => thread.id === activeThreadId) ||
      threads.find((thread) => thread.summary?.needsResponse) ||
      threads[0],
    [activeThreadId, threads],
  );

  function changeOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
  }

  function changeSelectedThread(threadId: string) {
    onSelectedThreadIdChange?.(threadId);
    if (selectedThreadId === undefined) {
      setInternalSelectedThreadId(threadId);
    }
  }

  useEffect(() => {
    if (!drawerOpen || !selectedThread) return;

    async function loadConversation() {
      setLoading(true);
      setError("");

      const { data } = await supabase.auth.getSession();
      const response = await fetch(selectedThread.apiPath, {
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
        setLoading(false);
        return;
      }

      setMessages(result.messages || []);
      setLoading(false);
    }

    loadConversation();
  }, [drawerOpen, selectedThread]);

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
        className="fixed bottom-5 right-5 z-40 rounded-full bg-[#071F2F] px-5 py-4 text-left font-bold text-white shadow-2xl shadow-[#071F2F]/25 transition hover:-translate-y-1"
        aria-label="Open booking messages"
      >
        <span className="block text-sm">Messages</span>
        <span className="mt-1 block text-xs text-white/70">
          {stats.needsResponseCount > 0
            ? `${stats.needsResponseCount} need response`
            : `${stats.threadCount} thread${stats.threadCount === 1 ? "" : "s"}`}
        </span>
      </button>

      {drawerOpen ? (
        <div className="fixed inset-0 z-50 bg-[#071F2F]/35 backdrop-blur-sm">
          <aside className="fixed inset-x-0 bottom-0 flex max-h-[92vh] flex-col overflow-hidden rounded-t-2xl bg-[#F7F3EA] shadow-2xl md:inset-y-6 md:left-auto md:right-6 md:w-[440px] md:rounded-2xl">
            <div className="bg-[#071F2F] p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#D6B56D]">
                    Booking chat
                  </p>
                  <h2 className="mt-1 text-2xl font-black">Messages</h2>
                  <p className="mt-1 text-sm text-white/70">
                    {stats.messageCount} message
                    {stats.messageCount === 1 ? "" : "s"} across{" "}
                    {stats.threadCount} thread
                    {stats.threadCount === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => changeOpen(false)}
                  className="rounded-full bg-white/10 px-3 py-2 text-sm font-bold text-white"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr_auto]">
              <div className="border-b border-[#D6B56D]/20 bg-white p-3">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {threads.map((thread) => (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => changeSelectedThread(thread.id)}
                      className={`min-w-56 rounded-xl border px-3 py-2 text-left text-sm transition ${
                        selectedThread?.id === thread.id
                          ? "border-[#00A8A8] bg-[#EEF7F6]"
                          : "border-gray-200 bg-white hover:border-[#00A8A8]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-black text-[#0B3C5D]">
                          {thread.title}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${threadBadgeClass(
                            thread.summary,
                          )}`}
                        >
                          {thread.summary?.badgeLabel || "No messages"}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-gray-500">
                        {thread.subtitle}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto p-4">
                {!selectedThread ? (
                  <p className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
                    {emptyText}
                  </p>
                ) : loading ? (
                  <p className="rounded-xl bg-white p-5 text-sm text-gray-600">
                    Loading messages...
                  </p>
                ) : messages.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-gray-300 bg-white p-5 text-sm text-gray-600">
                    No messages yet. Send the first update below.
                  </p>
                ) : (
                  <div className="grid gap-3">
                    {messages.map((message, index) => (
                      <div
                        key={`${message.created_at || index}-${message.sender_role}`}
                        className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${bubbleClass(
                          message,
                          viewerRole,
                        )}`}
                      >
                        <p className="text-xs font-black uppercase opacity-70">
                          {message.is_internal
                            ? "Internal admin note"
                            : senderLabel(message.sender_role)}
                        </p>
                        <p className="mt-1 whitespace-pre-line">
                          {message.message}
                        </p>
                        {message.created_at ? (
                          <p className="mt-2 text-[11px] opacity-70">
                            {new Date(message.created_at).toLocaleString()}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form
                onSubmit={sendMessage}
                className="border-t border-[#D6B56D]/20 bg-white p-4"
              >
                {selectedThread?.summary?.lastMessagePreview ? (
                  <p className="mb-3 rounded-xl bg-[#F7F3EA] px-3 py-2 text-xs text-gray-600">
                    {selectedThread.summary.lastMessagePreview}
                  </p>
                ) : null}
                <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                  {quickReplies.map((reply) => (
                    <button
                      key={reply}
                      type="button"
                      onClick={() => setDraft(reply)}
                      className="shrink-0 rounded-full border border-[#00A8A8]/25 bg-[#EEF7F6] px-3 py-1.5 text-xs font-bold text-[#0B3C5D]"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  maxLength={1200}
                  placeholder="Write a message..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#00A8A8]"
                />
                {allowInternalNotes ? (
                  <label className="mt-2 flex items-center gap-2 text-sm font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                    />
                    Internal admin note
                  </label>
                ) : null}
                {error ? (
                  <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    {error}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={sending || !draft.trim() || !selectedThread}
                  className="mt-3 w-full rounded-xl bg-[#00A8A8] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
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
