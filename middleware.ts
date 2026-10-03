import { type NextRequest, NextResponse } from "next/server";
import { isPortalAppPath, safePortalNext } from "@/lib/marketing/portal-paths";
import { PORTAL_COOKIE, verifyPortalSession } from "@/lib/marketing/portal-session";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const supabaseResponse = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (isPortalAppPath(pathname)) {
    const session = await verifyPortalSession(request.cookies.get(PORTAL_COOKIE)?.value);
    if (!session) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", safePortalNext(pathname));
      return NextResponse.redirect(login);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
