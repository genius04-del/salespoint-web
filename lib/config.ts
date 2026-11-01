/**
 * The Express backend's URL, as seen from the BROWSER. Every call except
 * login/register/refresh/logout goes straight from client JS to this URL
 * (see lib/apiClient.ts) — those four go through this Next.js app's own
 * /api/auth/* routes instead, so the refresh token can live in an httpOnly
 * cookie rather than anywhere JavaScript can read it.
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
