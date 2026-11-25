"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MWorldCommandBar } from "./mworld-command-bar";

type AppKey = "chat" | "calendar" | "room" | "paper" | "board" | "slate";

const APPS: {
  key: AppKey;
  name: string;
  desc: string;
  prodUrl: string;
  localPort: number;
  badge: string;
  color: string;
}[] = [
  { key: "chat", name: "mWorld Chat", desc: "Messages & calls", prodUrl: "https://chat.mworld.tech/chat", localPort: 3300, badge: "C", color: "#0d9488" },
  { key: "calendar", name: "Calendar", desc: "Events & booking", prodUrl: "https://cal.mworld.tech", localPort: 3100, badge: "Cal", color: "#2563eb" },
  { key: "room", name: "Room", desc: "Video meetings", prodUrl: "https://room.mworld.tech", localPort: 3400, badge: "R", color: "#059669" },
  { key: "paper", name: "Paper", desc: "Docs & databases", prodUrl: "https://paper.mworld.tech", localPort: 3200, badge: "P", color: "#27272a" },
  { key: "board", name: "Board", desc: "Whiteboards", prodUrl: "https://board.mworld.tech", localPort: 3120, badge: "B", color: "#7c3aed" },
  { key: "slate", name: "Slate", desc: "Visual studio", prodUrl: "https://slate.mworld.tech", localPort: 3500, badge: "S", color: "#db2777" },
];

const POPOVER_W = 288;
const POPOVER_H = 260;

function appHref(app: (typeof APPS)[number]): string {
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      return `http://${h}:${app.localPort}${app.key === "chat" ? "/chat" : ""}`;
    }
  }
  return app.prodUrl;
}

export function MWorldAppSwitcher({
  currentApp,
  compact = false,
  align = "left",
}: {
  currentApp: AppKey;
  compact?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 56, left: 12 });
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const syncPosition = useCallback(() => {
    const anchor = wrapRef.current;
    if (!anchor || typeof window === "undefined") return;
    const rect = anchor.getBoundingClientRect();
    const preferredLeft = align === "right" ? rect.right - POPOVER_W : rect.left;
    const left = Math.max(12, Math.min(preferredLeft, window.innerWidth - POPOVER_W - 12));
    const top =
      rect.bottom + 8 + POPOVER_H > window.innerHeight - 12
        ? Math.max(12, rect.top - POPOVER_H - 8)
        : rect.bottom + 8;
    setCoords({ top, left });
    const dark =
      currentApp === "calendar" ||
      Boolean(
        anchor.closest('[data-theme="dark"], .dark') ||
          document.documentElement.classList.contains("dark") ||
          document.documentElement.dataset.theme === "dark",
      );
    setIsDark(dark);
  }, [align, currentApp]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    syncPosition();
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        (wrapRef.current && wrapRef.current.contains(target)) ||
        (popoverRef.current && popoverRef.current.contains(target))
      ) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
    };
  }, [open, syncPosition]);

  const shapeClass = currentApp === "room" ? "h-9 rounded-full px-3" : "h-8 rounded-lg px-2.5";

  const popover =
    open && mounted
      ? createPortal(
          <div
            ref={popoverRef}
            data-theme={isDark ? "dark" : "light"}
            className={isDark ? "dark" : ""}
            style={{ position: "fixed", top: coords.top, left: coords.left, width: POPOVER_W, zIndex: 9998 }}
          >
            <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 p-2.5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <span>MWorld Suite</span>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setCmdOpen(true);
                  }}
                  className="text-[11px] font-medium normal-case text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Search (⌘K)
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                {APPS.map((app) => {
                  const active = app.key === currentApp;
                  return (
                    <a
                      key={app.key}
                      href={appHref(app)}
                      target={active ? undefined : "_blank"}
                      rel={active ? undefined : "noopener noreferrer"}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl p-2 text-left transition-colors ${
                        active
                          ? "bg-zinc-100 dark:bg-zinc-800 ring-1 ring-zinc-300 dark:ring-zinc-700"
                          : "hover:bg-zinc-100/70 dark:hover:bg-zinc-800/70"
                      }`}
                    >
                      <span
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                        style={{ backgroundColor: app.color }}
                      >
                        {app.badge}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {app.name}
                        </div>
                        <div className="truncate text-[10px] text-zinc-500 dark:text-zinc-400">
                          {app.desc}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={wrapRef} className="relative inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            if (!open) syncPosition();
            setOpen((v) => !v);
          }}
          title="Switch MWorld App"
          aria-label="MWorld App Switcher"
          className={`inline-flex ${shapeClass} items-center gap-1.5 border border-zinc-200/90 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/80 text-xs font-medium text-zinc-700 dark:text-zinc-200 shadow-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer`}
        >
          <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="3" cy="3" r="1.35" />
            <circle cx="8" cy="3" r="1.35" />
            <circle cx="13" cy="3" r="1.35" />
            <circle cx="3" cy="8" r="1.35" />
            <circle cx="8" cy="8" r="1.35" />
            <circle cx="13" cy="8" r="1.35" />
            <circle cx="3" cy="13" r="1.35" />
            <circle cx="8" cy="13" r="1.35" />
            <circle cx="13" cy="13" r="1.35" />
          </svg>
          {!compact && <span>Apps</span>}
        </button>

        {!compact && (
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            title="Search all MWorld apps (⌘K)"
            className={`inline-flex ${shapeClass} items-center gap-1.5 border border-zinc-200/90 dark:border-zinc-700/80 bg-white/90 dark:bg-zinc-900/80 text-xs text-zinc-500 dark:text-zinc-400 shadow-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer`}
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <kbd className="text-[10px] font-sans opacity-80">⌘K</kbd>
          </button>
        )}
      </div>

      {popover}
      <MWorldCommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
