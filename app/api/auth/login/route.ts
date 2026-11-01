import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REFRESH_COOKIE, refreshCookieOptions } from "@/lib/authCookie";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

/**
 * Proxies to the real backend's /auth/login, then splits its response:
 * the refresh token goes into an httpOnly cookie (never touched by client
 * JS), and only { user, accessToken } go back to the browser. This is the
 * one meaningful difference from a plain pass-through — see lib/config.ts
 * for the reasoning.
 */
export async function POST(request: Request) {
  const body = await request.json();

  const backendRes = await fetch(`${API_BASE_URL}/auth/login`, {
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
