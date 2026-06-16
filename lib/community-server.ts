import {
  communityDisplayName,
  type CommunityAuthorRole,
} from "@/lib/community-forum";
import {
  normalizeCommunityVerificationType,
  type CommunityVerificationType,
} from "@/lib/community-verification";
import { supabaseServer } from "@/lib/supabase-server";

export type CommunityUser = {
  id: string;
  email: string | null;
};

export type CommunityIdentity = {
  displayName: string;
  profileImageUrl: string | null;
  authorRole: CommunityAuthorRole;
  verificationType: CommunityVerificationType;
  isVerifiedLocal: boolean;
  isVerifiedOperator: boolean;
};

export async function getCommunityUser(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");

  if (!token) return null;

  const { data } = await supabaseServer.auth.getUser(token);
  return data.user
    ? {
        id: data.user.id,
        email: data.user.email || null,
      }
    : null;
}

export async function verifyCommunityAdmin(request: Request) {
  const user = await getCommunityUser(request);
  const email = user?.email?.toLowerCase();

  if (!email) return null;

  const { data: admin } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  return admin ? email : null;
}

export async function getCommunityIdentity({
  anonymous,
  user,
}: {
  anonymous: boolean;
  user: CommunityUser;
}): Promise<CommunityIdentity> {
  const email = user.email?.toLowerCase() || "";
  const [{ data: profile }, { data: admin }, { data: vendorLink }] =
    await Promise.all([
      supabaseServer
        .from("guest_profiles")
        .select("display_name, profile_image_url, community_verification_type")
        .eq("user_id", user.id)
        .maybeSingle(),
      email
        ? supabaseServer
            .from("admin_users")
            .select("email")
            .eq("email", email)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseServer
        .from("vendor_users")
        .select("vendor_id")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  const storedType = normalizeCommunityVerificationType(
    profile?.community_verification_type,
  );
  const verificationType: CommunityVerificationType = admin
    ? "admin"
    : vendorLink || storedType === "vendor"
      ? "vendor"
      : storedType === "local"
        ? "local"
        : storedType === "traveler"
          ? "traveler"
          : "unverified";
  const authorRole: CommunityAuthorRole =
    verificationType === "admin"
      ? "concierge"
      : verificationType === "vendor"
        ? "operator"
        : verificationType === "local"
          ? "local"
          : "traveler";

  return {
    displayName: communityDisplayName({
      anonymous,
      displayName: profile?.display_name,
      email,
    }),
    profileImageUrl: anonymous ? null : profile?.profile_image_url || null,
    authorRole,
    verificationType,
    isVerifiedLocal: verificationType === "local" || verificationType === "admin",
    isVerifiedOperator: verificationType === "vendor",
  };
}
