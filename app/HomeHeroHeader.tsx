"use client";

import Link from "next/link";
import SiteLogo from "@/app/SiteLogo";
import { profileInitials } from "@/lib/user-profile";

export type HomeAccountProfile = {
  email: string;
  displayName: string;
  profileImageUrl: string | null;
  href: string;
  label: string;
};

type HomeHeroHeaderProps = {
  account: HomeAccountProfile | null;
  accountLoading: boolean;
  signOutLoading: boolean;
  onSignOut: () => void;
};

export default function HomeHeroHeader({
  account,
  accountLoading,
  signOutLoading,
  onSignOut,
}: HomeHeroHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <SiteLogo variant="light" priority />
      <nav className="flex flex-wrap items-center justify-end gap-2 rounded-full border border-white/12 bg-white/[0.09] p-1 text-sm font-semibold text-white/90 shadow-2xl shadow-black/15 backdrop-blur-xl">
        <a href="#marketplace" className="rounded-full px-3 py-2 hover:bg-white/10">
          Listings
        </a>
        <Link href="/map" className="rounded-full px-3 py-2 hover:bg-white/10">
          Map
        </Link>
        <Link
          href="/concierge"
          className="rounded-full px-3 py-2 hover:bg-white/10"
        >
          Concierge
        </Link>
        {accountLoading ? null : account ? (
          <div className="flex max-w-[300px] items-center gap-1 rounded-full border border-white/15 bg-white/12 p-1 text-white shadow-lg shadow-black/10 backdrop-blur">
            <Link
              href={account.href}
              className="flex min-w-0 items-center gap-2 rounded-full px-2 py-1.5 hover:bg-white/15"
            >
              <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-[10px] font-black text-[#0B3C5D]">
                {account.profileImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.profileImageUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : (
                  profileInitials(account.displayName, account.email)
                )}
              </span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-xs font-black">
                  {account.displayName}
                </span>
                <span className="block truncate text-[10px] font-bold uppercase tracking-[0.08em] text-white/70">
                  {account.label}
                </span>
              </span>
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              disabled={signOutLoading}
              className="rounded-full bg-white px-3 py-2 text-xs font-black text-[#071F2F] disabled:opacity-60"
            >
              {signOutLoading ? "Signing out..." : "Sign out"}
            </button>
          </div>
        ) : (
          <Link href="/signin" className="rounded-full px-3 py-2 hover:bg-white/10">
            Sign in
          </Link>
        )}
        <Link
          href="/vendor/signup"
          className="rounded-full bg-white px-4 py-2 text-[#071F2F] shadow-lg shadow-black/10"
        >
          List your business
        </Link>
      </nav>
    </header>
  );
}
