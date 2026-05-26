"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BookingChatDrawer, {
  type BookingChatThread,
} from "@/app/BookingChatDrawer";
import GuestTravelCommandCenter from "@/app/account/GuestTravelCommandCenter";
import EmptyState from "@/app/EmptyState";
import SiteLogo from "@/app/SiteLogo";
import SiteFooter from "@/app/SiteFooter";
import {
  bookingThreadSummary,
  type BookingMessageLike,
  type BookingThreadSummary,
} from "@/lib/booking-communication";
import {
  buildGuestPasswordResetRedirect,
  getGuestAuthSubmitLabel,
  getGuestSignOutLabel,
  type GuestAuthMode,
} from "@/lib/guest-account-actions";
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

type BookingMessageRow = BookingMessageLike & {
  booking_id: string;
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

function threadBadgeClass(summary?: BookingThreadSummary) {
  if (!summary || summary.messageCount === 0) {
    return "bg-gray-100 text-gray-600";
  }

  if (summary.needsResponse) {
    return "bg-[#00A8A8] text-white";
  }

  return "bg-[#EEF7F6] text-[#0B3C5D]";
}

function summarizeThreads(messages: BookingMessageRow[]) {
  const grouped = new Map<string, BookingMessageLike[]>();

  for (const message of messages) {
    grouped.set(message.booking_id, [
      ...(grouped.get(message.booking_id) || []),
      message,
    ]);
  }

  return Object.fromEntries(
    [...grouped.entries()].map(([bookingId, bookingMessages]) => [
      bookingId,
      bookingThreadSummary(bookingMessages, "guest"),
    ]),
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [signedInEmail, setSignedInEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authMode, setAuthMode] = useState<GuestAuthMode>("signin");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [authMessageTone, setAuthMessageTone] = useState<"error" | "success">(
    "success",
  );
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [threadSummaries, setThreadSummaries] = useState<
    Record<string, BookingThreadSummary>
  >({});
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAccount() {
      const requestedMode = new URLSearchParams(window.location.search).get(
        "mode",
      );

      if (requestedMode === "signup") {
        setAuthMode("signup");
      } else if (requestedMode === "reset") {
        setAuthMode("updatePassword");
      }

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
      const accountBookings = (bookingRows as Booking[]) || [];
      setBookings(accountBookings);

      if (accountBookings.length > 0) {
        const { data: messageRows, error: messageError } = await supabase
          .from("booking_messages")
          .select("booking_id, sender_role, sender_email, message, is_internal, created_at")
          .in(
            "booking_id",
            accountBookings.map((booking) => booking.id),
          )
          .order("created_at", { ascending: true });

        if (!messageError) {
          setThreadSummaries(
            summarizeThreads((messageRows as BookingMessageRow[]) || []),
          );
        }
      } else {
        setThreadSummaries({});
      }

      setLoading(false);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("updatePassword");
        setAuthMessage("");
      }
    });

    loadAccount();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setAuthLoading(false);

    if (error) {
      setAuthMessageTone("error");
      setAuthMessage(error.message);
      return;
    }

    router.refresh();
    window.location.reload();
  }

  async function signUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });

    setAuthLoading(false);

    if (error) {
      setAuthMessageTone("error");
      setAuthMessage(error.message);
      return;
    }

    if (data.session) {
      router.refresh();
      window.location.reload();
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setAuthMessageTone("success");
    setAuthMessage(
      "Check your email to confirm your guest account. After confirmation, this page will open so you can sign in.",
    );
  }

  async function sendPasswordReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: buildGuestPasswordResetRedirect(window.location.origin),
    });

    setAuthLoading(false);

    if (error) {
      setAuthMessageTone("error");
      setAuthMessage(error.message);
      return;
    }

    setPassword("");
    setConfirmPassword("");
    setAuthMessageTone("success");
    setAuthMessage(
      "Check your email for a password reset link. It will bring you back here to set a new password.",
    );
  }

  async function updatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAuthMessage("");

    if (password !== confirmPassword) {
      setAuthMessageTone("error");
      setAuthMessage("Passwords do not match.");
      return;
    }

    setAuthLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setAuthLoading(false);

    if (error) {
      setAuthMessageTone("error");
      setAuthMessage(error.message);
      return;
    }

    await supabase.auth.signOut();

    setPassword("");
    setConfirmPassword("");
    setEmail("");
    setSignedInEmail("");
    setBookings([]);
    setAuthMode("signin");
    setAuthMessageTone("success");
    setAuthMessage("Password updated. You can now sign in with your new password.");
  }

  function chooseAuthMode(mode: GuestAuthMode) {
    setAuthMode(mode);
    setAuthMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  async function signOut() {
    setSignOutLoading(true);
    setSignOutError("");

    const { error } = await supabase.auth.signOut();

    setSignOutLoading(false);

    if (error) {
      setSignOutError(error.message);
      return;
    }

    setEmail("");
    setSignedInEmail("");
    setPassword("");
    setConfirmPassword("");
    setBookings([]);
    setAuthMode("signin");
    router.refresh();
    window.location.reload();
  }

  if (loading) {
    return <main className="min-h-screen bg-[#F7F3EA] p-8">Loading account...</main>;
  }

  const hasSignedIn = Boolean(signedInEmail);
  const isUpdatingPassword = authMode === "updatePassword";
  const latestBooking = bookings[0];
  const confirmedCount = bookings.filter(
    (booking) => booking.status === "confirmed",
  ).length;
  const chatThreads: BookingChatThread[] = bookings.map((booking) => ({
    id: booking.id,
    title: `${booking.tour_date} at ${booking.tour_time}`,
    subtitle: `${booking.guests} guest${booking.guests === 1 ? "" : "s"} - ${
      booking.status || "new"
    }`,
    apiPath: `/api/bookings/${booking.id}/messages`,
    summary: threadSummaries[booking.id],
  }));

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

        {hasSignedIn ? (
          <GuestTravelCommandCenter
            bookings={bookings}
            email={signedInEmail}
          />
        ) : null}

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
              <div className="flex flex-wrap items-center gap-2">
                <p className="rounded-xl bg-[#EEF7F6] px-4 py-2 text-sm font-bold text-[#0B3C5D]">
                  Signed in as {signedInEmail}
                </p>
                <button
                  type="button"
                  onClick={signOut}
                  disabled={signOutLoading}
                  className="rounded-xl border border-[#0B3C5D]/20 bg-white px-4 py-2 text-sm font-black text-[#0B3C5D] transition hover:-translate-y-0.5 hover:border-[#00A8A8] disabled:opacity-50"
                >
                  {getGuestSignOutLabel(signOutLoading)}
                </button>
              </div>
            ) : null}
          </div>

          {signOutError ? (
            <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {signOutError}
            </p>
          ) : null}

          {isUpdatingPassword || (bookings.length === 0 && !hasSignedIn) ? (
            <form
              onSubmit={
                authMode === "signup"
                  ? signUp
                  : authMode === "reset"
                    ? sendPasswordReset
                    : authMode === "updatePassword"
                      ? updatePassword
                      : signIn
              }
              className="mt-8 grid gap-4"
            >
              <div className="grid gap-2 rounded-xl bg-[#EEF7F6] p-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => chooseAuthMode("signin")}
                  className={`rounded-lg px-4 py-3 text-sm font-black transition ${
                    authMode === "signin"
                      ? "bg-white text-[#0B3C5D] shadow-sm"
                      : "text-[#466176] hover:bg-white/60"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => chooseAuthMode("signup")}
                  className={`rounded-lg px-4 py-3 text-sm font-black transition ${
                    authMode === "signup"
                      ? "bg-white text-[#0B3C5D] shadow-sm"
                      : "text-[#466176] hover:bg-white/60"
                  }`}
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => chooseAuthMode("reset")}
                  className={`rounded-lg px-4 py-3 text-sm font-black transition ${
                    authMode === "reset" || authMode === "updatePassword"
                      ? "bg-white text-[#0B3C5D] shadow-sm"
                      : "text-[#466176] hover:bg-white/60"
                  }`}
                >
                  Forgot password?
                </button>
              </div>
              <p className="text-sm leading-6 text-gray-600">
                {authMode === "signup"
                  ? "Create a free guest account with the same email you use for bookings."
                  : authMode === "reset"
                    ? "Enter your guest account email and we will send a password reset link."
                    : authMode === "updatePassword"
                      ? "Enter and confirm your new guest account password."
                      : "Sign in with the email you used for your booking requests."}
              </p>
              {authMode !== "updatePassword" ? (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  className="rounded-xl border border-gray-300 px-4 py-3"
                  required
                />
              ) : null}
              {authMode !== "reset" ? (
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    authMode === "updatePassword" ? "New password" : "Password"
                  }
                  className="rounded-xl border border-gray-300 px-4 py-3"
                  minLength={6}
                  required
                />
              ) : null}
              {authMode === "updatePassword" ? (
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="rounded-xl border border-gray-300 px-4 py-3"
                  minLength={6}
                  required
                />
              ) : null}
              {authMessage ? (
                <p
                  className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                    authMessageTone === "error"
                      ? "bg-red-50 text-red-700"
                      : "bg-green-50 text-green-800"
                  }`}
                >
                  {authMessage}
                </p>
              ) : null}
              <button
                disabled={authLoading}
                className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {getGuestAuthSubmitLabel(authMode, authLoading)}
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
                <article
                  key={booking.id}
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
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusBadgeClass(
                          booking.status,
                        )}`}
                      >
                        {booking.status || "new"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${threadBadgeClass(
                          threadSummaries[booking.id],
                        )}`}
                      >
                        {threadSummaries[booking.id]?.badgeLabel || "No messages"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-4 rounded-xl bg-[#F7F3EA] px-4 py-3 text-sm text-gray-600">
                    {threadSummaries[booking.id]?.lastMessagePreview ||
                      "No booking messages yet."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBookingId(booking.id);
                        setChatOpen(true);
                      }}
                      className="rounded-lg bg-[#00A8A8] px-4 py-2 text-sm font-bold text-white"
                    >
                      Open inbox
                    </button>
                    <Link
                      href={`/book/status/${booking.id}`}
                      className="rounded-lg border border-[#00A8A8] px-4 py-2 text-sm font-bold text-[#007B7B]"
                    >
                      View details
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        {hasSignedIn ? (
          <BookingChatDrawer
            threads={chatThreads}
            viewerRole="guest"
            open={chatOpen}
            onOpenChange={setChatOpen}
            selectedThreadId={selectedBookingId}
            onSelectedThreadIdChange={setSelectedBookingId}
            emptyText="No guest booking conversations yet."
          />
        ) : null}
      </div>
      <SiteFooter />
    </main>
  );
}
