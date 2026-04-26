import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  supabaseAnonKey;

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
