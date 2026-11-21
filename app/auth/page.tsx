"use client";

import { Suspense, useEffect } from "react";
import { SlateMark } from "@/components/slate-logo";

function AuthCallbackInner() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const token = params.get("token") ?? params.get("user_access_token");

    if ((success === "true" || success === "1") && token) {
      try {
        localStorage.setItem("user_auth_token", token);
        localStorage.setItem("auth_token", token);
      } catch {
        // ignore
      }
      const origin = (() => {
        try {
          return localStorage.getItem("mworld_origin") || window.location.origin;
        } catch {
          return window.location.origin;
        }
      })();

      void fetch("/api/auth/session", {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
          "x-mworld-origin": origin,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const failed = (await res.json().catch(() => ({}))) as { error?: string };
            const reason = encodeURIComponent(failed.error ?? "Invalid mAuth session");
            window.location.replace(`/login?auth=failed&reason=${reason}`);
            return;
          }
          let nextPath = "/";
          try {
            const saved = sessionStorage.getItem("slate_return_to");
            if (saved && saved.startsWith("/")) {
              nextPath = saved;
              sessionStorage.removeItem("slate_return_to");
            }
          } catch {
            // ignore
          }
          window.location.replace(window.location.origin + nextPath);
        })
        .catch(() => {
          window.location.replace("/login?auth=failed&reason=Could%20not%20finish%20login");
        });
      return;
    }

    window.location.replace("/login?auth=failed");
  }, []);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--bg)]">
      <SlateMark size={42} />
      <p className="text-sm text-[var(--muted)]">Signing you into Slate…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-sm text-[var(--muted)]">
          Loading…
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  );
}
