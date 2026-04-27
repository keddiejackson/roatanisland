"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function getIdFromPath(pathname: string, prefix: string) {
  if (!pathname.startsWith(prefix)) {
    return null;
  }

  return pathname.slice(prefix.length).split("/")[0] || null;
}

export default function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) {
      return;
    }

    const payload = {
      eventType: "page_view",
      path: `${pathname}${window.location.search}`,
      listingId: getIdFromPath(pathname, "/listings/"),
      vendorId: getIdFromPath(pathname, "/vendors/"),
      referrer: document.referrer || null,
    };

    const body = JSON.stringify(payload);

    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics",
        new Blob([body], { type: "application/json" }),
      );
      return;
    }

    fetch("/api/analytics", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body,
      keepalive: true,
    });
  }, [pathname]);

  return null;
}
