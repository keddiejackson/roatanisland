"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function VendorClaimPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getUser();

      if (data.user) {
        setEmail(data.user.email || "");
      }
    }

    checkSession();
  }, []);

  async function claimInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/vendor/login`,
        },
      });

      if (signUpError) {
        setLoading(false);
        setMessage(signUpError.message);
        return;
      }

      setLoading(false);
      setMessage("Check your email, confirm your account, then return to this invite link.");
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const response = await fetch("/api/vendor/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(sessionData.session?.access_token
          ? { Authorization: `Bearer ${sessionData.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ token }),
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setMessage(result.error || "Unable to claim vendor profile.");
      return;
    }

    router.push("/vendor/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#F7F3EA] px-6 py-12 text-[#17324D]">
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

        <section className="rounded-2xl bg-white p-8 shadow">
          <h1 className="text-3xl font-bold text-[#0B3C5D]">
            Claim vendor profile
          </h1>
          <p className="mt-2 text-gray-600">
            Log in or create an account with the invited email address.
          </p>

          {!token ? (
            <p className="mt-6 rounded-xl bg-red-100 p-4 text-red-700">
              Invite token is missing.
            </p>
          ) : (
            <form onSubmit={claimInvite} className="mt-8 space-y-5">
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
              {message ? (
                <p className="rounded-xl bg-yellow-100 p-4 text-sm text-yellow-900">
                  {message}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#00A8A8] px-6 py-3 font-semibold text-white disabled:opacity-50"
              >
                {loading ? "Claiming..." : "Claim Profile"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
