import { ApiError, apiFetch, setAccessToken } from "@/lib/apiClient";

function flatten(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error: unknown }).error;
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "fieldErrors" in error) {
      const fe = (error as { fieldErrors: Record<string, string[]> }).fieldErrors;
      const msg = Object.entries(fe)
        .filter(([, v]) => v.length > 0)
        .map(([k, v]) => `${k}: ${v.join(", ")}`)
        .join("; ");
      if (msg) return msg;
    }
  }
  return fallback;
}

/** Goes through the Next BFF so the refresh cookie is replaced. */
export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  let res: Response;
  try {
    res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new ApiError("Could not reach the server.", 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(flatten(data, "Could not change password."), res.status);
  setAccessToken(data.accessToken);
  return data as { accessToken: string; message: string };
}

/** Public — the reset token in the emailed link is the credential. */
export function resetPassword(input: { token: string; newPassword: string }) {
  return apiFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: input,
    skipAuth: true,
  });
}
