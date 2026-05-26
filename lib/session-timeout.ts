export const idleTimeoutMs = 30 * 60 * 1000;

export function hasIdleSessionExpired(
  lastActivityAt: number | null | undefined,
  now = Date.now(),
  timeoutMs = idleTimeoutMs,
) {
  if (!lastActivityAt) return false;

  return now - lastActivityAt > timeoutMs;
}

export function getIdleTimeoutRedirectPath(pathname: string | null | undefined) {
  const currentPath = pathname || "";

  if (currentPath.startsWith("/admin")) {
    return "/admin/login?timeout=1";
  }

  if (currentPath.startsWith("/vendor")) {
    return "/vendor/login?timeout=1";
  }

  return "/signin?timeout=1";
}
