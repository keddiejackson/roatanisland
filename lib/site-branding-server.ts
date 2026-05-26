import { normalizeSiteBranding } from "@/lib/site-branding";
import { supabaseServer } from "@/lib/supabase-server";

export async function getSiteBranding() {
  const { data } = await supabaseServer
    .from("site_settings")
    .select("value")
    .eq("key", "site")
    .maybeSingle();

  return normalizeSiteBranding(data?.value);
}
