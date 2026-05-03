import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type ExportType =
  | "bookings"
  | "listings"
  | "vendors"
  | "reviews"
  | "activity"
  | "vendor_invites"
  | "reports"
  | "promo_codes"
  | "vendor_documents";

async function verifyAdmin(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return false;
  }

  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;

  if (!email) {
    return false;
  }

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return Boolean(admin);
}

function csvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvValue).join(","),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
  ].join("\n");
}

async function fetchRows(type: ExportType) {
  if (type === "bookings") {
    const { data, error } = await supabaseServer
      .from("bookings")
      .select(
        "id, full_name, email, tour_date, tour_time, guests, guest_message, vendor_note, status, deposit_status, deposit_amount_cents, listing_id, admin_notes, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as Record<string, unknown>[];
  }

  if (type === "listings") {
    const { data, error } = await supabaseServer
      .from("listings")
      .select(
        "id, vendor_id, title, description, price, location, category, tour_times, availability_note, max_guests, minimum_notice_hours, approval_status, approval_note, is_active, is_featured, image_url, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as Record<string, unknown>[];
  }

  if (type === "reviews") {
    const { data, error } = await supabaseServer
      .from("listing_reviews")
      .select("id, listing_id, reviewer_name, reviewer_email, rating, comment, photo_urls, is_approved, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as Record<string, unknown>[];
  }

  if (type === "activity") {
    const { data, error } = await supabaseServer
      .from("admin_activity_logs")
      .select("id, actor_email, actor_role, action, target_type, target_id, target_label, metadata, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as Record<string, unknown>[];
  }

  if (type === "vendor_invites") {
    const { data, error } = await supabaseServer
      .from("vendor_invites")
      .select("id, vendor_id, email, accepted_at, expires_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as Record<string, unknown>[];
  }

  if (type === "reports") {
    const { data, error } = await supabaseServer
      .from("listing_reports")
      .select("id, listing_id, reporter_name, reporter_email, reason, details, status, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as Record<string, unknown>[];
  }

  if (type === "promo_codes") {
    const { data, error } = await supabaseServer
      .from("promo_codes")
      .select("id, code, description, discount_percent, discount_amount_cents, is_active, expires_at, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as Record<string, unknown>[];
  }

  if (type === "vendor_documents") {
    const { data, error } = await supabaseServer
      .from("vendor_documents")
      .select("id, vendor_id, title, file_url, status, admin_note, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []) as Record<string, unknown>[];
  }

  const { data, error } = await supabaseServer
    .from("vendors")
    .select(
      "id, business_name, contact_name, email, phone, website, notes, profile_image_url, is_active, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as Record<string, unknown>[];
}

export async function GET(request: Request) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get("type") as ExportType | null;

  if (
    !type ||
    ![
      "bookings",
      "listings",
      "vendors",
      "reviews",
      "activity",
      "vendor_invites",
      "reports",
      "promo_codes",
      "vendor_documents",
    ].includes(type)
  ) {
    return NextResponse.json({ error: "Unknown export type." }, { status: 400 });
  }

  try {
    const rows = await fetchRows(type);
    const csv = toCsv(rows);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="roatan-${type}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed." },
      { status: 500 },
    );
  }
}
