import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type ConciergeLeadRow = {
  id: string;
};

type AssignmentRow = {
  id: string;
  lead_id: string;
  listing_id: string | null;
  vendor_id: string | null;
  status: string;
  contact_method: string | null;
  vendor_note: string | null;
  guest_quote_cents: number | null;
  created_at: string;
  updated_at: string;
};

type ListingOption = {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  vendor_id: string | null;
  is_active: boolean | null;
};

type VendorOption = {
  id: string;
  business_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean | null;
};

async function verifyAdmin(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email;
  if (!email) return null;

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  return admin ? email : null;
}

function mapById<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]));
}

export async function GET(request: Request) {
  if (!(await verifyAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: leads, error } = await supabaseServer
    .from("concierge_leads")
    .select(
      "id, guest_name, guest_email, guest_phone, lead_type, status, priority, interest, message, travel_date, guests, pickup_area, arrival_type, trip_style, budget, plan, admin_notes, follow_up_date, created_at, updated_at",
    )
    .order("created_at", { ascending: false })
    .limit(250);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leadRows = (leads || []) as ConciergeLeadRow[];
  const leadIds = leadRows.map((lead) => lead.id);
  let assignments: AssignmentRow[] = [];
  let setupMessage: string | null = null;

  if (leadIds.length > 0) {
    const { data: assignmentRows, error: assignmentError } = await supabaseServer
      .from("concierge_lead_assignments")
      .select(
        "id, lead_id, listing_id, vendor_id, status, contact_method, vendor_note, guest_quote_cents, created_at, updated_at",
      )
      .in("lead_id", leadIds)
      .order("created_at", { ascending: true });

    if (assignmentError) {
      setupMessage =
        "Run the updated supabase/concierge-leads.sql to enable vendor fulfillment.";
    } else {
      assignments = (assignmentRows || []) as AssignmentRow[];
    }
  }

  const [{ data: listings }, { data: vendors }] = await Promise.all([
    supabaseServer
      .from("listings")
      .select("id, title, category, location, vendor_id, is_active")
      .order("title", { ascending: true })
      .limit(500),
    supabaseServer
      .from("vendors")
      .select("id, business_name, email, phone, is_active")
      .order("business_name", { ascending: true })
      .limit(500),
  ]);

  const listingOptions = ((listings || []) as ListingOption[]).filter(
    (listing) => listing.is_active !== false,
  );
  const vendorOptions = ((vendors || []) as VendorOption[]).filter(
    (vendor) => vendor.is_active !== false,
  );
  const listingMap = mapById(listingOptions);
  const vendorMap = mapById(vendorOptions);
  const assignmentsByLead = new Map<string, AssignmentRow[]>();

  for (const assignment of assignments) {
    const current = assignmentsByLead.get(assignment.lead_id) || [];
    current.push(assignment);
    assignmentsByLead.set(assignment.lead_id, current);
  }

  const enrichedLeads = (leads || []).map((lead) => ({
    ...lead,
    assignments: (assignmentsByLead.get(lead.id) || []).map((assignment) => ({
      ...assignment,
      listing: assignment.listing_id
        ? listingMap.get(assignment.listing_id) || null
        : null,
      vendor: assignment.vendor_id
        ? vendorMap.get(assignment.vendor_id) || null
        : null,
    })),
  }));

  return NextResponse.json({
    leads: enrichedLeads,
    options: {
      listings: listingOptions,
      vendors: vendorOptions,
    },
    setupMessage,
  });
}
