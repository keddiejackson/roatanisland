export type BookingMessageProfileInput = {
  sender_role: string;
  sender_email?: string | null;
  sender_display_name?: string | null;
  sender_profile_image_url?: string | null;
  is_internal?: boolean | null;
};

export type MessageProfile = {
  email: string;
  display_name?: string | null;
  profile_image_url?: string | null;
};

const adminProfile = {
  displayName: "RoatanIsland.life",
  imageUrl: "/images/roatan-island-life-mark.svg",
};

export function normalizeProfileEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || "";
}

function displayNameFromProfile(profile: {
  email?: string | null;
  display_name?: string | null;
}) {
  const displayName = profile.display_name?.trim();

  if (displayName) {
    return displayName;
  }

  const emailName = profile.email?.split("@")[0]?.trim();
  return emailName || "Roatan guest";
}

export function applyBookingMessageProfiles<T extends BookingMessageProfileInput>({
  messages,
  guestProfiles,
  vendorProfiles,
}: {
  messages: T[];
  guestProfiles: MessageProfile[];
  vendorProfiles: MessageProfile[];
}) {
  const guestByEmail = new Map(
    guestProfiles.map((profile) => [
      normalizeProfileEmail(profile.email),
      profile,
    ]),
  );
  const vendorByEmail = new Map(
    vendorProfiles.map((profile) => [
      normalizeProfileEmail(profile.email),
      profile,
    ]),
  );

  return messages.map((message) => {
    if (message.sender_role === "admin" || message.is_internal) {
      return {
        ...message,
        sender_display_name: adminProfile.displayName,
        sender_profile_image_url: adminProfile.imageUrl,
      };
    }

    const email = normalizeProfileEmail(message.sender_email);
    const profile =
      message.sender_role === "vendor"
        ? vendorByEmail.get(email)
        : guestByEmail.get(email);
    const fallbackName =
      message.sender_role === "vendor"
        ? "Vendor"
        : message.sender_role === "system"
          ? "System"
          : displayNameFromProfile({ email: message.sender_email });

    return {
      ...message,
      sender_display_name: profile
        ? displayNameFromProfile({
            email: profile.email || message.sender_email,
            display_name: profile.display_name,
          })
        : fallbackName,
      sender_profile_image_url: profile?.profile_image_url || null,
    };
  });
}
