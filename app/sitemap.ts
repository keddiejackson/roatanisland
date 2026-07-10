import type { MetadataRoute } from "next";
import { roatanGuides } from "@/lib/roatan-guides";
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
  const publicRoutes = [
    ["", "weekly", 1],
    ["/tours", "daily", 0.92],
    ["/map", "daily", 0.9],
    ["/hotels", "daily", 0.84],
    ["/transport", "daily", 0.84],
    ["/concierge", "weekly", 0.82],
    ["/community", "daily", 0.76],
    ["/vendors", "weekly", 0.72],
    ["/guides", "weekly", 0.75],
    ["/support", "monthly", 0.58],
    ["/vendor/signup", "monthly", 0.5],
  ] as const;
  const staticRoutes: MetadataRoute.Sitemap = publicRoutes.map(
    ([path, changeFrequency, priority]) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency,
      priority,
    }),
  );

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

  const guideRoutes = roatanGuides.map((guide) => ({
    url: `${siteUrl}/guides/${guide.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.72,
  }));

  const vendorRoutes = ((vendorsData as VendorSitemapRow[]) || []).map(
    (vendor) => ({
      url: `${siteUrl}/vendors/${vendor.id}`,
      lastModified: vendor.created_at ? new Date(vendor.created_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }),
  );

  return [...staticRoutes, ...guideRoutes, ...listingRoutes, ...vendorRoutes];
}
