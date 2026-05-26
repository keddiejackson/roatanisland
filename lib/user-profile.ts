export type PublicUserProfile = {
  email?: string | null;
  display_name?: string | null;
  profile_image_url?: string | null;
};

export function displayNameFromProfile(profile: PublicUserProfile) {
  const displayName = profile.display_name?.trim();

  if (displayName) {
    return displayName;
  }

  const emailName = profile.email?.split("@")[0]?.trim();
  return emailName || "Roatan guest";
}

export function profileInitials(
  displayName: string | null | undefined,
  email: string | null | undefined,
) {
  const nameParts = (displayName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (nameParts.length > 0) {
    return nameParts
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }

  const emailInitial = email?.trim()[0];
  return emailInitial ? emailInitial.toUpperCase() : "RI";
}
