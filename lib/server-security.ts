import "server-only";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

type RateEntry = { count: number; resetAt: number };
type RequestUser = { id: string; email: string; token: string };

const globalRateStore = globalThis as typeof globalThis & {
  __roatanRateLimits?: Map<string, RateEntry>;
};

const memoryRateLimits =
  globalRateStore.__roatanRateLimits || new Map<string, RateEntry>();
globalRateStore.__roatanRateLimits = memoryRateLimits;

export function getBearerToken(request: Request) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
}

export function isValidEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
  );
}

export async function getRequestUser(
  request: Request,
): Promise<RequestUser | null> {
  const token = getBearerToken(request);
  if (!token) return null;

  const { data, error } = await supabaseServer.auth.getUser(token);
  const email = data.user?.email?.trim().toLowerCase();

  if (error || !data.user?.id || !email) return null;
  return { id: data.user.id, email, token };
}

export async function isAdminUser(user: Pick<RequestUser, "email">) {
  const { data } = await supabaseServer
    .from("admin_users")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();

  return Boolean(data);
}

export async function getVendorMembership(
  user: Pick<RequestUser, "id">,
  vendorId?: string | null,
) {
  let query = supabaseServer
    .from("vendor_users")
    .select("vendor_id")
    .eq("user_id", user.id);

  if (vendorId) query = query.eq("vendor_id", vendorId);

  const { data } = await query.maybeSingle();
  return data?.vendor_id ? String(data.vendor_id) : null;
}

export function unauthorized(message = "Please sign in to continue.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "You do not have access to this action.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function readJsonObject<T extends object>(
  request: Request,
  maxBytes = 64 * 1024,
): Promise<
  | { ok: true; data: T }
  | { ok: false; response: NextResponse<{ error: string }> }
> {
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request is too large." }, { status: 413 }),
    };
  }

  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Request is too large." }, { status: 413 }),
    };
  }

  try {
    const value = JSON.parse(raw) as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("Expected an object.");
    }
    return { ok: true, data: value as T };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid request body." }, { status: 400 }),
    };
  }
}

function clientIdentifier(request: Request) {
  const raw =
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const salt = process.env.RATE_LIMIT_SALT || process.env.BOOKING_ACCESS_SECRET || "roatan";

  return createHash("sha256").update(`${salt}:${raw}`).digest("hex");
}

function memoryLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const current = memoryRateLimits.get(key);

  if (!current || current.resetAt <= now) {
    memoryRateLimits.set(key, {
      count: 1,
      resetAt: now + windowSeconds * 1000,
    });
    return true;
  }

  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export async function enforceRateLimit(
  request: Request,
  scope: string,
  options: { limit: number; windowSeconds: number },
) {
  const identifier = clientIdentifier(request);
  const key = `${scope}:${identifier}`;
  let allowed: boolean | null = null;

  try {
    const { data, error } = await supabaseServer.rpc("consume_api_rate_limit", {
      p_identifier: identifier,
      p_scope: scope,
      p_limit: options.limit,
      p_window_seconds: options.windowSeconds,
    });

    if (!error && typeof data === "boolean") allowed = data;
  } catch {
    allowed = null;
  }

  if (allowed === null) {
    allowed = memoryLimit(key, options.limit, options.windowSeconds);
  }

  if (allowed) return null;

  return NextResponse.json(
    { error: "Too many requests. Please wait a moment and try again." },
    {
      status: 429,
      headers: { "Retry-After": String(options.windowSeconds) },
    },
  );
}
