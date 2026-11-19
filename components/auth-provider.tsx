"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AuthUserInfo } from "@/lib/types";
import { SlateMark } from "@/components/slate-logo";

type ThemeMode = "light" | "dark";

interface AuthContextValue {
  user: AuthUserInfo | null;
  loading: boolean;
  theme: ThemeMode;
  toggleTheme: () => void;
  login: (fresh?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("slate_theme") as ThemeMode | null;
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        document.documentElement.dataset.theme = saved;
      } else {
        document.documentElement.dataset.theme = "light";
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("slate_theme", next);
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const agentic = params.get("mAuthAgenticToken");
      const headers: HeadersInit = {};
      if (agentic) {
        headers["mAuthAgenticToken"] = agentic;
        try {
          sessionStorage.setItem("slate_agentic_token", agentic);
        } catch {
          // ignore
        }
      } else {
        try {
          const cachedAgentic = sessionStorage.getItem("slate_agentic_token");
          if (cachedAgentic) headers["mAuthAgenticToken"] = cachedAgentic;
        } catch {
          // ignore
        }
      }
      const res = await fetch("/api/auth/me", { credentials: "include", headers });
      if (!res.ok) {
        setUser(null);
      } else {
        const data = (await res.json()) as AuthUserInfo;
        setUser(data);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.pathname === "/auth") {
      setLoading(false);
      return;
    }
    void refresh();
  }, [refresh]);

  const login = useCallback(async (fresh = false) => {
    try {
      const returnTo = window.location.pathname + window.location.search;
      if (returnTo && returnTo !== "/" && !returnTo.startsWith("/auth")) {
        sessionStorage.setItem("slate_return_to", returnTo);
      }
      localStorage.setItem("mworld_origin", window.location.origin);
    } catch {
      // ignore
    }
    const res = await fetch(`/api/auth/link${fresh ? "?fresh=1" : ""}`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as { link?: string; error?: string } | null;
    if (!res.ok || !data?.link) {
      throw new Error(data?.error ?? "Could not start mWorld login");
    }
    window.location.href = data.link;
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    try {
      localStorage.removeItem("user_auth_token");
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("slate_agentic_token");
    } catch {
      // ignore
    }
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, theme, toggleTheme, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function SignInGate({ errorReason }: { errorReason?: string | null }) {
  const { login } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(errorReason ?? null);

  const handleLogin = async () => {
    setBusy(true);
    setErr(null);
    try {
      await login(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not connect to mWorld");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--bg)] px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-xl">
        <div className="flex items-center gap-3">
          <SlateMark size={40} />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--fg)]">Slate</h1>
            <p className="text-xs text-[var(--muted)]">Visual Design Studio for MWorld</p>
          </div>
        </div>

        <p className="mt-6 text-sm leading-relaxed text-[var(--muted)]">
          Design pitch decks, social posts, posters, logos, and edited photos in one studio. Sign in
          with your mWorld account to access your personal or team workspace.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2.5 text-xs text-[var(--muted)]">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="font-semibold text-[var(--fg)]">Decks & PPTX</div>
            <div className="mt-0.5">Import, present & export</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="font-semibold text-[var(--fg)]">Logo Generator</div>
            <div className="mt-0.5">Vector logos & packs</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="font-semibold text-[var(--fg)]">Photo Editor</div>
            <div className="mt-0.5">Filters, crop & cutouts</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
            <div className="font-semibold text-[var(--fg)]">Brand Kit</div>
            <div className="mt-0.5">1-click team styling</div>
          </div>
        </div>

        {err && (
          <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-500">
            {err}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={busy}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-[var(--accent-fg)] transition hover:opacity-90 disabled:opacity-60 cursor-pointer"
        >
          {busy ? "Redirecting to mWorld…" : "Log in with mWorld"}
        </button>

        <p className="mt-4 text-center text-[11px] text-[var(--muted)]">
          Secured by mAuth • Personal & Business workspaces
        </p>
      </div>
    </div>
  );
}
