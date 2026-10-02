import { type NextRequest, NextResponse } from "next/server";
import { PORTAL_COOKIE, verifyPortalSession } from "@/lib/marketing/portal-session";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const supabaseResponse = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (
    pathname === "/account" ||
    pathname.startsWith("/account/") ||
    pathname === "/exitmania" ||
    pathname.startsWith("/exitmania/")
  ) {
    const session = await verifyPortalSession(request.cookies.get(PORTAL_COOKIE)?.value);
    if (!session) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname);
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
