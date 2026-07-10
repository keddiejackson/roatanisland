import { unstable_cache } from "next/cache";
import { normalizeSiteBranding } from "@/lib/site-branding";
import { supabaseServer } from "@/lib/supabase-server";

const getCachedSiteBranding = unstable_cache(async () => {
  const { data } = await supabaseServer
    .from("site_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();

  return normalizeSiteBranding(data?.value);
}, ["site-branding"], { tags: ["site-branding"], revalidate: 300 });

export async function getSiteBranding() {
  return getCachedSiteBranding();
}
