"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type ActivityLog = {
  id: string;
  actor_email: string | null;
  actor_role: string;
  action: string;
  target_type: string;
  target_id: string | null;
  target_label: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminActivityPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
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
    async function fetchLogs() {
      const { data, error } = await supabase
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(250);

      if (error) {
        console.error("Error loading activity logs:", error.message);
        setLoading(false);
        return;
      }

      setLogs((data as ActivityLog[]) || []);
      setLoading(false);
    }

    if (authorized) {
      fetchLogs();
    }
  }, [authorized]);

  const filteredLogs = useMemo(
    () =>
      logs.filter((log) =>
        [
          log.actor_email || "",
          log.actor_role,
          log.action,
          log.target_type,
          log.target_label || "",
          log.target_id || "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [logs, search],
  );

  if (checkingAuth || !authorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-7xl">
        <AdminNav />

        <section className="rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-bold text-[#0B3C5D]">
                Activity Logs
              </h1>
              <p className="mt-2 text-gray-600">
                Review important admin and vendor actions.
              </p>
            </div>
            <p className="text-sm font-semibold text-[#0B3C5D]">
              {filteredLogs.length} shown
            </p>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, person, record"
            className="mt-8 min-h-12 w-full rounded-xl border border-gray-200 px-4 outline-none focus:border-[#00A8A8]"
          />

          {loading ? (
            <p className="mt-8">Loading activity...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="mt-8 rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
              No activity logs found.
            </p>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-[1000px] border-collapse">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="border-b align-top">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#0B3C5D]">
                          {log.actor_email || log.actor_role}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {log.actor_role}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold capitalize text-[#0B3C5D]">
                        {log.action.replaceAll("_", " ")}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {log.target_label || log.target_id || "Unknown"}
                        </p>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {log.target_type}
                        </p>
                      </td>
                      <td className="max-w-md px-4 py-3 text-sm text-gray-600">
                        {log.metadata
                          ? JSON.stringify(log.metadata)
                          : "No extra details"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
