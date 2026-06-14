"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type ReminderCandidate = {
  id: string;
  bookingId: string;
  reminderType: string;
  label: string;
  recipientRole: string;
  recipientEmail: string;
  guestName: string;
  listingTitle: string;
  dateLabel: string;
  timeLabel: string;
  amountLabel: string;
  preview: string;
  actionUrl: string;
};

type ReminderSetting = {
  reminder_type: string;
  enabled: boolean;
  subject_template: string | null;
  body_template: string | null;
};

type ReminderLog = {
  id: string;
  booking_id: string;
  reminder_type: string;
  recipient_role: string;
  recipient_email: string | null;
  subject: string | null;
  status: string | null;
  sent_at: string | null;
};

type ReminderResponse = {
  candidates: ReminderCandidate[];
  logs: ReminderLog[];
  settings: ReminderSetting[];
  setupMissing?: boolean;
};

function settingLabel(type: string) {
  return type.replaceAll("_", " ");
}

export default function AdminRemindersPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState("");
  const [message, setMessage] = useState("");
  const [data, setData] = useState<ReminderResponse>({
    candidates: [],
    logs: [],
    settings: [],
  });

  async function authHeaders() {
    const { data: sessionData } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      ...(sessionData.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : {}),
    };
  }

  async function loadReminders() {
    setLoading(true);
    const response = await fetch("/api/admin/reminders", {
      headers: await authHeaders(),
    });
    const result = (await response.json()) as ReminderResponse & {
      error?: string;
    };

    if (!response.ok) {
      setMessage(result.error || "Unable to load reminders.");
      setLoading(false);
      return;
    }

    setData(result);
    setLoading(false);
  }

  useEffect(() => {
    async function verifyAdminSession() {
      const { data: userData, error } = await supabase.auth.getUser();

      if (error || !userData.user || !(await isAdminUser(userData.user.email))) {
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
      loadReminders();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  async function saveSetting(setting: ReminderSetting) {
    setSaving(setting.reminder_type);
    setMessage("");
    const response = await fetch("/api/admin/reminders", {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify({
        reminderType: setting.reminder_type,
        enabled: setting.enabled,
        subjectTemplate: setting.subject_template,
        bodyTemplate: setting.body_template,
      }),
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(result.error || "Unable to save setting.");
    } else {
      setMessage("Reminder setting saved.");
      await loadReminders();
    }

    setSaving("");
  }

  async function sendNow(candidate: ReminderCandidate) {
    setSaving(candidate.id);
    setMessage("");
    const response = await fetch("/api/admin/reminders", {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ candidateId: candidate.id }),
    });
    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(result.error || "Unable to send reminder.");
    } else {
      setMessage("Reminder sent and logged.");
      await loadReminders();
    }

    setSaving("");
  }

  function updateSetting(
    reminderType: string,
    patch: Partial<ReminderSetting>,
  ) {
    setData((current) => ({
      ...current,
      settings: current.settings.map((setting) =>
        setting.reminder_type === reminderType
          ? { ...setting, ...patch }
          : setting,
      ),
    }));
  }

  if (checkingAuth || !authorized) {
    return (
      <main className="brand-page min-h-screen px-4 py-6 text-[#17324D] sm:px-6 sm:py-10">
        <p className="text-center font-semibold">Checking admin access...</p>
      </main>
    );
  }

  return (
    <main className="brand-page min-h-screen px-4 py-6 text-[#17324D] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <AdminNav />

        <section className="brand-auth-card p-5 shadow sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
            Reminder Center
          </p>
          <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-black text-[#0B3C5D]">
                Automated follow-ups
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-gray-600">
                Review guest and vendor reminders before they go out, send one
                manually, and adjust the message templates.
              </p>
            </div>
            <button
              onClick={loadReminders}
              className="rounded-xl bg-[#0B3C5D] px-5 py-3 font-black text-white"
            >
              Refresh
            </button>
          </div>

          {message ? (
            <p className="mt-5 rounded-xl bg-[#EEF7F6] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
              {message}
            </p>
          ) : null}
          {data.setupMissing ? (
            <p className="mt-5 rounded-xl bg-[#FFF8E8] px-4 py-3 text-sm font-bold text-[#8A6116]">
              Run the booking reminders SQL before relying on automatic sends.
            </p>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["Due now", data.candidates.length],
              [
                "Guest reminders",
                data.candidates.filter(
                  (candidate) => candidate.recipientRole === "guest",
                ).length,
              ],
              [
                "Vendor reminders",
                data.candidates.filter(
                  (candidate) => candidate.recipientRole === "vendor",
                ).length,
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-[#F7F3EA] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
                  {label}
                </p>
                <p className="mt-2 text-3xl font-black text-[#0B3C5D]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <section className="mt-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#00A8A8]">
                  Send queue
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                  Reminders ready now
                </h2>
              </div>
              {loading ? (
                <p className="text-sm font-bold text-gray-500">Loading...</p>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3">
              {data.candidates.map((candidate) => (
                <article
                  key={candidate.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                    <div>
                      <p className="font-black text-[#0B3C5D]">
                        {candidate.label}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        {candidate.guestName} / {candidate.listingTitle} /{" "}
                        {candidate.dateLabel} at {candidate.timeLabel}
                      </p>
                      <p className="mt-2 text-sm text-gray-700">
                        {candidate.preview}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-black text-[#0B3C5D]">
                        {candidate.recipientRole}
                      </span>
                      <span className="rounded-full bg-[#FFF8E8] px-3 py-1 text-xs font-black text-[#8A6116]">
                        {candidate.amountLabel}
                      </span>
                      <button
                        onClick={() => sendNow(candidate)}
                        disabled={saving === candidate.id}
                        className="rounded-lg bg-[#00A8A8] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                      >
                        Send now
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {!loading && data.candidates.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 p-5 text-sm text-gray-600">
                  No reminders need attention right now.
                </p>
              ) : null}
            </div>
          </section>

          <section className="mt-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#00A8A8]">
              Reminder settings
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
              Turn reminders on or edit the copy
            </h2>
            <div className="mt-4 grid gap-4">
              {data.settings.map((setting) => (
                <article
                  key={setting.reminder_type}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-black capitalize text-[#0B3C5D]">
                        {settingLabel(setting.reminder_type)}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Use tokens like {"{guestName}"}, {"{listingTitle}"},{" "}
                        {"{amountDue}"}, {"{date}"}, and {"{time}"}.
                      </p>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-black text-[#0B3C5D]">
                      <input
                        type="checkbox"
                        checked={setting.enabled}
                        onChange={(event) =>
                          updateSetting(setting.reminder_type, {
                            enabled: event.target.checked,
                          })
                        }
                      />
                      Enabled
                    </label>
                  </div>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <input
                      value={setting.subject_template || ""}
                      onChange={(event) =>
                        updateSetting(setting.reminder_type, {
                          subject_template: event.target.value,
                        })
                      }
                      className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                      placeholder="Subject"
                    />
                    <textarea
                      value={setting.body_template || ""}
                      onChange={(event) =>
                        updateSetting(setting.reminder_type, {
                          body_template: event.target.value,
                        })
                      }
                      className="min-h-24 rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                      placeholder="Message body"
                    />
                  </div>
                  <button
                    onClick={() => saveSetting(setting)}
                    disabled={saving === setting.reminder_type}
                    className="mt-3 rounded-lg bg-[#0B3C5D] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                  >
                    Save setting
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-10">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#00A8A8]">
              Reminder history
            </p>
            <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
              Recently sent
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase tracking-[0.12em] text-gray-500">
                    <th className="py-3">Type</th>
                    <th className="py-3">Recipient</th>
                    <th className="py-3">Subject</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Sent</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100">
                      <td className="py-3 font-bold capitalize text-[#0B3C5D]">
                        {settingLabel(log.reminder_type)}
                      </td>
                      <td className="py-3 text-gray-600">
                        {log.recipient_email || log.recipient_role}
                      </td>
                      <td className="py-3 text-gray-600">
                        {log.subject || "Reminder"}
                      </td>
                      <td className="py-3 font-bold text-[#0B3C5D]">
                        {log.status || "sent"}
                      </td>
                      <td className="py-3 text-gray-600">
                        {log.sent_at
                          ? new Date(log.sent_at).toLocaleString()
                          : "Recently"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && data.logs.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 p-5 text-sm text-gray-600">
                  Sent reminders will appear here.
                </p>
              ) : null}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
