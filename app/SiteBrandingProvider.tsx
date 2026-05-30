"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  defaultSiteBranding,
  normalizeSiteBranding,
  type SiteBranding,
} from "@/lib/site-branding";
import {
  defaultMobileSiteControls,
  normalizeMobileSiteControls,
  type MobileSiteControls,
} from "@/lib/mobile-site-controls";
import { supabase } from "@/lib/supabase";

const SiteBrandingContext = createContext<SiteBranding>(defaultSiteBranding);
const MobileSiteControlsContext = createContext<MobileSiteControls>(
  defaultMobileSiteControls,
);

export function useSiteBranding() {
  return useContext(SiteBrandingContext);
}

export function useMobileSiteControls() {
  return useContext(MobileSiteControlsContext);
}

export default function SiteBrandingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branding, setBranding] = useState(defaultSiteBranding);
  const [mobileControls, setMobileControls] = useState(
    defaultMobileSiteControls,
  );

  useEffect(() => {
    async function fetchBranding() {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "site")
        .maybeSingle();

      setBranding(normalizeSiteBranding(data?.value));
      setMobileControls(normalizeMobileSiteControls(data?.value));
    }

    fetchBranding();
  }, []);

  return (
    <SiteBrandingContext.Provider value={branding}>
      <MobileSiteControlsContext.Provider value={mobileControls}>
        {children}
      </MobileSiteControlsContext.Provider>
    </SiteBrandingContext.Provider>
  );
}
