import { supabase } from "@/lib/supabase";

export function isAllowedAdminEmail(email?: string | null) {
  const allowedEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (!allowedEmails?.length) {
    return true;
  }

  return Boolean(email && allowedEmails.includes(email.toLowerCase()));
}

export async function isAdminUser(email?: string | null) {
  if (!email || !isAllowedAdminEmail(email)) {
    return false;
  }

  const { data, error } = await supabase
    .from("admin_users")
    .select("email")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) {
    console.error("Error checking admin access:", error);
    return false;
  }

  return Boolean(data);
}
