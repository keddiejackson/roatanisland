"use client";

import {
  communityVerificationBadge,
  normalizeCommunityVerificationRequestStatus,
  normalizeCommunityVerificationType,
  verificationStatusLabel,
  type CommunityVerificationRequestStatus,
  type CommunityVerificationType,
} from "@/lib/community-verification";
import { supabase } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

type VerificationMessage = {
  id: string;
  requestId: string;
  senderEmail: string;
  senderRole: "admin" | "traveler";
  body: string;
  createdAt: string;
};

type VerificationRequest = {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  requestedType: CommunityVerificationType;
  approvedType: CommunityVerificationType;
  status: CommunityVerificationRequestStatus;
  socialLinks: string[];
  notes: string;
  adminNote: string;
  reviewedBy: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages: VerificationMessage[];
};

type VerifiedAccount = {
  userId: string;
  email: string;
  displayName: string;
  profileImageUrl: string | null;
  verificationType: CommunityVerificationType;
  verifiedAt: string | null;
  verifiedBy: string;
};

function badgeClass(type: CommunityVerificationType) {
  return communityVerificationBadge(type).className;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusClass(status: CommunityVerificationRequestStatus) {
  if (status === "approved") return "bg-green-100 text-green-700";
  if (status === "denied") return "bg-red-100 text-red-700";
  if (status === "needs_info") return "bg-yellow-100 text-yellow-800";
  return "bg-orange-100 text-orange-700";
}

export default function CommunityVerificationDesk() {
  const [requests, setRequests] = useState<VerificationRequest[]>([]);
  const [verifiedAccounts, setVerifiedAccounts] = useState<VerifiedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupMessage, setSetupMessage] = useState("");
  const [savingId, setSavingId] = useState("");
  const [approvedTypes, setApprovedTypes] = useState<
    Record<string, CommunityVerificationType>
  >({});
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [messageDrafts, setMessageDrafts] = useState<Record<string, string>>({});

  async function tokenForRequest() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || "";
  }

  async function fetchVerificationDesk() {
    const token = await tokenForRequest();
    const response = await fetch("/api/admin/community/verification", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = (await response.json()) as {
      requests?: VerificationRequest[];
      verifiedAccounts?: VerifiedAccount[];
      setupRequired?: boolean;
      error?: string;
    };

    setLoading(false);

    if (!response.ok || result.setupRequired) {
      setSetupMessage(
        result.error ||
          "Run the community verification SQL to enable verification requests.",
      );
      return;
    }

    const nextRequests = result.requests || [];
    setRequests(nextRequests);
    setVerifiedAccounts(result.verifiedAccounts || []);
    setApprovedTypes(
      Object.fromEntries(
        nextRequests.map((request) => [
          request.id,
          request.approvedType !== "unverified"
            ? request.approvedType
            : request.requestedType,
        ]),
      ),
    );
    setAdminNotes(
      Object.fromEntries(
        nextRequests.map((request) => [request.id, request.adminNote || ""]),
      ),
    );
  }

  useEffect(() => {
    fetchVerificationDesk();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pendingRequests = useMemo(
    () => requests.filter((request) => request.status !== "approved"),
    [requests],
  );
  const approvedRequests = useMemo(
    () => requests.filter((request) => request.status === "approved"),
    [requests],
  );

  async function updateRequest(
    request: VerificationRequest,
    status: CommunityVerificationRequestStatus,
  ) {
    const token = await tokenForRequest();
    const approvedType = approvedTypes[request.id] || request.requestedType;
    setSavingId(request.id);

    const response = await fetch(
      `/api/admin/community/verification/${request.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
          approvedType,
          adminNote: adminNotes[request.id] || "",
        }),
      },
    );
    const result = (await response.json()) as {
      request?: VerificationRequest;
      error?: string;
    };
    setSavingId("");

    if (!response.ok || result.error || !result.request) {
      alert(result.error || "Unable to update verification request.");
      return;
    }

    await fetchVerificationDesk();
  }

  async function sendMessage(request: VerificationRequest) {
    const message = (messageDrafts[request.id] || "").trim();
    if (!message) return;

    const token = await tokenForRequest();
    setSavingId(request.id);
    const response = await fetch(
      `/api/community/verification/${request.id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: message }),
      },
    );
    const result = (await response.json()) as {
      message?: VerificationMessage;
      error?: string;
    };
    setSavingId("");

    if (!response.ok || result.error || !result.message) {
      alert(result.error || "Unable to send message.");
      return;
    }

    setMessageDrafts((current) => ({ ...current, [request.id]: "" }));
    setRequests((current) =>
      current.map((currentRequest) =>
        currentRequest.id === request.id
          ? {
              ...currentRequest,
              status: normalizeCommunityVerificationRequestStatus("needs_info"),
              messages: [...currentRequest.messages, result.message!],
            }
          : currentRequest,
      ),
    );
  }

  return (
    <section className="mt-6 rounded-3xl bg-white p-5 shadow ring-1 ring-[#071F2F]/5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
            Verification desk
          </p>
          <h2 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
            Review requests separately from verified accounts.
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-600">
            Check social links, ask follow-up questions, choose the final badge,
            then approve or deny the request.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <span className="rounded-2xl bg-[#FFF6DA] px-4 py-3 text-center text-sm font-black text-[#7A5A00]">
            {pendingRequests.length} requests
          </span>
          <span className="rounded-2xl bg-[#E6FAF8] px-4 py-3 text-center text-sm font-black text-[#007B7B]">
            {verifiedAccounts.length} verified
          </span>
        </div>
      </div>

      {setupMessage ? (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {setupMessage}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-5 rounded-2xl bg-[#EEF7F6] p-5 text-sm font-bold text-[#0B3C5D]">
          Loading verification desk...
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="min-w-0">
          <h3 className="text-xl font-black text-[#071F2F]">
            Verification requests
          </h3>
          <div className="mt-3 grid gap-4">
            {pendingRequests.map((request) => (
              <article
                key={request.id}
                className="rounded-3xl border border-[#071F2F]/10 bg-[#FDFBF6] p-4"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ${statusClass(
                          request.status,
                        )}`}
                      >
                        {verificationStatusLabel(request.status)}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ring-1 ${badgeClass(
                          request.requestedType,
                        )}`}
                      >
                        Wants{" "}
                        {communityVerificationBadge(request.requestedType).label}
                      </span>
                    </div>
                    <h4 className="mt-3 text-xl font-black text-[#071F2F]">
                      {request.displayName || request.email}
                    </h4>
                    <p className="mt-1 text-sm font-semibold text-gray-500">
                      {request.email} / {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <select
                    value={approvedTypes[request.id] || request.requestedType}
                    onChange={(event) =>
                      setApprovedTypes((current) => ({
                        ...current,
                        [request.id]: normalizeCommunityVerificationType(
                          event.target.value,
                        ),
                      }))
                    }
                    className="min-h-11 rounded-xl border border-[#071F2F]/10 px-3 text-sm font-bold"
                  >
                    <option value="vendor">Vendor</option>
                    <option value="local">Local</option>
                    <option value="traveler">Traveler</option>
                  </select>
                </div>

                <div className="mt-4 grid gap-2">
                  {request.socialLinks.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all rounded-2xl bg-white px-3 py-2 text-xs font-black text-[#007B7B]"
                    >
                      {link}
                    </a>
                  ))}
                </div>

                {request.notes ? (
                  <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#0B3C5D]">
                    {request.notes}
                  </p>
                ) : null}

                <div className="mt-4 grid gap-2">
                  <textarea
                    value={adminNotes[request.id] || ""}
                    onChange={(event) =>
                      setAdminNotes((current) => ({
                        ...current,
                        [request.id]: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Private admin decision note..."
                    className="rounded-2xl border border-[#071F2F]/10 px-4 py-3 text-sm font-semibold outline-none"
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => updateRequest(request, "approved")}
                      disabled={savingId === request.id}
                      className="rounded-2xl bg-[#00A8A8] px-4 py-3 text-sm font-black text-white"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequest(request, "needs_info")}
                      disabled={savingId === request.id}
                      className="rounded-2xl bg-[#D6B56D] px-4 py-3 text-sm font-black text-[#071F2F]"
                    >
                      Needs info
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRequest(request, "denied")}
                      disabled={savingId === request.id}
                      className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white"
                    >
                      Deny
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl bg-[#F7F3EA] p-3">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#D6B56D]">
                    Verification chat
                  </p>
                  <div className="mt-2 grid max-h-52 gap-2 overflow-y-auto pr-1">
                    {request.messages.length === 0 ? (
                      <p className="rounded-2xl bg-white px-3 py-2 text-xs font-bold text-gray-500">
                        No messages yet.
                      </p>
                    ) : (
                      request.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`rounded-2xl px-3 py-2 text-xs font-bold leading-5 ${
                            message.senderRole === "admin"
                              ? "bg-[#071F2F] text-white"
                              : "bg-white text-[#0B3C5D]"
                          }`}
                        >
                          <p className="text-[10px] uppercase tracking-[0.12em] opacity-70">
                            {message.senderRole}
                          </p>
                          {message.body}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                    <input
                      value={messageDrafts[request.id] || ""}
                      onChange={(event) =>
                        setMessageDrafts((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="Ask for more info..."
                      className="min-h-11 rounded-2xl border border-[#071F2F]/10 px-3 text-sm font-semibold outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => sendMessage(request)}
                      disabled={savingId === request.id}
                      className="rounded-2xl bg-[#071F2F] px-4 py-3 text-sm font-black text-white"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {!loading && pendingRequests.length === 0 ? (
              <p className="rounded-3xl bg-[#EEF7F6] p-6 text-center text-sm font-bold text-[#0B3C5D]">
                No open verification requests.
              </p>
            ) : null}
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="text-xl font-black text-[#071F2F]">
            Verified accounts
          </h3>
          <div className="mt-3 grid gap-3">
            {verifiedAccounts.map((account) => (
              <div
                key={account.userId}
                className="rounded-3xl bg-[#FDFBF6] p-4 ring-1 ring-[#071F2F]/8"
              >
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-xs font-black text-[#007B7B]">
                    {account.profileImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={account.profileImageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      account.displayName.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#071F2F]">
                      {account.displayName}
                    </p>
                    <p className="truncate text-xs font-semibold text-gray-500">
                      {account.email}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.12em] ring-1 ${badgeClass(
                      account.verificationType,
                    )}`}
                  >
                    {communityVerificationBadge(account.verificationType).label}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0B3C5D]">
                    {formatDate(account.verifiedAt)}
                  </span>
                </div>
              </div>
            ))}

            {approvedRequests.length > 0 ? (
              <div className="rounded-3xl bg-[#EEF7F6] p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#007B7B]">
                  Approved request log
                </p>
                <p className="mt-1 text-sm font-bold text-[#0B3C5D]">
                  {approvedRequests.length} approved request
                  {approvedRequests.length === 1 ? "" : "s"} archived here.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
