"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ConciergeListing } from "@/lib/guest-concierge";
import type {
  RoaBrainPlan,
  RoaChatMessage,
  RoaSuggestedListing,
  RoaTravelerContext,
} from "@/lib/roa-concierge";
import {
  buildRoaHandoffSummary,
  buildRoaPlanActions,
  getRoaReadyListings,
} from "@/lib/roa-concierge";
import { supabase } from "@/lib/supabase";

const quickPrompts = [
  "Plan a cruise day that gets me back on time",
  "Build a luxury private Roatan day",
  "Help with airport pickup and a first-day plan",
  "What should I bring for a Roatan tour?",
];

const guidedStarts = [
  {
    label: "Cruise day",
    detail: "Port timing, beach time, safe return buffer",
    traveler: {
      arrivalType: "Cruise",
      pickupArea: "Coxen Hole",
      tripStyle: "Family",
    },
    prompt:
      "Plan a cruise day with a safe return buffer, beach time, and local options.",
  },
  {
    label: "Airport arrival",
    detail: "Pickup, luggage, soft first-day plan",
    traveler: {
      arrivalType: "Airport",
      pickupArea: "Roatan Airport",
      tripStyle: "Family",
    },
    prompt:
      "Plan an airport arrival day with pickup, luggage-friendly timing, and an easy first stop.",
  },
  {
    label: "Private luxury day",
    detail: "VIP pacing, private charter, sunset option",
    traveler: {
      arrivalType: "Staying on island",
      tripStyle: "Luxury",
      budget: "Luxury",
    },
    prompt:
      "Build a luxury private Roatan day with premium pacing, water time, and a sunset option.",
  },
  {
    label: "Family beach day",
    detail: "Easy pickup, calm stops, simple timing",
    traveler: {
      arrivalType: "Staying on island",
      tripStyle: "Family",
      budget: "Moderate",
    },
    prompt:
      "Plan an easy family beach day with simple pickup, shade, food, and flexible timing.",
  },
];

function cleanLocalProfile() {
  if (typeof window === "undefined") return {};

  try {
    const profile = JSON.parse(localStorage.getItem("roatan-guest-profile") || "{}");

    return profile && typeof profile === "object" ? profile : {};
  } catch {
    return {};
  }
}

function moneyLabel(price: number | null) {
  if (!price) return "Price pending";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
  }).format(price);
}

export default function RoaConcierge({
  listings,
}: {
  listings: ConciergeListing[];
}) {
  const [traveler, setTraveler] = useState<RoaTravelerContext>(() => {
    const profile = cleanLocalProfile() as {
      guestName?: string;
      displayName?: string;
      phone?: string;
      pickupArea?: string;
      guests?: string;
      guestCount?: string;
      notes?: string;
    };

    return {
      name: profile.displayName || profile.guestName || "",
      phone: profile.phone || "",
      guests: profile.guests || profile.guestCount || "2",
      pickupArea: profile.pickupArea || "",
      notes: profile.notes || "",
    };
  });
  const [messages, setMessages] = useState<RoaChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi, I am Roa. Tell me your date, guest count, pickup point, and the kind of Roatan day you want. I will shape the plan and send it to the concierge team when you are ready.",
    },
  ]);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<RoaSuggestedListing[]>([]);
  const [sources, setSources] = useState<{ title: string; url: string }[]>([]);
  const [brainPlan, setBrainPlan] = useState<RoaBrainPlan | null>(null);
  const [mode, setMode] = useState<
    "ai" | "gemini" | "brain" | "fallback" | "idle"
  >("idle");
  const [sending, setSending] = useState(false);
  const [handoffStatus, setHandoffStatus] = useState("");
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email || "";
      setTraveler((current) => ({
        ...current,
        email: current.email || email,
        name:
          current.name ||
          data.user?.user_metadata?.display_name ||
          data.user?.email?.split("@")[0] ||
          "",
      }));
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    localStorage.setItem(
      "roatan-guest-profile",
      JSON.stringify({
        displayName: traveler.name || "",
        guestName: traveler.name || "",
        email: traveler.email || "",
        phone: traveler.phone || "",
        pickupArea: traveler.pickupArea || "",
        guests: traveler.guests || "",
        guestCount: traveler.guests || "",
        notes: traveler.notes || "",
        tripDate: traveler.tripDate || "",
        arrivalType: traveler.arrivalType || "",
        tripStyle: traveler.tripStyle || "",
        budget: traveler.budget || "",
      }),
    );
  }, [traveler]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  const featuredListings = useMemo(
    () =>
      getRoaReadyListings(listings).slice(0, 3).map((listing) => ({
        id: listing.id,
        title: listing.title,
        category: listing.category,
        location: listing.location,
        price: listing.price,
        rating: listing.rating,
        reasons: [listing.category || "Local option"].filter(Boolean),
      })),
    [listings],
  );
  const visibleSuggestions =
    suggestions.length > 0 ? suggestions : featuredListings;
  const planActions = useMemo(
    () =>
      buildRoaPlanActions({
        plan: brainPlan || undefined,
        suggestedListings: visibleSuggestions,
        traveler,
      }),
    [brainPlan, traveler, visibleSuggestions],
  );

  function updateTraveler(field: keyof RoaTravelerContext, value: string) {
    setTraveler((current) => ({ ...current, [field]: value }));
  }

  async function sendMessage(
    prompt?: string,
    travelerOverride?: RoaTravelerContext,
  ) {
    const content = (prompt || input).trim();
    if (!content || sending) return;
    const activeTraveler = travelerOverride || traveler;

    const nextMessages: RoaChatMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    setHandoffStatus("");

    try {
      const response = await fetch("/api/roa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          traveler: activeTraveler,
        }),
      });
      const result = await response.json();

      setMode(result.mode || "fallback");
      setSuggestions(result.suggestedListings || []);
      setSources(result.sources || []);
      setBrainPlan(result.brainPlan || null);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            result.reply ||
            "I can help with that. Tell me your date, pickup point, and what kind of day you want.",
        },
      ]);
    } catch {
      setMode("fallback");
      setBrainPlan(null);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "I am having trouble reaching the AI service, but I can still help gather the details for the concierge team.",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function startGuidedPlan(start: (typeof guidedStarts)[number]) {
    const nextTraveler = {
      ...traveler,
      ...start.traveler,
    };

    setTraveler(nextTraveler);
    sendMessage(start.prompt, nextTraveler);
  }

  function saveRoaPlan() {
    if (typeof window === "undefined") return;

    const savedPlan = {
      savedAt: new Date().toISOString(),
      traveler,
      brainPlan,
      suggestions: visibleSuggestions,
      messages,
    };

    localStorage.setItem("roatan-roa-saved-plan", JSON.stringify(savedPlan));
    setHandoffStatus("Saved. Your Roa plan is saved on this device.");
  }

  async function copyRoaSummary() {
    const summary = buildRoaHandoffSummary({
      messages,
      traveler,
      brainPlan,
      suggestedListings: visibleSuggestions,
    });

    try {
      await navigator.clipboard.writeText(summary);
      setHandoffStatus("Copied. You can paste the Roa summary anywhere.");
    } catch {
      setHandoffStatus("Unable to copy right now, but the plan is still here.");
    }
  }

  async function sendToConciergeTeam() {
    if (!traveler.name || !traveler.email) {
      setHandoffStatus("Add your name and email first.");
      return;
    }

    setHandoffStatus("Sending Roa plan...");

    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: traveler.name,
        email: traveler.email,
        phone: traveler.phone,
        interest: "Roa AI concierge request",
        message: buildRoaHandoffSummary({
          messages,
          traveler,
          brainPlan,
          suggestedListings: visibleSuggestions,
        }),
        leadType: "concierge_plan",
        travelDate: traveler.tripDate,
        guests: traveler.guests,
        pickupArea: traveler.pickupArea,
        arrivalType: traveler.arrivalType,
        tripStyle: traveler.tripStyle,
        budget: traveler.budget,
        plan: {
          source: "roa_ai_concierge",
          messages,
          suggestions: visibleSuggestions,
          brainPlan,
          actions: planActions,
          traveler,
        },
        sourcePath: "/concierge",
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      setHandoffStatus(result.error || "Unable to send this to concierge.");
      return;
    }

    setHandoffStatus("Sent. The concierge team can now review the Roa plan.");
  }

  return (
    <section className="mb-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-[#071F2F]/10">
        <div className="bg-[#071F2F] p-4 text-white sm:p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D6B56D]">
                Ask Roa
              </p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/75">
                Chat naturally. Roa will organize the route, pickup, timing,
                and next step.
              </p>
            </div>
            <div className="rounded-full bg-white/10 px-4 py-2 text-xs font-black ring-1 ring-white/15">
              {mode === "gemini"
                ? "Gemini polish"
                : mode === "ai"
                  ? "AI polish"
                  : mode === "brain"
                    ? "Roa Brain"
                    : mode === "fallback"
                      ? "Smart fallback"
                      : `${listings.length} listings ready`}
            </div>
          </div>
        </div>

        <div className="grid min-h-[calc(100svh-220px)] grid-rows-[auto_auto_1fr_auto] sm:min-h-[560px]">
          <div className="flex gap-2 overflow-x-auto border-b border-[#E8DDC6] bg-[#FBF7EC] p-3">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => sendMessage(prompt)}
                className="shrink-0 rounded-full border border-[#D6B56D]/30 bg-white px-4 py-2 text-sm font-black text-[#0B3C5D] shadow-sm transition hover:-translate-y-0.5 hover:border-[#00A8A8]"
              >
                {prompt}
              </button>
            ))}
          </div>

          {messages.length <= 1 && !brainPlan ? (
            <div className="border-b border-[#E8DDC6] bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                Start with your arrival
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {guidedStarts.map((start) => (
                  <button
                    key={start.label}
                    type="button"
                    onClick={() => startGuidedPlan(start)}
                    className="rounded-2xl border border-[#E8DDC6] bg-[#FFFDF7] px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#00A8A8]"
                  >
                    <span className="block font-black text-[#0B3C5D]">
                      {start.label}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-gray-600">
                      {start.detail}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="max-h-[52svh] space-y-4 overflow-y-auto bg-[#F7F3EA] p-4 sm:max-h-[430px] sm:p-5">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[90%] rounded-[1.35rem] px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[76%] ${
                    message.role === "user"
                      ? "bg-[#00A8A8] text-white"
                      : "bg-white text-[#17324D]"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <p className="mb-1 text-[0.68rem] font-black uppercase tracking-[0.16em] text-[#007B7B]">
                      Roa
                    </p>
                  ) : null}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {sending ? (
              <div className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-black text-[#0B3C5D] shadow-sm">
                Roa is planning...
              </div>
            ) : null}
            <div ref={messageEndRef} />
          </div>

          <div className="border-t border-[#E8DDC6] bg-white p-3 sm:p-4">
            {sources.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-bold text-[#007B7B]"
                  >
                    {source.title}
                  </a>
                ))}
              </div>
            ) : null}
            <div className="flex flex-col gap-2 sm:flex-row">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                rows={2}
                placeholder="Ask Roa to plan your day..."
                className="min-h-16 flex-1 resize-none rounded-2xl border border-gray-300 px-4 py-3 text-base outline-none focus:border-[#00A8A8]"
              />
              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={sending || !input.trim()}
                className="rounded-2xl bg-[#00A8A8] px-6 py-4 text-sm font-black text-white shadow-lg shadow-[#00A8A8]/20 disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      <aside className="grid gap-4 lg:content-start">
        <div className="rounded-[1.75rem] bg-[#071F2F] p-5 text-white shadow-xl shadow-[#071F2F]/10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D6B56D]">
            Trip context
          </p>
          <h3 className="mt-2 text-2xl font-black">The basics.</h3>
          <div className="mt-5 grid gap-3">
            <input
              value={traveler.name || ""}
              onChange={(event) => updateTraveler("name", event.target.value)}
              placeholder="Name"
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/45 focus:border-[#00A8A8]"
            />
            <input
              type="email"
              value={traveler.email || ""}
              onChange={(event) => updateTraveler("email", event.target.value)}
              placeholder="Email"
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/45 focus:border-[#00A8A8]"
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <input
                type="date"
                value={traveler.tripDate || ""}
                onChange={(event) =>
                  updateTraveler("tripDate", event.target.value)
                }
                className="min-w-0 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none focus:border-[#00A8A8]"
              />
              <input
                value={traveler.guests || ""}
                onChange={(event) => updateTraveler("guests", event.target.value)}
                placeholder="Guests"
                className="min-w-0 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/45 focus:border-[#00A8A8]"
              />
            </div>
            <input
              value={traveler.pickupArea || ""}
              onChange={(event) =>
                updateTraveler("pickupArea", event.target.value)
              }
              placeholder="Pickup area, hotel, port, or airport"
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/45 focus:border-[#00A8A8]"
            />
            <textarea
              value={traveler.notes || ""}
              onChange={(event) => updateTraveler("notes", event.target.value)}
              rows={3}
              placeholder="Kids, mobility needs, food preferences, ship time, flight time..."
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/45 focus:border-[#00A8A8]"
            />
          </div>
          <button
            type="button"
            onClick={sendToConciergeTeam}
            className="mt-4 w-full rounded-xl bg-[#D6B56D] px-4 py-3 text-sm font-black text-[#071F2F]"
          >
            Send Roa plan to concierge
          </button>
          {handoffStatus ? (
            <p className="mt-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white/85">
              {handoffStatus}
            </p>
          ) : null}
        </div>

        {brainPlan ? (
          <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-[#071F2F]/8">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                  Roa Brain
                </p>
                <h3 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                  {brainPlan.title}
                </h3>
              </div>
              <span className="rounded-full bg-[#EEF7F6] px-3 py-2 text-xs font-black text-[#007B7B]">
                {brainPlan.confidenceScore}% {brainPlan.confidenceLabel}
              </span>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              {brainPlan.summary}
            </p>
            <div className="mt-4 grid gap-2">
              {brainPlan.suggestedStops.slice(0, 3).map((stop, index) => (
                <div
                  key={`${stop.title}-${index}`}
                  className="rounded-2xl bg-[#FBF7EC] px-4 py-3"
                >
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#D6B56D]">
                    {stop.timeBlock}
                  </p>
                  <p className="mt-1 font-black text-[#0B3C5D]">{stop.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{stop.note}</p>
                </div>
              ))}
            </div>
            {brainPlan.missingDetails.length > 0 ? (
              <div className="mt-4 rounded-2xl bg-[#FFF8E8] px-4 py-3 text-sm font-bold text-[#7A5A12]">
                Needs: {brainPlan.missingDetails.join(", ")}
              </div>
            ) : null}
            <div className="mt-4 rounded-2xl bg-[#EEF7F6] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
              {brainPlan.nextAction}
            </div>
            <div className="mt-4 grid gap-2">
              {planActions.map((action) =>
                action.href ? (
                  <Link
                    key={action.key}
                    href={action.href}
                    className="rounded-xl border border-[#E8DDC6] bg-white px-4 py-3 text-sm font-black text-[#0B3C5D] shadow-sm transition hover:-translate-y-0.5"
                  >
                    {action.label}
                    <span className="mt-1 block text-xs font-bold text-gray-500">
                      {action.detail}
                    </span>
                  </Link>
                ) : (
                  <button
                    key={action.key}
                    type="button"
                    onClick={
                      action.key === "save"
                        ? saveRoaPlan
                        : action.key === "share"
                          ? copyRoaSummary
                          : sendToConciergeTeam
                    }
                    className="rounded-xl border border-[#E8DDC6] bg-white px-4 py-3 text-left text-sm font-black text-[#0B3C5D] shadow-sm transition hover:-translate-y-0.5"
                  >
                    {action.label}
                    <span className="mt-1 block text-xs font-bold text-gray-500">
                      {action.detail}
                    </span>
                  </button>
                ),
              )}
            </div>
          </div>
        ) : null}

        <div className="rounded-[1.75rem] bg-white p-5 shadow-xl shadow-[#071F2F]/8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                Roa matches
              </p>
              <h3 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                Best local fits.
              </h3>
            </div>
            <Link
              href="/map"
              className="rounded-xl bg-[#EEF7F6] px-3 py-2 text-xs font-black text-[#007B7B]"
            >
              Map
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {visibleSuggestions.length > 0 ? (
              visibleSuggestions.map((listing) => (
              <article
                key={listing.id}
                className="rounded-2xl border border-[#D6B56D]/25 bg-[#FFFDF7] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-[#00A8A8]">
                      {listing.location || listing.category || "Roatan"}
                    </p>
                    <h4 className="mt-1 font-black text-[#0B3C5D]">
                      {listing.title}
                    </h4>
                  </div>
                  <span className="rounded-full bg-[#071F2F] px-3 py-1 text-xs font-black text-white">
                    {moneyLabel(listing.price)}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {listing.reasons.join(" + ") || "Strong local fit"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="rounded-lg bg-[#0B3C5D] px-3 py-2 text-xs font-black text-white"
                  >
                    View
                  </Link>
                  <Link
                    href={`/book?listing=${listing.id}`}
                    className="rounded-lg bg-[#00A8A8] px-3 py-2 text-xs font-black text-white"
                  >
                    Request
                  </Link>
                </div>
              </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#D6B56D]/50 bg-[#FFFDF7] p-4 text-sm leading-6 text-gray-600">
                Ask Roa what kind of day you want. Polished local matches will
                appear here when there are guest-ready listings that fit.
              </div>
            )}
          </div>
        </div>
      </aside>
    </section>
  );
}
