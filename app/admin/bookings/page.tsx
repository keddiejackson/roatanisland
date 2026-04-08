import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function getBookings() {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  return data ?? [];
}

export default async function AdminBookingsPage() {
  const bookings = await getBookings();

  return (
    <main className="min-h-screen bg-[#F4EBD0] px-6 py-16 text-[#1F2937]">
      <div className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow">
        <h1 className="text-3xl font-bold text-[#0B3C5D]">Admin Bookings</h1>
        <p className="mt-2 text-gray-600">
          View all booking requests submitted through RoatanIsland.life
        </p>

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
              {bookings.map((booking: any) => (
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
      </div>
    </main>
  );
}