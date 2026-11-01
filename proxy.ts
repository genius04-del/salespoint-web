import { NextResponse, type NextRequest } from "next/server";
import { REFRESH_COOKIE } from "@/lib/authCookie";

/**
 * A lightweight, fast gate — not the real authorization check. It only
 * looks at whether the refresh-token cookie is PRESENT, not whether it's
 * still valid (that requires an API round-trip, which AuthContext does on
 * every page load regardless). This just avoids flashing the dashboard
 * shell for a split second before client-side JS redirects a clearly
 * logged-out visitor back to /login.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(REFRESH_COOKIE);
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if ((pathname === "/login" || pathname === "/register") && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/register"],
};
