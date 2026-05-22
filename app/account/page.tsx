"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import EmptyState from "@/app/EmptyState";
import SiteLogo from "@/app/SiteLogo";
import SiteFooter from "@/app/SiteFooter";
import { supabase } from "@/lib/supabase";

type Booking = {
  id: string;
  full_name: string;
  email: string;
  tour_date: string;
  tour_time: string;
  guests: number;
  status: string | null;
  deposit_status: string | null;
  listing_id: string | null;
};

function statusBadgeClass(status: string | null) {
  switch ((status || "new").toLowerCase()) {
    case "confirmed":
      return "bg-green-100 text-green-800";
    case "completed":
      return "bg-[#EEF7F6] text-[#007B7B]";
    case "cancelled":
      return "bg-red-100 text-red-700";
    default:
      return "bg-[#FFF3D2] text-[#7A5A00]";
  }
}

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [signedInEmail, setSignedInEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccount() {
      const { data } = await supabase.auth.getUser();
      if (!data.user?.email) {
        setLoading(false);
        return;
      }
      setEmail(data.user.email);
      setSignedInEmail(data.user.email);
      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("id, full_name, email, tour_date, tour_time, guests, status, deposit_status, listing_id")
        .eq("email", data.user.email)
        .order("tour_date", { ascending: false });
      setBookings((bookingRows as Booking[]) || []);
      setLoading(false);
    }
    loadAccount();
  }, []);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert(error.message);
      return;
    }
    router.refresh();
    window.location.reload();
  }

  if (loading) {
    return <main className="min-h-screen bg-[#F7F3EA] p-8">Loading account...</main>;
  }

  const hasSignedIn = Boolean(signedInEmail);
  const latestBooking = bookings[0];
  const confirmedCount = bookings.filter(
    (booking) => booking.status === "confirmed",
  ).length;

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-12 text-[#17324D]">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <SiteLogo />
          <Link href="/" className="rounded-xl bg-white px-4 py-2 font-semibold shadow">
            Home
          </Link>
        </header>

        <section className="overflow-hidden rounded-2xl bg-[#071F2F] text-white shadow-xl">
          <div className="p-8">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#D6B56D]">
              Trip dashboard
            </p>
            <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <h1 className="text-3xl font-bold sm:text-5xl">
                  Your Roatan plans
                </h1>
                <p className="mt-3 max-w-2xl leading-7 text-white/75">
                  Sign in to check booking requests, payment status, and trip
                  next steps in one place.
                </p>
              </div>
              <Link
                href="/map"
                className="rounded-xl bg-[#D6B56D] px-5 py-3 text-center font-bold text-[#071F2F]"
              >
                Plan another trip
              </Link>
            </div>
          </div>

          {hasSignedIn ? (
            <div className="grid border-t border-white/10 bg-white/10 text-center sm:grid-cols-3">
              <div className="p-5">
                <p className="text-3xl font-bold">{bookings.length}</p>
                <p className="mt-1 text-sm text-white/65">Booking requests</p>
              </div>
              <div className="p-5">
                <p className="text-3xl font-bold">{confirmedCount}</p>
                <p className="mt-1 text-sm text-white/65">Confirmed</p>
              </div>
              <div className="p-5">
                <p className="text-3xl font-bold">
                  {latestBooking?.tour_date || "Ready"}
                </p>
                <p className="mt-1 text-sm text-white/65">Latest activity</p>
              </div>
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#00A8A8]">
                Guest access
              </p>
              <h2 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
                My bookings
              </h2>
            </div>
            {hasSignedIn ? (
              <p className="rounded-xl bg-[#EEF7F6] px-4 py-2 text-sm font-bold text-[#0B3C5D]">
                Signed in as {signedInEmail}
              </p>
            ) : null}
          </div>

          {bookings.length === 0 && !hasSignedIn ? (
            <form onSubmit={signIn} className="mt-8 grid gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="rounded-xl border border-gray-300 px-4 py-3"
                required
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="rounded-xl border border-gray-300 px-4 py-3"
                required
              />
              <button className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white">
                Login
              </button>
            </form>
          ) : bookings.length === 0 ? (
            <div className="mt-8">
              <EmptyState
                title="No bookings found yet."
                text={`We did not find any booking requests for ${signedInEmail}. Browse listings or use the map to start planning.`}
                primaryHref="/map"
                primaryLabel="Explore the map"
                secondaryHref="/"
                secondaryLabel="Browse listings"
              />
            </div>
          ) : (
            <div className="mt-8 grid gap-4">
              {bookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/book/status/${booking.id}`}
                  className="rounded-xl border border-gray-200 p-5 transition hover:-translate-y-0.5 hover:border-[#00A8A8] hover:shadow-lg"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <p className="font-bold text-[#0B3C5D]">
                        {booking.tour_date} at {booking.tour_time}
                      </p>
                      <p className="mt-2 text-sm capitalize text-gray-600">
                        {booking.guests} guests - deposit{" "}
                        {booking.deposit_status || "not requested"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusBadgeClass(
                        booking.status,
                      )}`}
                    >
                      {booking.status || "new"}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-bold text-[#007B7B]">
                    View booking details
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
