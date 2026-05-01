"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type AppErrorRow = {
  id: string;
  source: string;
  message: string;
  details: Record<string, unknown> | null;
  severity: string;
  resolved: boolean;
  created_at: string;
};

export default function AdminErrorsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errors, setErrors] = useState<AppErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
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
    async function fetchErrors() {
      const { data, error } = await supabase
        .from("app_errors")
        .select("id, source, message, details, severity, resolved, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        setSetupMessage("Run the updated Supabase SQL setup to enable error logs.");
        setLoading(false);
        return;
      }

      setErrors((data as AppErrorRow[]) || []);
      setLoading(false);
    }

    if (authorized) {
      fetchErrors();
    }
  }, [authorized]);

  const filteredErrors = useMemo(
    () =>
      errors.filter((error) => {
        if (filter === "all") {
          return true;
        }

        return filter === "resolved" ? error.resolved : !error.resolved;
      }),
    [errors, filter],
  );

  if (checkingAuth || !authorized) {
    return null;
  }

  async function toggleResolved(errorRow: AppErrorRow) {
    const nextResolved = !errorRow.resolved;
    const { error } = await supabase
      .from("app_errors")
      .update({ resolved: nextResolved })
      .eq("id", errorRow.id);

    if (error) {
      alert(`Unable to update error: ${error.message}`);
      return;
    }

    setErrors((currentErrors) =>
      currentErrors.map((currentError) =>
        currentError.id === errorRow.id
          ? { ...currentError, resolved: nextResolved }
          : currentError,
      ),
    );
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <section className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className="text-3xl font-bold text-[#0B3C5D]">Error Logs</h1>
              <p className="mt-2 text-gray-600">
                Review failed emails, uploads, payments, and server actions.
              </p>
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none"
            >
              <option value="open">Open</option>
              <option value="resolved">Resolved</option>
              <option value="all">All</option>
            </select>
          </div>

          {setupMessage ? (
            <div className="mt-6 rounded-xl bg-yellow-100 p-4 text-sm text-yellow-900">
              {setupMessage}
            </div>
          ) : null}

          {loading ? (
            <p className="mt-8">Loading errors...</p>
          ) : filteredErrors.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-[#00A8A8]/40 bg-[#F7F3EA] p-6 text-center text-gray-600">
              No errors here.
            </div>
          ) : (
            <div className="mt-8 grid gap-4">
              {filteredErrors.map((errorRow) => (
                <article
                  key={errorRow.id}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            errorRow.severity === "warning"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {errorRow.severity}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(errorRow.created_at).toLocaleString()}
                        </span>
                      </div>
                      <h2 className="mt-3 text-lg font-bold text-[#0B3C5D]">
                        {errorRow.source}
                      </h2>
                      <p className="mt-2 text-sm text-gray-700">
                        {errorRow.message}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleResolved(errorRow)}
                      className="rounded-xl border border-[#00A8A8] px-4 py-2 text-sm font-semibold text-[#007B7B]"
                    >
                      {errorRow.resolved ? "Reopen" : "Resolve"}
                    </button>
                  </div>

                  {errorRow.details &&
                  Object.keys(errorRow.details).length > 0 ? (
                    <pre className="mt-4 overflow-x-auto rounded-lg bg-[#F7F3EA] p-4 text-xs text-gray-700">
                      {JSON.stringify(errorRow.details, null, 2)}
                    </pre>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
