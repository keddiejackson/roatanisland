"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
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

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-12 text-[#17324D]">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-[#0B3C5D]">
            RoatanIsland.life
          </Link>
          <Link href="/" className="rounded-xl bg-white px-4 py-2 font-semibold shadow">
            Home
          </Link>
        </header>
        <section className="rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold text-[#0B3C5D]">My Bookings</h1>
          {bookings.length === 0 && !email.includes("@") ? (
            <form onSubmit={signIn} className="mt-8 grid gap-4">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="rounded-xl border border-gray-300 px-4 py-3" required />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="rounded-xl border border-gray-300 px-4 py-3" required />
              <button className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white">Login</button>
            </form>
          ) : bookings.length === 0 ? (
            <p className="mt-8 text-gray-600">No bookings found for {email}.</p>
          ) : (
            <div className="mt-8 grid gap-4">
              {bookings.map((booking) => (
                <Link
                  key={booking.id}
                  href={`/book/status/${booking.id}`}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <p className="font-bold text-[#0B3C5D]">
                    {booking.tour_date} at {booking.tour_time}
                  </p>
                  <p className="mt-2 text-sm capitalize text-gray-600">
                    {booking.guests} guests - {booking.status || "new"} -{" "}
                    {booking.deposit_status || "not requested"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
