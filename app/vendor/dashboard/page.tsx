"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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
};

type ListingDraft = {
  title: string;
  description: string;
  price: string;
  location: string;
  category: string;
  imageUrl: string;
  galleryImageUrls: string;
};

type BookingRow = {
  id: string;
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

export default function VendorDashboardPage() {
  const router = useRouter();
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
  const [listingImageFiles, setListingImageFiles] = useState<Record<string, File | null>>({});
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [addonForms, setAddonForms] = useState<Record<string, { name: string; priceCents: string }>>({});
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [vendorNotes, setVendorNotes] = useState<Record<string, string>>({});
  const [listingTimes, setListingTimes] = useState<Record<string, string>>({});
  const [blockedDates, setBlockedDates] = useState<Record<string, string>>({});
  const [availabilityNotes, setAvailabilityNotes] = useState<Record<string, string>>({});
  const [maxGuestsByListing, setMaxGuestsByListing] = useState<Record<string, string>>({});
  const [noticeHoursByListing, setNoticeHoursByListing] = useState<Record<string, string>>({});
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
        "id, title, description, category, location, price, image_url, gallery_image_urls, is_active, approval_status, approval_note, tour_times, blocked_dates, availability_note, max_guests, minimum_notice_hours";
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

  async function saveListingTimes(listingId: string) {
    const draft = listingDrafts[listingId];
    const times = (listingTimes[listingId] || "")
      .split("\n")
      .map((time) => time.trim())
      .filter(Boolean);
    const unavailableDates = (blockedDates[listingId] || "")
      .split("\n")
      .map((date) => date.trim())
      .filter(Boolean);
    const galleryImageUrls = (draft.galleryImageUrls || "")
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

    const imageFile = listingImageFiles[listingId];

    if (imageFile) {
      const uploadForm = new FormData();
      uploadForm.append("image", imageFile);
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
      },
    }));
    setBlockedDates((currentDates) => ({
      ...currentDates,
      [listingId]: (result.listing.blocked_dates || []).join("\n"),
    }));
    setListingImageFiles((currentFiles) => ({
      ...currentFiles,
      [listingId]: null,
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
  }

  async function updateBookingStatus(
    bookingId: string,
    status: "confirmed" | "cancelled",
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
              status,
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

  const groupedBookings = useMemo(() => {
    const groups = new Map<string, BookingRow[]>();

    bookings.forEach((booking) => {
      const group = groups.get(booking.tour_date) || [];
      group.push(booking);
      groups.set(booking.tour_date, group);
    });

    return [...groups.entries()]
      .map(([date, dateBookings]) => ({
        date,
        bookings: dateBookings.sort((a, b) =>
          a.tour_time.localeCompare(b.tour_time),
        ),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [bookings]);

  const notifications = useMemo(() => {
    const newBookings = bookings.filter(
      (booking) => (booking.status || "new") === "new",
    ).length;
    const waitingListings = listings.filter(
      (listing) => listing.is_active === false,
    ).length;
    const confirmedBookings = bookings.filter(
      (booking) => booking.status === "confirmed",
    ).length;

    return [
      {
        label: "New booking requests",
        value: newBookings,
        text:
          newBookings === 0
            ? "No new requests waiting."
            : "Review and confirm or cancel these requests.",
      },
      {
        label: "Listings waiting for review",
        value: waitingListings,
        text:
          waitingListings === 0
            ? "No listing changes waiting."
            : "These listings are hidden until admin approves them.",
      },
      {
        label: "Confirmed bookings",
        value: confirmedBookings,
        text: "Keep guest pickup and trip details up to date.",
      },
    ];
  }, [bookings, listings]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7F3EA] px-6 py-10 text-[#17324D]">
        <div className="mx-auto max-w-5xl">Loading vendor dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-10 text-[#17324D]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold text-[#0B3C5D]">
            RoatanIsland.life
          </Link>
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
              Logout
            </button>
          </div>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          {notifications.map((notification) => (
            <div key={notification.label} className="rounded-2xl bg-white p-5 shadow">
              <p className="text-sm text-gray-600">{notification.label}</p>
              <p className="mt-2 text-3xl font-bold text-[#0B3C5D]">
                {notification.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {notification.text}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-8 shadow">
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
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
                Vendor dashboard
              </p>
              <h1 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
                {vendorAccount?.vendors?.business_name || "Your Business"}
              </h1>
              <p className="mt-2 text-gray-600">
                Track bookings, manage listings, and update your public profile.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-8 shadow">
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

        <section className="mt-8 rounded-2xl bg-white p-8 shadow">
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

        <section className="mt-8 rounded-2xl bg-white p-8 shadow">
          <div>
            <h2 className="text-2xl font-bold text-[#0B3C5D]">
              Booking Requests
            </h2>
            <p className="mt-2 text-gray-600">
              Recent requests for your active listings.
            </p>
          </div>

          {bookings.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-[#00A8A8]/40 bg-[#F7F3EA] p-6 text-sm text-gray-600">
              No booking requests yet.
            </div>
          ) : (
            <>
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
                      {group.bookings.length === 1 ? "" : "s"}
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
                            {booking.status || "new"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                          {booking.listing_name} - {booking.guests} guest
                          {booking.guests === 1 ? "" : "s"}
                        </p>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <div className="mt-8 overflow-x-auto">
              <table className="min-w-[1100px] border-collapse">
                <thead>
                  <tr className="border-b text-left">
                    <th className="px-4 py-3">Listing</th>
                    <th className="px-4 py-3">Guest</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Guests</th>
                    <th className="px-4 py-3">Message</th>
                    <th className="px-4 py-3">Your note</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="border-b">
                      <td className="px-4 py-3 font-medium">
                        {booking.listing_name}
                      </td>
                      <td className="px-4 py-3">{booking.full_name}</td>
                      <td className="px-4 py-3">{booking.email}</td>
                      <td className="px-4 py-3">{booking.tour_date}</td>
                      <td className="px-4 py-3">{booking.tour_time}</td>
                      <td className="px-4 py-3">{booking.guests}</td>
                      <td className="max-w-72 px-4 py-3 text-sm text-gray-600">
                        {booking.guest_message || "No message"}
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
                      <td className="px-4 py-3 capitalize">
                        {booking.status || "new"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
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

                return (
                <article
                  key={listing.id}
                  className="rounded-xl border border-gray-200 p-5"
                >
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                    <div>
                      <h3 className="text-lg font-bold text-[#0B3C5D]">
                        {listing.title}
                      </h3>
                      <p className="mt-2 text-sm text-gray-600">
                        {listing.category || "Listing"} in{" "}
                        {listing.location || "Roatan"}
                        {listing.price ? ` - $${listing.price}` : ""}
                      </p>
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
                            Listing Image
                          </label>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            onChange={(e) =>
                              setListingImageFiles((currentFiles) => ({
                                ...currentFiles,
                                [listing.id]: e.target.files?.[0] || null,
                              }))
                            }
                            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none"
                          />
                          {listingImageFiles[listing.id] ? (
                            <p className="mt-2 text-sm text-gray-500">
                              Selected: {listingImageFiles[listing.id]?.name}
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
                            Gallery Image URLs
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
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:items-end">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          listing.is_active
                            ? "bg-green-100 text-green-700"
                            : listing.approval_status === "rejected"
                              ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {listing.is_active
                          ? "Live"
                          : listing.approval_status === "rejected"
                            ? "Needs changes"
                            : "Waiting for review"}
                      </span>
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
    </main>
  );
}
