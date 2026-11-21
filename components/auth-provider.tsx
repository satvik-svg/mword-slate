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
      if (
        returnTo &&
        returnTo !== "/" &&
        !returnTo.startsWith("/auth") &&
        !returnTo.startsWith("/login")
      ) {
        sessionStorage.setItem("slate_return_to", returnTo);
      }
      localStorage.setItem("mworld_origin", window.location.origin);
    } catch {
      // ignore
    }
    const res = await fetch(`/api/auth/link${fresh ? "?fresh=1" : ""}`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as { link?: string; error?: string } | null;
    if (!res.ok || !data?.link) {
      throw new Error(data?.error ?? "Could not start sign-in");
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
