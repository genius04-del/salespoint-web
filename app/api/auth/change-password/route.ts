import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REFRESH_COOKIE, refreshCookieOptions } from "@/lib/authCookie";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

/**
 * Changing a password bumps the user's tokenVersion on the backend, which
 * kills the refresh token currently sitting in the httpOnly cookie. The
 * backend hands back a fresh pair, so this handler swaps the cookie and
 * returns only the new access token — the same split /api/auth/login does.
 *
 * The browser never sends the access token here; we exchange the cookie's
 * refresh token for one server-side, so lib/apiClient.ts needs no changes.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) {
    return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  }

  const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!refreshRes.ok) {
    cookieStore.delete(REFRESH_COOKIE);
    return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  }
  const { accessToken } = await refreshRes.json();

  const backendRes = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });
  const data = await backendRes.json();
  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  cookieStore.set(REFRESH_COOKIE, data.refreshToken, refreshCookieOptions());
  return NextResponse.json({ accessToken: data.accessToken, message: data.message });
}
