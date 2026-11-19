"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SignInGate, useAuth } from "@/components/auth-provider";
import { HomeDashboard } from "@/components/home-dashboard";
import { SlateMark } from "@/components/slate-logo";

function HomeGate() {
  const { user, loading } = useAuth();
  const params = useSearchParams();
  const authFailed = params.get("auth") === "failed";
  const reason = params.get("reason");

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--bg)]">
        <SlateMark size={38} />
        <span className="text-xs text-[var(--muted)]">Loading Slate…</span>
      </div>
    );
  }

  if (!user) {
    return (
      <SignInGate
        errorReason={authFailed ? reason || "Sign-in was cancelled or expired. Try again." : null}
      />
    );
  }

  return <HomeDashboard />;
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-xs text-[var(--muted)]">
          Loading Slate…
        </div>
      }
    >
      <HomeGate />
    </Suspense>
  );
}
