"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { HomeDashboard } from "@/components/home-dashboard";
import { LandingPage } from "@/components/landing-page";
import { LoginView } from "@/components/login-view";
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
    if (authFailed) {
      return (
        <LoginView
          errorReason={reason || "Sign-in was cancelled or expired. Try again."}
          showBackLink
        />
      );
    }
    return <LandingPage />;
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
