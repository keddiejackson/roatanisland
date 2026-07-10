import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.roatanisland.life";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/account",
        "/signin",
        "/book/status/",
        "/book/trip/",
        "/book/invoice/",
        "/book/receipt/",
        "/book/success",
        "/concierge/quote/",
        "/vendor/login",
        "/vendor/dashboard",
        "/vendor/add-listing",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
