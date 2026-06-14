"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
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
    <main className="brand-page min-h-screen text-[#17324D]">
      <div className="brand-shell max-w-lg">
        <header className="brand-topbar mb-6 sm:mb-8">
          <SiteLogo />
          <Link
            href="/"
            className="brand-button-secondary w-fit"
          >
            Home
          </Link>
        </header>

        <div className="brand-auth-card p-5 sm:p-8">
          <p className="brand-eyebrow">Operator access</p>
          <h1 className="mt-2 text-3xl font-black text-[#0B3C5D]">
            Vendor Login
          </h1>
          <p className="brand-subtitle mt-2 text-sm">
            Sign in to manage your submitted listings.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block font-medium">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="brand-input"
                required
              />
            </div>

            <div>
              <label className="mb-2 block font-medium">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="brand-input"
                required
              />
            </div>

            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="brand-button-primary w-full disabled:opacity-50"
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
      <SiteFooter />
    </main>
  );
}
