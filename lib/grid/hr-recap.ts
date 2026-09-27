/**
 * Booker / test recap recipient. Studio never collects this on the player screen.
 * Default is always dervis@exitmania.com.
 */

export { DEFAULT_HR_RECAP_EMAIL } from "@/lib/grid/flywheel";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseHrRecapEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 160 || !EMAIL_RE.test(email)) return null;
  return email;
}
