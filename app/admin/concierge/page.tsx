"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import ExportCsvButton from "@/app/admin/ExportCsvButton";
import { isAdminUser } from "@/lib/admin";
import {
  conciergeLeadPriorities,
  conciergeLeadStatuses,
  conciergeLeadSummary,
  type ConciergeLeadPriority,
  type ConciergeLeadStatus,
} from "@/lib/concierge-leads";
import { supabase } from "@/lib/supabase";

type PlanStop = {
  title?: string;
  timeBlock?: string;
  note?: string;
  listingId?: string;
};

type PlanPayload = {
  name?: string;
  notes?: string;
  stops?: PlanStop[];
};

type ConciergeLead = {
  id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  lead_type: string;
  status: ConciergeLeadStatus;
  priority: ConciergeLeadPriority;
  interest: string | null;
  message: string;
  travel_date: string | null;
  guests: number | null;
  pickup_area: string | null;
  arrival_type: string | null;
  trip_style: string | null;
  budget: string | null;
  plan: PlanPayload | null;
  admin_notes: string | null;
  follow_up_date: string | null;
  created_at: string;
  updated_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Date(`${value}T12:00:00`).toLocaleDateString();
}

function leadPlanStops(plan: PlanPayload | null) {
  return Array.isArray(plan?.stops) ? plan.stops.slice(0, 6) : [];
}

export default function AdminConciergePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [leads, setLeads] = useState<ConciergeLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function verifyAdminSession() {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user || !(await isAdminUser(data.user.email))) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      setAuthorized(true);
      setCheckingAuth(false);
    }

    verifyAdminSession();
  }, [router]);

  useEffect(() => {
    async function fetchLeads() {
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch("/api/admin/concierge-leads", {
        headers: {
          ...(sessionData.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
      });

      if (!response.ok) {
        const result = await response.json();
        setMessage(
          result.error?.includes("concierge_leads")
            ? "Run supabase/concierge-leads.sql in Supabase, then refresh this page."
            : result.error || "Unable to load concierge leads.",
        );
        setLoading(false);
        return;
      }

      const result = await response.json();
      setLeads((result.leads as ConciergeLead[]) || []);
      setLoading(false);
    }

    if (authorized) {
      fetchLeads();
    }
  }, [authorized]);

  const filteredLeads = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === "All" || lead.status === statusFilter;
      const matchesPriority =
        priorityFilter === "All" || lead.priority === priorityFilter;
      const matchesSearch =
        !searchText ||
        [
          lead.guest_name,
          lead.guest_email,
          lead.guest_phone,
          lead.pickup_area,
          lead.arrival_type,
          lead.trip_style,
          lead.message,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(searchText);

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [leads, priorityFilter, search, statusFilter]);

  const summary = useMemo(() => conciergeLeadSummary(leads), [leads]);

  if (checkingAuth || !authorized) return null;

  function updateLocalLead(id: string, updates: Partial<ConciergeLead>) {
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead)),
    );
  }

  async function saveLead(lead: ConciergeLead) {
    setSavingId(lead.id);
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/concierge-leads/${lead.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        status: lead.status,
        priority: lead.priority,
        adminNotes: lead.admin_notes,
        followUpDate: lead.follow_up_date,
      }),
    });

    const result = await response.json();
    setSavingId(null);

    if (!response.ok) {
      setMessage(result.error || "Unable to save this lead.");
      return;
    }

    updateLocalLead(lead.id, result.lead as ConciergeLead);
    setMessage("Concierge lead saved.");
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <section className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.14em] text-[#00A8A8]">
                Lead pipeline
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
                Concierge Inbox
              </h1>
              <p className="mt-2 max-w-2xl text-gray-600">
                Follow up with guests who ask for help building a Roatan day.
              </p>
            </div>
            <ExportCsvButton type="concierge_leads" />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ["Total leads", summary.total],
              ["New", summary.newCount],
              ["Active", summary.activeCount],
              ["Booked", summary.bookedCount],
              ["Cruise", summary.cruiseCount],
              ["Airport", summary.airportCount],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#F7F3EA] p-5">
                <p className="text-sm text-gray-600">{label}</p>
                <p className="mt-2 text-3xl font-black text-[#0B3C5D]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-3 rounded-2xl bg-[#F7F3EA] p-4 lg:grid-cols-[1fr_200px_200px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guest, pickup area, notes..."
              className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none"
            >
              <option value="All">All statuses</option>
              {conciergeLeadStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none"
            >
              <option value="All">All priorities</option>
              {conciergeLeadPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </div>

          {message ? (
            <p className="mt-4 rounded-xl bg-[#FFF8E8] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
              {message}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-8 text-gray-600">Loading concierge leads...</p>
          ) : filteredLeads.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-600">
              No concierge leads found.
            </p>
          ) : (
            <div className="mt-6 grid gap-5">
              {filteredLeads.map((lead) => {
                const stops = leadPlanStops(lead.plan);

                return (
                  <article
                    key={lead.id}
                    className="rounded-2xl border border-gray-200 p-5"
                  >
                    <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#0B3C5D] px-3 py-1 text-xs font-black uppercase text-white">
                            {lead.status}
                          </span>
                          <span className="rounded-full bg-[#FFF8E8] px-3 py-1 text-xs font-black uppercase text-[#9C7A2F]">
                            {lead.priority}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(lead.created_at).toLocaleString()}
                          </span>
                        </div>
                        <h2 className="mt-3 text-2xl font-black text-[#0B3C5D]">
                          {lead.guest_name}
                        </h2>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold text-[#0B3C5D]">
                          <a href={`mailto:${lead.guest_email}`}>
                            {lead.guest_email}
                          </a>
                          {lead.guest_phone ? (
                            <a href={`tel:${lead.guest_phone}`}>
                              {lead.guest_phone}
                            </a>
                          ) : null}
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-3">
                          {[
                            ["Travel date", formatDate(lead.travel_date)],
                            [
                              "Guests",
                              lead.guests ? String(lead.guests) : "Not set",
                            ],
                            ["Pickup", lead.pickup_area || "Not set"],
                            ["Arrival", lead.arrival_type || "Not set"],
                            ["Style", lead.trip_style || "Not set"],
                            ["Budget", lead.budget || "Not set"],
                          ].map(([label, value]) => (
                            <div
                              key={label}
                              className="rounded-xl bg-[#F7F3EA] p-4"
                            >
                              <p className="text-xs font-bold uppercase tracking-[0.12em] text-gray-500">
                                {label}
                              </p>
                              <p className="mt-1 font-bold text-[#0B3C5D]">
                                {value}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-5 rounded-xl bg-[#EEF7F6] p-4">
                          <p className="text-sm font-bold text-[#0B3C5D]">
                            Guest message
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-700">
                            {lead.message}
                          </p>
                        </div>

                        {stops.length > 0 ? (
                          <div className="mt-5 rounded-xl border border-[#D6B56D]/30 bg-[#FFF8E8] p-4">
                            <p className="text-sm font-bold text-[#0B3C5D]">
                              {lead.plan?.name || "Requested plan"}
                            </p>
                            <div className="mt-3 grid gap-2">
                              {stops.map((stop, index) => (
                                <div
                                  key={`${stop.listingId || stop.title}-${index}`}
                                  className="rounded-lg bg-white px-3 py-2 text-sm"
                                >
                                  <span className="font-bold text-[#0B3C5D]">
                                    {stop.timeBlock || `Stop ${index + 1}`}:
                                  </span>{" "}
                                  {stop.title || "Unnamed stop"}
                                </div>
                              ))}
                            </div>
                            {lead.plan?.notes ? (
                              <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm text-gray-700">
                                {lead.plan.notes}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-2xl bg-[#F7F3EA] p-5">
                        <p className="font-bold text-[#0B3C5D]">
                          Work this lead
                        </p>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                          <label className="grid gap-2 text-sm font-semibold text-[#0B3C5D]">
                            Status
                            <select
                              value={lead.status}
                              onChange={(event) =>
                                updateLocalLead(lead.id, {
                                  status: event.target
                                    .value as ConciergeLeadStatus,
                                })
                              }
                              className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none"
                            >
                              {conciergeLeadStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-2 text-sm font-semibold text-[#0B3C5D]">
                            Priority
                            <select
                              value={lead.priority}
                              onChange={(event) =>
                                updateLocalLead(lead.id, {
                                  priority: event.target
                                    .value as ConciergeLeadPriority,
                                })
                              }
                              className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none"
                            >
                              {conciergeLeadPriorities.map((priority) => (
                                <option key={priority} value={priority}>
                                  {priority}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-2 text-sm font-semibold text-[#0B3C5D]">
                            Follow-up date
                            <input
                              type="date"
                              value={lead.follow_up_date || ""}
                              onChange={(event) =>
                                updateLocalLead(lead.id, {
                                  follow_up_date: event.target.value,
                                })
                              }
                              className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none"
                            />
                          </label>
                        </div>

                        <label className="mt-4 grid gap-2 text-sm font-semibold text-[#0B3C5D]">
                          Admin notes
                          <textarea
                            value={lead.admin_notes || ""}
                            onChange={(event) =>
                              updateLocalLead(lead.id, {
                                admin_notes: event.target.value,
                              })
                            }
                            rows={6}
                            className="rounded-xl border border-gray-200 px-4 py-3 outline-none"
                            placeholder="Quote sent, WhatsApp details, vendor follow-up..."
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => saveLead(lead)}
                          disabled={savingId === lead.id}
                          className="mt-4 w-full rounded-xl bg-[#00A8A8] px-5 py-3 font-bold text-white disabled:opacity-50"
                        >
                          {savingId === lead.id ? "Saving..." : "Save lead"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
