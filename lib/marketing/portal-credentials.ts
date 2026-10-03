import { createHash, timingSafeEqual } from "node:crypto";
import { findPortalAccountByEmail, type PortalAccount } from "@/lib/marketing/portal-profile";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: string, right: string): boolean {
  return timingSafeEqual(digest(left), digest(right));
}

export async function findMatchingPortalAccount(
  email: string,
  password: string,
): Promise<PortalAccount | null> {
  const account = await findPortalAccountByEmail(email);
  if (!account?.email || !account.password) return null;
  if (!safeEqual(email.trim().toLowerCase(), account.email) || !safeEqual(password, account.password)) {
    return null;
  }
  return account;
}

export async function portalCredentialsMatch(email: string, password: string): Promise<boolean> {
  return (await findMatchingPortalAccount(email, password)) !== null;
}
