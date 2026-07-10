import { createHmac, timingSafeEqual } from "node:crypto";

export type BookingAccessSubject = {
  id: string;
  email: string;
};

function accessSecret() {
  const secret =
    process.env.BOOKING_ACCESS_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error("Missing BOOKING_ACCESS_SECRET or Supabase service role key.");
  }

  return secret;
}

function subjectValue(subject: BookingAccessSubject) {
  return `${subject.id.trim()}|${subject.email.trim().toLowerCase()}`;
}

export function createBookingAccessToken(subject: BookingAccessSubject) {
  const signature = createHmac("sha256", accessSecret())
    .update(subjectValue(subject))
    .digest("base64url");

  return `v1.${signature}`;
}

export function verifyBookingAccessToken(
  subject: BookingAccessSubject,
  token: string | null | undefined,
) {
  if (!token?.startsWith("v1.")) return false;

  const expected = createBookingAccessToken(subject);
  const expectedBuffer = Buffer.from(expected);
  const tokenBuffer = Buffer.from(token);

  return (
    expectedBuffer.length === tokenBuffer.length &&
    timingSafeEqual(expectedBuffer, tokenBuffer)
  );
}

export function withBookingAccess(path: string, token: string) {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}access=${encodeURIComponent(token)}`;
}
