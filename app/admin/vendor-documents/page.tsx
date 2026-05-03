"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminNav from "@/app/admin/AdminNav";
import ExportCsvButton from "@/app/admin/ExportCsvButton";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

type VendorDocument = {
  id: string;
  vendor_id: string;
  title: string;
  file_url: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  vendors: { business_name: string | null } | null;
};

export default function AdminVendorDocumentsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadDocuments() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user || !(await isAdminUser(userData.user.email))) {
        router.replace("/admin/login");
        return;
      }

      setAuthorized(true);
      const { data } = await supabase
        .from("vendor_documents")
        .select("id, vendor_id, title, file_url, status, admin_note, created_at, vendors(business_name)")
        .order("created_at", { ascending: false });
      const rows = (data as unknown as VendorDocument[]) || [];
      setDocuments(rows);
      setNotes(Object.fromEntries(rows.map((row) => [row.id, row.admin_note || ""])));
    }

    loadDocuments();
  }, [router]);

  const filteredDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          statusFilter === "All" || document.status === statusFilter,
      ),
    [documents, statusFilter],
  );

  if (!authorized) return null;

  async function reviewDocument(document: VendorDocument, status: string) {
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/vendor-documents/${document.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        status,
        adminNote: notes[document.id] || "",
      }),
    });
    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Unable to update document.");
      return;
    }

    setDocuments((current) =>
      current.map((currentDocument) =>
        currentDocument.id === document.id
          ? {
              ...currentDocument,
              status,
              admin_note: notes[document.id] || null,
            }
          : currentDocument,
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
                Vendor Documents
              </h1>
              <p className="mt-2 text-gray-600">
                Review uploaded business documents and mark vendors verified.
              </p>
            </div>
            <ExportCsvButton type="vendor_documents" />
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3 rounded-2xl bg-[#F7F3EA] p-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-h-12 rounded-xl border border-gray-200 px-4 outline-none"
            >
              <option value="All">All documents</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <p className="text-sm font-semibold text-[#0B3C5D]">
              {filteredDocuments.length} shown
            </p>
          </div>

          <div className="mt-6 grid gap-4">
            {filteredDocuments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                No vendor documents found.
              </p>
            ) : (
              filteredDocuments.map((document) => (
                <article key={document.id} className="rounded-xl border border-gray-200 p-5">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#00A8A8]">
                        {document.status}
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-[#0B3C5D]">
                        {document.title}
                      </h2>
                      <p className="mt-2 text-sm text-gray-600">
                        {document.vendors?.business_name || "Unknown vendor"}
                      </p>
                      <a
                        href={document.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block rounded-xl border border-[#00A8A8] px-4 py-2 text-sm font-semibold text-[#007B7B]"
                      >
                        Open document
                      </a>
                    </div>
                    <div className="grid gap-3 lg:w-96">
                      <textarea
                        value={notes[document.id] || ""}
                        onChange={(e) =>
                          setNotes((current) => ({
                            ...current,
                            [document.id]: e.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Admin note"
                        className="rounded-xl border border-gray-300 px-4 py-3"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => reviewDocument(document, "approved")}
                          className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => reviewDocument(document, "rejected")}
                          className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
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
