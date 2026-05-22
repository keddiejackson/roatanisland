"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  defaultSiteBranding,
  normalizeSiteBranding,
  type SiteBranding,
} from "@/lib/site-branding";
import { supabase } from "@/lib/supabase";

const SiteBrandingContext = createContext<SiteBranding>(defaultSiteBranding);

export function useSiteBranding() {
  return useContext(SiteBrandingContext);
}

export default function SiteBrandingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [branding, setBranding] = useState(defaultSiteBranding);

  useEffect(() => {
    async function fetchBranding() {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "site")
        .maybeSingle();

      setBranding(normalizeSiteBranding(data?.value));
    }

    fetchBranding();
  }, []);

  return (
    <SiteBrandingContext.Provider value={branding}>
      {children}
    </SiteBrandingContext.Provider>
  );
}
