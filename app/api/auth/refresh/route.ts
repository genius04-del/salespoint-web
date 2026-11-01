import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REFRESH_COOKIE } from "@/lib/authCookie";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

/**
 * Called by lib/apiClient.ts whenever a business-data call gets a 401, and
 * once on every app load to silently restore a session. Reads the refresh
 * token from the httpOnly cookie (the browser sends it automatically —
 * client JS never sees its value) and exchanges it for a new access token.
 */
export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: "No session" }, { status: 401 });
  }

  const backendRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await backendRes.json();

  if (!backendRes.ok) {
    // The stored refresh token is dead (revoked by logout, or expired) —
    // clear it so we stop trying it on every subsequent page load.
    cookieStore.delete(REFRESH_COOKIE);
    return NextResponse.json(data, { status: backendRes.status });
  }

  return NextResponse.json({ accessToken: data.accessToken });
}
