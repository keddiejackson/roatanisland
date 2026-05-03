"use client";

import { supabase } from "@/lib/supabase";

type ExportCsvButtonProps = {
  type:
    | "bookings"
    | "listings"
    | "vendors"
    | "reviews"
    | "activity"
    | "vendor_invites"
    | "reports"
    | "promo_codes"
    | "vendor_documents";
};

export default function ExportCsvButton({ type }: ExportCsvButtonProps) {
  const label = type.replaceAll("_", " ");

  async function exportCsv() {
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch(`/api/admin/export?type=${type}`, {
      headers: {
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
    });

    if (!response.ok) {
      const result = await response.json();
      alert(result.error || "Unable to export CSV.");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `roatan-${type}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow"
    >
      Export {label}
    </button>
  );
}
