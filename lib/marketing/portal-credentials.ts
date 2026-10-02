import { createHash, timingSafeEqual } from "node:crypto";
import { getPortalProfile } from "@/lib/marketing/portal-profile";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

export async function portalCredentialsMatch(email: string, password: string): Promise<boolean> {
  const profile = await getPortalProfile();
  if (!profile.email || !profile.password) return false;
  return safeEqual(email.trim().toLowerCase(), profile.email) && safeEqual(password, profile.password);
}
