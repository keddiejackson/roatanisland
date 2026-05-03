"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import ExportCsvButton from "@/app/admin/ExportCsvButton";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type ReportRow = {
  id: string;
  listing_id: string | null;
  reporter_name: string | null;
  reporter_email: string | null;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  listings: { title: string | null } | null;
};

export default function AdminReportsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    async function loadReports() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !(await isAdminUser(userData.user.email))) {
        router.replace("/admin/login");
        return;
      }

      setAuthorized(true);
      const { data } = await supabase
        .from("listing_reports")
        .select("id, listing_id, reporter_name, reporter_email, reason, details, status, created_at, listings(title)")
        .order("created_at", { ascending: false });
      setReports((data as unknown as ReportRow[]) || []);
    }

    loadReports();
  }, [router]);

  const filteredReports = useMemo(
    () =>
      reports.filter(
        (report) => statusFilter === "All" || report.status === statusFilter,
      ),
    [reports, statusFilter],
  );

  if (!authorized) return null;

  async function updateStatus(report: ReportRow, status: string) {
    const { error } = await supabase
      .from("listing_reports")
      .update({ status })
      .eq("id", report.id);

    if (error) {
      alert(error.message);
      return;
    }

    setReports((current) =>
      current.map((currentReport) =>
        currentReport.id === report.id
          ? { ...currentReport, status }
          : currentReport,
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
              <h1 className="text-3xl font-bold text-[#0B3C5D]">
                Listing Reports
              </h1>
              <p className="mt-2 text-gray-600">
                Review problems visitors send from public listing pages.
              </p>
            </div>
            <ExportCsvButton type="reports" />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl bg-[#F7F3EA] p-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none"
            >
              <option value="All">All reports</option>
              <option value="new">New</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved">Resolved</option>
            </select>
            <p className="text-sm font-semibold text-[#0B3C5D]">
              {filteredReports.length} shown
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            {filteredReports.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                No reports found.
              </p>
            ) : (
              filteredReports.map((report) => (
                <article key={report.id} className="rounded-xl border border-gray-200 p-5">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#00A8A8]">
                        {report.status}
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-[#0B3C5D]">
                        {report.listings?.title || "Deleted listing"}
                      </h2>
                      <p className="mt-2 text-sm text-gray-600">
                        {report.reason}
                      </p>
                    </div>
                    <select
                      value={report.status}
                      onChange={(e) => updateStatus(report, e.target.value)}
                      className="rounded-xl border border-gray-300 px-4 py-2"
                    >
                      <option value="new">New</option>
                      <option value="reviewing">Reviewing</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                  {report.details ? (
                    <p className="mt-4 rounded-xl bg-[#F7F3EA] p-4 text-sm text-gray-700">
                      {report.details}
                    </p>
                  ) : null}
                  <div className="mt-4 grid gap-2 text-sm text-gray-600 sm:grid-cols-3">
                    <p>{report.reporter_name || "No name"}</p>
                    <p>{report.reporter_email || "No email"}</p>
                    <p>{new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
