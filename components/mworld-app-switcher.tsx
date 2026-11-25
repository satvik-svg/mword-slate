"use client";

import { useEffect, useRef, useState } from "react";
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
}: {
  currentApp: AppKey;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <>
      <div ref={wrapRef} className="relative inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          title="Switch MWorld App"
          aria-label="MWorld App Switcher"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-900/80 px-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200/80 dark:border-zinc-700/80 bg-white/80 dark:bg-zinc-900/80 px-2.5 text-xs text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <kbd className="text-[10px] font-sans opacity-80">⌘K</kbd>
          </button>
        )}

        {open && (
          <div className="absolute left-0 top-full mt-2 z-[999] w-72 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 p-2.5 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
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
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
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
        )}
      </div>

      <MWorldCommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
