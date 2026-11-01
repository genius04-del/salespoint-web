/** Shared between the /api/auth/* route handlers and proxy.ts. */
export const REFRESH_COOKIE = "sp_refresh_token";

export function refreshCookieOptions() {
  return {
    httpOnly: true,
    // Secure requires HTTPS — off in local dev (plain http://localhost),
    // on automatically once NODE_ENV is production (a real deployment).
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    // Must be "/", not "/api/auth" — proxy.ts needs to see this cookie on
    // EVERY page (/login, /dashboard) to decide where to send the visitor.
    // Scoping it to /api/auth meant the browser silently never sent it to
    // any other path, so proxy.ts always believed there was no session and
    // bounced even a freshly-logged-in user straight back to /login.
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days — matches the backend's own refresh-token lifetime
  };
}
