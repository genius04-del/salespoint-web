import { API_BASE_URL } from "./config";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * The in-memory access token. Deliberately never persisted (not
 * localStorage, not a readable cookie) — on a hard page refresh it's gone,
 * and AuthContext silently restores it via POST /api/auth/refresh, which
 * reads the httpOnly refresh-token cookie the browser sends automatically.
 * An XSS payload that runs in this page can still read this variable, but
 * cannot read the refresh token itself, and this one expires in 15 minutes.
 */
let accessToken: string | null = null;
export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Set by AuthProvider — called when a refresh attempt fails, so the UI can
 *  route back to /login from wherever it is. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// Only one refresh call in flight at a time — if several requests 401 at
// once, the rest await this same promise instead of each refreshing separately.
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const res = await fetch("/api/auth/refresh", { method: "POST" });
    if (!res.ok) {
      setAccessToken(null);
      onUnauthorized?.();
      throw new ApiError("Session expired", 401);
    }
    const data = await res.json();
    setAccessToken(data.accessToken);
    return data.accessToken as string;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/** Flattens the backend's error shape — either {"error": "message"} or the
 *  zod validation shape {"error": {"fieldErrors": {...}}} — into one string. */
function extractErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error: unknown }).error;
    if (typeof error === "string") return error;
    if (error && typeof error === "object" && "fieldErrors" in error) {
      const fieldErrors = (error as { fieldErrors: Record<string, string[]> }).fieldErrors;
      const messages = Object.entries(fieldErrors)
        .filter(([, v]) => v.length > 0)
        .map(([field, v]) => `${field}: ${v.join(", ")}`)
        .join("; ");
      if (messages) return messages;
    }
  }
  return fallback;
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown; // pass a plain object; it's JSON.stringify'd for you
  skipAuth?: boolean; // for calls that don't need (or don't yet have) a token
}

/**
 * The one function every feature module should use to call the backend
 * (products, sales, inventory, etc.) — everything except the four
 * token-issuing auth calls, which go through /api/auth/* instead (see
 * lib/config.ts for why). Handles JSON encoding, the Authorization header,
 * and a single transparent retry after a 401 refresh.
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, skipAuth, headers, ...rest } = options;

  const doFetch = async (): Promise<Response> => {
    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...(headers as Record<string, string> | undefined),
    };
    if (!skipAuth && accessToken) {
      requestHeaders["Authorization"] = `Bearer ${accessToken}`;
    }
    return fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let response: Response;
  try {
    response = await doFetch();
  } catch {
    throw new ApiError(
      "Could not reach the server. Check your connection and that the backend is running.",
      0
    );
  }

  if (response.status === 401 && !skipAuth) {
    try {
      await refreshAccessToken();
      response = await doFetch();
    } catch {
      throw new ApiError("Your session has expired. Please log in again.", 401);
    }
  }

  if (!response.ok) {
    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      // Non-JSON error body (e.g. a proxy/502 page) — fall through to the generic message.
    }
    throw new ApiError(extractErrorMessage(data, "Something went wrong. Please try again."), response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
