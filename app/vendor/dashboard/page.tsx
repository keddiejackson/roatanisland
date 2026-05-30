"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import BookingChatDrawer, {
  type BookingChatThread,
} from "@/app/BookingChatDrawer";
import { useMobileSiteControls } from "@/app/SiteBrandingProvider";
import PinPicker from "@/app/map/PinPicker";
import SiteLogo from "@/app/SiteLogo";
import VendorProCommandCenter from "@/app/vendor/VendorProCommandCenter";
import {
  groupBookingsByDate,
  normalizeDateLines,
  toggleDateLine,
} from "@/lib/availability-calendar";
import {
  bookingThreadSummary,
  type BookingMessageLike,
  type BookingThreadSummary,
} from "@/lib/booking-communication";
import {
  getBookingChangeRequestSummary,
  type BookingChangeRequest,
} from "@/lib/booking-change-requests";
import {
  formatBookingCents,
  formatBookingStatus,
  formatDepositStatus,
  getBookingOpsPriority,
} from "@/lib/booking-flow";
import {
  getBookingMoneySnapshot,
  getVendorPayoutForecast,
} from "@/lib/booking-money-command";
import {
  getListingConversionScore,
  getVendorGrowthTasks,
} from "@/lib/booking-conversion-pro";
import {
  getVendorPayoutReceipts,
  getVendorPayoutStatements,
  getVendorPayoutSummary,
} from "@/lib/admin-revenue";
import { getMonthCalendarDays } from "@/lib/marketplace-upgrade";
import { supabase } from "@/lib/supabase";
import {
  countListingPhotos,
  getListingReadinessSummary,
  getListingRevenueKit,
  getListingStatusSummary,
  getProfileCompletionItems,
  getVendorFocusItems,
  getVendorDashboardStats,
  getVendorRevenueSummary,
  sortVendorBookings,
} from "@/lib/vendor-dashboard";

type VendorAccount = {
  vendor_id: string;
  vendors: {
    business_name: string;
    contact_name: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    notes: string | null;
    profile_image_url: string | null;
    show_contact_name: boolean | null;
    show_email: boolean | null;
    show_phone: boolean | null;
    show_website: boolean | null;
  } | null;
};

type ListingRow = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  location: string | null;
  price: number | null;
  image_url: string | null;
  gallery_image_urls: string[] | null;
  is_active: boolean | null;
  approval_status: string | null;
  approval_note: string | null;
  tour_times: string[] | null;
  blocked_dates: string[] | null;
  availability_note: string | null;
  max_guests: number | null;
  minimum_notice_hours: number | null;
  booking_cutoff_hours: number | null;
  auto_confirm_bookings: boolean | null;
  private_booking_mode: boolean | null;
  available_weekdays: number[] | null;
  season_start_date: string | null;
  season_end_date: string | null;
  latitude: number | null;
  longitude: number | null;
};

type ListingDraft = {
  title: string;
  description: string;
  price: string;
  location: string;
  category: string;
  imageUrl: string;
  galleryImageUrls: string;
  latitude: string;
  longitude: string;
};

type BookingRow = {
  id: string;
  listing_id: string | null;
  listing_name: string;
  full_name: string;
  email: string;
  tour_date: string;
  tour_time: string;
  guests: number;
  guest_message: string | null;
  vendor_note: string | null;
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
  commission_amount_cents: number | null;
  commission_override_cents: number | null;
  commission_status: string | null;
  vendor_private_payout_note: string | null;
  payout_note: string | null;
  payout_scheduled_for: string | null;
  payout_paid_at: string | null;
  selected_addons: { name?: string; price_cents?: number }[] | null;
  change_requests?: BookingChangeRequest[];
};

type BookingMessageRow = BookingMessageLike & {
  booking_id: string;
};

type BookingReadReceiptRow = {
  booking_id: string;
  last_read_at: string | null;
};

type AddonRow = {
  id: string;
  listing_id: string;
  name: string;
  price_cents: number;
};

type VendorDocument = {
  id: string;
  title: string;
  file_url: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

function currentMonthValue() {
  return new Date().toISOString().slice(0, 7);
}

const WEEKDAY_OPTIONS = [
  ["0", "Sun"],
  ["1", "Mon"],
  ["2", "Tue"],
  ["3", "Wed"],
  ["4", "Thu"],
  ["5", "Fri"],
  ["6", "Sat"],
];

function weekdayValue(days: number[] | null | undefined) {
  const normalized = days && days.length > 0 ? days : [0, 1, 2, 3, 4, 5, 6];
  return normalized.join(",");
}

function parseWeekdayValue(value: string) {
  const days = value
    .split(",")
    .map((day) => Number(day))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);

  return days.length > 0 ? Array.from(new Set(days)).sort() : [0, 1, 2, 3, 4, 5, 6];
}

function toggleWeekdayValue(value: string, day: string) {
  const days = new Set(parseWeekdayValue(value).map(String));
  if (days.has(day)) {
    days.delete(day);
  } else {
    days.add(day);
  }

  return Array.from(days)
    .map((item) => Number(item))
    .sort()
    .join(",");
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
        "vendor",
        lastReadByBooking.get(bookingId),
      ),
    ]),
  );
}

function threadBadgeClass(summary?: BookingThreadSummary) {
  if (!summary || summary.messageCount === 0) {
    return "bg-gray-100 text-gray-600";
  }

  if (summary.needsResponse) {
    return "bg-[#D6B56D] text-[#0B3C5D]";
  }

  return "bg-[#EEF7F6] text-[#0B3C5D]";
}

export default function VendorDashboardPage() {
  const router = useRouter();
  const mobileControls = useMobileSiteControls();
  const [vendorAccount, setVendorAccount] = useState<VendorAccount | null>(null);
  const [profileForm, setProfileForm] = useState({
    businessName: "",
    contactName: "",
    phone: "",
    website: "",
    notes: "",
    profileImageUrl: "",
    showContactName: true,
    showEmail: true,
    showPhone: true,
    showWebsite: true,
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [listingDrafts, setListingDrafts] = useState<Record<string, ListingDraft>>({});
  const [listingImageFiles, setListingImageFiles] = useState<Record<string, File[]>>({});
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [threadSummaries, setThreadSummaries] = useState<
    Record<string, BookingThreadSummary>
  >({});
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [addonForms, setAddonForms] = useState<Record<string, { name: string; priceCents: string }>>({});
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [vendorNotes, setVendorNotes] = useState<Record<string, string>>({});
  const [changeActionNotes, setChangeActionNotes] = useState<Record<string, string>>({});
  const [changeCounterForms, setChangeCounterForms] = useState<
    Record<string, { tourDate: string; tourTime: string; guests: string }>
  >({});
  const [listingTimes, setListingTimes] = useState<Record<string, string>>({});
  const [blockedDates, setBlockedDates] = useState<Record<string, string>>({});
  const [blockedDateQuickPicks, setBlockedDateQuickPicks] = useState<Record<string, string>>({});
  const [calendarMonths, setCalendarMonths] = useState<Record<string, string>>({});
  const [availabilityNotes, setAvailabilityNotes] = useState<Record<string, string>>({});
  const [maxGuestsByListing, setMaxGuestsByListing] = useState<Record<string, string>>({});
  const [noticeHoursByListing, setNoticeHoursByListing] = useState<Record<string, string>>({});
  const [bookingCutoffByListing, setBookingCutoffByListing] = useState<Record<string, string>>({});
  const [autoConfirmByListing, setAutoConfirmByListing] = useState<Record<string, boolean>>({});
  const [privateModeByListing, setPrivateModeByListing] = useState<Record<string, boolean>>({});
  const [weekdaysByListing, setWeekdaysByListing] = useState<Record<string, string>>({});
  const [seasonStartByListing, setSeasonStartByListing] = useState<Record<string, string>>({});
  const [seasonEndByListing, setSeasonEndByListing] = useState<Record<string, string>>({});
  const [expandedListingIds, setExpandedListingIds] = useState<Record<string, boolean>>({});
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [bookingResponseFilter, setBookingResponseFilter] = useState<
    "all" | "needs_response"
  >("all");
  const [savingListingId, setSavingListingId] = useState<string | null>(null);
  const [savingBookingId, setSavingBookingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVendorDashboard() {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData.user) {
        router.replace("/vendor/login");
        return;
      }

      const { data: accountData, error: accountError } = await supabase
        .from("vendor_users")
        .select(
          "vendor_id, vendors(business_name, contact_name, email, phone, website, notes, profile_image_url, show_contact_name, show_email, show_phone, show_website)",
        )
        .eq("user_id", userData.user.id)
        .single();

      if (accountError || !accountData) {
        router.replace("/vendor/signup");
        return;
      }

      const account = accountData as unknown as VendorAccount;
      setVendorAccount(account);
      setProfileForm({
        businessName: account.vendors?.business_name || "",
        contactName: account.vendors?.contact_name || "",
        phone: account.vendors?.phone || "",
        website: account.vendors?.website || "",
        notes: account.vendors?.notes || "",
        profileImageUrl: account.vendors?.profile_image_url || "",
        showContactName: account.vendors?.show_contact_name ?? true,
        showEmail: account.vendors?.show_email ?? true,
        showPhone: account.vendors?.show_phone ?? true,
        showWebsite: account.vendors?.show_website ?? true,
      });

      const listingSelectWithAvailability =
        "id, title, description, category, location, price, image_url, gallery_image_urls, is_active, approval_status, approval_note, tour_times, blocked_dates, availability_note, max_guests, minimum_notice_hours, booking_cutoff_hours, auto_confirm_bookings, private_booking_mode, available_weekdays, season_start_date, season_end_date, latitude, longitude";
      const listingResult = await supabase
        .from("listings")
        .select(listingSelectWithAvailability)
        .eq("vendor_id", account.vendor_id)
        .order("created_at", { ascending: false });
      let listingData: unknown[] | null = listingResult.data;
      let listingError = listingResult.error;

      if (listingError?.code === "42703") {
        const fallback = await supabase
          .from("listings")
          .select("id, title, description, category, location, price, image_url, is_active")
          .eq("vendor_id", account.vendor_id)
          .order("created_at", { ascending: false });

        listingData = fallback.data as unknown[] | null;
        listingError = fallback.error;
      }

      const rows = ((listingData as Partial<ListingRow>[]) || []).map((listing) => ({
        ...listing,
        tour_times: listing.tour_times || [
          "10:30 AM",
          "4:30 PM Sunset Cruise",
        ],
        gallery_image_urls: listing.gallery_image_urls || [],
        blocked_dates: listing.blocked_dates || [],
        availability_note: listing.availability_note || null,
        max_guests: listing.max_guests ?? null,
        minimum_notice_hours: listing.minimum_notice_hours ?? null,
        booking_cutoff_hours: listing.booking_cutoff_hours ?? null,
        auto_confirm_bookings: listing.auto_confirm_bookings ?? false,
        private_booking_mode: listing.private_booking_mode ?? false,
        available_weekdays: listing.available_weekdays || [0, 1, 2, 3, 4, 5, 6],
        season_start_date: listing.season_start_date || null,
        season_end_date: listing.season_end_date || null,
      })) as ListingRow[];

      setListings(rows);
      setListingDrafts(
        Object.fromEntries(
          rows.map((listing) => [
            listing.id,
            {
              title: listing.title || "",
              description: listing.description || "",
              price: listing.price === null ? "" : String(listing.price),
              location: listing.location || "",
            category: listing.category || "Tours",
            imageUrl: listing.image_url || "",
            galleryImageUrls: (listing.gallery_image_urls || []).join("\n"),
            latitude: listing.latitude == null ? "" : String(listing.latitude),
            longitude: listing.longitude == null ? "" : String(listing.longitude),
          },
          ]),
        ),
      );
      setBlockedDates(
        Object.fromEntries(
          rows.map((listing) => [
            listing.id,
            (listing.blocked_dates || []).join("\n"),
          ]),
        ),
      );
      setCalendarMonths(
        Object.fromEntries(rows.map((listing) => [listing.id, currentMonthValue()])),
      );
      setListingTimes(
        Object.fromEntries(
          rows.map((listing) => [
            listing.id,
            (listing.tour_times || []).join("\n"),
          ]),
        ),
      );
      setAvailabilityNotes(
        Object.fromEntries(
          rows.map((listing) => [
            listing.id,
            listing.availability_note || "",
          ]),
        ),
      );
      setMaxGuestsByListing(
        Object.fromEntries(
          rows.map((listing) => [
            listing.id,
            listing.max_guests ? String(listing.max_guests) : "",
          ]),
        ),
      );
      setNoticeHoursByListing(
        Object.fromEntries(
          rows.map((listing) => [
            listing.id,
            listing.minimum_notice_hours !== null
              ? String(listing.minimum_notice_hours)
              : "",
          ]),
        ),
      );
      setBookingCutoffByListing(
        Object.fromEntries(
          rows.map((listing) => [
            listing.id,
            listing.booking_cutoff_hours !== null
              ? String(listing.booking_cutoff_hours)
              : "",
          ]),
        ),
      );
      setAutoConfirmByListing(
        Object.fromEntries(
          rows.map((listing) => [listing.id, listing.auto_confirm_bookings === true]),
        ),
      );
      setPrivateModeByListing(
        Object.fromEntries(
          rows.map((listing) => [listing.id, listing.private_booking_mode === true]),
        ),
      );
      setWeekdaysByListing(
        Object.fromEntries(
          rows.map((listing) => [
            listing.id,
            weekdayValue(listing.available_weekdays),
          ]),
        ),
      );
      setSeasonStartByListing(
        Object.fromEntries(
          rows.map((listing) => [listing.id, listing.season_start_date || ""]),
        ),
      );
      setSeasonEndByListing(
        Object.fromEntries(
          rows.map((listing) => [listing.id, listing.season_end_date || ""]),
        ),
      );
      const listingIds = rows.map((listing) => listing.id);
      const addonsResult =
        listingIds.length === 0
          ? { data: [] }
          : await supabase
              .from("listing_addons")
              .select("id, listing_id, name, price_cents")
              .in("listing_id", listingIds);
      const addonsData = addonsResult.data;
      setAddons((addonsData as AddonRow[]) || []);

      const { data: documentData } = await supabase
        .from("vendor_documents")
        .select("id, title, file_url, status, admin_note, created_at")
        .eq("vendor_id", account.vendor_id)
        .order("created_at", { ascending: false });
      setDocuments((documentData as VendorDocument[]) || []);

      const { data: sessionData } = await supabase.auth.getSession();
      const bookingsResponse = await fetch("/api/vendor/bookings", {
        headers: {
          ...(sessionData.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
      });

      if (bookingsResponse.ok) {
        const bookingsResult = await bookingsResponse.json();
        const bookingRows = (bookingsResult.bookings as BookingRow[]) || [];
        setBookings(bookingRows);
        setVendorNotes(
          Object.fromEntries(
            bookingRows.map((booking) => [
              booking.id,
              booking.vendor_note || "",
            ]),
          ),
        );
        if (bookingRows.length > 0) {
          const { data: messageRows, error: messageError } = await supabase
            .from("booking_messages")
            .select("booking_id, sender_role, sender_email, message, is_internal, created_at")
            .in(
              "booking_id",
              bookingRows.map((booking) => booking.id),
            )
            .order("created_at", { ascending: true });

          if (!messageError) {
            const { data: readRows } = await supabase
              .from("booking_message_reads")
              .select("booking_id, last_read_at")
              .in(
                "booking_id",
                bookingRows.map((booking) => booking.id),
              )
              .eq("reader_role", "vendor")
              .eq("reader_email", (userData.user.email || "").toLowerCase());

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
      }

      setLoading(false);
    }

    loadVendorDashboard();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function updateProfileForm(
    field: keyof typeof profileForm,
    value: string | boolean,
  ) {
    setProfileForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  async function saveVendorProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const { data: sessionData } = await supabase.auth.getSession();
    let finalProfileImageUrl = profileForm.profileImageUrl;
    setSavingProfile(true);

    if (profileImageFile) {
      const uploadForm = new FormData();
      uploadForm.append("image", profileImageFile);

      const uploadResponse = await fetch("/api/uploads/vendor-profile-image", {
        method: "POST",
        headers: {
          ...(sessionData.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
        body: uploadForm,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setSavingProfile(false);
        alert(uploadResult.error || "Unable to upload profile picture.");
        return;
      }

      finalProfileImageUrl = uploadResult.imageUrl;
    }

    const response = await fetch("/api/vendor/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        ...profileForm,
        profileImageUrl: finalProfileImageUrl,
      }),
    });

    const result = await response.json();
    setSavingProfile(false);

    if (!response.ok) {
      alert(result.error || "Unable to save profile.");
      return;
    }

    setVendorAccount((currentAccount) =>
      currentAccount
        ? {
            ...currentAccount,
            vendors: {
              business_name: result.vendor.business_name,
              contact_name: result.vendor.contact_name,
              email: result.vendor.email,
              phone: result.vendor.phone,
              website: result.vendor.website,
              notes: result.vendor.notes,
              profile_image_url: result.vendor.profile_image_url,
              show_contact_name: result.vendor.show_contact_name,
              show_email: result.vendor.show_email,
              show_phone: result.vendor.show_phone,
              show_website: result.vendor.show_website,
            },
          }
        : currentAccount,
    );
    setProfileForm({
      businessName: result.vendor.business_name || "",
      contactName: result.vendor.contact_name || "",
      phone: result.vendor.phone || "",
      website: result.vendor.website || "",
      notes: result.vendor.notes || "",
      profileImageUrl: result.vendor.profile_image_url || "",
      showContactName: result.vendor.show_contact_name ?? true,
      showEmail: result.vendor.show_email ?? true,
      showPhone: result.vendor.show_phone ?? true,
      showWebsite: result.vendor.show_website ?? true,
    });
    setProfileImageFile(null);
  }

  function updateListingTimes(listingId: string, value: string) {
    setListingTimes((currentTimes) => ({
      ...currentTimes,
      [listingId]: value,
    }));
  }

  function updateListingDraft(
    listingId: string,
    field: keyof ListingDraft,
    value: string,
  ) {
    setListingDrafts((currentDrafts) => ({
      ...currentDrafts,
      [listingId]: {
        ...currentDrafts[listingId],
        [field]: value,
      },
    }));
  }

  function updateBlockedDates(listingId: string, value: string) {
    setBlockedDates((currentDates) => ({
      ...currentDates,
      [listingId]: value,
    }));
  }

  function updateBlockedDateQuickPick(listingId: string, value: string) {
    setBlockedDateQuickPicks((currentDates) => ({
      ...currentDates,
      [listingId]: value,
    }));
  }

  function toggleBlockedDate(listingId: string, date: string) {
    if (!date) return;

    setBlockedDates((currentDates) => ({
      ...currentDates,
      [listingId]: toggleDateLine(currentDates[listingId] || "", date),
    }));
  }

  function toggleQuickBlockedDate(listingId: string) {
    const date = blockedDateQuickPicks[listingId];

    if (!date) {
      alert("Choose a date first.");
      return;
    }

    toggleBlockedDate(listingId, date);
  }

  function updateCalendarMonth(listingId: string, month: string) {
    setCalendarMonths((currentMonths) => ({
      ...currentMonths,
      [listingId]: month,
    }));
  }

  function updateAvailabilityNote(listingId: string, value: string) {
    setAvailabilityNotes((currentNotes) => ({
      ...currentNotes,
      [listingId]: value,
    }));
  }

  function updateMaxGuests(listingId: string, value: string) {
    setMaxGuestsByListing((currentValues) => ({
      ...currentValues,
      [listingId]: value,
    }));
  }

  function updateNoticeHours(listingId: string, value: string) {
    setNoticeHoursByListing((currentValues) => ({
      ...currentValues,
      [listingId]: value,
    }));
  }

  function updateBookingCutoff(listingId: string, value: string) {
    setBookingCutoffByListing((currentValues) => ({
      ...currentValues,
      [listingId]: value,
    }));
  }

  function updateWeekdays(listingId: string, value: string) {
    setWeekdaysByListing((currentValues) => ({
      ...currentValues,
      [listingId]: value,
    }));
  }

  function updateSeasonStart(listingId: string, value: string) {
    setSeasonStartByListing((currentValues) => ({
      ...currentValues,
      [listingId]: value,
    }));
  }

  function updateSeasonEnd(listingId: string, value: string) {
    setSeasonEndByListing((currentValues) => ({
      ...currentValues,
      [listingId]: value,
    }));
  }

  function toggleListingEditor(listingId: string) {
    setExpandedListingIds((currentIds) => ({
      ...currentIds,
      [listingId]: !currentIds[listingId],
    }));
  }

  async function findListingMapPin(listingId: string) {
    const draft = listingDrafts[listingId];
    if (!draft) return;

    const query = [draft.title, draft.location, "Roatan"].filter(Boolean).join(", ");
    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Unable to find a map pin.");
      return;
    }

    setListingDrafts((currentDrafts) => ({
      ...currentDrafts,
      [listingId]: {
        ...currentDrafts[listingId],
        latitude: String(result.latitude),
        longitude: String(result.longitude),
      },
    }));
  }

  async function saveListingTimes(listingId: string) {
    const draft = listingDrafts[listingId];
    const times = (listingTimes[listingId] || "")
      .split("\n")
      .map((time) => time.trim())
      .filter(Boolean);
    const unavailableDates = normalizeDateLines(blockedDates[listingId] || "");
    let galleryImageUrls = (draft.galleryImageUrls || "")
      .split("\n")
      .map((url) => url.trim())
      .filter(Boolean);

    if (!draft) {
      return;
    }

    if (times.length === 0) {
      alert("Add at least one tour time.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    let finalImageUrl = draft.imageUrl;
    setSavingListingId(listingId);

    const imageFiles = listingImageFiles[listingId] || [];

    if (imageFiles.length > 0) {
      const uploadForm = new FormData();
      imageFiles.forEach((file) => uploadForm.append("image", file));
      uploadForm.append("vendorId", vendorAccount?.vendor_id || "pending");

      const uploadResponse = await fetch("/api/uploads/listing-image", {
        method: "POST",
        headers: {
          ...(sessionData.session?.access_token
            ? { Authorization: `Bearer ${sessionData.session.access_token}` }
            : {}),
        },
        body: uploadForm,
      });

      const uploadResult = await uploadResponse.json();

      if (!uploadResponse.ok) {
        setSavingListingId(null);
        alert(uploadResult.error || "Unable to upload listing image.");
        return;
      }

      finalImageUrl = uploadResult.imageUrl;
      galleryImageUrls = [
        ...((uploadResult.imageUrls as string[] | undefined) || []).slice(1),
        ...galleryImageUrls,
      ];
    }

    const response = await fetch(`/api/vendor/listings/${listingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        title: draft.title,
        description: draft.description,
        price: draft.price,
        location: draft.location,
        category: draft.category,
        imageUrl: finalImageUrl,
        galleryImageUrls,
        tourTimes: times,
        blockedDates: unavailableDates,
        availabilityNote: availabilityNotes[listingId] || "",
        maxGuests: maxGuestsByListing[listingId] || "",
        minimumNoticeHours: noticeHoursByListing[listingId] || "",
        bookingCutoffHours: bookingCutoffByListing[listingId] || "",
        autoConfirmBookings: autoConfirmByListing[listingId] === true,
        privateBookingMode: privateModeByListing[listingId] === true,
        availableWeekdays: parseWeekdayValue(weekdaysByListing[listingId] || ""),
        seasonStartDate: seasonStartByListing[listingId] || "",
        seasonEndDate: seasonEndByListing[listingId] || "",
        latitude: draft.latitude,
        longitude: draft.longitude,
      }),
    });

    const result = await response.json();
    setSavingListingId(null);

    if (!response.ok) {
      alert(result.error || "Unable to save tour times.");
      return;
    }

    setListings((currentListings) =>
      currentListings.map((listing) =>
        listing.id === listingId
          ? {
              ...listing,
              title: result.listing.title,
              description: result.listing.description,
              price: result.listing.price,
              location: result.listing.location,
              category: result.listing.category,
              image_url: result.listing.image_url,
              gallery_image_urls: result.listing.gallery_image_urls || [],
              tour_times: result.listing.tour_times,
              blocked_dates: result.listing.blocked_dates || [],
              availability_note: result.listing.availability_note || null,
              max_guests: result.listing.max_guests,
              minimum_notice_hours: result.listing.minimum_notice_hours,
              booking_cutoff_hours: result.listing.booking_cutoff_hours,
              auto_confirm_bookings: result.listing.auto_confirm_bookings,
              private_booking_mode: result.listing.private_booking_mode,
              available_weekdays: result.listing.available_weekdays || [0, 1, 2, 3, 4, 5, 6],
              season_start_date: result.listing.season_start_date || null,
              season_end_date: result.listing.season_end_date || null,
              is_active: false,
              approval_status: result.listing.approval_status || "pending",
              approval_note: result.listing.approval_note || null,
            }
          : listing,
      ),
    );
    setListingDrafts((currentDrafts) => ({
      ...currentDrafts,
      [listingId]: {
        title: result.listing.title || "",
        description: result.listing.description || "",
        price:
          result.listing.price === null ? "" : String(result.listing.price),
        location: result.listing.location || "",
        category: result.listing.category || "Tours",
        imageUrl: result.listing.image_url || "",
        galleryImageUrls: (result.listing.gallery_image_urls || []).join("\n"),
        latitude: result.listing.latitude == null ? "" : String(result.listing.latitude),
        longitude: result.listing.longitude == null ? "" : String(result.listing.longitude),
      },
    }));
    setBlockedDates((currentDates) => ({
      ...currentDates,
      [listingId]: (result.listing.blocked_dates || []).join("\n"),
    }));
    setListingImageFiles((currentFiles) => ({
      ...currentFiles,
      [listingId]: [],
    }));
    setAvailabilityNotes((currentNotes) => ({
      ...currentNotes,
      [listingId]: result.listing.availability_note || "",
    }));
    setMaxGuestsByListing((currentValues) => ({
      ...currentValues,
      [listingId]: result.listing.max_guests
        ? String(result.listing.max_guests)
        : "",
    }));
    setNoticeHoursByListing((currentValues) => ({
      ...currentValues,
      [listingId]:
        result.listing.minimum_notice_hours !== null
          ? String(result.listing.minimum_notice_hours)
          : "",
    }));
    setBookingCutoffByListing((currentValues) => ({
      ...currentValues,
      [listingId]:
        result.listing.booking_cutoff_hours !== null
          ? String(result.listing.booking_cutoff_hours)
          : "",
    }));
    setAutoConfirmByListing((currentValues) => ({
      ...currentValues,
      [listingId]: result.listing.auto_confirm_bookings === true,
    }));
    setPrivateModeByListing((currentValues) => ({
      ...currentValues,
      [listingId]: result.listing.private_booking_mode === true,
    }));
    setWeekdaysByListing((currentValues) => ({
      ...currentValues,
      [listingId]: weekdayValue(result.listing.available_weekdays),
    }));
    setSeasonStartByListing((currentValues) => ({
      ...currentValues,
      [listingId]: result.listing.season_start_date || "",
    }));
    setSeasonEndByListing((currentValues) => ({
      ...currentValues,
      [listingId]: result.listing.season_end_date || "",
    }));
  }

  async function updateBookingStatus(
    bookingId: string,
    status: "confirmed" | "cancelled" | "suggest_time",
  ) {
    const { data: sessionData } = await supabase.auth.getSession();
    setSavingBookingId(bookingId);

    const response = await fetch(`/api/vendor/bookings/${bookingId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        status,
        vendorNote: vendorNotes[bookingId] || "",
      }),
    });

    const result = await response.json();
    setSavingBookingId(null);

    if (!response.ok) {
      alert(result.error || "Unable to update booking.");
      return;
    }

    setBookings((currentBookings) =>
      currentBookings.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              status: result.booking?.status || booking.status || status,
              vendor_note: result.booking?.vendor_note || null,
            }
          : booking,
      ),
    );
    setVendorNotes((currentNotes) => ({
      ...currentNotes,
      [bookingId]: result.booking?.vendor_note || "",
    }));
  }

  async function updateChangeRequest(
    bookingId: string,
    changeRequestId: string,
    action: "approved" | "declined" | "countered",
  ) {
    const { data: sessionData } = await supabase.auth.getSession();
    const note = changeActionNotes[changeRequestId] || "";
    const counter = changeCounterForms[changeRequestId] || {
      tourDate: "",
      tourTime: "",
      guests: "",
    };

    setSavingBookingId(bookingId);

    const response = await fetch(`/api/booking-change-requests/${changeRequestId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        action,
        responseNote: note,
        requestedTourDate: counter.tourDate || null,
        requestedTourTime: counter.tourTime || null,
        requestedGuests: counter.guests ? Number(counter.guests) : null,
      }),
    });
    const result = (await response.json()) as {
      error?: string;
      changeRequest?: BookingChangeRequest;
    };

    setSavingBookingId(null);

    const updatedChangeRequest = result.changeRequest;

    if (!response.ok || !updatedChangeRequest) {
      alert(result.error || "Unable to update change request.");
      return;
    }

    setBookings((currentBookings) =>
      currentBookings.map((booking) => {
        if (booking.id !== bookingId) return booking;

        const nextRequests = (booking.change_requests || []).map((request) =>
          request.id === changeRequestId ? updatedChangeRequest : request,
        );

        return {
          ...booking,
          ...(action === "approved"
            ? {
                tour_date:
                  updatedChangeRequest.requested_tour_date || booking.tour_date,
                tour_time:
                  updatedChangeRequest.requested_tour_time || booking.tour_time,
                guests: updatedChangeRequest.requested_guests || booking.guests,
              }
            : {}),
          change_requests: nextRequests,
        };
      }),
    );
  }

  async function addAddon(listingId: string) {
    const form = addonForms[listingId] || { name: "", priceCents: "" };
    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/vendor/listing-addons", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ listingId, ...form }),
    });
    const result = await response.json();
    if (!response.ok) {
      alert(result.error || "Unable to add add-on.");
      return;
    }
    setAddons((current) => [...current, result.addon as AddonRow]);
    setAddonForms((current) => ({ ...current, [listingId]: { name: "", priceCents: "" } }));
  }

  async function uploadVendorDocument(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!documentFile) {
      alert("Choose a document to upload.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const formData = new FormData();
    formData.append("title", documentTitle);
    formData.append("document", documentFile);
    setUploadingDocument(true);

    const response = await fetch("/api/vendor/documents", {
      method: "POST",
      headers: {
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: formData,
    });
    const result = await response.json();
    setUploadingDocument(false);

    if (!response.ok) {
      alert(result.error || "Unable to upload document.");
      return;
    }

    setDocuments((current) => [result.document as VendorDocument, ...current]);
    setDocumentTitle("");
    setDocumentFile(null);
  }

  const sortedBookings = useMemo(() => sortVendorBookings(bookings), [bookings]);
  const filteredVendorBookings = useMemo(
    () =>
      sortedBookings.filter(
        (booking) =>
          bookingResponseFilter === "all" ||
          Boolean(threadSummaries[booking.id]?.needsResponse),
      ),
    [bookingResponseFilter, sortedBookings, threadSummaries],
  );
  const chatThreads: BookingChatThread[] = useMemo(
    () =>
      sortedBookings.map((booking) => ({
        id: booking.id,
        title: booking.full_name,
        subtitle: `${booking.listing_name} - ${booking.tour_date} at ${booking.tour_time}`,
        apiPath: `/api/vendor/bookings/${booking.id}/messages`,
        summary: threadSummaries[booking.id],
      })),
    [sortedBookings, threadSummaries],
  );

  const pendingBookings = useMemo(
    () =>
      filteredVendorBookings.filter((booking) => (booking.status || "new") === "new"),
    [filteredVendorBookings],
  );

  const groupedBookings = useMemo(
    () => groupBookingsByDate(filteredVendorBookings),
    [filteredVendorBookings],
  );
  const needsResponseCount = bookings.filter(
    (booking) => threadSummaries[booking.id]?.needsResponse,
  ).length;

  const dashboardStats = useMemo(
    () => getVendorDashboardStats({ bookings, listings }),
    [bookings, listings],
  );
  const revenueSummary = useMemo(
    () => getVendorRevenueSummary({ bookings }),
    [bookings],
  );
  const payoutSummary = useMemo(
    () => getVendorPayoutSummary({ bookings }),
    [bookings],
  );
  const payoutListings = useMemo(
    () =>
      listings.map((listing) => ({
        id: listing.id,
        title: listing.title,
        vendor_id: vendorAccount?.vendor_id || null,
      })),
    [listings, vendorAccount?.vendor_id],
  );
  const payoutVendors = useMemo(
    () =>
      vendorAccount
        ? [
            {
              id: vendorAccount.vendor_id,
              business_name: vendorAccount.vendors?.business_name || "Your business",
              is_active: true,
            },
          ]
        : [],
    [vendorAccount],
  );
  const payoutStatements = useMemo(
    () =>
      getVendorPayoutStatements({
        bookings,
        listings: payoutListings,
        vendors: payoutVendors,
      }),
    [bookings, payoutListings, payoutVendors],
  );
  const payoutReceipts = useMemo(
    () =>
      getVendorPayoutReceipts({
        bookings,
        listings: payoutListings,
        vendors: payoutVendors,
      }),
    [bookings, payoutListings, payoutVendors],
  );

  const profileCompletionItems = useMemo(
    () =>
      getProfileCompletionItems({
        profile: profileForm,
        listings,
        documents,
      }),
    [documents, listings, profileForm],
  );

  const completedProfileItems = profileCompletionItems.filter(
    (item) => item.complete,
  ).length;
  const vendorFocusItems = useMemo(
    () =>
      getVendorFocusItems({
        stats: dashboardStats,
        needsResponseCount,
        profileCompletionItems,
      }),
    [dashboardStats, needsResponseCount, profileCompletionItems],
  );
  const vendorGrowthTasks = useMemo(
    () => getVendorGrowthTasks({ listings }),
    [listings],
  );
  const averageListingConversionScore = useMemo(() => {
    if (listings.length === 0) return 0;

    return Math.round(
      listings.reduce(
        (total, listing) => total + getListingConversionScore(listing).score,
        0,
      ) / listings.length,
    );
  }, [listings]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F3EA] px-6 py-10 text-[#17324D]">
        <div className="mx-auto max-w-5xl">Loading vendor dashboard...</div>
      </main>
    );
  }

  return (
    <main
      className={`min-h-screen bg-[#F7F3EA] text-[#17324D] ${
        mobileControls.compactMobileVendorDashboard
          ? "px-3 py-5 sm:px-6 sm:py-10"
          : "px-6 py-10"
      }`}
    >
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <SiteLogo />
          <div className="flex flex-wrap justify-end gap-2">
            <Link
              href="/"
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow"
            >
              Home
            </Link>
            <Link
              href="/vendor/add-listing"
              className="rounded-xl bg-[#00A8A8] px-4 py-2 text-sm font-semibold text-white"
            >
              Add Listing
            </Link>
            <button
              onClick={logout}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow"
            >
              Sign out
            </button>
          </div>
        </header>

        <section className="rounded-2xl bg-[#071F2F] p-6 text-white shadow-2xl shadow-[#071F2F]/10 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#D8EFEC] text-3xl font-bold text-[#0B3C5D]">
              {profileForm.profileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profileForm.profileImageUrl}
                  alt={profileForm.businessName || "Vendor profile"}
                  className="h-full w-full object-cover"
                />
              ) : (
                (profileForm.businessName || "V").slice(0, 1)
              )}
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9EE8E3]">
                Vendor dashboard
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                {vendorAccount?.vendors?.business_name || "Your Business"}
              </h1>
              <p className="mt-2 max-w-2xl text-white/75">
                Review new requests, keep listings polished, and finish your
                public profile from one cleaner workspace.
              </p>
            </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/vendor/add-listing"
                className="rounded-xl bg-[#00A8A8] px-4 py-3 text-sm font-bold text-white"
              >
                Add Listing
              </Link>
              <Link
                href={vendorAccount?.vendor_id ? `/vendors/${vendorAccount.vendor_id}` : "/vendors"}
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white"
              >
                View Profile
              </Link>
            </div>
          </div>
        </section>

        <VendorProCommandCenter
          listings={listings}
          bookings={bookings}
          documents={documents}
        />

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            {
              label: "New requests",
              value: dashboardStats.newBookings,
              text: "Need an answer",
            },
            {
              label: "Confirmed",
              value: dashboardStats.confirmedBookings,
              text: "Trips to prepare",
            },
            {
              label: "Live listings",
              value: dashboardStats.liveListings,
              text: "Visible to travelers",
            },
            {
              label: "In review",
              value: dashboardStats.reviewListings,
              text: "Waiting or needs edits",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-[#00A8A8]">{item.label}</p>
              <p className="mt-2 text-3xl font-black text-[#0B3C5D]">
                {item.value}
              </p>
              <p className="mt-1 text-sm text-gray-600">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded-2xl bg-[#071F2F] p-6 text-white shadow-xl shadow-[#071F2F]/10">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#D6B56D]">
                Revenue kit
              </p>
              <h2 className="mt-2 text-2xl font-bold">
                Know what requests are worth.
              </h2>
            </div>
            <p className="rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white">
              {revenueSummary.label}
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total requests",
                value: formatBookingCents(revenueSummary.grossBookingValueCents),
                text: "All active booking value",
              },
              {
                label: "Confirmed",
                value: formatBookingCents(revenueSummary.confirmedValueCents),
                text: `${revenueSummary.upcomingConfirmedCount} upcoming confirmed`,
              },
              {
                label: "Pending",
                value: formatBookingCents(revenueSummary.pendingValueCents),
                text: "New or suggested requests",
              },
              {
                label: "Add-ons",
                value: formatBookingCents(revenueSummary.addonRevenueCents),
                text: `Top: ${revenueSummary.topAddonLabel}`,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-white/10 p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9EE8E3]">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-black text-white">
                  {item.value}
                </p>
                <p className="mt-1 text-sm text-white/65">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-white/70">
            Average request value:{" "}
            <span className="font-bold text-white">
              {formatBookingCents(revenueSummary.averageBookingValueCents)}
            </span>
            . Add-ons make it easier to lift each booking without changing the
            main price.
          </p>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#00A8A8]">
                Payout tracker
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#0B3C5D]">
                See what is pending, scheduled, and paid.
              </h2>
            </div>
            <p className="rounded-full bg-[#EEF7F6] px-4 py-2 text-sm font-bold text-[#0B3C5D]">
              {payoutSummary.label}
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Unpaid",
                value: formatBookingCents(payoutSummary.unpaidCents),
                text: `${payoutSummary.unpaidCount} payout${payoutSummary.unpaidCount === 1 ? "" : "s"}`,
              },
              {
                label: "Scheduled",
                value: formatBookingCents(payoutSummary.scheduledCents),
                text: payoutSummary.nextScheduledDate
                  ? `Next: ${payoutSummary.nextScheduledDate}`
                  : `${payoutSummary.scheduledCount} scheduled`,
              },
              {
                label: "Paid",
                value: formatBookingCents(payoutSummary.paidCents),
                text: `${payoutSummary.paidCount} marked paid`,
              },
              {
                label: "Waived",
                value: formatBookingCents(payoutSummary.waivedCents),
                text: `${payoutSummary.waivedCount} waived`,
              },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-[#F7F3EA] p-4">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#007B7B]">
                  {item.label}
                </p>
                <p className="mt-2 text-2xl font-black text-[#0B3C5D]">
                  {item.value}
                </p>
                <p className="mt-1 text-sm text-gray-600">{item.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
                    Vendor payout statements
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[#0B3C5D]">
                    Monthly payout summary
                  </h3>
                </div>
                <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-black text-[#0B3C5D]">
                  {payoutStatements.length}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {payoutStatements.slice(0, 3).map((statement) => (
                  <div
                    key={statement.statementId}
                    className="rounded-lg bg-[#F7F3EA] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#0B3C5D]">
                          {statement.period === "unscheduled"
                            ? "Unscheduled"
                            : statement.period}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          {statement.bookingCount} booking
                          {statement.bookingCount === 1 ? "" : "s"} /{" "}
                          {statement.receiptCount} receipt
                          {statement.receiptCount === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p className="text-right text-sm font-black text-[#0B3C5D]">
                        {formatBookingCents(statement.vendorPayoutCents)}
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-bold text-gray-600">
                      {statement.label}
                    </p>
                  </div>
                ))}
                {payoutStatements.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                    Statements will appear after bookings have payout amounts.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
                    Recent payout receipts
                  </p>
                  <h3 className="mt-1 text-lg font-black text-[#0B3C5D]">
                    Paid payout proof
                  </h3>
                </div>
                <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-xs font-black text-[#0B3C5D]">
                  {payoutReceipts.length}
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {payoutReceipts.slice(0, 3).map((receipt) => (
                  <div
                    key={receipt.receiptId}
                    className="rounded-lg bg-[#F7F3EA] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#0B3C5D]">
                          {receipt.receiptId}
                        </p>
                        <p className="mt-1 text-xs text-gray-600">
                          {receipt.listingTitle} / {receipt.guestName}
                        </p>
                      </div>
                      <p className="text-right text-sm font-black text-[#0B3C5D]">
                        {formatBookingCents(receipt.vendorPayoutCents)}
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-bold text-gray-600">
                      Paid {receipt.payoutPaidAt?.slice(0, 10) || "recently"}
                    </p>
                  </div>
                ))}
                {payoutReceipts.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                    Receipts will appear when payouts are marked paid.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-gray-600">
            Payouts are updated by the RoatanIsland.life admin after bookings
            are confirmed, completed, or reconciled.
          </p>
          <div className="mt-6 rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-4">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
                  Vendor payout forecast
                </p>
                <h3 className="mt-1 text-lg font-black text-[#0B3C5D]">
                  What each booking is expected to pay.
                </h3>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0B3C5D]">
                Private payout note appears per booking
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {bookings.slice(0, 4).map((booking) => {
                const payout = getVendorPayoutForecast(booking);
                const snapshot = getBookingMoneySnapshot(booking);

                return (
                  <div key={booking.id} className="rounded-lg bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-[#0B3C5D]">
                          {booking.full_name}
                        </p>
                        <p className="mt-1 text-xs font-bold text-gray-600">
                          Guest payment status: {snapshot.paymentLabel}
                        </p>
                      </div>
                      <p className="text-right text-sm font-black text-[#0B3C5D]">
                        {payout.label}
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-gray-600">
                      Private payout note:{" "}
                      {booking.vendor_private_payout_note ||
                        booking.payout_note ||
                        "No private note yet."}
                    </p>
                  </div>
                );
              })}
              {bookings.length === 0 ? (
                <p className="rounded-lg border border-dashed border-[#00A8A8]/25 p-4 text-sm text-gray-600">
                  Payout forecasts will appear when booking requests arrive.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#00A8A8]">
                Today{"'"}s focus
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#0B3C5D]">
                Start with the highest-impact tasks.
              </h2>
            </div>
            <Link
              href="#bookings"
              className="rounded-xl bg-[#0B3C5D] px-4 py-3 text-sm font-bold text-white"
            >
              Open bookings
            </Link>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {vendorFocusItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`rounded-xl border p-5 transition hover:-translate-y-0.5 hover:shadow-lg ${
                  item.tone === "urgent"
                    ? "border-[#D6B56D]/40 bg-[#FFF8E8]"
                    : item.tone === "setup"
                      ? "border-[#00A8A8]/25 bg-[#EEF7F6]"
                      : "border-gray-200 bg-white"
                }`}
              >
                <p className="text-sm font-black uppercase tracking-[0.14em] text-[#0B3C5D]/65">
                  {item.label}
                </p>
                <p className="mt-3 text-4xl font-black text-[#0B3C5D]">
                  {item.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {item.text}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#00A8A8]">
                Growth checklist
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#0B3C5D]">
                Make every listing easier to book.
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                These are the biggest things travelers look for before sending
                a request.
              </p>
            </div>
            <div className="rounded-xl bg-[#071F2F] px-5 py-4 text-white">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9EE8E3]">
                Conversion score
              </p>
              <p className="mt-2 text-3xl font-black">
                {averageListingConversionScore}%
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {(vendorGrowthTasks.length
              ? vendorGrowthTasks
              : [
                  {
                    label: "Keep listings fresh",
                    count: listings.length,
                    text: "Review photos, times, map pins, and availability before busy travel days.",
                  },
                ]
            ).map((task) => (
              <div
                key={task.label}
                className="rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-[#0B3C5D]">{task.label}</p>
                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {task.text}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-[#0B3C5D]">
                    {task.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-2xl bg-white p-6 shadow">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#00A8A8]">
                Profile checklist
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#0B3C5D]">
                {completedProfileItems}/{profileCompletionItems.length} complete
              </h2>
            </div>
            <Link
              href="#profile"
              className="rounded-xl bg-[#F7F3EA] px-4 py-3 text-sm font-bold text-[#0B3C5D]"
            >
              Update profile
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {profileCompletionItems.map((item) => (
              <div
                key={item.label}
                className={`rounded-xl border p-4 ${
                  item.complete
                    ? "border-green-200 bg-green-50"
                    : "border-[#D6B56D]/30 bg-[#FFF9EC]"
                }`}
              >
                <p className="font-bold text-[#0B3C5D]">
                  {item.complete ? "Done: " : "Next: "}
                  {item.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="profile" className="mt-8 rounded-2xl bg-white p-8 shadow">
          <h2 className="text-2xl font-bold text-[#0B3C5D]">
            Public Vendor Profile
          </h2>
          <p className="mt-2 text-gray-600">
            These details appear on your public vendor page.
          </p>

          <form onSubmit={saveVendorProfile} className="mt-6 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block font-medium">Profile Picture</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              />
              {profileImageFile ? (
                <p className="mt-2 text-sm text-gray-500">
                  Selected: {profileImageFile.name}
                </p>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block font-medium">Business Name</label>
              <input
                value={profileForm.businessName}
                onChange={(e) => updateProfileForm("businessName", e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Contact Name</label>
              <input
                value={profileForm.contactName}
                onChange={(e) => updateProfileForm("contactName", e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              />
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={profileForm.showContactName}
                  onChange={(e) =>
                    updateProfileForm("showContactName", e.target.checked)
                  }
                />
                Show on public profile
              </label>
            </div>

            <div>
              <label className="mb-2 block font-medium">Phone</label>
              <input
                value={profileForm.phone}
                onChange={(e) => updateProfileForm("phone", e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              />
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={profileForm.showPhone}
                  onChange={(e) =>
                    updateProfileForm("showPhone", e.target.checked)
                  }
                />
                Show on public profile
              </label>
            </div>

            <div className="md:col-span-2">
              <p className="mb-2 block font-medium">Email Privacy</p>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={profileForm.showEmail}
                  onChange={(e) =>
                    updateProfileForm("showEmail", e.target.checked)
                  }
                />
                Show contact button using your account email
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block font-medium">Website</label>
              <input
                value={profileForm.website}
                onChange={(e) => updateProfileForm("website", e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              />
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={profileForm.showWebsite}
                  onChange={(e) =>
                    updateProfileForm("showWebsite", e.target.checked)
                  }
                />
                Show on public profile
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block font-medium">About / Notes</label>
              <textarea
                value={profileForm.notes}
                onChange={(e) => updateProfileForm("notes", e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white disabled:opacity-50 md:col-span-2"
            >
              {savingProfile ? "Saving profile..." : "Save Profile"}
            </button>
          </form>
        </section>

        <section id="bookings" className="mt-8 scroll-mt-24 rounded-2xl bg-white p-8 shadow">
          <h2 className="text-2xl font-bold text-[#0B3C5D]">
            Business Verification
          </h2>
          <p className="mt-2 text-gray-600">
            Upload business documents so the admin can review and verify your vendor account.
          </p>

          <form onSubmit={uploadVendorDocument} className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <input
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="Document name"
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none"
              required
            />
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
              className="rounded-xl border border-gray-300 px-4 py-3 outline-none"
              required
            />
            <button
              type="submit"
              disabled={uploadingDocument}
              className="rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white disabled:opacity-50"
            >
              {uploadingDocument ? "Uploading..." : "Upload"}
            </button>
          </form>

          <div className="mt-6 grid gap-3">
            {documents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-300 p-5 text-sm text-gray-600">
                No documents uploaded yet.
              </p>
            ) : (
              documents.map((document) => (
                <div
                  key={document.id}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold text-[#0B3C5D]">
                        {document.title}
                      </p>
                      <p className="mt-1 text-sm text-gray-600">
                        Status: {document.status}
                      </p>
                    </div>
                    <a
                      href={document.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-[#00A8A8] px-4 py-2 text-sm font-semibold text-[#007B7B]"
                    >
                      Open
                    </a>
                  </div>
                  {document.admin_note ? (
                    <p className="mt-3 rounded-lg bg-[#F7F3EA] p-3 text-sm text-gray-700">
                      {document.admin_note}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </section>

        <section id="listings" className="mt-8 scroll-mt-24 rounded-2xl bg-white p-8 shadow">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#00A8A8]">
                Booking controls
              </p>
              <h2 className="mt-2 text-2xl font-bold text-[#0B3C5D]">
                Booking command center
              </h2>
              <p className="mt-2 text-gray-600">
                Confirm requests, decline unavailable dates, and send pickup or
                payment notes back to guests.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={bookingResponseFilter}
                onChange={(e) =>
                  setBookingResponseFilter(
                    e.target.value as "all" | "needs_response",
                  )
                }
                className="rounded-xl border border-gray-200 bg-[#F7F3EA] px-4 py-3 text-sm font-bold text-[#0B3C5D] outline-none"
              >
                <option value="all">All booking threads</option>
                <option value="needs_response">Needs response</option>
              </select>
              <span className="rounded-xl bg-[#F7F3EA] px-4 py-3 text-sm font-bold text-[#0B3C5D]">
                {pendingBookings.length} new / {needsResponseCount} need response
              </span>
            </div>
          </div>

          {bookings.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-[#00A8A8]/40 bg-[#F7F3EA] p-6 text-sm text-gray-600">
              No booking requests yet.
            </div>
          ) : (
            <>
            {pendingBookings.length > 0 ? (
              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                {pendingBookings.slice(0, 4).map((booking) => (
                  <article
                    key={booking.id}
                    className="rounded-xl border border-[#00A8A8]/25 bg-[#EEF7F6] p-5"
                  >
                    <div className="flex flex-wrap justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold uppercase text-[#007B7B]">
                          New request
                        </p>
                        <h3 className="mt-1 text-lg font-black text-[#0B3C5D]">
                          {booking.full_name}
                        </h3>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[#0B3C5D]">
                        {booking.guests} guest{booking.guests === 1 ? "" : "s"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-bold ${threadBadgeClass(
                          threadSummaries[booking.id],
                        )}`}
                      >
                        {threadSummaries[booking.id]?.badgeLabel ||
                          "No messages"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-gray-700">
                      {booking.listing_name} on {booking.tour_date} at{" "}
                      {booking.tour_time}
                    </p>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-xs font-bold uppercase text-gray-500">
                          Payment
                        </p>
                        <p className="mt-1 font-bold text-[#0B3C5D]">
                          {formatDepositStatus(booking.deposit_status)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white p-3">
                        <p className="text-xs font-bold uppercase text-gray-500">
                          Estimated value
                        </p>
                        <p className="mt-1 font-bold text-[#0B3C5D]">
                          {formatBookingCents(booking.booking_value_cents)}
                        </p>
                      </div>
                    </div>
                    {booking.selected_addons?.length ? (
                      <div className="mt-3 rounded-lg bg-white p-3 text-sm text-gray-700">
                        <p className="font-bold text-[#0B3C5D]">Add-ons</p>
                        <p className="mt-1">
                          {booking.selected_addons
                            .map((addon) => addon.name || "Add-on")
                            .join(", ")}
                        </p>
                      </div>
                    ) : null}
                    {booking.guest_message ? (
                      <p className="mt-3 rounded-lg bg-white p-3 text-sm text-gray-700">
                        {booking.guest_message}
                      </p>
                    ) : null}
                    <p className="mt-3 rounded-lg bg-white p-3 text-sm text-gray-700">
                      {threadSummaries[booking.id]?.lastMessagePreview ||
                        "No thread messages yet."}
                    </p>
                    <label className="mt-4 block text-sm font-bold text-[#0B3C5D]">
                      Note sent to guest
                    </label>
                    <textarea
                      value={vendorNotes[booking.id] || ""}
                      onChange={(e) =>
                        setVendorNotes((currentNotes) => ({
                          ...currentNotes,
                          [booking.id]: e.target.value,
                        }))
                      }
                      rows={2}
                      maxLength={1000}
                      placeholder="Pickup details or confirmation note"
                      className="mt-4 w-full rounded-lg border border-white px-3 py-2 text-sm outline-none"
                      disabled={savingBookingId === booking.id}
                    />
                    {(booking.change_requests || []).filter(
                      (request) => request.status === "pending",
                    ).length > 0 ? (
                      <div className="mt-4 rounded-xl border border-[#D6B56D]/35 bg-[#FFF8E8] p-4">
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9C7A2F]">
                          Change requests
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#0B3C5D]">
                          {
                            getBookingChangeRequestSummary(
                              booking.change_requests || [],
                            ).latestLabel
                          }
                        </p>
                        {(booking.change_requests || [])
                          .filter((request) => request.status === "pending")
                          .slice(0, 1)
                          .map((request) => (
                            <div key={request.id} className="mt-3 grid gap-3">
                              <p className="text-sm leading-6 text-gray-700">
                                Requested:{" "}
                                {request.requested_tour_date || booking.tour_date} at{" "}
                                {request.requested_tour_time || booking.tour_time}
                                {request.requested_guests
                                  ? ` for ${request.requested_guests} guests`
                                  : ""}
                              </p>
                              {request.reason ? (
                                <p className="rounded-lg bg-white p-3 text-sm text-gray-700">
                                  {request.reason}
                                </p>
                              ) : null}
                              <textarea
                                value={changeActionNotes[request.id] || ""}
                                onChange={(event) =>
                                  setChangeActionNotes((current) => ({
                                    ...current,
                                    [request.id]: event.target.value,
                                  }))
                                }
                                rows={2}
                                placeholder="Response note"
                                className="rounded-lg border border-white px-3 py-2 text-sm outline-none"
                              />
                              <div className="grid gap-2 sm:grid-cols-3">
                                <input
                                  type="date"
                                  value={changeCounterForms[request.id]?.tourDate || ""}
                                  onChange={(event) =>
                                    setChangeCounterForms((current) => ({
                                      ...current,
                                      [request.id]: {
                                        tourDate: event.target.value,
                                        tourTime: current[request.id]?.tourTime || "",
                                        guests: current[request.id]?.guests || "",
                                      },
                                    }))
                                  }
                                  className="rounded-lg border border-white px-3 py-2 text-sm outline-none"
                                  aria-label="Suggested date"
                                />
                                <input
                                  value={changeCounterForms[request.id]?.tourTime || ""}
                                  onChange={(event) =>
                                    setChangeCounterForms((current) => ({
                                      ...current,
                                      [request.id]: {
                                        tourDate: current[request.id]?.tourDate || "",
                                        tourTime: event.target.value,
                                        guests: current[request.id]?.guests || "",
                                      },
                                    }))
                                  }
                                  placeholder="Suggest time"
                                  className="rounded-lg border border-white px-3 py-2 text-sm outline-none"
                                />
                                <input
                                  type="number"
                                  min="1"
                                  value={changeCounterForms[request.id]?.guests || ""}
                                  onChange={(event) =>
                                    setChangeCounterForms((current) => ({
                                      ...current,
                                      [request.id]: {
                                        tourDate: current[request.id]?.tourDate || "",
                                        tourTime: current[request.id]?.tourTime || "",
                                        guests: event.target.value,
                                      },
                                    }))
                                  }
                                  placeholder="Guests"
                                  className="rounded-lg border border-white px-3 py-2 text-sm outline-none"
                                />
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateChangeRequest(
                                      booking.id,
                                      request.id,
                                      "approved",
                                    )
                                  }
                                  className="rounded-lg bg-green-600 px-3 py-2 text-sm font-bold text-white"
                                >
                                  Approve change
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateChangeRequest(
                                      booking.id,
                                      request.id,
                                      "countered",
                                    )
                                  }
                                  className="rounded-lg bg-[#D6B56D] px-3 py-2 text-sm font-bold text-[#0B3C5D]"
                                >
                                  Suggest another
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateChangeRequest(
                                      booking.id,
                                      request.id,
                                      "declined",
                                    )
                                  }
                                  className="rounded-lg bg-red-500 px-3 py-2 text-sm font-bold text-white"
                                >
                                  Decline
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          setSelectedBookingId(booking.id);
                          setChatOpen(true);
                        }}
                        disabled={savingBookingId === booking.id}
                        className="rounded-lg bg-[#0B3C5D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Open thread
                      </button>
                      <button
                        onClick={() => updateBookingStatus(booking.id, "confirmed")}
                        disabled={savingBookingId === booking.id}
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => updateBookingStatus(booking.id, "cancelled")}
                        disabled={savingBookingId === booking.id}
                        className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          updateBookingStatus(booking.id, "suggest_time")
                        }
                        disabled={
                          savingBookingId === booking.id ||
                          !(vendorNotes[booking.id] || "").trim()
                        }
                        className="rounded-lg bg-[#D6B56D] px-4 py-2 text-sm font-semibold text-[#0B3C5D] disabled:opacity-50"
                      >
                        Suggest time
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : null}
            <div className="mt-8 grid gap-4">
              {groupedBookings.slice(0, 6).map((group) => (
                <section
                  key={group.date}
                  className="rounded-2xl border border-gray-200 p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-[#0B3C5D]">
                      {group.date}
                    </h3>
                    <span className="rounded-full bg-[#EEF7F6] px-3 py-1 text-sm font-semibold text-[#0B3C5D]">
                      {group.bookings.length} request
                      {group.bookings.length === 1 ? "" : "s"} -{" "}
                      {group.totalGuests} guest
                      {group.totalGuests === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {group.bookings.map((booking) => (
                      <article
                        key={booking.id}
                        className="rounded-xl bg-[#F7F3EA] p-4"
                      >
                        <div className="flex flex-wrap justify-between gap-3">
                          <p className="font-bold text-[#0B3C5D]">
                            {booking.tour_time} - {booking.full_name}
                          </p>
                          <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold capitalize text-[#0B3C5D]">
                            {formatBookingStatus(booking.status)}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${threadBadgeClass(
                              threadSummaries[booking.id],
                            )}`}
                          >
                            {threadSummaries[booking.id]?.badgeLabel ||
                              "No messages"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          {booking.listing_name} - {booking.guests} guest
                          {booking.guests === 1 ? "" : "s"}
                        </p>
                        <p className="mt-2 text-sm font-semibold text-[#0B3C5D]">
                          {formatDepositStatus(booking.deposit_status)} -{" "}
                          {formatBookingCents(booking.booking_value_cents)}
                        </p>
                        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-gray-600">
                          {threadSummaries[booking.id]?.lastMessagePreview ||
                            "No thread messages yet."}
                        </p>
                        {(() => {
                          const cue = getBookingOpsPriority({
                            status: booking.status,
                            depositStatus: booking.deposit_status,
                            threadNeedsResponse: Boolean(
                              threadSummaries[booking.id]?.needsResponse,
                            ),
                            paymentIssue: false,
                            tourDate: booking.tour_date,
                          });

                          return (
                            <div className="mt-3 rounded-lg border border-[#00A8A8]/15 bg-white p-3">
                              <p className="text-xs font-black uppercase tracking-[0.12em] text-[#007B7B]">
                                Guest confidence cue
                              </p>
                              <p className="mt-1 font-black text-[#0B3C5D]">
                                {cue.label}
                              </p>
                              <p className="mt-1 text-sm leading-6 text-gray-600">
                                {cue.text}
                              </p>
                            </div>
                          );
                        })()}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <div className="mt-8 rounded-xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-4 text-sm font-semibold text-[#0B3C5D] md:hidden">
              The full table is available on wider screens. On your phone, use
              the booking cards above for faster updates.
            </div>
            <div className="mt-8 hidden md:block overflow-x-auto">
              <table className="min-w-[1320px] border-collapse">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3">Listing</th>
                    <th className="px-4 py-3">Guest</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Guests</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Value</th>
                    <th className="px-4 py-3">Add-ons</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Thread</th>
                    <th className="px-4 py-3">Your note</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Change requests</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendorBookings.map((booking) => (
                    <tr key={booking.id} className="border-b">
                      <td className="px-4 py-3 font-medium">
                        {booking.listing_name}
                      </td>
                      <td className="px-4 py-3">{booking.full_name}</td>
                      <td className="px-4 py-3">{booking.email}</td>
                      <td className="px-4 py-3">{booking.tour_date}</td>
                      <td className="px-4 py-3">{booking.tour_time}</td>
                      <td className="px-4 py-3">{booking.guests}</td>
                      <td className="px-4 py-3">
                        {formatDepositStatus(booking.deposit_status)}
                      </td>
                      <td className="px-4 py-3">
                        {formatBookingCents(booking.booking_value_cents)}
                      </td>
                      <td className="max-w-56 px-4 py-3 text-sm text-gray-600">
                        {booking.selected_addons?.length
                          ? booking.selected_addons
                              .map((addon) => addon.name || "Add-on")
                              .join(", ")
                          : "None"}
                      </td>
                      <td className="max-w-72 px-4 py-3 text-sm text-gray-600">
                        {booking.guest_message || "No message"}
                      </td>
                      <td className="max-w-72 px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${threadBadgeClass(
                            threadSummaries[booking.id],
                          )}`}
                        >
                          {threadSummaries[booking.id]?.badgeLabel ||
                            "No messages"}
                        </span>
                        <p className="mt-2 text-sm text-gray-600">
                          {threadSummaries[booking.id]?.lastMessagePreview ||
                            "No thread messages yet."}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <textarea
                          value={vendorNotes[booking.id] || ""}
                          onChange={(e) =>
                            setVendorNotes((currentNotes) => ({
                              ...currentNotes,
                              [booking.id]: e.target.value,
                            }))
                          }
                          rows={2}
                          maxLength={1000}
                          placeholder="Pickup details or confirmation note"
                          className="min-w-60 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                          disabled={savingBookingId === booking.id}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {formatBookingStatus(booking.status)}
                      </td>
                      <td className="max-w-80 px-4 py-3">
                        {booking.change_requests?.length ? (
                          <div className="grid gap-3">
                            <span className="w-fit rounded-full bg-[#FFF8E8] px-3 py-1 text-xs font-black text-[#7A5B12]">
                              {
                                getBookingChangeRequestSummary(
                                  booking.change_requests,
                                ).latestLabel
                              }
                            </span>
                            {(booking.change_requests || [])
                              .filter((request) => request.status === "pending")
                              .slice(0, 1)
                              .map((request) => (
                                <div key={request.id} className="grid gap-2">
                                  <p className="text-sm text-gray-600">
                                    {request.requested_tour_date ||
                                      booking.tour_date}{" "}
                                    at{" "}
                                    {request.requested_tour_time ||
                                      booking.tour_time}
                                  </p>
                                  <textarea
                                    value={changeActionNotes[request.id] || ""}
                                    onChange={(event) =>
                                      setChangeActionNotes((current) => ({
                                        ...current,
                                        [request.id]: event.target.value,
                                      }))
                                    }
                                    rows={2}
                                    placeholder="Response note"
                                    className="min-w-56 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none"
                                  />
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateChangeRequest(
                                          booking.id,
                                          request.id,
                                          "approved",
                                        )
                                      }
                                      className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateChangeRequest(
                                          booking.id,
                                          request.id,
                                          "declined",
                                        )
                                      }
                                      className="rounded-lg bg-red-500 px-3 py-2 text-xs font-bold text-white"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            No changes
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setSelectedBookingId(booking.id);
                              setChatOpen(true);
                            }}
                            disabled={savingBookingId === booking.id}
                            className="rounded-lg bg-[#0B3C5D] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Thread
                          </button>
                          <button
                            onClick={() =>
                              updateBookingStatus(booking.id, "confirmed")
                            }
                            disabled={
                              savingBookingId === booking.id ||
                              booking.status === "confirmed"
                            }
                            className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() =>
                              updateBookingStatus(booking.id, "cancelled")
                            }
                            disabled={
                              savingBookingId === booking.id ||
                              booking.status === "cancelled"
                            }
                            className="rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() =>
                              updateBookingStatus(booking.id, "suggest_time")
                            }
                            disabled={
                              savingBookingId === booking.id ||
                              !(vendorNotes[booking.id] || "").trim()
                            }
                            className="rounded-lg bg-[#D6B56D] px-3 py-2 text-sm font-semibold text-[#0B3C5D] disabled:opacity-50"
                          >
                            Suggest
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        <section className="mt-8 rounded-2xl bg-white p-8 shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#0B3C5D]">
                Your Listings
              </h2>
              <p className="mt-2 text-gray-600">
                Approved listings appear on the public site.
              </p>
            </div>
          </div>

          {listings.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-[#00A8A8]/40 bg-[#F7F3EA] p-6">
              <p className="font-semibold text-[#0B3C5D]">
                No listings submitted yet.
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Add your first tour, stay, or transport listing for admin
                review.
              </p>
              <Link
                href="/vendor/add-listing"
                className="mt-4 inline-block rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
              >
                Add a listing
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-4">
              {listings.map((listing) => {
                const draft = listingDrafts[listing.id];

                if (!draft) {
                  return null;
                }

                const status = getListingStatusSummary(listing);
                const readiness = getListingReadinessSummary(listing);
                const revenueKit = getListingRevenueKit({
                  listing,
                  bookings,
                  addons,
                });
                const photoCount = countListingPhotos(listing);
                const timeCount = (listing.tour_times || []).length;
                const hasMapPin =
                  listing.latitude != null && listing.longitude != null;
                const isExpanded = Boolean(expandedListingIds[listing.id]);

                return (
                <article
                  key={listing.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-[#0B3C5D]">
                        {listing.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600">
                        {listing.category || "Listing"} in{" "}
                        {listing.location || "Roatan"}
                        {listing.price ? ` - $${listing.price}` : ""}
                      </p>
                      <div className="mt-4 grid gap-3 sm:grid-cols-4">
                        {[
                          {
                            label: "Photos",
                            value: photoCount,
                          },
                          {
                            label: "Tour times",
                            value: timeCount,
                          },
                          {
                            label: "Map pin",
                            value: hasMapPin ? "Set" : "Missing",
                          },
                          {
                            label: "Max guests",
                            value: listing.max_guests || "Ask",
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-xl bg-[#F7F3EA] p-3"
                          >
                            <p className="text-xs font-bold uppercase text-[#007B7B]">
                              {item.label}
                            </p>
                            <p className="mt-1 font-black text-[#0B3C5D]">
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-4">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#007B7B]">
                              Guest readiness
                            </p>
                            <p className="mt-1 text-lg font-black text-[#0B3C5D]">
                              {readiness.label} - {readiness.score}%
                            </p>
                          </div>
                          <div className="h-2 min-w-36 overflow-hidden rounded-full bg-white">
                            <span
                              className="block h-full rounded-full bg-[#00A8A8]"
                              style={{ width: `${readiness.score}%` }}
                            />
                          </div>
                        </div>
                        {readiness.missingItems.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {readiness.missingItems.slice(0, 4).map((item) => (
                              <span
                                key={item}
                                className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0B3C5D]"
                              >
                                {item}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm font-semibold text-[#0B3C5D]/70">
                            This listing has the basics travelers need to decide.
                          </p>
                        )}
                      </div>
                      <div className="mt-4 rounded-xl border border-[#D6B56D]/30 bg-[#FFF8E8] p-4">
                        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#9C7A2F]">
                              Listing revenue score
                            </p>
                            <p className="mt-1 text-lg font-black text-[#0B3C5D]">
                              {revenueKit.label} - {revenueKit.score}%
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center text-sm">
                            <div className="rounded-lg bg-white px-3 py-2">
                              <p className="text-xs font-bold text-gray-500">
                                Requests
                              </p>
                              <p className="font-black text-[#0B3C5D]">
                                {revenueKit.requestCount}
                              </p>
                            </div>
                            <div className="rounded-lg bg-white px-3 py-2">
                              <p className="text-xs font-bold text-gray-500">
                                Value
                              </p>
                              <p className="font-black text-[#0B3C5D]">
                                {formatBookingCents(revenueKit.bookingValueCents)}
                              </p>
                            </div>
                            <div className="rounded-lg bg-white px-3 py-2">
                              <p className="text-xs font-bold text-gray-500">
                                Add-ons
                              </p>
                              <p className="font-black text-[#0B3C5D]">
                                {revenueKit.addonCount}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {revenueKit.tips.slice(0, 4).map((tip) => (
                            <span
                              key={tip}
                              className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#0B3C5D]"
                            >
                              {tip}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => toggleListingEditor(listing.id)}
                          className="rounded-xl bg-[#0B3C5D] px-4 py-2 text-sm font-semibold text-white"
                        >
                          {isExpanded ? "Hide details" : "Edit details"}
                        </button>
                        <Link
                          href={`/listings/${listing.id}`}
                          className="rounded-xl border border-[#00A8A8] px-4 py-2 text-sm font-semibold text-[#007B7B]"
                        >
                          View
                        </Link>
                      </div>
                      {isExpanded ? (
                      <>
                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                            Title
                          </label>
                          <input
                            value={draft.title}
                            onChange={(e) =>
                              updateListingDraft(
                                listing.id,
                                "title",
                                e.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                            required
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                            Description
                          </label>
                          <textarea
                            value={draft.description}
                            onChange={(e) =>
                              updateListingDraft(
                                listing.id,
                                "description",
                                e.target.value,
                              )
                            }
                            rows={4}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                            Price
                          </label>
                          <input
                            type="number"
                            value={draft.price}
                            onChange={(e) =>
                              updateListingDraft(
                                listing.id,
                                "price",
                                e.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                            Location
                          </label>
                          <input
                            value={draft.location}
                            onChange={(e) =>
                              updateListingDraft(
                                listing.id,
                                "location",
                                e.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                            Category
                          </label>
                          <select
                            value={draft.category}
                            onChange={(e) =>
                              updateListingDraft(
                                listing.id,
                                "category",
                                e.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                          >
                            <option value="Tours">Tours</option>
                            <option value="Hotels">Hotels</option>
                            <option value="Transport">Transport</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                            Listing Photos
                          </label>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            multiple
                            onChange={(e) =>
                              setListingImageFiles((currentFiles) => ({
                                ...currentFiles,
                                [listing.id]: Array.from(e.target.files || []),
                              }))
                            }
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                          />
                          {(listingImageFiles[listing.id] || []).length > 0 ? (
                            <p className="mt-2 text-sm text-gray-500">
                              Selected: {(listingImageFiles[listing.id] || [])
                                .map((file) => file.name)
                                .join(", ")}
                            </p>
                          ) : null}
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                            Image URL
                          </label>
                          <input
                            value={draft.imageUrl}
                            onChange={(e) =>
                              updateListingDraft(
                                listing.id,
                                "imageUrl",
                                e.target.value,
                              )
                            }
                            placeholder="https://..."
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                            Extra Gallery Image URLs
                          </label>
                          <textarea
                            value={draft.galleryImageUrls}
                            onChange={(e) =>
                              updateListingDraft(
                                listing.id,
                                "galleryImageUrls",
                                e.target.value,
                              )
                            }
                            rows={3}
                            placeholder={"https://...\nhttps://..."}
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                          />
                          <p className="mt-2 text-sm text-gray-500">
                            Add one image URL per line for the public gallery.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-xl bg-[#F7F3EA] p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-[#0B3C5D]">
                            Map Pin
                          </p>
                          <button
                            type="button"
                            onClick={() => findListingMapPin(listing.id)}
                            className="rounded-xl bg-[#0B3C5D] px-4 py-2 text-sm font-semibold text-white"
                          >
                            Find map pin
                          </button>
                        </div>
                        <div className="mb-3 grid gap-3 sm:grid-cols-2">
                          <input
                            type="number"
                            step="any"
                            value={draft.latitude}
                            onChange={(e) =>
                              updateListingDraft(
                                listing.id,
                                "latitude",
                                e.target.value,
                              )
                            }
                            placeholder="Latitude"
                            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                          />
                          <input
                            type="number"
                            step="any"
                            value={draft.longitude}
                            onChange={(e) =>
                              updateListingDraft(
                                listing.id,
                                "longitude",
                                e.target.value,
                              )
                            }
                            placeholder="Longitude"
                            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                          />
                        </div>
                        <PinPicker
                          latitude={draft.latitude}
                          longitude={draft.longitude}
                          onChange={(coords) => {
                            updateListingDraft(listing.id, "latitude", coords.latitude);
                            updateListingDraft(listing.id, "longitude", coords.longitude);
                          }}
                        />
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                          Available tour times
                        </label>
                        <textarea
                          value={listingTimes[listing.id] || ""}
                          onChange={(e) =>
                            updateListingTimes(listing.id, e.target.value)
                          }
                          rows={3}
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                        />
                      <p className="mt-2 text-sm text-gray-500">
                          One time per line. These options show on the booking
                          form.
                        </p>
                      </div>
                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                          Availability note
                        </label>
                        <input
                          value={availabilityNotes[listing.id] || ""}
                          onChange={(e) =>
                            updateAvailabilityNote(listing.id, e.target.value)
                          }
                          placeholder="Runs Monday-Friday, weather permitting"
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                        />
                      </div>
                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                          Blocked Dates
                        </label>
                        <textarea
                          value={blockedDates[listing.id] || ""}
                          onChange={(e) =>
                            updateBlockedDates(listing.id, e.target.value)
                          }
                          rows={3}
                          placeholder={"2026-06-15\n2026-06-16"}
                          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                          Add one unavailable date per line using YYYY-MM-DD.
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                          <input
                            type="date"
                            value={blockedDateQuickPicks[listing.id] || ""}
                            onChange={(e) =>
                              updateBlockedDateQuickPick(
                                listing.id,
                                e.target.value,
                              )
                            }
                            className="rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => toggleQuickBlockedDate(listing.id)}
                            className="rounded-xl bg-[#0B3C5D] px-4 py-3 text-sm font-semibold text-white"
                          >
                            Block / unblock
                          </button>
                        </div>
                        {normalizeDateLines(blockedDates[listing.id] || "")
                          .length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {normalizeDateLines(
                              blockedDates[listing.id] || "",
                            ).map((date) => (
                              <button
                                key={date}
                                type="button"
                                onClick={() => toggleBlockedDate(listing.id, date)}
                                className="rounded-full border border-[#D6B56D]/40 bg-[#FFF8E8] px-3 py-1 text-xs font-semibold text-[#7A5B12]"
                              >
                                {date} x
                              </button>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-4 rounded-xl border border-[#00A8A8]/20 bg-[#EEF7F6] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-[#0B3C5D]">
                                Monthly calendar
                              </p>
                              <p className="mt-1 text-xs text-gray-600">
                                Tap a day to block or unblock it. Booked days show requests.
                              </p>
                            </div>
                            <input
                              type="month"
                              value={calendarMonths[listing.id] || currentMonthValue()}
                              onChange={(e) =>
                                updateCalendarMonth(listing.id, e.target.value)
                              }
                              className="rounded-lg border border-[#00A8A8]/25 bg-white px-3 py-2 text-sm outline-none"
                            />
                          </div>
                          <div className="mt-4 grid grid-cols-7 gap-2">
                            {getMonthCalendarDays({
                              month: calendarMonths[listing.id] || currentMonthValue(),
                              blockedDates: normalizeDateLines(
                                blockedDates[listing.id] || "",
                              ),
                              bookings: bookings.filter(
                                (booking) => booking.listing_id === listing.id,
                              ),
                            }).map((day) => (
                              <button
                                key={day.date}
                                type="button"
                                onClick={() => toggleBlockedDate(listing.id, day.date)}
                                className={`min-h-16 rounded-lg border p-2 text-left text-xs transition ${
                                  day.isBlocked
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : day.bookingCount > 0
                                      ? "border-[#D6B56D]/40 bg-[#FFF8E8] text-[#7A5B12]"
                                      : "border-white bg-white text-[#0B3C5D] hover:border-[#00A8A8]/40"
                                }`}
                              >
                                <span className="block font-black">{day.day}</span>
                                <span className="mt-1 block font-semibold">
                                  {day.isBlocked
                                    ? "Blocked"
                                    : day.bookingCount > 0
                                      ? `${day.bookingCount} request${
                                          day.bookingCount === 1 ? "" : "s"
                                        }`
                                      : "Open"}
                                </span>
                                {day.guestCount > 0 ? (
                                  <span className="mt-1 block text-[11px]">
                                    {day.guestCount} guest
                                    {day.guestCount === 1 ? "" : "s"}
                                  </span>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                            Max guests
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={maxGuestsByListing[listing.id] || ""}
                            onChange={(e) =>
                              updateMaxGuests(listing.id, e.target.value)
                            }
                            placeholder="12"
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                          />
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                            Notice hours
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={noticeHoursByListing[listing.id] || ""}
                            onChange={(e) =>
                              updateNoticeHours(listing.id, e.target.value)
                            }
                            placeholder="24"
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                          />
                        </div>
                      </div>
                      <div className="mt-4 rounded-xl border border-[#D6B56D]/25 bg-[#FFF8E8] p-4">
                        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#9C7A2F]">
                          Smart booking rules
                        </p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                              Booking cutoff hours
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={bookingCutoffByListing[listing.id] || ""}
                              onChange={(e) =>
                                updateBookingCutoff(listing.id, e.target.value)
                              }
                              placeholder="24"
                              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                              Season start
                            </label>
                            <input
                              value={seasonStartByListing[listing.id] || ""}
                              onChange={(e) =>
                                updateSeasonStart(listing.id, e.target.value)
                              }
                              placeholder="06-01"
                              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-[#0B3C5D]">
                              Season end
                            </label>
                            <input
                              value={seasonEndByListing[listing.id] || ""}
                              onChange={(e) =>
                                updateSeasonEnd(listing.id, e.target.value)
                              }
                              placeholder="08-31"
                              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="mb-2 text-sm font-semibold text-[#0B3C5D]">
                            Available weekdays
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {WEEKDAY_OPTIONS.map(([value, label]) => (
                              <button
                                key={value}
                                type="button"
                                onClick={() =>
                                  updateWeekdays(
                                    listing.id,
                                    toggleWeekdayValue(
                                      weekdaysByListing[listing.id] || "",
                                      value,
                                    ),
                                  )
                                }
                                className={`rounded-full border px-3 py-1 text-sm font-bold ${
                                  parseWeekdayValue(
                                    weekdaysByListing[listing.id] || "",
                                  ).includes(Number(value))
                                    ? "border-[#00A8A8] bg-white text-[#0B3C5D]"
                                    : "border-gray-200 bg-white/60 text-gray-400"
                                }`}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <label className="flex items-center gap-3 rounded-lg border border-[#D6B56D]/30 bg-white px-4 py-3 text-sm font-semibold text-[#0B3C5D]">
                            <input
                              type="checkbox"
                              checked={autoConfirmByListing[listing.id] === true}
                              onChange={(e) =>
                                setAutoConfirmByListing((currentValues) => ({
                                  ...currentValues,
                                  [listing.id]: e.target.checked,
                                }))
                              }
                            />
                            Auto-confirm available bookings
                          </label>
                          <label className="flex items-center gap-3 rounded-lg border border-[#D6B56D]/30 bg-white px-4 py-3 text-sm font-semibold text-[#0B3C5D]">
                            <input
                              type="checkbox"
                              checked={privateModeByListing[listing.id] === true}
                              onChange={(e) =>
                                setPrivateModeByListing((currentValues) => ({
                                  ...currentValues,
                                  [listing.id]: e.target.checked,
                                }))
                              }
                            />
                            Private booking mode
                          </label>
                        </div>
                      </div>
                      <div className="mt-4 rounded-xl bg-[#F7F3EA] p-4">
                        <p className="font-semibold text-[#0B3C5D]">Add-ons</p>
                        <div className="mt-3 grid gap-2">
                          {addons
                            .filter((addon) => addon.listing_id === listing.id)
                            .map((addon) => (
                              <p key={addon.id} className="text-sm text-gray-600">
                                {addon.name} - ${(addon.price_cents / 100).toFixed(2)}
                              </p>
                            ))}
                        </div>
                        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_120px_auto]">
                          <input
                            value={addonForms[listing.id]?.name || ""}
                            onChange={(e) =>
                              setAddonForms((current) => ({
                                ...current,
                                [listing.id]: {
                                  ...(current[listing.id] || { name: "", priceCents: "" }),
                                  name: e.target.value,
                                },
                              }))
                            }
                            placeholder="Pickup, lunch, private upgrade"
                            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                          />
                          <input
                            type="number"
                            value={addonForms[listing.id]?.priceCents || ""}
                            onChange={(e) =>
                              setAddonForms((current) => ({
                                ...current,
                                [listing.id]: {
                                  ...(current[listing.id] || { name: "", priceCents: "" }),
                                  priceCents: e.target.value,
                                },
                              }))
                            }
                            placeholder="Cents"
                            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => addAddon(listing.id)}
                            className="rounded-xl bg-[#0B3C5D] px-4 py-2 text-sm font-semibold text-white"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                      </>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:items-end">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          status.tone === "live"
                            ? "bg-green-100 text-green-700"
                            : status.tone === "rejected"
                              ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {status.label}
                      </span>
                      <p className="max-w-56 text-right text-sm leading-6 text-gray-600">
                        {status.text}
                      </p>
                      {listing.approval_note ? (
                        <p className="max-w-56 rounded-xl bg-yellow-100 p-3 text-sm text-yellow-900">
                          {listing.approval_note}
                        </p>
                      ) : null}
                      <button
                        onClick={() => saveListingTimes(listing.id)}
                        disabled={savingListingId === listing.id}
                        className="rounded-xl bg-[#00A8A8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {savingListingId === listing.id
                          ? "Saving..."
                          : "Save for review"}
                      </button>
                    </div>
                  </div>
                </article>
              );
              })}
            </div>
          )}
        </section>
      </div>
      <BookingChatDrawer
        threads={chatThreads}
        viewerRole="vendor"
        open={chatOpen}
        onOpenChange={setChatOpen}
        selectedThreadId={selectedBookingId}
        onSelectedThreadIdChange={setSelectedBookingId}
        emptyText="No vendor booking conversations yet."
      />
    </main>
  );
}
