"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import {
  communityCategories,
  communityStatuses,
  type CommunityAuthorRole,
  type CommunityCategory,
  type CommunityStatus,
} from "@/lib/community-forum";
import { supabase } from "@/lib/supabase";

type CommunityReplyAdminRow = {
  id: string;
  thread_id: string;
  body: string;
  display_name: string;
  author_role: CommunityAuthorRole;
  is_verified_local: boolean;
  is_verified_operator: boolean;
  is_best_answer: boolean;
  is_concierge_pick: boolean;
  helpful_count: number;
  status: CommunityStatus;
  created_at: string;
};

type CommunityThreadAdminRow = {
  id: string;
  category: CommunityCategory;
  title: string;
  body: string;
  display_name: string;
  anonymous: boolean;
  author_role: CommunityAuthorRole;
  is_verified_local: boolean;
  is_verified_operator: boolean;
  status: CommunityStatus;
  trip_date: string | null;
  area: string | null;
  group_size: number | null;
  arrival_type: string | null;
  arrival_time: string | null;
  budget: string | null;
  related_listing_title: string | null;
  map_area: string | null;
  roa_summary: string | null;
  is_pinned: boolean;
  is_featured: boolean;
  best_reply_id: string | null;
  concierge_pick_reply_id: string | null;
  helpful_count: number;
  reply_count: number;
  created_at: string;
  last_reply_at: string;
  community_replies?: CommunityReplyAdminRow[];
};

function statusClass(status: CommunityStatus) {
  if (status === "removed") return "bg-red-100 text-red-700";
  if (status === "hidden") return "bg-[#FFF3D2] text-[#7A5A00]";
  return "bg-[#E6FAF8] text-[#007B7B]";
}

function roleLabel(role: string) {
  return role.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function threadContext(thread: CommunityThreadAdminRow) {
  return [
    thread.arrival_type,
    thread.area || thread.map_area,
    thread.trip_date,
    thread.group_size ? `${thread.group_size} guests` : "",
    thread.budget,
  ].filter(Boolean);
}

export default function AdminCommunityPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [threads, setThreads] = useState<CommunityThreadAdminRow[]>([]);
  const [roaDrafts, setRoaDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [setupMessage, setSetupMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState<CommunityStatus | "all">(
    "active",
  );
  const [categoryFilter, setCategoryFilter] = useState<
    CommunityCategory | "all"
  >("all");
  const [search, setSearch] = useState("");

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
    async function fetchThreads() {
      const { data, error } = await supabase
        .from("community_threads")
        .select(
          `
          id, category, title, body, display_name, anonymous, author_role,
          is_verified_local, is_verified_operator, status, trip_date, area,
          group_size, arrival_type, arrival_time, budget, related_listing_title,
          map_area, roa_summary, is_pinned, is_featured, best_reply_id,
          concierge_pick_reply_id, helpful_count, reply_count, created_at,
          last_reply_at,
          community_replies (
            id, thread_id, body, display_name, author_role, is_verified_local,
            is_verified_operator, is_best_answer, is_concierge_pick,
            helpful_count, status, created_at
          )
        `,
        )
        .order("is_pinned", { ascending: false })
        .order("last_reply_at", { ascending: false })
        .limit(120);

      setLoading(false);

      if (error) {
        setSetupMessage(
          "Run the Roatan Circle SQL setup to enable community moderation.",
        );
        return;
      }

      const rows = (data || []) as unknown as CommunityThreadAdminRow[];
      setThreads(rows);
      setRoaDrafts(
        Object.fromEntries(
          rows.map((thread) => [thread.id, thread.roa_summary || ""]),
        ),
      );
    }

    if (authorized) {
      fetchThreads();
    }
  }, [authorized]);

  const digest = useMemo(() => {
    const activeThreads = threads.filter((thread) => thread.status === "active");

    return {
      active: activeThreads.length,
      unanswered: activeThreads.filter((thread) => !thread.reply_count).length,
      featured: activeThreads.filter((thread) => thread.is_featured).length,
      pinned: activeThreads.filter((thread) => thread.is_pinned).length,
    };
  }, [threads]);

  const filteredThreads = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return threads.filter((thread) => {
      if (statusFilter !== "all" && thread.status !== statusFilter) {
        return false;
      }

      if (categoryFilter !== "all" && thread.category !== categoryFilter) {
        return false;
      }

      if (!cleanSearch) return true;

      return [thread.title, thread.body, thread.display_name, thread.area]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(cleanSearch));
    });
  }, [categoryFilter, search, statusFilter, threads]);

  if (checkingAuth || !authorized) {
    return null;
  }

  function mergeThread(
    threadId: string,
    values: Partial<CommunityThreadAdminRow>,
  ) {
    setThreads((current) =>
      current.map((thread) =>
        thread.id === threadId ? { ...thread, ...values } : thread,
      ),
    );
  }

  function mergeReply(
    threadId: string,
    replyId: string,
    values: Partial<CommunityReplyAdminRow>,
  ) {
    setThreads((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              community_replies: (thread.community_replies || []).map((reply) =>
                reply.id === replyId ? { ...reply, ...values } : reply,
              ),
            }
          : thread,
      ),
    );
  }

  async function tokenForRequest() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function patchThread(
    thread: CommunityThreadAdminRow,
    body: Record<string, unknown>,
    optimistic: Partial<CommunityThreadAdminRow>,
  ) {
    const token = await tokenForRequest();
    setSavingId(thread.id);

    const response = await fetch(`/api/admin/community/threads/${thread.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { error?: string };
    setSavingId("");

    if (!response.ok || result.error) {
      alert(result.error || "Unable to update Circle thread.");
      return;
    }

    mergeThread(thread.id, optimistic);
  }

  async function patchReply(
    thread: CommunityThreadAdminRow,
    reply: CommunityReplyAdminRow,
    body: Record<string, unknown>,
    optimistic: Partial<CommunityReplyAdminRow>,
  ) {
    const token = await tokenForRequest();
    setSavingId(reply.id);

    const response = await fetch(`/api/admin/community/replies/${reply.id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { error?: string };
    setSavingId("");

    if (!response.ok || result.error) {
      alert(result.error || "Unable to update Circle reply.");
      return;
    }

    mergeReply(thread.id, reply.id, optimistic);
  }

  function markReply(
    thread: CommunityThreadAdminRow,
    reply: CommunityReplyAdminRow,
    kind: "best" | "concierge",
  ) {
    const replyField =
      kind === "best" ? "best_reply_id" : "concierge_pick_reply_id";
    const replyFlag =
      kind === "best" ? "is_best_answer" : "is_concierge_pick";
    const body =
      kind === "best"
        ? { bestReplyId: reply.id }
        : { conciergePickReplyId: reply.id };

    patchThread(thread, body, {
      [replyField]: reply.id,
      community_replies: (thread.community_replies || []).map((currentReply) => ({
        ...currentReply,
        [replyFlag]: currentReply.id === reply.id,
        ...(kind === "concierge" && currentReply.id === reply.id
          ? { author_role: "concierge" as CommunityAuthorRole, is_verified_local: true }
          : {}),
      })),
    });
  }

  return (
    <main className="brand-workspace min-h-screen px-4 py-6 text-[#1F2937] sm:px-6 sm:py-12">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <section className="brand-auth-card p-5 shadow sm:p-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                The Roatan Circle
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
                Community moderation
              </h1>
              <p className="mt-2 max-w-2xl text-gray-600">
                Feature strong questions, mark trusted answers, hide weak
                posts, and keep Roa summaries useful for travelers.
              </p>
            </div>
            <Link
              href="/community"
              className="rounded-xl bg-[#071F2F] px-4 py-3 text-center text-sm font-black text-white"
            >
              View public Circle
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            {[
              ["Active", digest.active],
              ["Unanswered", digest.unanswered],
              ["Featured", digest.featured],
              ["Pinned", digest.pinned],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#EEF7F6] p-4">
                <p className="text-2xl font-black text-[#0B3C5D]">{value}</p>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-3xl bg-white p-5 shadow ring-1 ring-[#071F2F]/5">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_220px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search questions, names, or areas"
              className="min-h-12 rounded-2xl border border-[#071F2F]/10 px-4 text-sm font-bold outline-none"
            />
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as CommunityStatus | "all")
              }
              className="min-h-12 rounded-2xl border border-[#071F2F]/10 px-4 text-sm font-bold outline-none"
            >
              <option value="all">All statuses</option>
              {communityStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(event.target.value as CommunityCategory | "all")
              }
              className="min-h-12 rounded-2xl border border-[#071F2F]/10 px-4 text-sm font-bold outline-none"
            >
              <option value="all">All categories</option>
              {communityCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {setupMessage ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
              {setupMessage}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-6 rounded-2xl bg-[#EEF7F6] p-5 text-sm font-bold text-[#0B3C5D]">
              Loading Circle threads...
            </p>
          ) : null}

          <div className="mt-6 grid gap-4">
            {filteredThreads.map((thread) => (
              <article
                key={thread.id}
                className="rounded-3xl border border-[#071F2F]/10 bg-[#FDFBF6] p-4 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#071F2F] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-white">
                        {thread.category}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusClass(
                          thread.status,
                        )}`}
                      >
                        {thread.status}
                      </span>
                      {thread.is_pinned ? (
                        <span className="rounded-full bg-[#D6B56D] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#071F2F]">
                          Pinned
                        </span>
                      ) : null}
                      {thread.is_featured ? (
                        <span className="rounded-full bg-[#E6FAF8] px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#007B7B]">
                          Featured
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-2xl font-black text-[#071F2F]">
                      {thread.title}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-gray-600">
                      {thread.display_name} / {roleLabel(thread.author_role)} /
                      {" "}
                      {formatDate(thread.created_at)}
                    </p>
                    <p className="mt-3 max-w-4xl text-sm leading-6 text-gray-700">
                      {thread.body}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {threadContext(thread).map((label) => (
                        <span
                          key={label}
                          className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0B3C5D]"
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid min-w-48 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        patchThread(
                          thread,
                          { isPinned: !thread.is_pinned },
                          { is_pinned: !thread.is_pinned },
                        )
                      }
                      className="rounded-xl bg-[#071F2F] px-4 py-3 text-sm font-black text-white"
                      disabled={savingId === thread.id}
                    >
                      {thread.is_pinned ? "Unpin" : "Pin thread"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        patchThread(
                          thread,
                          { isFeatured: !thread.is_featured },
                          { is_featured: !thread.is_featured },
                        )
                      }
                      className="rounded-xl bg-[#00A8A8] px-4 py-3 text-sm font-black text-white"
                      disabled={savingId === thread.id}
                    >
                      {thread.is_featured ? "Unfeature" : "Feature"}
                    </button>
                    <select
                      value={thread.status}
                      onChange={(event) =>
                        patchThread(
                          thread,
                          { status: event.target.value },
                          { status: event.target.value as CommunityStatus },
                        )
                      }
                      className="min-h-11 rounded-xl border border-[#071F2F]/10 px-3 text-sm font-bold"
                      disabled={savingId === thread.id}
                    >
                      {communityStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]">
                  <textarea
                    value={roaDrafts[thread.id] || ""}
                    onChange={(event) =>
                      setRoaDrafts((current) => ({
                        ...current,
                        [thread.id]: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Roa summary for travelers..."
                    className="rounded-2xl border border-[#071F2F]/10 px-4 py-3 text-sm font-semibold leading-6 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      patchThread(
                        thread,
                        { roaSummary: roaDrafts[thread.id] || "" },
                        { roa_summary: roaDrafts[thread.id] || null },
                      )
                    }
                    className="rounded-2xl bg-[#D6B56D] px-5 py-3 text-sm font-black text-[#071F2F]"
                    disabled={savingId === thread.id}
                  >
                    Save Roa note
                  </button>
                </div>

                <div className="mt-5 grid gap-3">
                  {(thread.community_replies || []).length === 0 ? (
                    <p className="rounded-2xl border border-dashed border-[#071F2F]/15 p-4 text-sm font-bold text-gray-500">
                      No replies yet.
                    </p>
                  ) : (
                    (thread.community_replies || []).map((reply) => (
                      <div
                        key={reply.id}
                        className="rounded-2xl bg-white p-4 ring-1 ring-[#071F2F]/6"
                      >
                        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-black text-[#071F2F]">
                                {reply.display_name}
                              </p>
                              <span className="rounded-full bg-[#EEF7F6] px-2 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-[#007B7B]">
                                {roleLabel(reply.author_role)}
                              </span>
                              {reply.is_best_answer ? (
                                <span className="rounded-full bg-[#D6B56D] px-2 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-[#071F2F]">
                                  Best answer
                                </span>
                              ) : null}
                              {reply.is_concierge_pick ? (
                                <span className="rounded-full bg-[#071F2F] px-2 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-white">
                                  Concierge pick
                                </span>
                              ) : null}
                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-[0.1em] ${statusClass(
                                  reply.status,
                                )}`}
                              >
                                {reply.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-gray-700">
                              {reply.body}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 lg:justify-end">
                            <button
                              type="button"
                              onClick={() => markReply(thread, reply, "best")}
                              className="rounded-xl border border-[#D6B56D] px-3 py-2 text-xs font-black text-[#7A5A00]"
                              disabled={savingId === thread.id}
                            >
                              Best
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                markReply(thread, reply, "concierge")
                              }
                              className="rounded-xl border border-[#00A8A8] px-3 py-2 text-xs font-black text-[#007B7B]"
                              disabled={savingId === thread.id}
                            >
                              Concierge
                            </button>
                            <select
                              value={reply.status}
                              onChange={(event) =>
                                patchReply(
                                  thread,
                                  reply,
                                  { status: event.target.value },
                                  {
                                    status:
                                      event.target.value as CommunityStatus,
                                  },
                                )
                              }
                              className="min-h-9 rounded-xl border border-[#071F2F]/10 px-2 text-xs font-bold"
                              disabled={savingId === reply.id}
                            >
                              {communityStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </article>
            ))}

            {!loading && filteredThreads.length === 0 ? (
              <p className="rounded-3xl bg-[#EEF7F6] p-8 text-center text-sm font-bold text-[#0B3C5D]">
                No Circle threads match those filters yet.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
