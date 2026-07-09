/** Safe internal admin return path (no open redirects). */
export function parseAdminReturnTo(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const decoded = decodeURIComponent(raw);
  if (!decoded.startsWith("/admin")) return undefined;
  if (decoded.includes("//") || decoded.includes("://")) return undefined;
  return decoded;
}
