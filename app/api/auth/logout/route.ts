import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { REFRESH_COOKIE } from "@/lib/authCookie";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");

  // Best-effort — even if this fails (e.g. the access token already
  // expired), the cookie below still gets cleared, which is what actually
  // signs the browser out locally.
  if (authHeader) {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: { Authorization: authHeader },
      });
    } catch {
      // Intentionally ignored — see comment above.
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(REFRESH_COOKIE);

  return NextResponse.json({ message: "Logged out" });
}
