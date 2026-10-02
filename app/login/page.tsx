import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GridMarketingFooter } from "@/components/marketing/grid-marketing-footer";
import { GridNav } from "@/components/marketing/grid-nav";
import { PortalLoginForm } from "@/components/marketing/portal-login-form";
import { PORTAL_COOKIE, verifyPortalSession } from "@/lib/marketing/portal-session";
import "@/app/grid-marketing.css";

export const metadata: Metadata = {
  title: "The GRID | Customer Login",
  robots: { index: false, follow: false },
};

function safeNext(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (
    typeof raw === "string" &&
    (raw === "/account" ||
      raw === "/exitmania" ||
      raw.startsWith("/account/") ||
      raw.startsWith("/exitmania/"))
  ) {
    return raw;
  }
  return "/account";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const nextPath = safeNext(params.next);
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  if (await verifyPortalSession(token)) {
    redirect(nextPath);
  }

  return (
    <div className="grid-marketing grid-marketing-studio min-h-screen">
      <GridNav />
      <main className="grid-section">
        <div className="grid-container" style={{ maxWidth: 480 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <span className="section-label">Customer Login</span>
            <h1 className="grid-h2" style={{ marginBottom: 12 }}>
              Your room
              <br />
              <span style={{ color: "var(--grid-cyan)" }}>is waiting.</span>
            </h1>
            <p className="grid-body">Email and password. This is how every customer comes in.</p>
          </div>
          <PortalLoginForm nextPath={nextPath} />
          <p className="grid-body" style={{ marginTop: 20, textAlign: "center", fontSize: 13 }}>
            <Link href="/" className="grid-nav-link">
              Back to The GRID
            </Link>
          </p>
        </div>
      </main>
      <GridMarketingFooter />
    </div>
  );
}
