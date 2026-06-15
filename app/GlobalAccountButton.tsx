"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { displayNameFromProfile, profileInitials } from "@/lib/user-profile";
import { supabase } from "@/lib/supabase";

type GuestProfile = {
  email?: string | null;
  display_name?: string | null;
  profile_image_url?: string | null;
};

export default function GlobalAccountButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.auth.getSession();

      if (!data.session?.access_token) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/account/profile", {
        headers: {
          Authorization: `Bearer ${data.session.access_token}`,
        },
      });

      if (response.ok) {
        const result = (await response.json()) as { profile?: GuestProfile };
        setProfile(result.profile || null);
      }

      setLoading(false);
    }

    loadProfile();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      loadProfile();
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (
    pathname === "/" ||
    pathname?.startsWith("/admin") ||
    pathname === "/book" ||
    pathname === "/signin" ||
    loading
  ) {
    return null;
  }

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setProfile(null);
    setSigningOut(false);
    router.refresh();
  }

  if (!profile?.email) {
    return (
      <Link
        href="/signin"
        className="fixed right-2 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 hidden max-w-[calc(100vw-1rem)] rounded-2xl bg-white px-3 py-2.5 text-sm font-black text-[#0B3C5D] shadow-xl ring-1 ring-[#0B3C5D]/10 transition hover:-translate-y-0.5 sm:right-5 sm:top-[calc(1rem+env(safe-area-inset-top))] sm:block sm:px-4 sm:py-3"
      >
        Sign in
      </Link>
    );
  }

  const name = displayNameFromProfile(profile);
  const initials = profileInitials(profile.display_name, profile.email);

  return (
    <div className="fixed right-2 top-[calc(0.75rem+env(safe-area-inset-top))] z-40 hidden max-w-[calc(100vw-1rem)] items-center gap-1.5 rounded-2xl bg-white p-1.5 text-sm font-black text-[#0B3C5D] shadow-xl ring-1 ring-[#0B3C5D]/10 sm:right-5 sm:top-[calc(1rem+env(safe-area-inset-top))] sm:flex sm:gap-2 sm:p-2">
      <Link
        href="/account"
        className="flex min-w-0 items-center gap-3 rounded-xl px-1 py-1 transition hover:bg-[#EEF7F6]"
      >
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[#EEF7F6] text-xs text-[#007B7B] sm:size-9">
          {profile.profile_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.profile_image_url}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            initials
          )}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-36 truncate leading-tight">{name}</span>
          <span className="block text-[11px] font-bold leading-tight text-gray-500">
            Signed in
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="rounded-xl bg-[#F7F3EA] px-2.5 py-2 text-[11px] font-black text-[#0B3C5D] transition hover:bg-[#EEF7F6] disabled:opacity-60 sm:px-3 sm:text-xs"
      >
        {signingOut ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}
