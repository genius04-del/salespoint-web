"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  apiFetch,
  ApiError,
  setAccessToken,
  setUnauthorizedHandler,
} from "@/lib/apiClient";
import type { AppUser, LoginResponse, MeResponse } from "@/lib/types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface RegisterBusinessInput {
  businessName: string;
  businessType: string;
  currency: string;
  ownerName: string;
  email: string;
  phone?: string;
  password: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: AppUser | null;
  permissions: string[];
  isSubmitting: boolean;
  errorMessage: string | null;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  registerBusiness: (input: RegisterBusinessInput) => Promise<boolean>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AppUser | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSessionExpired = useCallback(() => {
    setUser(null);
    setPermissions([]);
    setStatus("unauthenticated");
  }, []);

  // Register once so apiClient (a plain module, outside React) can signal
  // back into this context when a refresh attempt fails.
  useEffect(() => {
    setUnauthorizedHandler(handleSessionExpired);
    return () => setUnauthorizedHandler(null);
  }, [handleSessionExpired]);

  // On first load: try to silently restore a session from the httpOnly
  // refresh-token cookie. If there's no cookie (or it's expired/revoked),
  // this fails harmlessly and the user just sees the login screen.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/refresh", { method: "POST" });
        if (!res.ok) throw new Error("no session");
        const { accessToken } = await res.json();
        setAccessToken(accessToken);

        const me = await apiFetch<MeResponse>("/auth/me");
        setUser(me.user);
        setPermissions(me.permissions);
        setStatus("authenticated");
      } catch {
        setAccessToken(null);
        setStatus("unauthenticated");
      }
    })();
  }, []);

  const finishAuthSuccess = useCallback(async (result: LoginResponse) => {
    setAccessToken(result.accessToken);
    // Neither /auth/login nor /auth/register returns the permission list —
    // fetch it right away so the dashboard can render its menu immediately.
    const me = await apiFetch<MeResponse>("/auth/me");
    setUser(me.user);
    setPermissions(me.permissions);
    setStatus("authenticated");
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsSubmitting(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new ApiError(data.error ?? "Login failed", res.status);
        await finishAuthSuccess(data as LoginResponse);
        return true;
      } catch (err) {
        setErrorMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [finishAuthSuccess]
  );

  const registerBusiness = useCallback(
    async (input: RegisterBusinessInput) => {
      setIsSubmitting(true);
      setErrorMessage(null);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const data = await res.json();
        if (!res.ok) throw new ApiError(data.error ?? "Registration failed", res.status);
        await finishAuthSuccess(data as LoginResponse);
        return true;
      } catch (err) {
        setErrorMessage(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [finishAuthSuccess]
  );

 const logout = useCallback(async () => {
  try {
    // Tells the backend to invalidate this user's refresh tokens.
    await apiFetch("/auth/logout", { method: "POST" });
  } catch {
    // Still sign out locally below even if the server call fails
    // (e.g. no connection).
  }
  try {
    // Clears the httpOnly refresh-token cookie. Only the server can do this,
    // and without it /login redirects straight back into the dashboard.
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignored: the in-memory session is cleared below regardless.
  }
  setAccessToken(null);
  setUser(null);
  setPermissions([]);
  setStatus("unauthenticated");
}, []);

  const forgotPassword = useCallback(async (email: string) => {
    await apiFetch("/auth/forgot-password", {
      method: "POST",
      body: { email },
      skipAuth: true,
    });
  }, []);

  const hasPermission = useCallback((permission: string) => permissions.includes(permission), [permissions]);
  const hasAnyPermission = useCallback(
    (anyOf: string[]) => anyOf.some((p) => permissions.includes(p)),
    [permissions]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      permissions,
      isSubmitting,
      errorMessage,
      hasPermission,
      hasAnyPermission,
      login,
      registerBusiness,
      logout,
      forgotPassword,
      clearError: () => setErrorMessage(null),
    }),
    [
      status,
      user,
      permissions,
      isSubmitting,
      errorMessage,
      hasPermission,
      hasAnyPermission,
      login,
      registerBusiness,
      logout,
      forgotPassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
