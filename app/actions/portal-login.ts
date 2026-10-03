"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  bindStudioOrganization,
  clearStudioOrganizationCookies,
} from "@/app/actions/cms/organizations";
import { findMatchingPortalAccount } from "@/lib/marketing/portal-credentials";
import {
  PORTAL_COOKIE,
  portalCookieOptions,
  signPortalSession,
} from "@/lib/marketing/portal-session";

const FAIL_DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function loginPortal(
  formData: FormData,
): Promise<{ success: true } | { success: false; error: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    await sleep(FAIL_DELAY_MS);
    return { success: false, error: "Email and password are required." };
  }

  const account = await findMatchingPortalAccount(email, password);
  if (!account) {
    await sleep(FAIL_DELAY_MS);
    return { success: false, error: "Email or password is wrong." };
  }

  const bound = await bindStudioOrganization(account.orgSlug);
  if (!bound.success) {
    await sleep(FAIL_DELAY_MS);
    return { success: false, error: "This login has no project yet." };
  }

  const token = await signPortalSession(account.email, account.orgSlug);
  const jar = await cookies();
  jar.set(PORTAL_COOKIE, token, portalCookieOptions());
  return { success: true };
}

export async function logoutPortal(): Promise<void> {
  const jar = await cookies();
  jar.set(PORTAL_COOKIE, "", { ...portalCookieOptions(), maxAge: 0 });
  await clearStudioOrganizationCookies();
  redirect("/");
}
