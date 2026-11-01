import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REFRESH_COOKIE, refreshCookieOptions } from "@/lib/authCookie";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

/**
 * Till (PIN) login. Same split as /api/auth/login: the refresh token goes
 * into the httpOnly cookie, only the access token returns to the browser.
 * Signing in here replaces whoever was signed in on this device before.
 */
export async function POST(request: Request) {
  const body = await request.json();

  const backendRes = await fetch(`${API_BASE_URL}/auth/pin-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await backendRes.json();

  if (!backendRes.ok) {
    return NextResponse.json(data, { status: backendRes.status });
  }

  const cookieStore = await cookies();
  cookieStore.set(REFRESH_COOKIE, data.refreshToken, refreshCookieOptions());

  return NextResponse.json({ user: data.user, accessToken: data.accessToken });
}
