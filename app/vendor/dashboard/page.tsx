"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  } | null;
};

type ListingRow = {
  id: string;
  title: string;
  category: string | null;
  location: string | null;
  price: number | null;
  is_active: boolean | null;
  tour_times: string[] | null;
  availability_note: string | null;
  max_guests: number | null;
  minimum_notice_hours: number | null;
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
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [vendorNotes, setVendorNotes] = useState<Record<string, string>>({});
  const [listingTimes, setListingTimes] = useState<Record<string, string>>({});
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
          "vendor_id, vendors(business_name, contact_name, email, phone, website, notes, profile_image_url)",
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
      });

      const listingSelect =
        "id, title, category, location, price, is_active, tour_times, availability_note, max_guests, minimum_notice_hours";
      const listingResult = await supabase
        .from("listings")
        .select(listingSelect)
        .eq("vendor_id", account.vendor_id)
        .order("created_at", { ascending: false });
      let listingData: unknown[] | null = listingResult.data;
      let listingError = listingResult.error;

      if (listingError?.code === "42703") {
        const fallback = await supabase
          .from("listings")
          .select("id, title, category, location, price, is_active")
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
        availability_note: listing.availability_note || null,
        max_guests: listing.max_guests ?? null,
        minimum_notice_hours: listing.minimum_notice_hours ?? null,
      })) as ListingRow[];

      setListings(rows);
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

  function updateProfileForm(field: keyof typeof profileForm, value: string) {
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
    });
    setProfileImageFile(null);
  }

  function updateListingTimes(listingId: string, value: string) {
    setListingTimes((currentTimes) => ({
      ...currentTimes,
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
    const times = (listingTimes[listingId] || "")
      .split("\n")
      .map((time) => time.trim())
      .filter(Boolean);

    if (times.length === 0) {
      alert("Add at least one tour time.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    setSavingListingId(listingId);

    const response = await fetch("/api/vendor/listing-times", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        listingId,
        tourTimes: times,
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
              tour_times: result.tourTimes,
              availability_note: result.availabilityNote || null,
              max_guests: result.maxGuests,
              minimum_notice_hours: result.minimumNoticeHours,
            }
          : listing,
      ),
    );
    setAvailabilityNotes((currentNotes) => ({
      ...currentNotes,
      [listingId]: result.availabilityNote || "",
    }));
    setMaxGuestsByListing((currentValues) => ({
      ...currentValues,
      [listingId]: result.maxGuests ? String(result.maxGuests) : "",
    }));
    setNoticeHoursByListing((currentValues) => ({
      ...currentValues,
      [listingId]:
        result.minimumNoticeHours !== null
          ? String(result.minimumNoticeHours)
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
            </div>

            <div>
              <label className="mb-2 block font-medium">Phone</label>
              <input
                value={profileForm.phone}
                onChange={(e) => updateProfileForm("phone", e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block font-medium">Website</label>
              <input
                value={profileForm.website}
                onChange={(e) => updateProfileForm("website", e.target.value)}
                placeholder="https://..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
              />
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
              {listings.map((listing) => (
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
                    </div>
                    <div className="flex flex-col items-start gap-3 sm:items-end">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-semibold ${
                          listing.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {listing.is_active ? "Live" : "Waiting for review"}
                      </span>
                      <button
                        onClick={() => saveListingTimes(listing.id)}
                        disabled={savingListingId === listing.id}
                        className="rounded-xl bg-[#00A8A8] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        {savingListingId === listing.id
                          ? "Saving..."
                          : "Save times"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
