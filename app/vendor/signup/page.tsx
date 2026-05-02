"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeWebsiteUrl } from "@/lib/url";

export default function VendorSignupPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/vendor/login`,
        data: {
          vendor_business_name: businessName,
          vendor_contact_name: contactName || null,
          vendor_phone: phone || null,
          vendor_website: normalizeWebsiteUrl(website),
        },
      },
    });

    if (signupError || !authData.user) {
      setError(signupError?.message || "Unable to create vendor account.");
      setLoading(false);
      return;
    }

    if (!authData.session) {
      setLoading(false);
      setSuccess(
        "Check your email to confirm your account. After confirmation, you will be sent to vendor login.",
      );
      return;
    }

    const { error: vendorError } = await supabase.rpc(
      "create_vendor_account",
      {
        business_name: businessName,
        contact_name: contactName || null,
        phone: phone || null,
        website: normalizeWebsiteUrl(website),
      },
    );

    setLoading(false);

    if (vendorError) {
      setError(vendorError.message);
      return;
    }

    router.push("/vendor/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-10 text-[#17324D]">
      <div className="mx-auto max-w-2xl">
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
        </header>

        <div className="rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold text-[#0B3C5D]">
            Vendor Signup
          </h1>
          <p className="mt-2 text-gray-600">
            Create an account so you can submit listings and return later.
          </p>

          <form onSubmit={handleSignup} className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-2 block font-medium">Business Name</label>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Contact Name</label>
              <input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
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

            <div>
              <label className="mb-2 block font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none"
                required
                minLength={6}
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

            {error ? (
              <p className="text-sm text-red-600 md:col-span-2">{error}</p>
            ) : null}
            {success ? (
              <p className="rounded-xl bg-green-100 p-4 text-sm text-green-800 md:col-span-2">
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#00A8A8] px-6 py-3 font-semibold text-white disabled:opacity-50 md:col-span-2"
            >
              {loading ? "Creating..." : "Create Vendor Account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/vendor/login" className="font-semibold text-[#007B7B]">
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
