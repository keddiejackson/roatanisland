"use client";

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
};

export default function AdminBookingsPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loggedIn = localStorage.getItem("admin");

    if (!loggedIn) {
      router.replace("/admin/login");
    } else {
      setAuthorized(true);
    }
  }, [router]);

  useEffect(() => {
    async function fetchBookings() {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading bookings:", error);
      } else {
        setBookings(data || []);
      }

      setLoading(false);
    }

    if (authorized) {
      fetchBookings();
    }
  }, [authorized]);

  if (!authorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0B3C5D]">Admin Bookings</h1>
            <p className="mt-2 text-gray-600">
              View all booking requests submitted through RoatanIsland.life
            </p>
          </div>

          <button
            onClick={() => {
              localStorage.removeItem("admin");
              router.push("/admin/login");
            }}
            className="rounded-xl bg-red-500 px-4 py-2 text-white"
          >
            Logout
          </button>
        </div>

        {loading ? (
          <p className="mt-8">Loading bookings...</p>
        ) : bookings.length === 0 ? (
          <p className="mt-8">No bookings found.</p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Guests</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id} className="border-b">
                    <td className="px-4 py-3">{booking.full_name}</td>
                    <td className="px-4 py-3">{booking.email}</td>
                    <td className="px-4 py-3">{booking.tour_date}</td>
                    <td className="px-4 py-3">{booking.tour_time}</td>
                    <td className="px-4 py-3">{booking.guests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}