import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { logoutPortal } from "@/app/actions/portal-login";
import { GridMarketingFooter } from "@/components/marketing/grid-marketing-footer";
import { GridNav } from "@/components/marketing/grid-nav";
import { PORTAL_COOKIE, verifyPortalSession } from "@/lib/marketing/portal-session";
import "@/app/grid-marketing.css";

export const metadata: Metadata = {
  title: "Your GRID",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  const session = await verifyPortalSession(token);
  if (!session) {
    redirect("/login?next=/account");
  }

  return (
    <div className="grid-marketing grid-marketing-studio min-h-screen">
      <GridNav />
      <main className="grid-section">
        <div className="grid-container" style={{ maxWidth: 720 }}>
          <span className="section-label">Your GRID</span>
          <h1 className="grid-h1" style={{ fontSize: "clamp(36px, 5vw, 56px)", marginBottom: 16 }}>
            You&apos;re in.
          </h1>
          <p className="grid-body" style={{ fontSize: 18, marginBottom: 28 }}>
            This is your company room. Sessions, results, and the page your people open.
          </p>
          <div className="grid-card" style={{ padding: 28 }}>
            <p className="grid-body" style={{ marginBottom: 8 }}>
              Signed in as
            </p>
            <p className="grid-product-header" style={{ marginBottom: 24 }}>
              {session.email}
            </p>
            <form action={logoutPortal}>
              <button type="submit" className="grid-cta-outline">
                Log out
              </button>
            </form>
          </div>
          <p className="grid-body" style={{ marginTop: 28 }}>
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
