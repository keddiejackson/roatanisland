import {
  type BookingMessageLike,
  type BookingSenderRole,
} from "@/lib/booking-communication";
import {
  applyBookingMessageProfiles,
  normalizeProfileEmail,
  type MessageProfile,
} from "@/lib/booking-message-profile-utils";
import { getSiteBranding } from "@/lib/site-branding-server";
import { shouldUseCustomLogo } from "@/lib/site-branding";
import { supabaseServer } from "@/lib/supabase-server";

type VendorProfileRow = {
  email?: string | null;
  vendors?:
    | {
        business_name?: string | null;
        profile_image_url?: string | null;
      }
    | {
        business_name?: string | null;
        profile_image_url?: string | null;
      }[]
    | null;
};

function uniqueSenderEmails(
  messages: BookingMessageLike[],
  senderRole: BookingSenderRole,
) {
  return [
    ...new Set(
      messages
        .filter((message) => message.sender_role === senderRole)
        .map((message) => normalizeProfileEmail(message.sender_email))
        .filter(Boolean),
    ),
  ];
}

function vendorFromRow(row: VendorProfileRow) {
  if (Array.isArray(row.vendors)) {
    return row.vendors[0] || null;
  }

  return row.vendors || null;
}

export async function enrichBookingMessagesWithProfiles(
  messages: BookingMessageLike[],
) {
  const guestEmails = uniqueSenderEmails(messages, "guest");
  const vendorEmails = uniqueSenderEmails(messages, "vendor");

  const [guestResult, vendorResult, branding] = await Promise.all([
    guestEmails.length
      ? supabaseServer
          .from("guest_profiles")
          .select("email, display_name, profile_image_url")
          .in("email", guestEmails)
      : Promise.resolve({ data: [] }),
    vendorEmails.length
      ? supabaseServer
          .from("vendor_users")
          .select("email, vendors(business_name, profile_image_url)")
          .in("email", vendorEmails)
      : Promise.resolve({ data: [] }),
    getSiteBranding(),
  ]);

  const guestProfiles =
    ((guestResult.data as MessageProfile[] | null) || []).map((profile) => ({
      ...profile,
      email: normalizeProfileEmail(profile.email),
    }));
  const vendorProfiles =
    ((vendorResult.data as VendorProfileRow[] | null) || []).flatMap((row) => {
      const email = normalizeProfileEmail(row.email);
      const vendor = vendorFromRow(row);

      if (!email) return [];

      return [
        {
          email,
          display_name: vendor?.business_name || null,
          profile_image_url: vendor?.profile_image_url || null,
        },
      ];
    });

  return applyBookingMessageProfiles({
    messages,
    guestProfiles,
    vendorProfiles,
    adminProfile: {
      displayName: "RoatanIsland.life",
      imageUrl: shouldUseCustomLogo(branding, "chat")
        ? branding.logoUrl
        : "/images/roatan-island-life-mark.svg",
    },
  });
}
