"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BookingChatDrawer, {
  type BookingChatThread,
} from "@/app/BookingChatDrawer";
import EmptyState from "@/app/EmptyState";
import SiteLogo from "@/app/SiteLogo";
import SiteFooter from "@/app/SiteFooter";
import {
  bookingThreadSummary,
  type BookingMessageLike,
  type BookingThreadSummary,
} from "@/lib/booking-communication";
import {
  formatMoneyCents,
  getBookingMoneySnapshot,
  getGuestBalanceSummary,
} from "@/lib/booking-money-command";
import {
  getBookingChangeRequestSummary,
  type BookingChangeRequest,
} from "@/lib/booking-change-requests";
import { bookingNextAction } from "@/lib/booking-flow";
import { getGuestTripHubHero } from "@/lib/guest-command-center";
import {
  buildGuestTripPlanMapUrl,
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
import { getGuestSupportTicketSummary } from "@/lib/support-tickets";
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

type SupportTicket = {
  id: string;
  intent: string;
  status: string;
  priority: string;
  admin_notes: string | null;
  message: string;
  booking_reference: string | null;
  created_at: string;
  updated_at: string;
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

type ChangeRequestForm = {
  tourDate: string;
  tourTime: string;
  guests: string;
  pickupNote: string;
  reason: string;
};

type AccountTab = "overview" | "messages" | "profile";

const accountTabs: Array<{
  id: AccountTab;
  label: string;
  text: string;
}> = [
  { id: "overview", label: "Overview", text: "Trips, plans, and help" },
  { id: "messages", label: "Messages", text: "Chat with the team" },
  { id: "profile", label: "Profile", text: "Name and photo" },
];

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

function nextActionClass(tone: ReturnType<typeof bookingNextAction>["tone"]) {
  if (tone === "cancelled") return "border-red-200 bg-red-50 text-red-800";
  if (tone === "complete" || tone === "paid") {
    return "border-green-200 bg-green-50 text-green-800";
  }
  if (tone === "confirmed") {
    return "border-[#00A8A8]/25 bg-[#EEF7F6] text-[#0B3C5D]";
  }
  return "border-[#D6B56D]/35 bg-[#FFF8E8] text-[#0B3C5D]";
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
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportTicketMessage, setSupportTicketMessage] = useState("");
  const [changeRequestsByBooking, setChangeRequestsByBooking] = useState<
    Record<string, BookingChangeRequest[]>
  >({});
  const [changeRequestForms, setChangeRequestForms] = useState<
    Record<string, ChangeRequestForm>
  >({});
  const [changeRequestMessages, setChangeRequestMessages] = useState<
    Record<string, string>
  >({});
  const [savingChangeRequestId, setSavingChangeRequestId] = useState("");
  const [threadSummaries, setThreadSummaries] = useState<
    Record<string, BookingThreadSummary>
  >({});
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [activeAccountTab, setActiveAccountTab] =
    useState<AccountTab>("overview");
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

      const { data: supportTicketRows, error: supportTicketError } =
        await supabase
          .from("support_tickets")
          .select(
            "id, intent, status, priority, admin_notes, message, booking_reference, created_at, updated_at",
          )
          .eq("email", data.user.email.toLowerCase())
          .order("created_at", { ascending: false })
          .limit(20);

      if (supportTicketError) {
        setSupportTicketMessage(
          "Support request history will appear after the support ticket SQL setup is enabled.",
        );
      } else {
        setSupportTickets((supportTicketRows as SupportTicket[]) || []);
        setSupportTicketMessage("");
      }

      setChangeRequestForms(
        Object.fromEntries(
          accountBookings.map((booking) => [
            booking.id,
            {
              tourDate: "",
              tourTime: "",
              guests: "",
              pickupNote: "",
              reason: "",
            },
          ]),
        ),
      );

      if (accountBookings.length > 0) {
        if (sessionData.session?.access_token) {
          const changeRequestEntries = await Promise.all(
            accountBookings.map(async (booking) => {
              const response = await fetch(
                `/api/bookings/${booking.id}/change-requests`,
                {
                  headers: {
                    Authorization: `Bearer ${sessionData.session?.access_token}`,
                  },
                },
              );

              if (!response.ok) {
                return [booking.id, []] as const;
              }

              const result = (await response.json()) as {
                changeRequests?: BookingChangeRequest[];
              };

              return [booking.id, result.changeRequests || []] as const;
            }),
          );

          setChangeRequestsByBooking(Object.fromEntries(changeRequestEntries));
        }

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
        setChangeRequestsByBooking({});
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
    setSupportTickets([]);
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
    setSupportTickets([]);
    setSupportTicketMessage("");
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

  function updateChangeRequestForm(
    bookingId: string,
    values: Partial<ChangeRequestForm>,
  ) {
    setChangeRequestForms((current) => {
      const existing = current[bookingId] || {
        tourDate: "",
        tourTime: "",
        guests: "",
        pickupNote: "",
        reason: "",
      };

      return {
        ...current,
        [bookingId]: {
          ...existing,
          ...values,
        },
      };
    });
  }

  async function submitChangeRequest(
    e: React.FormEvent<HTMLFormElement>,
    booking: Booking,
  ) {
    e.preventDefault();
    setSavingChangeRequestId(booking.id);
    setChangeRequestMessages((current) => ({ ...current, [booking.id]: "" }));

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setSavingChangeRequestId("");
      setChangeRequestMessages((current) => ({
        ...current,
        [booking.id]: "Please sign in again to request a change.",
      }));
      return;
    }

    const form = changeRequestForms[booking.id] || {
      tourDate: "",
      tourTime: "",
      guests: "",
      pickupNote: "",
      reason: "",
    };
    const response = await fetch(`/api/bookings/${booking.id}/change-requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        requestedTourDate: form.tourDate || null,
        requestedTourTime: form.tourTime || null,
        requestedGuests: form.guests ? Number(form.guests) : null,
        requestedPickupNote: form.pickupNote || null,
        reason: form.reason || null,
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      changeRequest?: BookingChangeRequest;
    };

    setSavingChangeRequestId("");

    const createdChangeRequest = result.changeRequest;

    if (!response.ok || !createdChangeRequest) {
      setChangeRequestMessages((current) => ({
        ...current,
        [booking.id]: result.error || "Unable to send change request.",
      }));
      return;
    }

    setChangeRequestsByBooking((current) => ({
      ...current,
      [booking.id]: [createdChangeRequest, ...(current[booking.id] || [])],
    }));
    updateChangeRequestForm(booking.id, {
      tourDate: "",
      tourTime: "",
      guests: "",
      pickupNote: "",
      reason: "",
    });
    setChangeRequestMessages((current) => ({
      ...current,
      [booking.id]: "Change request sent.",
    }));
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
  const confirmedCount = bookings.filter(
    (booking) => booking.status === "confirmed",
  ).length;
  const guestBalanceSummary = getGuestBalanceSummary(bookings);
  const supportTicketSummary = getGuestSupportTicketSummary({
    tickets: supportTickets,
  });
  const nextTripDate =
    bookings
      .map((booking) => booking.tour_date || "")
      .filter(Boolean)
      .sort()[0] ||
    latestBooking?.tour_date ||
    "Flexible";
  const tripHero = getGuestTripHubHero({
    bookingCount: bookings.length,
    confirmedCount,
    tripScore: confirmedCount > 0 ? 86 : bookings.length > 0 ? 58 : 20,
    nextDate: nextTripDate,
    walletLabel: guestBalanceSummary.label,
  });
  const chatThreads: BookingChatThread[] = bookings.map((booking) => ({
    id: booking.id,
    title: `${booking.tour_date} at ${booking.tour_time}`,
    subtitle: `${booking.guests} guest${booking.guests === 1 ? "" : "s"} - ${
      booking.status || "new"
    }`,
    apiPath: `/api/bookings/${booking.id}/messages`,
    summary: threadSummaries[booking.id],
  }));
  const messageThreadsNeedingReply = Object.values(threadSummaries).filter(
    (summary) => summary.needsResponse,
  ).length;
  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-10 text-[#17324D]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SiteLogo />
          <div className="flex flex-wrap items-center gap-2">
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

        <section
          aria-label="Private guest lounge"
          className="overflow-hidden rounded-[1.75rem] bg-[#071F2F] text-white shadow-2xl shadow-[#071F2F]/20"
        >
          <div className="p-6 sm:p-10">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#D6B56D]">
              Private guest lounge
            </p>
            <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
                  Your Roatan plans, simplified.
                </h1>
                <p className="mt-3 max-w-2xl leading-7 text-white/75">
                  {hasSignedIn
                    ? tripHero.text
                    : "Sign in once to keep bookings, messages, saved map plans, and trip details in one calm place."}
                </p>
              </div>
              <Link
                href={hasSignedIn ? tripHero.actionHref : "/map"}
                className="rounded-xl bg-[#D6B56D] px-5 py-3 text-center font-bold text-[#071F2F]"
              >
                {hasSignedIn ? tripHero.actionLabel : "Start planning"}
              </Link>
            </div>
          </div>

          {hasSignedIn ? (
            <div className="grid border-t border-white/10 bg-white/10 text-center sm:grid-cols-4">
              <div className="p-5">
                <p className="text-3xl font-black">{bookings.length}</p>
                <p className="mt-1 text-sm text-white/65">Booking requests</p>
              </div>
              <div className="p-5">
                <p className="text-3xl font-black">{tripPlans.length}</p>
                <p className="mt-1 text-sm text-white/65">Saved map plans</p>
              </div>
              <div className="p-5">
                <p className="text-3xl font-black">
                  {messageThreadsNeedingReply}
                </p>
                <p className="mt-1 text-sm text-white/65">Need reply</p>
              </div>
              <div className="p-5">
                <p className="text-3xl font-black">{guestBalanceSummary.label}</p>
                <p className="mt-1 text-sm text-white/65">Balance</p>
              </div>
            </div>
          ) : (
            <div className="grid border-t border-white/10 bg-white/10 text-center sm:grid-cols-3">
              <div className="p-5">
                <p className="text-lg font-black">Booking status</p>
                <p className="mt-1 text-sm text-white/65">Check requests fast</p>
              </div>
              <div className="p-5">
                <p className="text-lg font-black">Saved plans</p>
                <p className="mt-1 text-sm text-white/65">Ready on return</p>
              </div>
              <div className="p-5">
                <p className="text-lg font-black">Concierge help</p>
                <p className="mt-1 text-sm text-white/65">When you need it</p>
              </div>
            </div>
          )}
        </section>

        {hasSignedIn ? (
          <section
            aria-label="Guest account sections"
            className="mt-6 rounded-[1.5rem] border border-white/70 bg-white/90 p-2 shadow-xl shadow-[#0B3C5D]/5"
          >
            <div role="tablist" className="grid gap-2 sm:grid-cols-3">
              {accountTabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  onClick={() => setActiveAccountTab(tab.id)}
                  aria-selected={activeAccountTab === tab.id}
                  className={`rounded-2xl px-4 py-4 text-left transition ${
                    activeAccountTab === tab.id
                      ? "bg-[#071F2F] text-white shadow"
                      : "bg-[#F7F3EA] text-[#0B3C5D] hover:bg-[#EEF7F6]"
                  }`}
                >
                  <span className="block text-sm font-black">{tab.label}</span>
                  <span
                    className={`mt-1 block text-xs font-semibold ${
                      activeAccountTab === tab.id
                        ? "text-white/65"
                        : "text-gray-500"
                    }`}
                  >
                    {tab.text}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {hasSignedIn && activeAccountTab === "profile" ? (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow">
            <form
              onSubmit={saveProfile}
              className="grid gap-5 md:grid-cols-[auto_1fr_auto] md:items-end"
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
          </section>
        ) : null}

        {hasSignedIn && activeAccountTab === "overview" ? (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#00A8A8]">
                  Saved map plans
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                  Your Roatan days from the map.
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Save a plan from Roatan Day Map and come back to it here from
                  any signed-in device.
                </p>
              </div>
              <Link
                href="/map"
                className="rounded-xl bg-[#00A8A8] px-4 py-3 text-center text-sm font-black text-white"
              >
                Open map
              </Link>
            </div>

            {tripPlanMessage ? (
              <p className="mt-4 rounded-xl bg-[#EEF7F6] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
                {tripPlanMessage}
              </p>
            ) : null}

            {tripPlans.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-[#D6B56D]/50 bg-[#FFF8E8] p-5">
                <p className="font-black text-[#0B3C5D]">
                  No saved map plans yet.
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Open the map, save a few stops, then tap Save plan.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {tripPlans.map((plan) => {
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
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9C7A2F]">
                          {(plan.status || "saved").replaceAll("_", " ")}
                        </p>
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
              </div>
            )}
          </section>
        ) : null}

        {hasSignedIn && activeAccountTab === "messages" ? (
          <section className="mt-6 rounded-2xl bg-white p-6 shadow">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#00A8A8]">
                  Messages
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                  Booking conversations.
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Open any trip thread without digging through the booking
                  cards.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                className="rounded-xl bg-[#00A8A8] px-4 py-3 text-sm font-black text-white"
              >
                Open chat drawer
              </button>
            </div>

            {chatThreads.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-dashed border-[#D6B56D]/50 bg-[#FFF8E8] p-5">
                <p className="font-black text-[#0B3C5D]">
                  No conversations yet.
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Booking messages will appear here after you request or confirm
                  a trip.
                </p>
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {chatThreads.map((thread) => (
                  <article
                    key={thread.id}
                    className="rounded-2xl border border-gray-200 bg-[#FFFDF7] p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <p className="font-black text-[#0B3C5D]">
                          {thread.title}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {thread.summary?.lastMessagePreview ||
                            thread.subtitle}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${threadBadgeClass(
                            thread.summary,
                          )}`}
                        >
                          {thread.summary?.badgeLabel || "No messages"}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBookingId(thread.id);
                            setChatOpen(true);
                          }}
                          className="rounded-xl bg-[#0B3C5D] px-4 py-2 text-sm font-black text-white"
                        >
                          Open conversation
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {!hasSignedIn || isUpdatingPassword || activeAccountTab === "overview" ? (
        <section className="mt-6 rounded-[1.5rem] bg-white p-6 shadow-xl shadow-[#0B3C5D]/5 sm:p-8">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-[#00A8A8]">
                Private itinerary
              </p>
              <h2 className="mt-2 text-3xl font-black text-[#0B3C5D]">
                Your bookings and next steps.
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

          {hasSignedIn ? (
            <section className="mt-6 rounded-2xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#007B7B]">
                    Guest balance tracking
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                    Payments, invoices, and receipts.
                  </h3>
                </div>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#0B3C5D]">
                  {guestBalanceSummary.label}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  ["Paid", formatMoneyCents(guestBalanceSummary.paidCents)],
                  [
                    "Balance due",
                    formatMoneyCents(guestBalanceSummary.balanceDueCents),
                  ],
                  [
                    "Refund pending",
                    formatMoneyCents(guestBalanceSummary.refundPendingCents),
                  ],
                  ["Next due", guestBalanceSummary.nextDueDate || "None"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-gray-500">
                      {label}
                    </p>
                    <p className="mt-2 font-black text-[#0B3C5D]">{value}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {hasSignedIn ? (
            <section className="mt-6 rounded-2xl border border-[#D6B56D]/30 bg-[#FFF8E8] p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9C7A2F]">
                    Need help?
                  </p>
                  <h3 className="mt-2 text-2xl font-black text-[#0B3C5D]">
                    Support is one tap away.
                  </h3>
                  <p className="mt-2 text-sm font-semibold text-gray-600">
                    {supportTicketSummary.label} -{" "}
                    {supportTicketSummary.resolvedCount} resolved
                  </p>
                </div>
                <Link
                  href="/support"
                  className="rounded-xl bg-[#0B3C5D] px-4 py-3 text-center text-sm font-black text-white"
                >
                  Get support
                </Link>
              </div>

              {supportTicketMessage ? (
                <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-bold text-[#7A5A00]">
                  {supportTicketMessage}
                </p>
              ) : supportTickets.length === 0 ? (
                <p className="mt-4 rounded-xl border border-dashed border-[#D6B56D]/50 bg-white/60 px-4 py-3 text-sm text-gray-600">
                  No support requests yet. If you need help with a booking,
                  pickup, cancellation, vendor question, or trip day issue, send
                  a request from the support center.
                </p>
              ) : (
                <div className="mt-4 grid gap-3">
                  {supportTickets.slice(0, 4).map((ticket) => (
                    <article
                      key={ticket.id}
                      className="rounded-xl bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div>
                          <p className="text-sm font-black text-[#0B3C5D]">
                            {ticket.intent}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {new Date(ticket.created_at).toLocaleString()}
                            {ticket.booking_reference
                              ? ` - ${ticket.booking_reference}`
                              : ""}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-black capitalize text-[#007B7B]">
                            {ticket.status.replaceAll("_", " ")}
                          </span>
                          <span className="rounded-full bg-[#FFF3D2] px-3 py-1 text-xs font-black capitalize text-[#7A5A00]">
                            {ticket.priority}
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-600">
                        {ticket.message}
                      </p>
                      {ticket.admin_notes ? (
                        <p className="mt-3 rounded-lg bg-[#F7F3EA] px-3 py-2 text-sm font-semibold text-[#0B3C5D]">
                          Admin note: {ticket.admin_notes}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </section>
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
              {bookings.map((booking) => {
                const nextAction = bookingNextAction({
                  status: booking.status,
                  depositStatus: booking.deposit_status,
                  canReview: Boolean(
                    booking.status === "completed" && booking.listing_id,
                  ),
                });
                const changeRequests = changeRequestsByBooking[booking.id] || [];
                const changeSummary =
                  getBookingChangeRequestSummary(changeRequests);
                const changeForm = changeRequestForms[booking.id] || {
                  tourDate: "",
                  tourTime: "",
                  guests: "",
                  pickupNote: "",
                  reason: "",
                };
                const moneySnapshot = getBookingMoneySnapshot(booking);

                return (
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
                  <div className="mt-4 grid gap-3 rounded-xl border border-[#00A8A8]/15 bg-[#EEF7F6] p-4 sm:grid-cols-4">
                    {[
                      ["Payment", moneySnapshot.paymentLabel],
                      [
                        "Balance due",
                        formatMoneyCents(moneySnapshot.balanceDueCents),
                      ],
                      ["Invoice", moneySnapshot.invoiceNumber],
                      ["Receipt", moneySnapshot.receiptNumber],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-[#007B7B]">
                          {label}
                        </p>
                        <p className="mt-1 text-sm font-black text-[#0B3C5D]">
                          {value}
                        </p>
                      </div>
                    ))}
                    <div className="sm:col-span-4 flex flex-wrap gap-2">
                      <Link
                        href={`/book/invoice/${booking.id}`}
                        className="rounded-lg bg-white px-3 py-2 text-xs font-black text-[#0B3C5D]"
                      >
                        Open invoice
                      </Link>
                      <Link
                        href={`/book/receipt/${booking.id}`}
                        className="rounded-lg bg-white px-3 py-2 text-xs font-black text-[#0B3C5D]"
                      >
                        Open receipt
                      </Link>
                      <Link
                        href={`/book/trip/${booking.id}`}
                        className="rounded-lg bg-[#0B3C5D] px-3 py-2 text-xs font-black text-white"
                      >
                        Trip packet
                      </Link>
                    </div>
                  </div>
                  <p className="mt-4 rounded-xl bg-[#F7F3EA] px-4 py-3 text-sm text-gray-600">
                    {threadSummaries[booking.id]?.lastMessagePreview ||
                      "No booking messages yet."}
                  </p>
                  <div
                    className={`mt-4 rounded-xl border px-4 py-3 text-sm ${nextActionClass(
                      nextAction.tone,
                    )}`}
                  >
                    <p className="font-black">{nextAction.label}</p>
                    <p className="mt-1 leading-6">{nextAction.text}</p>
                  </div>
                  <form
                    onSubmit={(event) => submitChangeRequest(event, booking)}
                    className="mt-4 rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
                          Request changes
                        </p>
                        <p className="mt-1 text-sm font-semibold text-[#0B3C5D]">
                          {changeSummary.totalCount > 0
                            ? `${changeSummary.latestLabel} - ${changeSummary.pendingCount} pending`
                            : "Need a different date, time, guest count, or pickup detail?"}
                        </p>
                      </div>
                      {changeSummary.needsAction ? (
                        <span className="rounded-full bg-[#D6B56D] px-3 py-1 text-xs font-black text-[#0B3C5D]">
                          Pending review
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <input
                        type="date"
                        value={changeForm.tourDate}
                        onChange={(event) =>
                          updateChangeRequestForm(booking.id, {
                            tourDate: event.target.value,
                          })
                        }
                        className="rounded-lg border border-white px-3 py-2 text-sm outline-none"
                        aria-label="Requested date"
                      />
                      <input
                        value={changeForm.tourTime}
                        onChange={(event) =>
                          updateChangeRequestForm(booking.id, {
                            tourTime: event.target.value,
                          })
                        }
                        placeholder="Requested time"
                        className="rounded-lg border border-white px-3 py-2 text-sm outline-none"
                      />
                      <input
                        type="number"
                        min="1"
                        value={changeForm.guests}
                        onChange={(event) =>
                          updateChangeRequestForm(booking.id, {
                            guests: event.target.value,
                          })
                        }
                        placeholder="Guests"
                        className="rounded-lg border border-white px-3 py-2 text-sm outline-none"
                      />
                      <input
                        value={changeForm.pickupNote}
                        onChange={(event) =>
                          updateChangeRequestForm(booking.id, {
                            pickupNote: event.target.value,
                          })
                        }
                        placeholder="Pickup/details"
                        className="rounded-lg border border-white px-3 py-2 text-sm outline-none"
                      />
                    </div>
                    <textarea
                      value={changeForm.reason}
                      onChange={(event) =>
                        updateChangeRequestForm(booking.id, {
                          reason: event.target.value,
                        })
                      }
                      placeholder="Reason for the change"
                      rows={2}
                      className="mt-3 w-full rounded-lg border border-white px-3 py-2 text-sm outline-none"
                    />
                    {changeRequestMessages[booking.id] ? (
                      <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm font-bold text-[#0B3C5D]">
                        {changeRequestMessages[booking.id]}
                      </p>
                    ) : null}
                    <button
                      type="submit"
                      disabled={savingChangeRequestId === booking.id}
                      className="mt-3 rounded-lg bg-[#0B3C5D] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
                    >
                      {savingChangeRequestId === booking.id
                        ? "Sending..."
                        : "Send change request"}
                    </button>
                  </form>
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
                      Open trip details
                    </Link>
                    {booking.status === "completed" && booking.listing_id ? (
                      <Link
                        href={`/listings/${booking.listing_id}#review`}
                        className="rounded-lg bg-[#D6B56D] px-4 py-2 text-sm font-bold text-[#0B3C5D]"
                      >
                        Leave review
                      </Link>
                    ) : null}
                  </div>
                </article>
                );
              })}
            </div>
          )}
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
