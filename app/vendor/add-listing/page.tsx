"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PinPicker from "@/app/map/PinPicker";
import { supabase } from "@/lib/supabase";

type VendorAccount = {
  vendor_id: string;
  vendors: {
    business_name: string;
    email: string | null;
    phone: string | null;
    website: string | null;
  } | null;
};

export default function AddListingPage() {
  const [vendorAccount, setVendorAccount] = useState<VendorAccount | null>(null);
  const [checkingAccount, setCheckingAccount] = useState(true);

  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [vendorEmail, setVendorEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [vendorNotes, setVendorNotes] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [category, setCategory] = useState("Tours");
  const [tourTimes, setTourTimes] = useState(
    "10:30 AM\n4:30 PM Sunset Cruise",
  );
  const [availabilityNote, setAvailabilityNote] = useState("");
  const [maxGuests, setMaxGuests] = useState("");
  const [minimumNoticeHours, setMinimumNoticeHours] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [galleryImageUrls, setGalleryImageUrls] = useState("");
  const [blockedDates, setBlockedDates] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function loadVendorAccount() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setCheckingAccount(false);
        return;
      }

      const { data } = await supabase
        .from("vendor_users")
        .select("vendor_id, vendors(business_name, email, phone, website)")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (data) {
        setVendorAccount(data as unknown as VendorAccount);
      }

      setCheckingAccount(false);
    }

    loadVendorAccount();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const { data: sessionData } = await supabase.auth.getSession();
    let finalImageUrl = imageUrl;
    let uploadedGalleryUrls: string[] = [];

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
        setLoading(false);
        alert(
          `Error uploading image: ${uploadResult.error || "Please try again."}`,
        );
        return;
      }

      finalImageUrl = uploadResult.imageUrl;
      uploadedGalleryUrls = (uploadResult.imageUrls || []).slice(1);
    }

    const response = await fetch("/api/vendor-listings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        vendorId: vendorAccount?.vendor_id || null,
        businessName,
        contactName,
        vendorEmail,
        phone,
        website,
        vendorNotes,
        title,
        description,
        price,
        location,
        latitude,
        longitude,
        category,
        imageUrl: finalImageUrl,
        galleryImageUrls: [
          ...uploadedGalleryUrls,
          ...galleryImageUrls
            .split("\n")
            .map((url) => url.trim())
            .filter(Boolean),
        ],
        tourTimes: tourTimes
          .split("\n")
          .map((time) => time.trim())
          .filter(Boolean),
        blockedDates: blockedDates
          .split("\n")
          .map((date) => date.trim())
          .filter(Boolean),
        availabilityNote,
        maxGuests,
        minimumNoticeHours,
      }),
    });

    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      alert(`Error adding listing: ${result.error || "Please try again."}`);
      return;
    }

    setSubmitted(true);
  }

  async function findListingMapPin() {
    const query = [title, location, "Roatan"].filter(Boolean).join(", ");

    if (!query.trim()) {
      alert("Add a title and location first.");
      return;
    }

    const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
    const result = await response.json();

    if (!response.ok) {
      alert(result.error || "Unable to find a map pin.");
      return;
    }

    setLatitude(String(result.latitude));
    setLongitude(String(result.longitude));
  }

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-10 text-[#17324D]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="text-xl font-bold text-[#0B3C5D]">
            RoatanIsland.life
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow"
          >
            Home
          </Link>
          <Link
            href="/vendor/login"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-[#0B3C5D] shadow"
          >
            Vendor Login
          </Link>
        </header>

        <div className="rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#00A8A8]">
            Vendor onboarding
          </p>
          <h1 className="mt-2 text-3xl font-bold text-[#0B3C5D]">
            Add your business and listing
          </h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Submit your local tour, stay, or transport service. New listings are
            reviewed before they appear on the public site.
          </p>

          {!checkingAccount && vendorAccount ? (
            <div className="mt-6 rounded-xl bg-[#EEF7F6] p-4 text-sm text-[#0B3C5D]">
              Signed in as {vendorAccount.vendors?.business_name}. This listing
              will be added to your vendor account.
            </div>
          ) : null}

          {submitted ? (
            <div className="mt-8 rounded-xl bg-green-100 p-6 text-green-800">
              <h2 className="text-xl font-semibold">Listing Submitted</h2>
              <p className="mt-2">
                Thank you. Your listing was received and is waiting for review.
              </p>
              <Link
                href="/"
                className="mt-5 inline-block rounded-xl bg-[#00A8A8] px-5 py-3 font-semibold text-white"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-8">
              {!vendorAccount ? (
                <section>
                  <h2 className="text-xl font-bold text-[#0B3C5D]">
                    Business details
                  </h2>

                  <div className="mt-4 grid gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block font-medium">
                        Business Name
                      </label>
                      <input
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">
                        Contact Name
                      </label>
                      <input
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">Email</label>
                      <input
                        type="email"
                        value={vendorEmail}
                        onChange={(e) => setVendorEmail(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block font-medium">Phone</label>
                      <input
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block font-medium">Website</label>
                      <input
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-2 block font-medium">
                        Vendor Notes
                      </label>
                      <textarea
                        value={vendorNotes}
                        onChange={(e) => setVendorNotes(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                      />
                    </div>
                  </div>
                </section>
              ) : null}

              <section>
                <h2 className="text-xl font-bold text-[#0B3C5D]">
                  Listing details
                </h2>

                <div className="mt-4 grid gap-5 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">
                      Listing Title
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                      rows={5}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">Price</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">Location</label>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                      required
                    />
                  </div>

                  <div className="md:col-span-2 rounded-2xl bg-[#F7F3EA] p-5">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div>
                        <h3 className="font-bold text-[#0B3C5D]">
                          Map pin
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          Drop the pin as close as possible to where guests meet,
                          check in, or start the experience.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={findListingMapPin}
                        className="rounded-xl bg-[#0B3C5D] px-4 py-2 text-sm font-semibold text-white"
                      >
                        Find pin
                      </button>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <input
                        type="number"
                        step="any"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        placeholder="Latitude"
                        className="rounded-xl border border-gray-300 px-4 py-3 outline-none"
                      />
                      <input
                        type="number"
                        step="any"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        placeholder="Longitude"
                        className="rounded-xl border border-gray-300 px-4 py-3 outline-none"
                      />
                    </div>
                    <div className="mt-4">
                      <PinPicker
                        latitude={latitude}
                        longitude={longitude}
                        onChange={(coords) => {
                          setLatitude(coords.latitude);
                          setLongitude(coords.longitude);
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                      required
                    >
                      <option value="Tours">Tours</option>
                      <option value="Hotels">Hotels</option>
                      <option value="Transport">Transport</option>
                      <option value="Food">Food</option>
                      <option value="Beaches">Beaches</option>
                      <option value="Private Charters">Private Charters</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">
                      Available Tour Times
                    </label>
                    <textarea
                      value={tourTimes}
                      onChange={(e) => setTourTimes(e.target.value)}
                      rows={4}
                      placeholder={"9:00 AM\n1:30 PM\n4:30 PM Sunset Cruise"}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                      required
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Add one time per line. You can change these later from
                      your dashboard.
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">
                      Availability Note
                    </label>
                    <input
                      value={availabilityNote}
                      onChange={(e) => setAvailabilityNote(e.target.value)}
                      placeholder="Runs Monday-Friday, weather permitting"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">
                      Max Guests Per Tour
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={maxGuests}
                      onChange={(e) => setMaxGuests(e.target.value)}
                      placeholder="12"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">
                      Minimum Notice Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={minimumNoticeHours}
                      onChange={(e) => setMinimumNoticeHours(e.target.value)}
                      placeholder="24"
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">
                      Listing Photos
                    </label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={(e) =>
                        setImageFiles(Array.from(e.target.files || []))
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                    />
                    {imageFiles.length > 0 ? (
                      <p className="mt-2 text-sm text-gray-500">
                        Selected: {imageFiles.map((file) => file.name).join(", ")}
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">
                      Image URL fallback
                    </label>
                    <input
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">
                      Extra Gallery Image URLs
                    </label>
                    <textarea
                      value={galleryImageUrls}
                      onChange={(e) => setGalleryImageUrls(e.target.value)}
                      rows={3}
                      placeholder={"https://...\nhttps://..."}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block font-medium">
                      Blocked Dates
                    </label>
                    <textarea
                      value={blockedDates}
                      onChange={(e) => setBlockedDates(e.target.value)}
                      rows={3}
                      placeholder={"2026-06-15\n2026-06-16"}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                    />
                    <p className="mt-2 text-sm text-gray-500">
                      Optional. Add dates you already know are unavailable.
                    </p>
                  </div>
                </div>
              </section>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#00A8A8] px-6 py-4 text-lg font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Submit Listing for Review"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
