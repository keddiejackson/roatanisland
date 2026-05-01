import type { Metadata } from "next";
import AnalyticsTracker from "./AnalyticsTracker";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.roatanisland.life",
  ),
  title: "RoatanIsland.life",
  description: "Discover and book tours, stays, and transport in Roatan.",
  verification: {
    google: "rvSAtX1sV6nfPG1RCaF8euFpTRUtZ3NqRwmqE_J5C4o",
  },
  openGraph: {
    title: "RoatanIsland.life",
    description: "Discover and book tours, stays, and transport in Roatan.",
    siteName: "RoatanIsland.life",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
