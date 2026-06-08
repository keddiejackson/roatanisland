"use client";

import Link from "next/link";
import SiteLogo from "@/app/SiteLogo";
import {
  defaultMobileSiteControls,
  type MobileSiteControls,
} from "@/lib/mobile-site-controls";
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
  mobileControls?: MobileSiteControls;
};

export default function HomeHeroHeader({
  account,
  accountLoading,
  signOutLoading,
  onSignOut,
  mobileControls = defaultMobileSiteControls,
}: HomeHeroHeaderProps) {
  return (
    <header className="grid items-start gap-3 sm:flex sm:items-center sm:justify-between">
      <div className="max-w-[min(100%,19rem)] sm:max-w-none">
        <SiteLogo
          variant="light"
          priority
          className="max-w-full [&>span]:max-h-20 [&>span]:max-w-full sm:[&>span]:max-h-24"
        />
      </div>

      <nav aria-label="Mobile main navigation" className="w-full sm:hidden">
        <div className="mobile-scroll-row rounded-[1.15rem] border border-white/12 bg-white/[0.09] p-1 text-center text-[13px] font-black text-white/90 shadow-xl shadow-black/10 backdrop-blur-xl">
          {mobileControls.showMobileNavListings ? (
            <a
              href="#marketplace"
              className="shrink-0 rounded-xl px-3 py-3 hover:bg-white/10"
            >
              {mobileControls.mobileNavListingsLabel}
            </a>
          ) : null}
          {mobileControls.showMobileNavMap ? (
            <Link
              href="/map"
              className="shrink-0 rounded-xl px-3 py-3 hover:bg-white/10"
            >
              {mobileControls.mobileNavMapLabel}
            </Link>
          ) : null}
          {mobileControls.showMobileNavConcierge ? (
            <Link
              href="/concierge"
              className="shrink-0 rounded-xl px-3 py-3 hover:bg-white/10"
            >
              {mobileControls.mobileNavConciergeLabel}
            </Link>
          ) : null}
          {accountLoading ? (
            <span className="shrink-0 rounded-xl px-3 py-3 text-white/50">
              ...
            </span>
          ) : account ? (
            <details className="group relative shrink-0">
              <summary className="grid cursor-pointer list-none place-items-center rounded-xl px-3 py-3 hover:bg-white/10">
                Account
              </summary>
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-2xl border border-white/20 bg-white p-2 text-left text-[#071F2F] shadow-2xl shadow-black/20">
                <Link
                  href={account.href}
                  className="block rounded-xl px-3 py-2 text-sm font-black hover:bg-[#EEF7F6]"
                >
                  Dashboard
                </Link>
                <Link
                  href="/account"
                  className="block rounded-xl px-3 py-2 text-sm font-black hover:bg-[#EEF7F6]"
                >
                  Messages
                </Link>
                <button
                  type="button"
                  onClick={onSignOut}
                  disabled={signOutLoading}
                  className="mt-1 w-full rounded-xl bg-[#071F2F] px-3 py-2 text-left text-sm font-black text-white disabled:opacity-60"
                >
                  {signOutLoading ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </details>
          ) : mobileControls.showMobileNavSignIn ? (
            <Link
              href="/signin"
              className="shrink-0 rounded-xl px-3 py-3 hover:bg-white/10"
            >
              {mobileControls.mobileNavSignInLabel}
            </Link>
          ) : null}
          {mobileControls.showMobileNavBusiness ? (
            <Link
              href="/vendor/signup"
              className="shrink-0 rounded-xl bg-white px-3 py-3 text-[#071F2F] shadow-lg shadow-black/10"
            >
              {mobileControls.mobileNavBusinessLabel}
            </Link>
          ) : null}
        </div>
      </nav>

      <nav
        aria-label="Desktop main navigation"
        className="hidden sm:flex items-center justify-end gap-2 rounded-full border border-white/12 bg-white/[0.09] p-1 text-sm font-semibold text-white/90 shadow-2xl shadow-black/15 backdrop-blur-xl"
      >
        <a href="#marketplace" className="rounded-full px-3 py-2 hover:bg-white/10">
          Experiences
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
          <details className="group relative">
            <summary className="flex max-w-[240px] cursor-pointer list-none items-center gap-2 rounded-full border border-white/15 bg-white/12 px-2 py-1.5 text-white shadow-lg shadow-black/10 backdrop-blur hover:bg-white/15">
              <span className="grid size-7 place-items-center overflow-hidden rounded-full bg-white text-[10px] font-black text-[#0B3C5D]">
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
            </summary>
            <div className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-white/20 bg-white p-2 text-[#071F2F] shadow-2xl shadow-black/20">
              <Link
                href={account.href}
                className="block rounded-xl px-3 py-2 text-sm font-black hover:bg-[#EEF7F6]"
              >
                Dashboard
              </Link>
              <Link
                href="/account"
                className="block rounded-xl px-3 py-2 text-sm font-black hover:bg-[#EEF7F6]"
              >
                Messages
              </Link>
              <button
                type="button"
                onClick={onSignOut}
                disabled={signOutLoading}
                className="mt-1 w-full rounded-xl bg-[#071F2F] px-3 py-2 text-left text-sm font-black text-white disabled:opacity-60"
              >
                {signOutLoading ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </details>
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
