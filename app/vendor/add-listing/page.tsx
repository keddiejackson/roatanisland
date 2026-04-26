"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
  const [category, setCategory] = useState("Tours");
  const [imageUrl, setImageUrl] = useState("");
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
        category,
        imageUrl,
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
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block font-medium">Image URL</label>
                    <input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                    />
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
