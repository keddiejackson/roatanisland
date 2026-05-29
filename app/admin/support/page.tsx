"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import ExportCsvButton from "@/app/admin/ExportCsvButton";
import { isAdminUser } from "@/lib/admin";
import {
  buildSupportTicketUpdate,
  getSupportTicketAdminDigest,
  supportTicketPriorities,
  supportTicketStatuses,
  type SupportTicketPriority,
  type SupportTicketStatus,
} from "@/lib/support-tickets";
import { supabase } from "@/lib/supabase";

type SupportTicketRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  intent: string;
  booking_reference: string | null;
  message: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  admin_notes: string | null;
  source_path: string | null;
  created_at: string;
  updated_at: string;
};

type TicketDraft = {
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  admin_notes: string;
};

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

function statusClass(status: string) {
  if (status === "resolved") return "bg-green-100 text-green-800";
  if (status === "waiting_on_guest") return "bg-[#FFF3D2] text-[#7A5A00]";
  if (status === "in_progress") return "bg-[#EEF7F6] text-[#007B7B]";
  return "bg-[#E8F4FF] text-[#0B3C5D]";
}

function priorityClass(priority: string) {
  if (priority === "urgent") return "bg-red-100 text-red-700";
  if (priority === "low") return "bg-gray-100 text-gray-600";
  return "bg-[#FFF3D2] text-[#7A5A00]";
}

function draftForTicket(ticket: SupportTicketRow): TicketDraft {
  return {
    status: ticket.status,
    priority: ticket.priority,
    admin_notes: ticket.admin_notes || "",
  };
}

export default function AdminSupportPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [ticketDrafts, setTicketDrafts] = useState<Record<string, TicketDraft>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [savingTicketId, setSavingTicketId] = useState("");
  const [filter, setFilter] = useState("open");
  const [setupMessage, setSetupMessage] = useState("");

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
    async function fetchTickets() {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(
          "id, name, email, phone, intent, booking_reference, message, status, priority, admin_notes, source_path, created_at, updated_at",
        )
        .order("created_at", { ascending: false })
        .limit(150);

      if (error) {
        setSetupMessage(
          "Run the support ticket SQL setup to enable the admin support queue.",
        );
        setLoading(false);
        return;
      }

      const rows = (data as SupportTicketRow[]) || [];
      setTickets(rows);
      setTicketDrafts(
        Object.fromEntries(rows.map((ticket) => [ticket.id, draftForTicket(ticket)])),
      );
      setLoading(false);
    }

    if (authorized) {
      fetchTickets();
    }
  }, [authorized]);

  const digest = useMemo(
    () => getSupportTicketAdminDigest({ tickets }),
    [tickets],
  );

  const filteredTickets = useMemo(
    () =>
      tickets.filter((ticket) => {
        if (filter === "all") return true;
        if (filter === "urgent") return ticket.priority === "urgent";
        if (filter === "resolved") return ticket.status === "resolved";
        return ticket.status !== "resolved";
      }),
    [filter, tickets],
  );

  if (checkingAuth || !authorized) {
    return null;
  }

  function updateDraft(ticketId: string, values: Partial<TicketDraft>) {
    setTicketDrafts((current) => ({
      ...current,
      [ticketId]: {
        ...(current[ticketId] || {
          status: "new",
          priority: "normal",
          admin_notes: "",
        }),
        ...values,
      },
    }));
  }

  async function saveTicket(ticket: SupportTicketRow) {
    const draft = ticketDrafts[ticket.id] || draftForTicket(ticket);
    setSavingTicketId(ticket.id);

    const update = buildSupportTicketUpdate(draft);
    const { data, error } = await supabase
      .from("support_tickets")
      .update(update)
      .eq("id", ticket.id)
      .select(
        "id, name, email, phone, intent, booking_reference, message, status, priority, admin_notes, source_path, created_at, updated_at",
      )
      .single();

    setSavingTicketId("");

    if (error) {
      alert(`Unable to update ticket: ${error.message}`);
      return;
    }

    const updatedTicket = data as SupportTicketRow;
    setTickets((current) =>
      current.map((currentTicket) =>
        currentTicket.id === updatedTicket.id ? updatedTicket : currentTicket,
      ),
    );
    setTicketDrafts((current) => ({
      ...current,
      [updatedTicket.id]: draftForTicket(updatedTicket),
    }));
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <section className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                Support Ticket System
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
                Guest support queue
              </h1>
              <p className="mt-2 max-w-2xl text-gray-600">
                Review support requests from the public support center, track
                urgent issues, and keep internal notes in one place.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ExportCsvButton type="support_tickets" />
              <Link
                href="/support"
                className="rounded-xl border border-[#00A8A8] px-4 py-3 text-sm font-black text-[#007B7B]"
              >
                Public support page
              </Link>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-black text-[#0B3C5D] outline-none"
              >
                <option value="open">Open tickets</option>
                <option value="urgent">Urgent</option>
                <option value="resolved">Resolved</option>
                <option value="all">All tickets</option>
              </select>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-4">
            {[
              ["Queue", digest.headline],
              ["Urgent", String(digest.urgentCount)],
              ["Waiting", String(digest.waitingOnGuestCount)],
              ["Resolved", String(digest.resolvedCount)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#F7F3EA] p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
                  {label}
                </p>
                <p className="mt-2 text-xl font-black text-[#0B3C5D]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {setupMessage ? (
            <div className="mt-6 rounded-xl bg-yellow-100 p-4 text-sm font-bold text-yellow-900">
              {setupMessage}
            </div>
          ) : null}

          {loading ? (
            <p className="mt-8 text-gray-600">Loading support tickets...</p>
          ) : filteredTickets.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-[#00A8A8]/40 bg-[#F7F3EA] p-6 text-center text-gray-600">
              No support tickets in this view.
            </div>
          ) : (
            <div className="mt-8 grid gap-5">
              {filteredTickets.map((ticket) => {
                const draft = ticketDrafts[ticket.id] || draftForTicket(ticket);

                return (
                  <article
                    key={ticket.id}
                    className="rounded-2xl border border-gray-200 p-5 shadow-sm"
                  >
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black capitalize ${priorityClass(
                              ticket.priority,
                            )}`}
                          >
                            {ticket.priority}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black capitalize ${statusClass(
                              ticket.status,
                            )}`}
                          >
                            {statusLabel(ticket.status)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {new Date(ticket.created_at).toLocaleString()}
                          </span>
                        </div>
                        <h2 className="mt-3 text-xl font-black text-[#0B3C5D]">
                          {ticket.intent}
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-gray-600">
                          {ticket.name} - {ticket.email}
                          {ticket.phone ? ` - ${ticket.phone}` : ""}
                        </p>
                        {ticket.booking_reference ? (
                          <p className="mt-2 text-sm font-black text-[#007B7B]">
                            Booking reference: {ticket.booking_reference}
                          </p>
                        ) : null}
                      </div>
                      <a
                        href={`mailto:${ticket.email}?subject=RoatanIsland.life support ticket ${ticket.id.slice(
                          0,
                          8,
                        )}`}
                        className="rounded-xl bg-[#00A8A8] px-4 py-3 text-center text-sm font-black text-white"
                      >
                        Email guest
                      </a>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap rounded-xl bg-[#F7F3EA] p-4 text-sm leading-6 text-gray-700">
                      {ticket.message}
                    </p>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[0.8fr_0.8fr_1.4fr_auto] lg:items-end">
                      <label className="grid gap-2 text-sm font-black text-[#0B3C5D]">
                        Status
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            updateDraft(ticket.id, {
                              status: event.target.value as SupportTicketStatus,
                            })
                          }
                          className="rounded-xl border border-gray-300 px-4 py-3 font-semibold outline-none"
                        >
                          {supportTicketStatuses.map((status) => (
                            <option key={status} value={status}>
                              {statusLabel(status)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-black text-[#0B3C5D]">
                        Priority
                        <select
                          value={draft.priority}
                          onChange={(event) =>
                            updateDraft(ticket.id, {
                              priority: event.target.value as SupportTicketPriority,
                            })
                          }
                          className="rounded-xl border border-gray-300 px-4 py-3 font-semibold outline-none"
                        >
                          {supportTicketPriorities.map((priority) => (
                            <option key={priority} value={priority}>
                              {priority}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-2 text-sm font-black text-[#0B3C5D]">
                        Admin notes
                        <textarea
                          value={draft.admin_notes}
                          onChange={(event) =>
                            updateDraft(ticket.id, {
                              admin_notes: event.target.value,
                            })
                          }
                          rows={2}
                          className="rounded-xl border border-gray-300 px-4 py-3 font-normal outline-none"
                          placeholder="Next step, refund note, pickup issue..."
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => saveTicket(ticket)}
                        disabled={savingTicketId === ticket.id}
                        className="rounded-xl bg-[#071F2F] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
                      >
                        {savingTicketId === ticket.id ? "Saving..." : "Save"}
                      </button>
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
