import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isProductionBuild =
  process.env.NEXT_PHASE === "phase-production-build";

if (
  process.env.NODE_ENV === "production" &&
  !isProductionBuild &&
  !supabaseServiceRoleKey
) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in production.");
}

const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase server environment variables.");
}

const serverSupabaseUrl = supabaseUrl;
const serverSupabaseKey = supabaseKey;

export const supabaseServer = createClient(serverSupabaseUrl, serverSupabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export function createSupabaseUserClient(accessToken: string) {
  if (!supabaseAnonKey) {
    throw new Error("Missing Supabase anon key.");
  }

  return createClient(serverSupabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
