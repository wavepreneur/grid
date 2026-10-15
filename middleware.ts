import { type NextRequest, NextResponse } from "next/server";
import { isPortalAppPath, safePortalNext } from "@/lib/marketing/portal-paths";
import { PORTAL_COOKIE, verifyPortalSession } from "@/lib/marketing/portal-session";
import {
  TELLS_GATE_COOKIE,
  isTellsGateBypass,
  tellsGateEnabled,
  verifyTellsGate,
} from "@/lib/marketing/tells-gate";
import { updateSession } from "@/lib/supabase/middleware";

function withNoIndex(response: NextResponse) {
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export async function middleware(request: NextRequest) {
  const supabaseResponse = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (tellsGateEnabled() && !isTellsGateBypass(pathname)) {
    const open = await verifyTellsGate(request.cookies.get(TELLS_GATE_COOKIE)?.value);
    if (!open) {
      if (pathname.startsWith("/api/")) {
        return withNoIndex(NextResponse.json({ error: "forbidden" }, { status: 401 }));
      }
      const gate = request.nextUrl.clone();
      gate.pathname = "/gate";
      gate.search = "";
      if (pathname !== "/" && pathname !== "/gate") {
        gate.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      }
      return withNoIndex(
        pathname === "/" ? NextResponse.rewrite(gate) : NextResponse.redirect(gate),
      );
    }
  }

  if (isPortalAppPath(pathname)) {
    const session = await verifyPortalSession(request.cookies.get(PORTAL_COOKIE)?.value);
    if (!session) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", safePortalNext(pathname));
      return NextResponse.redirect(login);
    }
  }

  return withNoIndex(supabaseResponse);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
