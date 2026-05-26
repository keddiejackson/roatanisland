"use client";

import { useEffect, useState } from "react";
import type {
  BookingMessageLike,
  BookingTimelineItem,
} from "@/lib/booking-communication";
import { bookingMessagePreview } from "@/lib/booking-communication";
import { supabase } from "@/lib/supabase";

type BookingConversationPanelProps = {
  bookingId: string;
  apiPath: string;
  title: string;
  subtitle?: string;
  allowInternalNotes?: boolean;
};

type BookingConversationResponse = {
  messages?: BookingMessageLike[];
  timeline?: BookingTimelineItem[];
};

function timelineToneClass(tone: BookingTimelineItem["tone"]) {
  if (tone === "success") return "border-green-200 bg-green-50";
  if (tone === "danger") return "border-red-200 bg-red-50";
  if (tone === "warning") return "border-[#D6B56D]/35 bg-[#FFF8E8]";
  return "border-[#00A8A8]/20 bg-[#EEF7F6]";
}

export default function BookingConversationPanel({
  bookingId,
  apiPath,
  title,
  subtitle,
  allowInternalNotes = false,
}: BookingConversationPanelProps) {
  const [timeline, setTimeline] = useState<BookingTimelineItem[]>([]);
  const [messages, setMessages] = useState<BookingMessageLike[]>([]);
  const [draft, setDraft] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadConversation() {
      setLoading(true);
      setError("");

      const { data } = await supabase.auth.getSession();
      const response = await fetch(apiPath, {
        headers: {
          ...(data.session?.access_token
            ? { Authorization: `Bearer ${data.session.access_token}` }
            : {}),
        },
      });
      const result = (await response.json()) as BookingConversationResponse & {
        error?: string;
      };

      if (!response.ok) {
        setError(result.error || "Unable to load booking conversation.");
        setLoading(false);
        return;
      }

      setTimeline(result.timeline || []);
      setMessages(result.messages || []);
      setLoading(false);
    }

    loadConversation();
  }, [apiPath, bookingId]);

  async function sendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSending(true);

    const { data } = await supabase.auth.getSession();
    const response = await fetch(apiPath, {
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
    const result = (await response.json()) as BookingConversationResponse & {
      error?: string;
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
    setTimeline((current) =>
      result.message
        ? [
            ...current,
            {
              kind: "message",
              title: result.message.is_internal
                ? "Internal admin note"
                : `${result.message.sender_role} message`,
              text: result.message.message,
              actorLabel: result.message.sender_role,
              createdAt: result.message.created_at || null,
              tone: result.message.is_internal ? "warning" : "info",
            },
          ]
        : current,
    );
  }

  return (
    <section className="rounded-2xl border border-[#D6B56D]/20 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#00A8A8]">
            Booking conversation
          </p>
          <h3 className="mt-1 text-xl font-black text-[#0B3C5D]">{title}</h3>
          {subtitle ? (
            <p className="mt-1 text-sm leading-6 text-gray-600">{subtitle}</p>
          ) : null}
        </div>
        <span className="rounded-full bg-[#F7F3EA] px-3 py-1 text-sm font-bold text-[#0B3C5D]">
          {messages.length} message{messages.length === 1 ? "" : "s"}
        </span>
      </div>

      {loading ? (
        <p className="mt-5 rounded-xl bg-[#F7F3EA] p-4 text-sm text-gray-600">
          Loading conversation...
        </p>
      ) : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="text-sm font-bold text-[#0B3C5D]">Timeline</p>
            <div className="mt-3 grid gap-3">
              {timeline.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                  No timeline activity yet.
                </p>
              ) : (
                timeline.map((item, index) => (
                  <div
                    key={`${item.kind}-${item.createdAt || index}-${item.title}`}
                    className={`rounded-xl border p-4 ${timelineToneClass(
                      item.tone,
                    )}`}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-bold text-[#0B3C5D]">{item.title}</p>
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        {item.actorLabel}
                      </p>
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                      {item.text}
                    </p>
                    {item.createdAt ? (
                      <p className="mt-2 text-xs text-gray-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-[#0B3C5D]">Messages</p>
            <div className="mt-3 grid max-h-80 gap-3 overflow-y-auto rounded-xl bg-[#F7F3EA] p-3">
              {messages.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-600">
                  No messages yet.
                </p>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.created_at || index}-${message.sender_role}`}
                    className="rounded-xl bg-white p-4 text-sm leading-6 text-gray-700"
                  >
                    <p className="font-bold text-[#0B3C5D]">
                      {bookingMessagePreview(message)}
                    </p>
                    {message.created_at ? (
                      <p className="mt-2 text-xs text-gray-500">
                        {new Date(message.created_at).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={sendMessage} className="mt-4 grid gap-3">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                maxLength={1200}
                placeholder="Write a booking message..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-[#00A8A8]"
              />
              {allowInternalNotes ? (
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                  />
                  Internal admin note
                </label>
              ) : null}
              {error ? (
                <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="rounded-xl bg-[#00A8A8] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {sending ? "Sending..." : "Send message"}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
