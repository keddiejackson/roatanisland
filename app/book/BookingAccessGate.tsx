"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function BookingAccessGate({
  bookingId,
  returnPath,
}: {
  bookingId: string;
  returnPath: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "signed-out" | "denied">(
    "checking",
  );

  useEffect(() => {
    let active = true;

    async function verifySignedInAccess() {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        if (active) setState("signed-out");
        return;
      }

      const response = await fetch(`/api/bookings/${bookingId}/access`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        if (active) setState("denied");
        return;
      }

      const result = (await response.json()) as { accessToken?: string };
      if (!result.accessToken) {
        if (active) setState("denied");
        return;
      }

      router.replace(
        `${returnPath}${returnPath.includes("?") ? "&" : "?"}access=${encodeURIComponent(
          result.accessToken,
        )}`,
      );
    }

    verifySignedInAccess();
    return () => {
      active = false;
    };
  }, [bookingId, returnPath, router]);

  return (
    <main className="brand-page min-h-screen px-4 py-8 text-[#17324D] sm:px-6 sm:py-12">
      <section className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-xl ring-1 ring-[#071F2F]/10 sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#007B7B]">
          Private trip access
        </p>
        <h1 className="mt-3 text-3xl font-black text-[#071F2F]">
          {state === "checking" ? "Checking your access..." : "Open your secure trip"}
        </h1>
        <p className="mt-4 leading-7 text-[#17324D]/70" aria-live="polite">
          {state === "checking"
            ? "We are confirming that this booking belongs to your account."
            : state === "denied"
              ? "This signed-in account is not connected to the booking. Use the private link from your confirmation email or contact support."
              : "Sign in with the same email used for the booking, or use the private link in your confirmation email."}
        </p>
        {state !== "checking" ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href={`/account?next=${encodeURIComponent(returnPath)}`}
              className="brand-button-primary text-center"
            >
              Sign in
            </Link>
            <Link href="/support" className="brand-button-secondary text-center">
              Get help
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

