import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import AnalyticsTracker from "./AnalyticsTracker";
import GlobalBookingChat from "./GlobalBookingChat";
import GlobalAccountButton from "./GlobalAccountButton";
import GlobalRoaButton from "./GlobalRoaButton";
import GuestMobilePlatform from "./GuestMobilePlatform";
import SessionIdleTimeout from "./SessionIdleTimeout";
import SiteBrandingProvider from "./SiteBrandingProvider";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.roatanisland.life",
  ),
  applicationName: "Roatan Island Life",
  title: {
    default: "Roatan Island Life | Curated island planning",
    template: "%s | Roatan Island Life",
  },
  description:
    "Plan Roatan with curated local experiences, precise map context, trusted operators, and help from Roa, your island concierge.",
  keywords: [
    "Roatan tours",
    "Roatan map",
    "Roatan hotels",
    "Roatan transportation",
    "Roatan cruise excursions",
    "Roatan concierge",
  ],
  category: "travel",
  alternates: { canonical: "/" },
  verification: {
    google: "rvSAtX1sV6nfPG1RCaF8euFpTRUtZ3NqRwmqE_J5C4o",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Roatan Life",
  },
  openGraph: {
    title: "Roatan Island Life",
    description:
      "Curated local experiences, precise map planning, and trusted Roatan concierge support.",
    siteName: "RoatanIsland.life",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Roatan Island Life",
    description:
      "Curated local experiences, precise map planning, and trusted Roatan concierge support.",
  },
};

export const viewport: Viewport = {
  themeColor: "#071f2f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${fraunces.variable} ${plusJakartaSans.variable}`}
    >
      <body className="flex min-h-dvh flex-col">
        <SiteBrandingProvider>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <AnalyticsTracker />
          <SessionIdleTimeout />
          <div id="main-content" tabIndex={-1} className="min-w-0 flex-1">
            {children}
          </div>
          <GuestMobilePlatform />
          <GlobalBookingChat />
          <GlobalRoaButton />
          <GlobalAccountButton />
        </SiteBrandingProvider>
      </body>
    </html>
  );
}
