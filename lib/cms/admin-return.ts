import { APP_HOME, canonicalizeAppPath } from "@/lib/platform/app-paths";

/** Safe internal workspace return path (no open redirects). */
export function parseAdminReturnTo(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const decoded = decodeURIComponent(raw);
  if (decoded.includes("//") || decoded.includes("://")) return undefined;
  if (
    decoded === APP_HOME ||
    decoded.startsWith(`${APP_HOME}/`) ||
    decoded.startsWith("/admin") ||
    decoded === "/overview" ||
    decoded.startsWith("/overview/")
  ) {
    return canonicalizeAppPath(decoded);
  }
  return undefined;
}
