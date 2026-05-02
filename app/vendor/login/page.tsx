"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeWebsiteUrl } from "@/lib/url";

export default function VendorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function finishVendorSetupIfNeeded() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      return;
    }

    const { data: existingVendor } = await supabase
      .from("vendor_users")
      .select("vendor_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingVendor?.vendor_id) {
      return;
    }

    const metadata = user.user_metadata || {};
    const businessName =
      typeof metadata.vendor_business_name === "string"
        ? metadata.vendor_business_name
        : "";

    if (!businessName) {
      return;
    }

    await supabase.rpc("create_vendor_account", {
      business_name: businessName,
      contact_name:
        typeof metadata.vendor_contact_name === "string"
          ? metadata.vendor_contact_name
          : null,
      phone:
        typeof metadata.vendor_phone === "string" ? metadata.vendor_phone : null,
      website:
        typeof metadata.vendor_website === "string"
          ? normalizeWebsiteUrl(metadata.vendor_website)
          : null,
    });
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    await finishVendorSetupIfNeeded();

    router.push("/vendor/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-10 text-[#17324D]">
      <div className="mx-auto max-w-md">
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
          <h1 className="text-3xl font-bold text-[#0B3C5D]">Vendor Login</h1>
          <p className="mt-2 text-gray-600">
            Sign in to manage your submitted listings.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
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
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-[#00A8A8] px-6 py-3 font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-600">
            Need an account?{" "}
            <Link href="/vendor/signup" className="font-semibold text-[#007B7B]">
              Sign up as a vendor
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
