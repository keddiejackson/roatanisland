"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import BookingChatDrawer, {
  type BookingChatThread,
} from "@/app/BookingChatDrawer";
import {
  bookingThreadSummary,
  type BookingMessageLike,
  type BookingThreadSummary,
  type BookingThreadViewerRole,
} from "@/lib/booking-communication";
import {
  buildGlobalBookingChatThread,
  shouldShowGlobalBookingChat,
  type GlobalBookingChatBooking,
} from "@/lib/global-booking-chat";
import { supabase } from "@/lib/supabase";

type BookingRow = GlobalBookingChatBooking & {
  listing_id?: string | null;
  created_at?: string | null;
};

type BookingMessageRow = BookingMessageLike & {
  booking_id: string;
};

type BookingReadReceiptRow = {
  booking_id: string;
  last_read_at: string | null;
};

function summarizeThreads(
  messages: BookingMessageRow[],
  viewerRole: BookingThreadViewerRole,
  readReceipts: BookingReadReceiptRow[] = [],
) {
  const grouped = new Map<string, BookingMessageLike[]>();
  const lastReadByBooking = new Map(
    readReceipts.map((receipt) => [receipt.booking_id, receipt.last_read_at]),
  );

  for (const message of messages) {
    grouped.set(message.booking_id, [
      ...(grouped.get(message.booking_id) || []),
      message,
    ]);
  }

  return Object.fromEntries(
    [...grouped.entries()].map(([bookingId, bookingMessages]) => [
      bookingId,
      bookingThreadSummary(
        bookingMessages,
        viewerRole,
        lastReadByBooking.get(bookingId),
      ),
    ]),
  );
}

async function addListingNames(bookings: BookingRow[]) {
  const listingIds = [
    ...new Set(
      bookings
        .map((booking) => booking.listing_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (listingIds.length === 0) {
    return bookings.map((booking) => ({
      ...booking,
      listing_name: booking.listing_name || "Roatan booking",
    }));
  }

  const { data } = await supabase
    .from("listings")
    .select("id, title")
    .in("id", listingIds);
  const listingNames = new Map(
    ((data as { id: string; title: string | null }[]) || []).map((listing) => [
      listing.id,
      listing.title || "Roatan booking",
    ]),
  );

  return bookings.map((booking) => ({
    ...booking,
    listing_name:
      booking.listing_name ||
      (booking.listing_id ? listingNames.get(booking.listing_id) : null) ||
      "Roatan booking",
  }));
}

async function getViewerRole(
  userId: string,
  email: string,
): Promise<BookingThreadViewerRole> {
  const { data: adminRecord } = await supabase
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (adminRecord) {
    return "admin";
  }

  const { data: vendorRecord } = await supabase
    .from("vendor_users")
    .select("vendor_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (vendorRecord?.vendor_id) {
    return "vendor";
  }

  return "guest";
}

async function getBookingsForRole({
  viewerRole,
  email,
  token,
}: {
  viewerRole: BookingThreadViewerRole;
  email: string;
  token: string;
}) {
  if (viewerRole === "vendor") {
    const response = await fetch("/api/vendor/bookings", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) return [];

    const result = (await response.json()) as { bookings?: BookingRow[] };
    return (result.bookings || []).slice(0, 100);
  }

  const query = supabase
    .from("bookings")
    .select(
      "id, full_name, tour_date, tour_time, guests, status, listing_id, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const { data } =
    viewerRole === "admin" ? await query : await query.eq("email", email);

  return addListingNames((data as BookingRow[]) || []);
}

async function getThreadSummaries({
  bookings,
  viewerRole,
  email,
}: {
  bookings: BookingRow[];
  viewerRole: BookingThreadViewerRole;
  email: string;
}): Promise<Record<string, BookingThreadSummary>> {
  if (bookings.length === 0) {
    return {};
  }

  const bookingIds = bookings.map((booking) => booking.id);
  const [{ data: messageRows }, { data: readRows }] = await Promise.all([
    supabase
      .from("booking_messages")
      .select(
        "booking_id, sender_role, sender_email, message, is_internal, created_at",
      )
      .in("booking_id", bookingIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("booking_message_reads")
      .select("booking_id, last_read_at")
      .in("booking_id", bookingIds)
      .eq("reader_role", viewerRole)
      .eq("reader_email", email.toLowerCase()),
  ]);

  return summarizeThreads(
    (messageRows as BookingMessageRow[]) || [],
    viewerRole,
    (readRows as BookingReadReceiptRow[]) || [],
  );
}

export default function GlobalBookingChat() {
  const pathname = usePathname();
  const [viewerRole, setViewerRole] =
    useState<BookingThreadViewerRole>("guest");
  const [threads, setThreads] = useState<BookingChatThread[]>([]);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadGlobalChat() {
      if (!shouldShowGlobalBookingChat(pathname)) {
        setThreads([]);
        return;
      }

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const email = session?.user.email || "";
      const token = session?.access_token || "";

      if (!session?.user.id || !email || !token) {
        if (!isMounted) return;
        setIsSignedIn(false);
        setThreads([]);
        return;
      }

      const nextViewerRole = await getViewerRole(session.user.id, email);
      const bookings = await getBookingsForRole({
        viewerRole: nextViewerRole,
        email,
        token,
      });
      const summaries = await getThreadSummaries({
        bookings,
        viewerRole: nextViewerRole,
        email,
      });
      const nextThreads = bookings.map((booking) =>
        buildGlobalBookingChatThread(
          booking,
          nextViewerRole,
          summaries[booking.id],
        ),
      );

      if (!isMounted) return;

      setViewerRole(nextViewerRole);
      setIsSignedIn(true);
      setThreads(nextThreads);
    }

    loadGlobalChat();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadGlobalChat();
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [pathname]);

  if (!isSignedIn || !shouldShowGlobalBookingChat(pathname)) {
    return null;
  }

  return (
    <BookingChatDrawer
      threads={threads}
      viewerRole={viewerRole}
      allowInternalNotes={viewerRole === "admin"}
      showWhenEmpty
      emptyText="No booking conversations yet."
    />
  );
}
