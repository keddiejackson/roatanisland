"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import SiteLogo from "@/app/SiteLogo";
import { isAdminUser } from "@/lib/admin";
import { supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    if (!(await isAdminUser(data.user?.email))) {
      await supabase.auth.signOut();
      setError("This account is not allowed to access the admin area.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="brand-page flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-10">
      <div className="brand-shell w-full max-w-md">
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
          <p className="brand-eyebrow">Control room</p>
          <h1 className="mt-2 text-3xl font-black text-[#0B3C5D]">
            Admin Login
          </h1>
          <p className="brand-subtitle mt-2 text-sm">
            Sign in to manage bookings, vendors, and listings.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
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
        </div>
      </div>
    </main>
  );
}
