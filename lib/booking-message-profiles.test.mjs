import assert from "node:assert/strict";
import test from "node:test";
import { applyBookingMessageProfiles } from "./booking-message-profile-utils.ts";

test("adds guest profile names and photos to booking messages", () => {
  const [message] = applyBookingMessageProfiles({
    messages: [
      {
        sender_role: "guest",
        sender_email: "keddie@example.com",
        message: "Ready to go",
      },
    ],
    guestProfiles: [
      {
        email: "keddie@example.com",
        display_name: "Keddie Jackson",
        profile_image_url: "https://example.com/keddie.jpg",
      },
    ],
    vendorProfiles: [],
  });

  assert.equal(message.sender_display_name, "Keddie Jackson");
  assert.equal(
    message.sender_profile_image_url,
    "https://example.com/keddie.jpg",
  );
});

test("adds vendor business names and admin site identity to messages", () => {
  const messages = applyBookingMessageProfiles({
    messages: [
      {
        sender_role: "vendor",
        sender_email: "operator@example.com",
        message: "Pickup confirmed",
      },
      {
        sender_role: "admin",
        sender_email: "admin@example.com",
        message: "We will help",
      },
    ],
    guestProfiles: [],
    vendorProfiles: [
      {
        email: "operator@example.com",
        display_name: "Island Charters",
        profile_image_url: "https://example.com/vendor.jpg",
      },
    ],
  });

  assert.equal(messages[0].sender_display_name, "Island Charters");
  assert.equal(messages[0].sender_profile_image_url, "https://example.com/vendor.jpg");
  assert.equal(messages[1].sender_display_name, "RoatanIsland.life");
});

test("uses custom branding for admin chat messages when provided", () => {
  const [message] = applyBookingMessageProfiles({
    messages: [
      {
        sender_role: "admin",
        sender_email: "admin@example.com",
        message: "We will help",
      },
    ],
    guestProfiles: [],
    vendorProfiles: [],
    adminProfile: {
      displayName: "Roatan Island Life",
      imageUrl: "https://example.com/custom-logo.png",
    },
  });

  assert.equal(message.sender_display_name, "Roatan Island Life");
  assert.equal(
    message.sender_profile_image_url,
    "https://example.com/custom-logo.png",
  );
});
