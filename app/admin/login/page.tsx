"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
    <main className="flex min-h-screen items-center justify-center bg-[#F7F3EA] px-6 py-10">
      <div className="w-full max-w-md">
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
          <h1 className="text-3xl font-bold text-[#0B3C5D]">Admin Login</h1>
          <p className="mt-2 text-gray-600">
            Sign in to manage bookings, vendors, and listings.
          </p>

          <form onSubmit={handleLogin} className="mt-6 space-y-4">
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
        </div>
      </div>
    </main>
  );
}
