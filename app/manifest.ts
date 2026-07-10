import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Roatan Island Life",
    short_name: "Roatan Life",
    description:
      "Curated Roatan experiences, map planning, bookings, trips, and concierge help.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf6",
    theme_color: "#071f2f",
    orientation: "portrait-primary",
    categories: ["travel", "lifestyle"],
    icons: [
      {
        src: "/icon",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}

