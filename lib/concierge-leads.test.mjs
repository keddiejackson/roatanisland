import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConciergeAssignmentInsert,
  buildConciergeLeadInsert,
  buildConciergeQuoteLineItems,
  conciergeFulfillmentSummary,
  conciergeLeadSummary,
  conciergeQuoteSummary,
  normalizeConciergeAssignmentStatus,
  normalizeConciergeLeadStatus,
  normalizeConciergeQuoteStatus,
  priorityForConciergeLead,
} from "./concierge-leads.ts";

test("normalizes concierge lead statuses", () => {
  assert.equal(normalizeConciergeLeadStatus("quoted"), "quoted");
  assert.equal(normalizeConciergeLeadStatus("unknown"), "new");
  assert.equal(normalizeConciergeLeadStatus(undefined), "new");
});

test("assigns useful priority labels", () => {
  assert.equal(
    priorityForConciergeLead({
      arrivalType: "Cruise",
      tripStyle: "Family",
      notes: "Need to be back by 3 PM",
    }),
    "cruise",
  );

  assert.equal(
    priorityForConciergeLead({
      arrivalType: "Airport",
      tripStyle: "Luxury",
      notes: "Landing late with luggage",
    }),
    "airport",
  );

  assert.equal(
    priorityForConciergeLead({
      arrivalType: "Staying on island",
      tripStyle: "Luxury",
      notes: "Private boat preferred",
    }),
    "luxury",
  );
});

test("builds a database insert from contact request details", () => {
  assert.deepEqual(
    buildConciergeLeadInsert({
      name: "Keddie",
      email: "keddie@example.com",
      phone: "555",
      interest: "Concierge trip plan",
      message: "Trip plan details",
      leadType: "concierge_plan",
      travelDate: "2026-07-10",
      guests: "4",
      pickupArea: "Coxen Hole",
      arrivalType: "Cruise",
      tripStyle: "Family",
      budget: "Moderate",
      plan: {
        name: "Cruise Day",
        stops: [{ listingId: "abc", title: "Island Tour", timeBlock: "Morning" }],
      },
    }),
    {
      guest_name: "Keddie",
      guest_email: "keddie@example.com",
      guest_phone: "555",
      lead_type: "concierge_plan",
      status: "new",
      priority: "cruise",
      interest: "Concierge trip plan",
      message: "Trip plan details",
      travel_date: "2026-07-10",
      guests: 4,
      pickup_area: "Coxen Hole",
      arrival_type: "Cruise",
      trip_style: "Family",
      budget: "Moderate",
      plan: {
        name: "Cruise Day",
        stops: [{ listingId: "abc", title: "Island Tour", timeBlock: "Morning" }],
      },
      source_path: "/concierge",
    },
  );
});

test("summarizes concierge lead pipeline", () => {
  assert.deepEqual(
    conciergeLeadSummary([
      { id: "1", status: "new", priority: "cruise" },
      { id: "2", status: "reviewing", priority: "airport" },
      { id: "3", status: "booked", priority: "family" },
      { id: "4", status: "closed", priority: "general" },
    ]),
    {
      total: 4,
      newCount: 1,
      activeCount: 2,
      bookedCount: 1,
      closedCount: 1,
      cruiseCount: 1,
      airportCount: 1,
    },
  );
});

test("normalizes concierge assignment statuses", () => {
  assert.equal(normalizeConciergeAssignmentStatus("quoted"), "quoted");
  assert.equal(normalizeConciergeAssignmentStatus("bad"), "recommended");
  assert.equal(normalizeConciergeAssignmentStatus(undefined), "recommended");
});

test("builds a clean concierge assignment insert", () => {
  assert.deepEqual(
    buildConciergeAssignmentInsert({
      leadId: "lead-1",
      listingId: "listing-1",
      vendorId: "vendor-1",
      status: "contacted",
      contactMethod: "WhatsApp",
      vendorNote: "Can do a private pickup.",
      guestQuoteCents: "12500",
    }),
    {
      lead_id: "lead-1",
      listing_id: "listing-1",
      vendor_id: "vendor-1",
      status: "contacted",
      contact_method: "WhatsApp",
      vendor_note: "Can do a private pickup.",
      guest_quote_cents: 12500,
    },
  );
});

test("summarizes concierge fulfillment progress", () => {
  assert.deepEqual(
    conciergeFulfillmentSummary([
      { id: "1", status: "recommended" },
      { id: "2", status: "contacted" },
      { id: "3", status: "quoted" },
      { id: "4", status: "confirmed" },
      { id: "5", status: "declined" },
    ]),
    {
      total: 5,
      recommendedCount: 1,
      contactedCount: 1,
      quotedCount: 1,
      confirmedCount: 1,
      declinedCount: 1,
      activeCount: 3,
    },
  );
});

test("normalizes concierge quote statuses", () => {
  assert.equal(normalizeConciergeQuoteStatus("approved"), "approved");
  assert.equal(normalizeConciergeQuoteStatus("bad"), "draft");
  assert.equal(normalizeConciergeQuoteStatus(undefined), "draft");
});

test("builds quote line items from active assignments", () => {
  assert.deepEqual(
    buildConciergeQuoteLineItems([
      {
        id: "assignment-1",
        status: "quoted",
        guest_quote_cents: 12500,
        vendor_note: "Private pickup included",
        listing: { title: "Island Tour" },
        vendor: { business_name: "Roatan Tours" },
      },
      {
        id: "assignment-2",
        status: "declined",
        guest_quote_cents: 2500,
        listing: { title: "Declined Stop" },
        vendor: { business_name: "Nope" },
      },
    ]),
    [
      {
        assignmentId: "assignment-1",
        title: "Island Tour",
        vendorName: "Roatan Tours",
        status: "quoted",
        note: "Private pickup included",
        amountCents: 12500,
      },
    ],
  );
});

test("summarizes concierge quotes", () => {
  assert.deepEqual(
    conciergeQuoteSummary([
      { id: "1", status: "sent", total_amount_cents: 10000 },
      { id: "2", status: "approved", total_amount_cents: 20000 },
      { id: "3", status: "paid", total_amount_cents: 30000 },
    ]),
    {
      total: 3,
      sentCount: 1,
      approvedCount: 1,
      paidCount: 1,
      totalValueCents: 60000,
    },
  );
});
