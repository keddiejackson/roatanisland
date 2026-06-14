import Link from "next/link";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
import { formatBookingCents } from "@/lib/booking-flow";
import { supabaseServer } from "@/lib/supabase-server";
import QuoteActions from "./QuoteActions";

type QuoteLineItem = {
  assignmentId?: string;
  title?: string;
  vendorName?: string;
  status?: string;
  note?: string | null;
  amountCents?: number;
};

type ConciergeQuote = {
  id: string;
  lead_id: string;
  public_token: string;
  status: string;
  title: string;
  line_items: QuoteLineItem[] | null;
  total_amount_cents: number;
  deposit_amount_cents: number | null;
  guest_note: string | null;
  guest_response: string | null;
  booking_id: string | null;
  expires_at: string | null;
  created_at: string;
};

type ConciergeLead = {
  guest_name: string;
  guest_email: string;
  travel_date: string | null;
  guests: number | null;
  pickup_area: string | null;
  arrival_type: string | null;
  trip_style: string | null;
  budget: string | null;
};

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export default async function ConciergeQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { data: quoteData } = await supabaseServer
    .from("concierge_quotes")
    .select(
      "id, lead_id, public_token, status, title, line_items, total_amount_cents, deposit_amount_cents, guest_note, guest_response, booking_id, expires_at, created_at",
    )
    .eq("public_token", token)
    .maybeSingle();
  const quote = quoteData as ConciergeQuote | null;
  let lead: ConciergeLead | null = null;

  if (quote) {
    const { data: leadData } = await supabaseServer
      .from("concierge_leads")
      .select(
        "guest_name, guest_email, travel_date, guests, pickup_area, arrival_type, trip_style, budget",
      )
      .eq("id", quote.lead_id)
      .maybeSingle();
    lead = leadData as ConciergeLead | null;
  }

  if (!quote || !lead) {
    return (
      <main className="brand-page min-h-screen px-4 py-6 text-[#17324D] sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <SiteLogo />
          <section className="mt-8 brand-auth-card p-5 shadow sm:p-8">
            <h1 className="text-2xl font-black text-[#0B3C5D]">
              Quote not found
            </h1>
            <p className="mt-3 text-gray-600">
              This concierge quote link is not available.
            </p>
            <Link
              href="/concierge"
              className="mt-6 inline-block rounded-xl bg-[#00A8A8] px-5 py-3 font-bold text-white"
            >
              Request a new plan
            </Link>
          </section>
        </div>
        <SiteFooter />
      </main>
    );
  }

  const lineItems = Array.isArray(quote.line_items) ? quote.line_items : [];
  const expired =
    Boolean(quote.expires_at && quote.expires_at < todayValue()) &&
    !["approved", "deposit_started", "paid"].includes(quote.status);

  return (
    <main className="brand-page min-h-screen px-4 py-6 text-[#17324D] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <SiteLogo />
          <Link
            href="/"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow"
          >
            Home
          </Link>
        </div>

        <section className="rounded-3xl bg-white p-8 shadow">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                Private concierge quote
              </p>
              <h1 className="mt-2 text-3xl font-black text-[#0B3C5D] sm:text-5xl">
                {quote.title}
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-gray-600">
                Review your proposed Roatan plan. Approving creates your booking
                and opens the secure deposit checkout.
              </p>
            </div>
            <div className="rounded-2xl bg-[#F7F3EA] p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-gray-500">
                Quote status
              </p>
              <p className="mt-1 text-xl font-black capitalize text-[#0B3C5D]">
                {expired ? "expired" : statusLabel(quote.status)}
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {[
              ["Guest", lead.guest_name],
              ["Date", lead.travel_date || "To confirm"],
              ["Guests", String(lead.guests || 1)],
              ["Pickup", lead.pickup_area || "To confirm"],
              ["Arrival", lead.arrival_type || "To confirm"],
              ["Style", lead.trip_style || "To confirm"],
              ["Budget", lead.budget || "To confirm"],
              [
                "Expires",
                quote.expires_at ? quote.expires_at : "No expiration",
              ],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#F7F3EA] p-4">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="mt-1 break-words font-black text-[#0B3C5D]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h2 className="text-2xl font-black text-[#0B3C5D]">
                Included in this plan
              </h2>
              <div className="mt-4 grid gap-3">
                {lineItems.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                    This quote has no line items yet.
                  </p>
                ) : (
                  lineItems.map((item, index) => (
                    <article
                      key={`${item.assignmentId || item.title}-${index}`}
                      className="rounded-2xl border border-gray-200 p-5"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#D6B56D]">
                            {item.vendorName || "Roatan partner"}
                          </p>
                          <h3 className="mt-1 text-xl font-black text-[#0B3C5D]">
                            {item.title || "Concierge service"}
                          </h3>
                          {item.note ? (
                            <p className="mt-2 text-sm leading-6 text-gray-600">
                              {item.note}
                            </p>
                          ) : null}
                        </div>
                        <p className="text-lg font-black text-[#0B3C5D]">
                          {formatBookingCents(item.amountCents || 0)}
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>

            <aside className="rounded-3xl bg-[#F7F3EA] p-6">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#00A8A8]">
                Your total
              </p>
              <p className="mt-2 text-4xl font-black text-[#0B3C5D]">
                {formatBookingCents(quote.total_amount_cents)}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Deposit due now:{" "}
                <span className="font-bold text-[#0B3C5D]">
                  {quote.deposit_amount_cents
                    ? formatBookingCents(quote.deposit_amount_cents)
                    : "Site deposit amount"}
                </span>
              </p>

              {quote.guest_note ? (
                <div className="mt-5 rounded-2xl bg-white p-4">
                  <p className="text-sm font-bold text-[#0B3C5D]">
                    Concierge note
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                    {quote.guest_note}
                  </p>
                </div>
              ) : null}

              {quote.guest_response ? (
                <div className="mt-5 rounded-2xl bg-[#FFF8E8] p-4">
                  <p className="text-sm font-bold text-[#0B3C5D]">
                    Your requested changes
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-700">
                    {quote.guest_response}
                  </p>
                </div>
              ) : null}

              <div className="mt-6">
                <QuoteActions
                  token={token}
                  status={quote.status}
                  bookingId={quote.booking_id}
                  expired={expired}
                />
              </div>
            </aside>
          </div>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
