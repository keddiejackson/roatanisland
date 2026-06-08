"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BookingChatDrawer, {
  type BookingChatThread,
} from "@/app/BookingChatDrawer";
import { useMobileSiteControls } from "@/app/SiteBrandingProvider";
import SiteLogo from "@/app/SiteLogo";
import SiteFooter from "@/app/SiteFooter";
import {
  bookingThreadSummary,
  type BookingMessageLike,
  type BookingThreadSummary,
} from "@/lib/booking-communication";
import {
  bookingNextAction,
  getBookingConfidenceCommandCenter,
} from "@/lib/booking-flow";
import {
  buildGuestTripPlanMapUrl,
  getGuestTripPlanSourceLabel,
  getGuestTripPlanStatusLabel,
  getGuestTripPlanSummary,
  type GuestTripPlan,
} from "@/lib/guest-trip-plans";
import {
  buildGuestPasswordResetRedirect,
  getGuestAuthSubmitLabel,
  getGuestSignOutLabel,
  type GuestAuthMode,
} from "@/lib/guest-account-actions";
import { supabase } from "@/lib/supabase";
import { displayNameFromProfile, profileInitials } from "@/lib/user-profile";

type Booking = {
  id: string;
  full_name: string;
  email: string;
  tour_date: string;
  tour_time: string;
  guests: number;
  status: string | null;
  deposit_status: string | null;
  deposit_amount_cents: number | null;
  booking_value_cents: number | null;
  payment_schedule_type: string | null;
  payment_due_date: string | null;
  balance_due_date: string | null;
  amount_paid_cents: number | null;
  balance_due_cents: number | null;
  payment_method: string | null;
  invoice_number: string | null;
  receipt_number: string | null;
  refund_status: string | null;
  refund_amount_cents: number | null;
  listing_id: string | null;
};

type BookingMessageRow = BookingMessageLike & {
  booking_id: string;
};

type BookingReadReceiptRow = {
  booking_id: string;
  last_read_at: string | null;
};

type GuestProfile = {
  email: string | null;
  display_name: string | null;
  profile_image_url: string | null;
};

type TripPlanApiResponse = {
  tripPlans?: GuestTripPlan[];
  error?: string;
};

type TripPlanConciergeResponse = {
  tripPlan?: GuestTripPlan;
  conciergeLeadId?: string;
  alreadyRequested?: boolean;
  error?: string;
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

function summarizeThreads(
  messages: BookingMessageRow[],
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
        "guest",
        lastReadByBooking.get(bookingId),
      ),
    ]),
  );
}

export default function AccountPage() {
  const router = useRouter();
  const mobileControls = useMobileSiteControls();
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
  const [profileForm, setProfileForm] = useState({
    displayName: "",
    profileImageUrl: "",
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [signOutLoading, setSignOutLoading] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tripPlans, setTripPlans] = useState<GuestTripPlan[]>([]);
  const [tripPlanMessage, setTripPlanMessage] = useState("");
  const [deletingTripPlanId, setDeletingTripPlanId] = useState("");
  const [requestingConciergePlanId, setRequestingConciergePlanId] =
    useState("");
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
      const { data: sessionData } = await supabase.auth.getSession();

      if (sessionData.session?.access_token) {
        const profileResponse = await fetch("/api/account/profile", {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });

        if (profileResponse.ok) {
          const result = (await profileResponse.json()) as {
            profile?: GuestProfile;
          };
          setProfileForm({
            displayName: result.profile?.display_name || "",
            profileImageUrl: result.profile?.profile_image_url || "",
          });
        }

        const tripPlansResponse = await fetch("/api/account/trip-plans", {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        });
        const tripPlansResult =
          (await tripPlansResponse.json()) as TripPlanApiResponse;

        if (tripPlansResponse.ok) {
          setTripPlans(tripPlansResult.tripPlans || []);
          setTripPlanMessage("");
        } else {
          setTripPlans([]);
          setTripPlanMessage(
            tripPlansResult.error ||
              "Saved map plans will appear after the guest trip plan SQL setup is enabled.",
          );
        }
      }

      const { data: bookingRows } = await supabase
        .from("bookings")
        .select("*")
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
          const { data: readRows } = await supabase
            .from("booking_message_reads")
            .select("booking_id, last_read_at")
            .in(
              "booking_id",
              accountBookings.map((booking) => booking.id),
            )
            .eq("reader_role", "guest")
            .eq("reader_email", data.user.email.toLowerCase());

          setThreadSummaries(
            summarizeThreads(
              (messageRows as BookingMessageRow[]) || [],
              (readRows as BookingReadReceiptRow[]) || [],
            ),
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
    setTripPlans([]);
    setTripPlanMessage("");
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
    setTripPlans([]);
    setTripPlanMessage("");
    setProfileForm({ displayName: "", profileImageUrl: "" });
    setProfileImageFile(null);
    setAuthMode("signin");
    router.refresh();
    window.location.reload();
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setProfileSaving(false);
      setProfileMessage("Please sign in again to update your profile.");
      return;
    }

    let imageUrl = profileForm.profileImageUrl;

    if (profileImageFile) {
      const formData = new FormData();
      formData.append("image", profileImageFile);

      const uploadResponse = await fetch("/api/uploads/guest-profile-image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setProfileSaving(false);
        setProfileMessage(uploadResult.error || "Unable to upload image.");
        return;
      }

      imageUrl = uploadResult.imageUrl || "";
    }

    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        displayName: profileForm.displayName,
        profileImageUrl: imageUrl,
      }),
    });
    const result = await response.json();
    setProfileSaving(false);

    if (!response.ok) {
      setProfileMessage(result.error || "Unable to save profile.");
      return;
    }

    setProfileImageFile(null);
    setProfileForm({
      displayName: result.profile?.display_name || "",
      profileImageUrl: result.profile?.profile_image_url || "",
    });
    setProfileMessage("Profile saved.");
  }

  async function deleteTripPlan(planId: string) {
    setDeletingTripPlanId(planId);
    setTripPlanMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setDeletingTripPlanId("");
      setTripPlanMessage("Please sign in again to remove a saved plan.");
      return;
    }

    const response = await fetch(`/api/account/trip-plans/${planId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const result = (await response.json()) as { error?: string };
    setDeletingTripPlanId("");

    if (!response.ok) {
      setTripPlanMessage(result.error || "Unable to remove this saved plan.");
      return;
    }

    setTripPlans((current) => current.filter((plan) => plan.id !== planId));
    setTripPlanMessage("Saved plan removed.");
  }

  async function requestConciergeForPlan(planId: string) {
    setRequestingConciergePlanId(planId);
    setTripPlanMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setRequestingConciergePlanId("");
      setTripPlanMessage("Please sign in again to request concierge help.");
      return;
    }

    const response = await fetch(
      `/api/account/trip-plans/${planId}/concierge`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const result = (await response.json()) as TripPlanConciergeResponse;
    setRequestingConciergePlanId("");

    if (!response.ok || !result.tripPlan) {
      setTripPlanMessage(
        result.error || "Unable to send this plan to the concierge team.",
      );
      return;
    }

    setTripPlans((current) =>
      current.map((plan) => (plan.id === planId ? result.tripPlan! : plan)),
    );
    setTripPlanMessage(
      result.alreadyRequested
        ? "This plan is already in the concierge queue."
        : "Concierge request sent. The team can now build a quote from this saved plan.",
    );
  }

  if (loading) {
    return <main className="min-h-screen bg-[#F7F3EA] p-8">Loading account...</main>;
  }

  const hasSignedIn = Boolean(signedInEmail);
  const isUpdatingPassword = authMode === "updatePassword";
  const latestBooking = bookings[0];
  const profileDisplayName = displayNameFromProfile({
    display_name: profileForm.displayName,
    email: signedInEmail,
  });
  const profileAvatarInitials = profileInitials(
    profileForm.displayName,
    signedInEmail,
  );
  const chatThreads: BookingChatThread[] = bookings.map((booking) => ({
    id: booking.id,
    title: `${booking.tour_date} at ${booking.tour_time}`,
    subtitle: `${booking.guests} guest${booking.guests === 1 ? "" : "s"} - ${
      booking.status || "new"
    }`,
    apiPath: `/api/bookings/${booking.id}/messages`,
    summary: threadSummaries[booking.id],
  }));
  const latestBookingAction = latestBooking
    ? bookingNextAction({
        status: latestBooking.status,
        depositStatus: latestBooking.deposit_status,
        canReview: Boolean(
          latestBooking.status === "completed" && latestBooking.listing_id,
        ),
      })
    : null;
  const latestBookingConfidence = latestBooking
    ? getBookingConfidenceCommandCenter({
        fullName: latestBooking.full_name,
        email: latestBooking.email,
        tourDate: latestBooking.tour_date,
        tourTime: latestBooking.tour_time,
        guests: String(latestBooking.guests || ""),
        pickupPreference: "",
        guestMessage: "",
        estimatedTotalLabel: latestBooking.booking_value_cents
          ? `$${Math.round(latestBooking.booking_value_cents / 100).toLocaleString()}`
          : "",
        availabilityTone:
          latestBooking.status === "cancelled" ? "blocked" : "available",
        hasListing: Boolean(latestBooking.listing_id),
        depositsEnabled: true,
      })
    : null;
  const latestThreadSummary = latestBooking
    ? threadSummaries[latestBooking.id]
    : undefined;

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-4 py-6 text-[#17324D] sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <SiteLogo />
          <div className="mobile-scroll-row sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <Link href="/" className="rounded-xl bg-white px-4 py-2 font-semibold shadow">
              Home
            </Link>
            <Link
              href="/map"
              className="rounded-xl bg-white px-4 py-2 font-semibold shadow"
            >
              Map
            </Link>
            {hasSignedIn ? (
              <button
                type="button"
                onClick={signOut}
                disabled={signOutLoading}
                className="rounded-xl bg-[#071F2F] px-4 py-2 text-sm font-black text-white shadow disabled:opacity-50"
              >
                {getGuestSignOutLabel(signOutLoading)}
              </button>
            ) : null}
          </div>
        </header>

        {signOutError ? (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {signOutError}
          </p>
        ) : null}

        <section
          aria-label="Private guest travel lounge"
          className="rounded-[1.75rem] bg-[#071F2F] p-6 text-white shadow-2xl shadow-[#071F2F]/20 sm:p-8"
        >
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#D6B56D]">
            <span className="sm:hidden">
              {mobileControls.mobileAccountEyebrow}
            </span>
            <span className="hidden sm:inline">Private guest lounge</span>
          </p>
          <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
                <span className="sm:hidden">
                  {hasSignedIn
                    ? mobileControls.mobileAccountHeadline
                    : mobileControls.mobileAccountSignedOutHeadline}
                </span>
                <span className="hidden sm:inline">
                  {hasSignedIn
                    ? `Welcome back, ${profileDisplayName}.`
                    : "Your Roatan trip, beautifully handled."}
                </span>
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-white/75">
                <span className="sm:hidden">
                  {hasSignedIn
                    ? mobileControls.mobileAccountIntro
                    : mobileControls.mobileAccountSignedOutIntro}
                </span>
                <span className="hidden sm:inline">
                  {hasSignedIn
                    ? "Your next trip, saved plans, and messages are gathered in one quiet place."
                    : "Sign in once to keep bookings, messages, saved map plans, and trip details in one calm place."}
                </span>
              </p>
            </div>
            <Link
              href={hasSignedIn ? "#guest-plans" : "/map"}
              className="rounded-xl bg-[#D6B56D] px-5 py-3 text-center font-bold text-[#071F2F] sm:w-auto"
            >
              <span className="sm:hidden">
                {hasSignedIn
                  ? mobileControls.mobileAccountPrimaryActionLabel
                  : "Start planning"}
              </span>
              <span className="hidden sm:inline">
                {hasSignedIn ? "View all trips" : "Start planning"}
              </span>
            </Link>
          </div>
        </section>

        {hasSignedIn ? (
          <section className="mt-6 rounded-[1.5rem] border border-white/70 bg-white p-4 shadow-xl shadow-[#0B3C5D]/5 sm:p-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                  Next up
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#0B3C5D] sm:mt-3 sm:text-3xl">
                  {latestBooking
                    ? `${latestBooking.tour_date} at ${latestBooking.tour_time}`
                    : "Start with your ideal island day."}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:mt-3 sm:text-base sm:leading-7">
                  {latestBookingAction?.text ||
                    "Save a few map stops or send a concierge request and we will keep the plan here."}
                </p>
                {latestThreadSummary?.lastMessagePreview ? (
                  <p className="mt-4 rounded-xl bg-[#F7F3EA] px-4 py-3 text-sm text-gray-600">
                    {latestThreadSummary.lastMessagePreview}
                  </p>
                ) : null}
                {latestBookingConfidence ? (
                  <div className="mt-4 hidden rounded-xl border border-[#00A8A8]/15 bg-[#EEF7F6] px-4 py-3 sm:block">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
                      Guest booking confidence
                    </p>
                    <p className="mt-1 font-black text-[#0B3C5D]">
                      {latestBookingConfidence.label} -{" "}
                      {latestBookingConfidence.score}/100
                    </p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {latestBookingConfidence.primaryText}
                    </p>
                  </div>
                ) : null}
              </div>
              {latestBooking ? (
                <span
                  className={`w-fit rounded-full px-3 py-1 text-xs font-black capitalize ${statusBadgeClass(
                    latestBooking.status,
                  )}`}
                >
                  {latestBooking.status || "new"}
                </span>
              ) : null}
            </div>
            <div className="mt-5 grid gap-2 sm:flex sm:flex-wrap">
              {latestBooking ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBookingId(latestBooking.id);
                      setChatOpen(true);
                    }}
                    className="rounded-xl bg-[#00A8A8] px-5 py-3 text-center text-sm font-black text-white"
                  >
                    Open messages
                  </button>
                  <Link
                    href={`/book/status/${latestBooking.id}`}
                    className="rounded-xl border border-[#00A8A8]/35 bg-white px-5 py-3 text-center text-sm font-black text-[#0B3C5D]"
                  >
                    View trip
                  </Link>
                  <Link
                    href={`/book/trip/${latestBooking.id}`}
                    className="rounded-xl border border-[#D6B56D]/50 bg-white px-5 py-3 text-center text-sm font-black text-[#0B3C5D]"
                  >
                    Trip packet
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/map"
                    className="rounded-xl bg-[#00A8A8] px-5 py-3 text-center text-sm font-black text-white"
                  >
                    Open the map
                  </Link>
                  <Link
                    href="/concierge"
                    className="rounded-xl border border-[#00A8A8]/35 bg-white px-5 py-3 text-center text-sm font-black text-[#0B3C5D]"
                  >
                    Ask concierge
                  </Link>
                </>
              )}
            </div>
          </section>
        ) : null}

        {hasSignedIn ? (
          <details
            id="guest-profile"
            className="mt-6 rounded-2xl bg-white p-4 shadow sm:p-6"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#00A8A8]">
                  Profile and settings
                </p>
                <h2 className="mt-1 text-2xl font-black text-[#0B3C5D]">
                  Name, photo, and sign out.
                </h2>
              </div>
              <span className="rounded-xl border border-[#00A8A8]/30 px-4 py-2 text-sm font-black text-[#007B7B]">
                Open
              </span>
            </summary>
            <form
              onSubmit={saveProfile}
              className="mt-5 grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-end"
            >
              <div className="flex items-center gap-4 md:block">
                <div className="grid size-20 place-items-center overflow-hidden rounded-2xl bg-[#EEF7F6] text-xl font-black text-[#007B7B] shadow-inner">
                  {profileForm.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profileForm.profileImageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    profileAvatarInitials
                  )}
                </div>
                <div className="md:hidden">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#00A8A8]">
                    Profile
                  </p>
                  <h2 className="text-xl font-black text-[#0B3C5D]">
                    {profileDisplayName}
                  </h2>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2 hidden md:block">
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#00A8A8]">
                    Profile
                  </p>
                  <h2 className="mt-1 text-2xl font-black text-[#0B3C5D]">
                    Chat identity
                  </h2>
                </div>
                <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
                  Display name
                  <input
                    value={profileForm.displayName}
                    onChange={(e) =>
                      setProfileForm((current) => ({
                        ...current,
                        displayName: e.target.value,
                      }))
                    }
                    placeholder="Your name"
                    className="rounded-xl border border-gray-300 px-4 py-3 font-normal"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-[#0B3C5D]">
                  Profile picture
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setProfileImageFile(e.target.files?.[0] || null)
                    }
                    className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-normal"
                  />
                </label>
                <p className="sm:col-span-2 text-sm leading-6 text-gray-600">
                  This name and picture can appear beside your booking chat
                  messages.
                </p>
                {profileMessage ? (
                  <p className="sm:col-span-2 rounded-xl bg-[#EEF7F6] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
                    {profileMessage}
                  </p>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={profileSaving}
                className="rounded-xl bg-[#00A8A8] px-5 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {profileSaving ? "Saving..." : "Save profile"}
              </button>
            </form>
          </details>
        ) : null}

        {hasSignedIn ? (
          <section
            id="guest-plans"
            className="mt-6 rounded-[1.5rem] bg-white p-4 shadow-xl shadow-[#0B3C5D]/5 sm:p-8"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                  Your plans
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#0B3C5D] sm:text-3xl">
                  Trips and saved map ideas.
                </h2>
                <p className="mt-2 hidden text-sm leading-6 text-gray-600 sm:block">
                  Keep the overview light. Open a trip when you need payments,
                  invoices, change requests, or a full packet.
                </p>
              </div>
              <Link
                href="/map"
                className="rounded-xl bg-[#00A8A8] px-5 py-3 text-center text-sm font-black text-white"
              >
                Open map
              </Link>
            </div>

            {tripPlanMessage ? (
              <p className="mt-4 rounded-xl bg-[#EEF7F6] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
                {tripPlanMessage}
              </p>
            ) : null}

            {tripPlans.length === 0 && bookings.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-[#D6B56D]/50 bg-[#FFF8E8] p-5">
                <p className="font-black text-[#0B3C5D]">No plans yet.</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Start with the map, save a few stops, or ask concierge for a
                  hand-built day.
                </p>
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {tripPlans.slice(0, 2).map((plan) => {
                  const conciergeRequested =
                    plan.status === "concierge_requested" ||
                    Boolean(plan.conciergeLeadId);

                  return (
                  <article
                    id={`trip-plan-${plan.id || plan.name}`}
                    key={plan.id || plan.name}
                    className="rounded-2xl border border-[#D6B56D]/25 bg-[#FFFDF7] p-5"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9C7A2F]">
                            {getGuestTripPlanSourceLabel(plan.source)}
                          </p>
                          <span className="rounded-full bg-[#EEF7F6] px-2.5 py-1 text-[0.65rem] font-black uppercase text-[#007B7B]">
                            {getGuestTripPlanStatusLabel(plan.status)}
                          </span>
                        </div>
                        <h3 className="mt-1 text-xl font-black text-[#0B3C5D]">
                          {plan.name}
                        </h3>
                        <p className="mt-2 text-sm font-semibold text-gray-600">
                          {getGuestTripPlanSummary(plan)}
                        </p>
                      </div>
                      {plan.guestCount ? (
                        <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-black text-[#007B7B]">
                          {plan.guestCount} guests
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-2">
                      {plan.stops.slice(0, 4).map((stop, index) => (
                        <div
                          key={`${plan.id}-${stop.listingId}-${index}`}
                          className="flex items-center gap-3 rounded-xl bg-white px-3 py-2"
                        >
                          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#D6B56D] text-xs font-black text-[#071F2F]">
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-[#0B3C5D]">
                              {stop.title}
                            </p>
                            <p className="text-xs text-gray-500">
                              {stop.timeBlock || "Flexible"}
                              {stop.location ? ` - ${stop.location}` : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={buildGuestTripPlanMapUrl(plan)}
                        className="rounded-xl bg-[#0B3C5D] px-4 py-2 text-sm font-black text-white"
                      >
                        Reopen map
                      </Link>
                      {plan.id ? (
                        <button
                          type="button"
                          onClick={() => requestConciergeForPlan(plan.id || "")}
                          disabled={
                            conciergeRequested ||
                            requestingConciergePlanId === plan.id
                          }
                          className={`rounded-xl border px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-70 ${
                            conciergeRequested
                              ? "border-green-200 bg-green-50 text-green-800"
                              : "border-[#00A8A8]/30 text-[#007B7B]"
                          }`}
                        >
                          {conciergeRequested
                            ? "Requested"
                            : requestingConciergePlanId === plan.id
                              ? "Sending..."
                              : "Ask concierge"}
                        </button>
                      ) : (
                        <Link
                          href="/concierge"
                          className="rounded-xl border border-[#00A8A8]/30 px-4 py-2 text-sm font-black text-[#007B7B]"
                        >
                          Ask concierge
                        </Link>
                      )}
                      {plan.id ? (
                        <button
                          type="button"
                          onClick={() => deleteTripPlan(plan.id || "")}
                          disabled={deletingTripPlanId === plan.id}
                          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-black text-red-700 disabled:opacity-50"
                        >
                          {deletingTripPlanId === plan.id ? "Removing..." : "Remove"}
                        </button>
                      ) : null}
                    </div>
                  </article>
                  );
                })}
                {latestBooking ? (
                  <article className="rounded-2xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
                          Latest trip
                        </p>
                        <h3 className="mt-1 text-xl font-black text-[#0B3C5D]">
                          {latestBooking.tour_date} at {latestBooking.tour_time}
                        </h3>
                        <p className="mt-2 text-sm font-semibold text-gray-600">
                          {latestBooking.guests} guests
                          {latestBooking.deposit_status
                            ? ` - deposit ${latestBooking.deposit_status}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black capitalize ${statusBadgeClass(
                          latestBooking.status,
                        )}`}
                      >
                        {latestBooking.status || "new"}
                      </span>
                    </div>
                    <p className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-sm text-gray-600">
                      {latestThreadSummary?.lastMessagePreview ||
                        "Open the trip for payment details, pickup notes, and next steps."}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBookingId(latestBooking.id);
                          setChatOpen(true);
                        }}
                        className="rounded-xl bg-[#00A8A8] px-4 py-2 text-sm font-black text-white"
                      >
                        Open messages
                      </button>
                      <Link
                        href={`/book/status/${latestBooking.id}`}
                        className="rounded-xl bg-[#0B3C5D] px-4 py-2 text-sm font-black text-white"
                      >
                        View trip
                      </Link>
                      <Link
                        href={`/book/trip/${latestBooking.id}`}
                        className="rounded-xl border border-[#D6B56D]/50 px-4 py-2 text-sm font-black text-[#0B3C5D]"
                      >
                        Trip packet
                      </Link>
                    </div>
                  </article>
                ) : null}
            </div>

            {bookings.length > 0 ? (
              <details className="mt-5 rounded-2xl border border-gray-200 bg-[#FFFDF7] p-4">
                <summary className="cursor-pointer list-none text-sm font-black text-[#0B3C5D]">
                  View all trips
                </summary>
                <div className="mt-4 grid gap-3">
                  {bookings.map((booking) => (
                    <article
                      key={booking.id}
                      className="rounded-xl border border-gray-200 bg-white p-4"
                    >
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div>
                          <p className="font-black text-[#0B3C5D]">
                            {booking.tour_date} at {booking.tour_time}
                          </p>
                          <p className="mt-1 text-sm capitalize text-gray-600">
                            {booking.guests} guests -{" "}
                            {booking.deposit_status || "deposit not requested"}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black capitalize ${statusBadgeClass(
                              booking.status,
                            )}`}
                          >
                            {booking.status || "new"}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${threadBadgeClass(
                              threadSummaries[booking.id],
                            )}`}
                          >
                            {threadSummaries[booking.id]?.badgeLabel ||
                              "No messages"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBookingId(booking.id);
                            setChatOpen(true);
                          }}
                          className="rounded-lg bg-[#00A8A8] px-4 py-2 text-sm font-bold text-white"
                        >
                          Open messages
                        </button>
                        <Link
                          href={`/book/status/${booking.id}`}
                          className="rounded-lg border border-[#00A8A8] px-4 py-2 text-sm font-bold text-[#007B7B]"
                        >
                          View trip
                        </Link>
                        <Link
                          href={`/book/trip/${booking.id}`}
                          className="rounded-lg border border-[#D6B56D]/50 px-4 py-2 text-sm font-bold text-[#0B3C5D]"
                        >
                          Trip packet
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </details>
            ) : null}
          </section>
        ) : null}

        {(!hasSignedIn || isUpdatingPassword) ? (
          <section className="mt-6 rounded-[1.5rem] bg-white p-6 shadow-xl shadow-[#0B3C5D]/5 sm:p-8">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                Sign in
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#0B3C5D]">
                Access your Roatan plans.
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                Use the same email from your booking request to see messages and trip details.
              </p>
            </div>

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
          </section>
        ) : null}

        {hasSignedIn ? (
          <section className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-[#D6B56D]/30 bg-[#FFF8E8] p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9C7A2F]">
                Need help?
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-600">
                Concierge support can help with pickup notes, timing, cancellations, or trip-day questions.
              </p>
            </div>
            <Link
              href="/support"
              className="rounded-xl bg-[#0B3C5D] px-4 py-3 text-center text-sm font-black text-white"
            >
              Contact concierge
            </Link>
          </section>
        ) : null}

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
