import type { Metadata } from "next";
import AnalyticsTracker from "./AnalyticsTracker";
import GlobalBookingChat from "./GlobalBookingChat";
import GlobalAccountButton from "./GlobalAccountButton";
import GlobalRoaButton from "./GlobalRoaButton";
import GuestMobilePlatform from "./GuestMobilePlatform";
import SessionIdleTimeout from "./SessionIdleTimeout";
import SiteBrandingProvider from "./SiteBrandingProvider";
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
  twitter: {
    card: "summary_large_image",
    title: "RoatanIsland.life",
    description: "Discover and book tours, stays, and transport in Roatan.",
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
        <SiteBrandingProvider>
          <AnalyticsTracker />
          <SessionIdleTimeout />
          {children}
          <GuestMobilePlatform />
          <GlobalBookingChat />
          <GlobalRoaButton />
          <GlobalAccountButton />
        </SiteBrandingProvider>
      </body>
    </html>
  );
}
