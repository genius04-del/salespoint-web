"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * The root route is just a traffic director — it never renders real
 * content, only a brief splash while AuthProvider figures out (via the
 * httpOnly refresh cookie) whether there's a session to restore.
 */
export default function RootPage() {
  const { status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") router.replace("/dashboard");
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-primary-navy">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-orange border-t-transparent" />
    </div>
  );
}
