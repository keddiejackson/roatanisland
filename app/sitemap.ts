import type { MetadataRoute } from "next";
import { supabaseServer } from "@/lib/supabase-server";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.roatanisland.life";

type ListingSitemapRow = {
  id: string;
  image_url: string | null;
  created_at: string | null;
};

type VendorSitemapRow = {
  id: string;
  created_at: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/vendor/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${siteUrl}/vendor/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const { data: listingsData } = await supabaseServer
    .from("listings")
    .select("id, image_url, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(500);

  const { data: vendorsData } = await supabaseServer
    .from("vendors")
    .select("id, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(500);

  const listingRoutes = ((listingsData as ListingSitemapRow[]) || []).map(
    (listing) => ({
      url: `${siteUrl}/listings/${listing.id}`,
      lastModified: listing.created_at
        ? new Date(listing.created_at)
        : now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: listing.image_url ? [listing.image_url] : undefined,
    }),
  );

  const vendorRoutes = ((vendorsData as VendorSitemapRow[]) || []).map(
    (vendor) => ({
      url: `${siteUrl}/vendors/${vendor.id}`,
      lastModified: vendor.created_at ? new Date(vendor.created_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }),
  );

  return [...staticRoutes, ...listingRoutes, ...vendorRoutes];
}
