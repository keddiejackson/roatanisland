"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import ExportCsvButton from "@/app/admin/ExportCsvButton";
import { isAdminUser } from "@/lib/admin";
import {
  conciergeLeadPriorities,
  conciergeAssignmentStatuses,
  conciergeFulfillmentSummary,
  conciergeLeadStatuses,
  conciergeLeadSummary,
  type ConciergeAssignmentStatus,
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

type ConciergeListingOption = {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  vendor_id: string | null;
};

type ConciergeVendorOption = {
  id: string;
  business_name: string;
  email: string | null;
  phone: string | null;
};

type ConciergeAssignment = {
  id: string;
  lead_id: string;
  listing_id: string | null;
  vendor_id: string | null;
  status: ConciergeAssignmentStatus;
  contact_method: string | null;
  vendor_note: string | null;
  guest_quote_cents: number | null;
  listing: ConciergeListingOption | null;
  vendor: ConciergeVendorOption | null;
  created_at: string;
  updated_at: string;
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
  assignments: ConciergeAssignment[];
};

type AssignmentDraft = {
  listingId: string;
  vendorId: string;
  status: ConciergeAssignmentStatus;
  contactMethod: string;
  vendorNote: string;
  guestQuoteDollars: string;
};

const emptyAssignmentDraft: AssignmentDraft = {
  listingId: "",
  vendorId: "",
  status: "recommended",
  contactMethod: "Email",
  vendorNote: "",
  guestQuoteDollars: "",
};

function formatDate(value: string | null) {
  if (!value) return "No date";
  return new Date(`${value}T12:00:00`).toLocaleDateString();
}

function leadPlanStops(plan: PlanPayload | null) {
  return Array.isArray(plan?.stops) ? plan.stops.slice(0, 6) : [];
}

function quoteToCents(value: string) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0
    ? Math.round(numberValue * 100)
    : null;
}

function centsToDollars(value: number | null) {
  return value === null ? "" : (value / 100).toFixed(2);
}

function formatQuote(value: number | null) {
  if (value === null) return "No quote";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value / 100);
}

export default function AdminConciergePage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [leads, setLeads] = useState<ConciergeLead[]>([]);
  const [listingOptions, setListingOptions] = useState<ConciergeListingOption[]>(
    [],
  );
  const [vendorOptions, setVendorOptions] = useState<ConciergeVendorOption[]>([]);
  const [assignmentDrafts, setAssignmentDrafts] = useState<
    Record<string, AssignmentDraft>
  >({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingAssignmentId, setSavingAssignmentId] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState("");

  const loadLeads = useCallback(async () => {
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
    setListingOptions(
      (result.options?.listings as ConciergeListingOption[] | undefined) || [],
    );
    setVendorOptions(
      (result.options?.vendors as ConciergeVendorOption[] | undefined) || [],
    );
    setMessage(result.setupMessage || "");
    setLoading(false);
  }, []);

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
    if (authorized) {
      async function run() {
        await loadLeads();
      }

      run();
    }
  }, [authorized, loadLeads]);

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
          ...lead.assignments.flatMap((assignment) => [
            assignment.status,
            assignment.vendor_note,
            assignment.listing?.title,
            assignment.vendor?.business_name,
          ]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(searchText);

      return matchesStatus && matchesPriority && matchesSearch;
    });
  }, [leads, priorityFilter, search, statusFilter]);

  const summary = useMemo(() => conciergeLeadSummary(leads), [leads]);
  const fulfillmentSummary = useMemo(
    () => conciergeFulfillmentSummary(leads.flatMap((lead) => lead.assignments)),
    [leads],
  );

  if (checkingAuth || !authorized) return null;

  function updateLocalLead(id: string, updates: Partial<ConciergeLead>) {
    setLeads((current) =>
      current.map((lead) => (lead.id === id ? { ...lead, ...updates } : lead)),
    );
  }

  function updateAssignmentDraft(
    leadId: string,
    updates: Partial<AssignmentDraft>,
  ) {
    setAssignmentDrafts((current) => ({
      ...current,
      [leadId]: {
        ...(current[leadId] || emptyAssignmentDraft),
        ...updates,
      },
    }));
  }

  function updateLocalAssignment(
    leadId: string,
    assignmentId: string,
    updates: Partial<ConciergeAssignment>,
  ) {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === leadId
          ? {
              ...lead,
              assignments: lead.assignments.map((assignment) =>
                assignment.id === assignmentId
                  ? { ...assignment, ...updates }
                  : assignment,
              ),
            }
          : lead,
      ),
    );
  }

  async function authorizedHeaders() {
    const { data: sessionData } = await supabase.auth.getSession();

    return {
      "Content-Type": "application/json",
      ...(sessionData.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : {}),
    };
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

  async function createAssignment(lead: ConciergeLead) {
    const draft = assignmentDrafts[lead.id] || emptyAssignmentDraft;

    setSavingAssignmentId(`new-${lead.id}`);
    setMessage("");

    const response = await fetch(
      `/api/admin/concierge-leads/${lead.id}/assignments`,
      {
        method: "POST",
        headers: await authorizedHeaders(),
        body: JSON.stringify({
          listingId: draft.listingId || undefined,
          vendorId: draft.vendorId || undefined,
          status: draft.status,
          contactMethod: draft.contactMethod,
          vendorNote: draft.vendorNote,
          guestQuoteCents: quoteToCents(draft.guestQuoteDollars),
        }),
      },
    );

    const result = await response.json();
    setSavingAssignmentId(null);

    if (!response.ok) {
      setMessage(result.error || "Unable to add this assignment.");
      return;
    }

    setAssignmentDrafts((current) => ({
      ...current,
      [lead.id]: emptyAssignmentDraft,
    }));
    await loadLeads();
    setMessage("Fulfillment assignment added.");
  }

  async function saveAssignment(assignment: ConciergeAssignment) {
    setSavingAssignmentId(assignment.id);
    setMessage("");

    const response = await fetch(`/api/admin/concierge-assignments/${assignment.id}`, {
      method: "PATCH",
      headers: await authorizedHeaders(),
      body: JSON.stringify({
        listingId: assignment.listing_id,
        vendorId: assignment.vendor_id,
        status: assignment.status,
        contactMethod: assignment.contact_method,
        vendorNote: assignment.vendor_note,
        guestQuoteCents: assignment.guest_quote_cents,
      }),
    });

    const result = await response.json();
    setSavingAssignmentId(null);

    if (!response.ok) {
      setMessage(result.error || "Unable to save this assignment.");
      return;
    }

    await loadLeads();
    setMessage("Fulfillment assignment saved.");
  }

  async function deleteAssignment(assignment: ConciergeAssignment) {
    setSavingAssignmentId(assignment.id);
    setMessage("");

    const response = await fetch(`/api/admin/concierge-assignments/${assignment.id}`, {
      method: "DELETE",
      headers: await authorizedHeaders(),
    });

    const result = await response.json();
    setSavingAssignmentId(null);

    if (!response.ok) {
      setMessage(result.error || "Unable to remove this assignment.");
      return;
    }

    await loadLeads();
    setMessage("Fulfillment assignment removed.");
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
            <div className="flex flex-wrap gap-2">
              <ExportCsvButton type="concierge_leads" />
              <ExportCsvButton type="concierge_assignments" />
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ["Total leads", summary.total],
              ["New", summary.newCount],
              ["Active", summary.activeCount],
              ["Booked", summary.bookedCount],
              ["Cruise", summary.cruiseCount],
              ["Airport", summary.airportCount],
              ["Vendor matches", fulfillmentSummary.total],
              ["Quoted", fulfillmentSummary.quotedCount],
              ["Confirmed", fulfillmentSummary.confirmedCount],
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
                const draft = assignmentDrafts[lead.id] || emptyAssignmentDraft;
                const leadFulfillment = conciergeFulfillmentSummary(
                  lead.assignments,
                );

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

                        <div className="mt-6 border-t border-white pt-5">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-bold text-[#0B3C5D]">
                              Vendor fulfillment
                            </p>
                            <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-[#0B3C5D]">
                              {leadFulfillment.confirmedCount} confirmed
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {[
                              ["Matches", leadFulfillment.total],
                              ["Contacted", leadFulfillment.contactedCount],
                              ["Quoted", leadFulfillment.quotedCount],
                            ].map(([label, value]) => (
                              <div
                                key={label}
                                className="rounded-xl bg-white p-3 text-center"
                              >
                                <p className="text-xs text-gray-500">{label}</p>
                                <p className="mt-1 text-lg font-black text-[#0B3C5D]">
                                  {value}
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="mt-4 grid gap-3 rounded-xl bg-white p-4">
                            <select
                              value={draft.listingId}
                              onChange={(event) => {
                                const listing = listingOptions.find(
                                  (option) => option.id === event.target.value,
                                );

                                updateAssignmentDraft(lead.id, {
                                  listingId: event.target.value,
                                  vendorId:
                                    listing?.vendor_id || draft.vendorId || "",
                                });
                              }}
                              className="min-h-11 rounded-xl border border-gray-200 px-3 outline-none"
                            >
                              <option value="">Choose listing</option>
                              {listingOptions.map((listing) => (
                                <option key={listing.id} value={listing.id}>
                                  {listing.title}
                                </option>
                              ))}
                            </select>
                            <select
                              value={draft.vendorId}
                              onChange={(event) =>
                                updateAssignmentDraft(lead.id, {
                                  vendorId: event.target.value,
                                })
                              }
                              className="min-h-11 rounded-xl border border-gray-200 px-3 outline-none"
                            >
                              <option value="">Choose vendor</option>
                              {vendorOptions.map((vendor) => (
                                <option key={vendor.id} value={vendor.id}>
                                  {vendor.business_name}
                                </option>
                              ))}
                            </select>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                              <select
                                value={draft.status}
                                onChange={(event) =>
                                  updateAssignmentDraft(lead.id, {
                                    status: event.target
                                      .value as ConciergeAssignmentStatus,
                                  })
                                }
                                className="min-h-11 rounded-xl border border-gray-200 px-3 outline-none"
                              >
                                {conciergeAssignmentStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              <select
                                value={draft.contactMethod}
                                onChange={(event) =>
                                  updateAssignmentDraft(lead.id, {
                                    contactMethod: event.target.value,
                                  })
                                }
                                className="min-h-11 rounded-xl border border-gray-200 px-3 outline-none"
                              >
                                {["Email", "Phone", "WhatsApp", "In person"].map(
                                  (method) => (
                                    <option key={method} value={method}>
                                      {method}
                                    </option>
                                  ),
                                )}
                              </select>
                            </div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={draft.guestQuoteDollars}
                              onChange={(event) =>
                                updateAssignmentDraft(lead.id, {
                                  guestQuoteDollars: event.target.value,
                                })
                              }
                              placeholder="Guest quote"
                              className="min-h-11 rounded-xl border border-gray-200 px-3 outline-none"
                            />
                            <textarea
                              value={draft.vendorNote}
                              onChange={(event) =>
                                updateAssignmentDraft(lead.id, {
                                  vendorNote: event.target.value,
                                })
                              }
                              rows={3}
                              placeholder="Vendor follow-up note..."
                              className="rounded-xl border border-gray-200 px-3 py-2 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => createAssignment(lead)}
                              disabled={savingAssignmentId === `new-${lead.id}`}
                              className="rounded-xl bg-[#0B3C5D] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
                            >
                              {savingAssignmentId === `new-${lead.id}`
                                ? "Adding..."
                                : "Add vendor match"}
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3">
                            {lead.assignments.length === 0 ? (
                              <p className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-5 text-center text-sm text-gray-600">
                                No vendors assigned yet.
                              </p>
                            ) : (
                              lead.assignments.map((assignment) => (
                                <div
                                  key={assignment.id}
                                  className="rounded-xl bg-white p-4"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                      <p className="font-black text-[#0B3C5D]">
                                        {assignment.listing?.title ||
                                          "Direct vendor"}
                                      </p>
                                      <p className="mt-1 text-sm text-gray-600">
                                        {assignment.vendor?.business_name ||
                                          "No vendor selected"}{" "}
                                        - {formatQuote(assignment.guest_quote_cents)}
                                      </p>
                                    </div>
                                    <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-black uppercase text-[#0B3C5D]">
                                      {assignment.status}
                                    </span>
                                  </div>

                                  <div className="mt-3 grid gap-2">
                                    <select
                                      value={assignment.status}
                                      onChange={(event) =>
                                        updateLocalAssignment(
                                          lead.id,
                                          assignment.id,
                                          {
                                            status: event.target
                                              .value as ConciergeAssignmentStatus,
                                          },
                                        )
                                      }
                                      className="min-h-10 rounded-lg border border-gray-200 px-3 outline-none"
                                    >
                                      {conciergeAssignmentStatuses.map(
                                        (status) => (
                                          <option key={status} value={status}>
                                            {status}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                    <select
                                      value={assignment.listing_id || ""}
                                      onChange={(event) => {
                                        const listing = listingOptions.find(
                                          (option) =>
                                            option.id === event.target.value,
                                        );

                                        updateLocalAssignment(
                                          lead.id,
                                          assignment.id,
                                          {
                                            listing_id:
                                              event.target.value || null,
                                            vendor_id:
                                              listing?.vendor_id ||
                                              assignment.vendor_id,
                                          },
                                        );
                                      }}
                                      className="min-h-10 rounded-lg border border-gray-200 px-3 outline-none"
                                    >
                                      <option value="">No listing</option>
                                      {listingOptions.map((listing) => (
                                        <option key={listing.id} value={listing.id}>
                                          {listing.title}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={assignment.vendor_id || ""}
                                      onChange={(event) =>
                                        updateLocalAssignment(
                                          lead.id,
                                          assignment.id,
                                          {
                                            vendor_id:
                                              event.target.value || null,
                                          },
                                        )
                                      }
                                      className="min-h-10 rounded-lg border border-gray-200 px-3 outline-none"
                                    >
                                      <option value="">No vendor</option>
                                      {vendorOptions.map((vendor) => (
                                        <option key={vendor.id} value={vendor.id}>
                                          {vendor.business_name}
                                        </option>
                                      ))}
                                    </select>
                                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                      <input
                                        value={assignment.contact_method || ""}
                                        onChange={(event) =>
                                          updateLocalAssignment(
                                            lead.id,
                                            assignment.id,
                                            {
                                              contact_method:
                                                event.target.value,
                                            },
                                          )
                                        }
                                        placeholder="Contact method"
                                        className="min-h-10 rounded-lg border border-gray-200 px-3 outline-none"
                                      />
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={centsToDollars(
                                          assignment.guest_quote_cents,
                                        )}
                                        onChange={(event) =>
                                          updateLocalAssignment(
                                            lead.id,
                                            assignment.id,
                                            {
                                              guest_quote_cents: quoteToCents(
                                                event.target.value,
                                              ),
                                            },
                                          )
                                        }
                                        placeholder="Quote"
                                        className="min-h-10 rounded-lg border border-gray-200 px-3 outline-none"
                                      />
                                    </div>
                                    <textarea
                                      value={assignment.vendor_note || ""}
                                      onChange={(event) =>
                                        updateLocalAssignment(
                                          lead.id,
                                          assignment.id,
                                          { vendor_note: event.target.value },
                                        )
                                      }
                                      rows={3}
                                      placeholder="Vendor notes..."
                                      className="rounded-lg border border-gray-200 px-3 py-2 outline-none"
                                    />
                                    <div className="grid gap-2 sm:grid-cols-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          saveAssignment(assignment)
                                        }
                                        disabled={
                                          savingAssignmentId === assignment.id
                                        }
                                        className="rounded-lg bg-[#00A8A8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                                      >
                                        {savingAssignmentId === assignment.id
                                          ? "Saving..."
                                          : "Save match"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          deleteAssignment(assignment)
                                        }
                                        disabled={
                                          savingAssignmentId === assignment.id
                                        }
                                        className="rounded-lg bg-[#F7F3EA] px-3 py-2 text-sm font-bold text-[#0B3C5D] disabled:opacity-50"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
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
