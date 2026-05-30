"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { HomeListing } from "@/lib/home-listings";
import type { HomepageControls } from "@/lib/homepage-settings";
import { getPremiumListingCardPolish } from "@/lib/marketplace-upgrade";

export type HomePageListing = HomeListing & {
  image_url: string | null;
  reviews_count: number | null;
};

const smoothEase = [0.22, 1, 0.36, 1] as const;

const reducedMotionVariants: Variants = {
  hidden: { opacity: 1 },
  visible: { opacity: 1 },
};

const listingCardVariants: Variants = {
  hidden: { opacity: 0, y: 34 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: smoothEase },
  },
};

function listingBadge(
  listing: HomePageListing,
  homepageControls: HomepageControls,
) {
  if (listing.is_featured) return homepageControls.featuredBadgeLabel;
  if ((listing.rating || 0) >= 4.8) return homepageControls.topRatedBadgeLabel;
  return listing.category || "Listing";
}

type HomeListingCardProps = {
  listing: HomePageListing;
  homepageControls: HomepageControls;
  featured?: boolean;
};

export default function HomeListingCard({
  listing,
  homepageControls,
  featured = false,
}: HomeListingCardProps) {
  const reduceMotion = useReducedMotion();
  const cardPolish = getPremiumListingCardPolish(listing);

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: reduceMotion ? 0.05 : 0.22 }}
      variants={reduceMotion ? reducedMotionVariants : listingCardVariants}
      whileHover={reduceMotion ? undefined : { y: -7 }}
      transition={{ duration: 0.28, ease: smoothEase }}
      className="h-full"
    >
      <Link
        href={`/listings/${listing.id}`}
        className="brand-card-lift group block h-full overflow-hidden focus:outline-none focus:ring-4 focus:ring-[#00A8A8]/25"
      >
        <div
          className={
            featured ? "relative h-60 bg-[#D8EFEC]" : "relative h-52 bg-[#D8EFEC]"
          }
        >
          {listing.image_url ? (
            <Image
              src={listing.image_url}
              alt={listing.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              unoptimized
              className="object-cover transition duration-700 group-hover:scale-105"
            />
          ) : (
            <>
              <Image
                src={homepageControls.listingFallbackImageUrl}
                alt="Roatan preview"
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                unoptimized
                className="object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,31,47,0.04)_0%,rgba(7,31,47,0.24)_100%)]" />
              <span className="absolute left-4 bottom-4 rounded-full bg-white/90 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-[#0B3C5D] shadow">
                Premium photo pending
              </span>
            </>
          )}
          <span className="brand-badge absolute left-4 top-4 rounded-lg bg-white px-3 py-1 text-xs uppercase shadow">
            {listingBadge(listing, homepageControls)}
          </span>
          <span className="absolute bottom-4 right-4 rounded-lg bg-[#071F2F] px-3 py-1 text-sm font-black text-white shadow">
            {cardPolish.priceLabel}
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="brand-eyebrow">{listing.location || "Roatan"}</p>
              <h3 className="mt-2 text-lg font-black leading-snug text-[#0B3C5D]">
                {listing.title}
              </h3>
            </div>
            <span className="brand-badge brand-badge-teal shrink-0 text-center">
              {cardPolish.primaryBadge}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">
            {cardPolish.benefitLine}
          </p>
          <div className="mt-5 flex items-center justify-between border-t border-gray-100 pt-4 text-sm">
            <span className="font-bold text-gray-500">
              {listing.category || "Listing"}
            </span>
            <span className="font-black text-[#007B7B]">View details</span>
          </div>
          {cardPolish.trustBadges.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {cardPolish.trustBadges.slice(0, 3).map((badge) => (
                <span key={badge} className="brand-badge brand-badge-teal">
                  {badge}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
    </motion.div>
  );
}
