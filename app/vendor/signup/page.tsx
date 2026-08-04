"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import SiteFooter from "@/app/SiteFooter";
import SiteLogo from "@/app/SiteLogo";
import { supabase } from "@/lib/supabase";
import { normalizeWebsiteUrl } from "@/lib/url";

const smoothEase = [0.22, 1, 0.36, 1] as const;

const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: smoothEase },
  },
};

const founderBenefits = [
  {
    title: "Founding placement",
    text: "Early operators get priority spots on the homepage, category pages, and map as the marketplace opens.",
  },
  {
    title: "No crowded feed",
    text: "Listings launch in small, curated batches, so your business gets real attention instead of getting buried.",
  },
  {
    title: "Roa sends you shaped requests",
    text: "Guests plan with Roa first, so requests already include dates, pace, and pickup context before they reach you.",
  },
  {
    title: "One dashboard for everything",
    text: "Manage listings, messages, availability, and booking requests from a single vendor account.",
  },
];

export default function VendorSignupPage() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { data: authData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/vendor/login`,
        data: {
          vendor_business_name: businessName,
          vendor_contact_name: contactName || null,
          vendor_phone: phone || null,
          vendor_website: normalizeWebsiteUrl(website),
        },
      },
    });

    if (signupError || !authData.user) {
      setError(signupError?.message || "Unable to create vendor account.");
      setLoading(false);
      return;
    }

    if (!authData.session) {
      setLoading(false);
      setSuccess(
        "Check your email to confirm your account. After confirmation, you will be sent to vendor login.",
      );
      return;
    }

    const { error: vendorError } = await supabase.rpc(
      "create_vendor_account",
      {
        business_name: businessName,
        contact_name: contactName || null,
        phone: phone || null,
        website: normalizeWebsiteUrl(website),
      },
    );

    setLoading(false);

    if (vendorError) {
      setError(vendorError.message);
      return;
    }

    router.push("/vendor/dashboard");
    router.refresh();
  }

  return (
    <main className="brand-page min-h-screen text-[#17324D]">
      <div className="brand-shell max-w-6xl">
        <header className="brand-topbar mb-6 sm:mb-8">
          <SiteLogo />
          <Link
            href="/"
            className="brand-button-secondary w-fit"
          >
            Home
          </Link>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_1fr] lg:items-start">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={reduceMotion ? undefined : fadeUpVariants}
            className="relative overflow-hidden rounded-[1.5rem] bg-[#071F2F] text-white shadow-2xl shadow-[#071F2F]/15"
          >
            <div className="relative h-48 sm:h-56">
              <Image
                src="/images/vendor-hero.jpg"
                alt="Roatan harbor at golden hour"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#071F2F] via-[#071F2F]/35 to-transparent" />
            </div>
            <div className="p-6 sm:p-8">
              <p className="brand-eyebrow-gold">Pre-launch &middot; founding operators</p>
              <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
                Be one of Roatan&apos;s first listed operators.
              </h1>
              <p className="mt-4 text-sm leading-7 text-white/76 sm:text-base">
                Roatan Island Life is opening to guests in stages. Founding
                operators who join now get set up before the doors open, and
                shape what &quot;guest-ready&quot; looks like on the island.
              </p>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {founderBenefits.map((benefit) => (
                  <div
                    key={benefit.title}
                    className="rounded-2xl border border-white/12 bg-white/[0.06] p-4"
                  >
                    <p className="text-sm font-black text-white">
                      {benefit.title}
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-white/68">
                      {benefit.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={reduceMotion ? undefined : fadeUpVariants}
            transition={{ delay: reduceMotion ? 0 : 0.1 }}
            className="brand-auth-card p-5 sm:p-8"
          >
          <p className="brand-eyebrow">Operator onboarding</p>
          <h2 className="mt-2 text-2xl font-black text-[#0B3C5D] sm:text-3xl">
            Claim your founding spot
          </h2>
          <p className="brand-subtitle mt-2 text-sm">
            Create an account so you can submit listings and return later.
            Takes about two minutes.
          </p>

          <form onSubmit={handleSignup} className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <label htmlFor="vendor-business-name" className="mb-2 block font-medium">
                Business Name
              </label>
              <input
                id="vendor-business-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="brand-input"
                required
              />
            </div>

            <div>
              <label htmlFor="vendor-contact-name" className="mb-2 block font-medium">
                Contact Name
              </label>
              <input
                id="vendor-contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="brand-input"
              />
            </div>

            <div>
              <label htmlFor="vendor-phone" className="mb-2 block font-medium">
                Phone
              </label>
              <input
                id="vendor-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="brand-input"
              />
            </div>

            <div>
              <label htmlFor="vendor-email" className="mb-2 block font-medium">
                Email
              </label>
              <input
                id="vendor-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="brand-input"
                required
              />
            </div>

            <div>
              <label htmlFor="vendor-password" className="mb-2 block font-medium">
                Password
              </label>
              <input
                id="vendor-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="brand-input"
                required
                minLength={6}
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="vendor-website" className="mb-2 block font-medium">
                Website
              </label>
              <input
                id="vendor-website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="brand-input"
              />
            </div>

            {error ? (
              <p className="text-sm text-red-600 md:col-span-2">{error}</p>
            ) : null}
            {success ? (
              <p className="rounded-xl bg-green-100 p-4 text-sm text-green-800 md:col-span-2">
                {success}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="brand-button-primary w-full disabled:opacity-50 md:col-span-2"
            >
              {loading ? "Creating..." : "Create Vendor Account"}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/vendor/login" className="font-semibold text-[#007B7B]">
              Login
            </Link>
          </p>
          </motion.div>
        </div>
      </div>
      <SiteFooter />
    </main>
  );
}
