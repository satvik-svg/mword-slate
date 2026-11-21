"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { LoginView } from "@/components/login-view";
import { SlateMark } from "@/components/slate-logo";

function LoginRouteInner() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const params = useSearchParams();
  const authFailed = params.get("auth") === "failed";
  const reason = params.get("reason");

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--bg)]">
        <SlateMark size={34} />
        <span className="text-xs text-[var(--muted)]">Loading Slate…</span>
      </div>
    );
  }

  return (
    <LoginView
      errorReason={authFailed ? reason || "Sign-in was cancelled or expired. Try again." : null}
      showBackLink
    />
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-xs text-[var(--muted)]">
          Loading…
        </div>
      }
    >
      <LoginRouteInner />
    </Suspense>
  );
}
