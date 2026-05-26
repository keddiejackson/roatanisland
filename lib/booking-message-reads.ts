import type { BookingThreadViewerRole } from "@/lib/booking-communication";
import { supabaseServer } from "@/lib/supabase-server";

export type BookingMessageReadReceipt = {
  booking_id: string;
  reader_role: BookingThreadViewerRole;
  reader_email: string;
  last_read_at: string;
};

type MarkReadInput = {
  bookingId: string;
  readerRole: BookingThreadViewerRole;
  readerEmail: string | null | undefined;
};

export async function markBookingThreadRead({
  bookingId,
  readerRole,
  readerEmail,
}: MarkReadInput) {
  if (!readerEmail) {
    return null;
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseServer
    .from("booking_message_reads")
    .upsert(
      {
        booking_id: bookingId,
        reader_role: readerRole,
        reader_email: readerEmail.toLowerCase(),
        last_read_at: now,
        updated_at: now,
      },
      {
        onConflict: "booking_id,reader_role,reader_email",
      },
    )
    .select("booking_id, reader_role, reader_email, last_read_at")
    .single();

  if (error) {
    console.info("Booking read receipt skipped:", error.message);
    return null;
  }

  return data as BookingMessageReadReceipt;
}
