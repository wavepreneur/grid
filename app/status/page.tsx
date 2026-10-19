import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { StatusPage } from "@/components/marketing/status/status-page";
import { PORTAL_COOKIE, verifyPortalSession } from "@/lib/marketing/portal-session";

export const metadata: Metadata = {
  title: "Tells | Status",
  robots: { index: false, follow: false },
};

export default async function StatusRoute() {
  const session = await verifyPortalSession((await cookies()).get(PORTAL_COOKIE)?.value);
  if (!session) notFound();
  return <StatusPage />;
}
