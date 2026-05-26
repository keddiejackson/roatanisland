"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const [profile, setProfile] = useState<GuestProfile | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (pathname?.startsWith("/admin") || pathname === "/signin" || loading) {
    return null;
  }

  if (!profile?.email) {
    return (
      <Link
        href="/signin"
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-40 rounded-2xl bg-white px-4 py-3 text-sm font-black text-[#0B3C5D] shadow-xl ring-1 ring-[#0B3C5D]/10 transition hover:-translate-y-0.5 sm:left-5"
      >
        Sign in
      </Link>
    );
  }

  const name = displayNameFromProfile(profile);
  const initials = profileInitials(profile.display_name, profile.email);

  return (
    <Link
      href="/account"
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl bg-white px-3 py-2 text-sm font-black text-[#0B3C5D] shadow-xl ring-1 ring-[#0B3C5D]/10 transition hover:-translate-y-0.5 sm:left-5"
    >
      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#EEF7F6] text-xs text-[#007B7B]">
        {profile.profile_image_url ? (
          <img
            src={profile.profile_image_url}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          initials
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate leading-tight">{name}</span>
        <span className="block text-[11px] font-bold leading-tight text-gray-500">
          Signed in
        </span>
      </span>
    </Link>
  );
}
