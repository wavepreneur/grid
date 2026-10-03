"use server";

import { cookies } from "next/headers";
import {
  findPortalAccountByEmail,
  firstNameFrom,
  getPortalProfile,
  savePortalProfile,
} from "@/lib/marketing/portal-profile";
import { portalCredentialsMatch } from "@/lib/marketing/portal-credentials";
import { PORTAL_COOKIE, portalCookieOptions, signPortalSession, verifyPortalSession } from "@/lib/marketing/portal-session";

export async function getPortalProfilePublic(): Promise<{
  name: string;
  email: string;
  firstName: string;
  orgSlug: string;
}> {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  const session = await verifyPortalSession(token);
  const profile =
    (session ? await findPortalAccountByEmail(session.email) : null) ?? (await getPortalProfile());
  return {
    name: profile.name,
    email: profile.email,
    firstName: firstNameFrom(profile.name),
    orgSlug: session?.orgSlug ?? profile.orgSlug,
  };
}

export async function updatePortalProfile(formData: FormData): Promise<
  { success: true; firstName: string } | { success: false; error: string }
> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!name) return { success: false, error: "Name fehlt." };
  if (!email || !email.includes("@")) return { success: false, error: "Email ist ungültig." };
  if (password && password.length < 8) {
    return { success: false, error: "Passwort mindestens 8 Zeichen." };
  }
  if (password && password !== passwordConfirm) {
    return { success: false, error: "Passwörter stimmen nicht überein." };
  }

  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  const session = await verifyPortalSession(token);
  const current =
    (session ? await findPortalAccountByEmail(session.email) : null) ?? (await getPortalProfile());
  const next = {
    name,
    email,
    password: password || current.password,
    orgSlug: current.orgSlug,
  };
  if (!next.password) return { success: false, error: "Passwort fehlt." };

  await savePortalProfile(next, current.email);

  if (await portalCredentialsMatch(email, next.password)) {
    const jar = await cookies();
    jar.set(PORTAL_COOKIE, await signPortalSession(email, next.orgSlug), portalCookieOptions());
  }

  return { success: true, firstName: firstNameFrom(name) };
}
