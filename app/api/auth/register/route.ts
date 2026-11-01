import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REFRESH_COOKIE, refreshCookieOptions } from "@/lib/authCookie";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

export async function POST(request: Request) {
  const body = await request.json();

  const backendRes = await fetch(`${API_BASE_URL}/auth/register-business`, {
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

  // The backend's register response doesn't include businessId on `user`
  // (only `business.id`) — fold it in here so the client always gets a
  // consistent AppUser shape from both /api/auth/login and /api/auth/register.
  return NextResponse.json({
    user: { ...data.user, businessId: data.business.id },
    accessToken: data.accessToken,
  });
}
