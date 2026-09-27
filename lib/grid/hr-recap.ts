/**
 * Optional HR recap recipient — Studio test field, or later booking growth pack.
 * Empty = no HR mail. Never collected on the player recap screen.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseHrRecapEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (!email || email.length > 160 || !EMAIL_RE.test(email)) return null;
  return email;
}

export function readHrRecapEmailFromFlags(featureFlags: unknown): string | null {
  if (!featureFlags || typeof featureFlags !== "object") return null;
  return parseHrRecapEmail((featureFlags as { hr_recap_email?: unknown }).hr_recap_email);
}

export function readHrRecapEmailFromConfig(contentConfig: unknown): string | null {
  if (!contentConfig || typeof contentConfig !== "object") return null;
  const growth = (contentConfig as { growth?: { hr_email?: unknown } }).growth;
  return parseHrRecapEmail(growth?.hr_email);
}

export function withHrRecapEmail(
  featureFlags: Record<string, unknown> | null | undefined,
  email: string | null,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...(featureFlags ?? {}) };
  const parsed = parseHrRecapEmail(email);
  if (parsed) next.hr_recap_email = parsed;
  else delete next.hr_recap_email;
  return next;
}
