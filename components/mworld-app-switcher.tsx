"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MWorldAppIcon, type MWorldAppKey } from "./mworld-app-icon";
import { MWorldCommandBar } from "./mworld-command-bar";

const APPS: {
  key: MWorldAppKey;
  name: string;
  desc: string;
  prodUrl: string;
  localPort: number;
}[] = [
  { key: "chat", name: "MChat", desc: "Team chat", prodUrl: "https://mworld-whatsapp.laflabs-tech.workers.dev/chat", localPort: 3300 },
  { key: "calendar", name: "Calendar", desc: "Schedule", prodUrl: "https://mworld-calendar.laflabs-tech.workers.dev", localPort: 3100 },
  { key: "room", name: "Room", desc: "Meetings", prodUrl: "https://mworld-room.laflabs-tech.workers.dev", localPort: 3400 },
  { key: "paper", name: "Paper", desc: "Docs & wiki", prodUrl: "https://mworld-notion.laflabs-tech.workers.dev", localPort: 3200 },
  { key: "board", name: "Board", desc: "Whiteboard", prodUrl: "https://mworld-board.laflabs-tech.workers.dev", localPort: 3120 },
  { key: "slate", name: "Slate", desc: "Studio", prodUrl: "https://slate.laflabs-tech.workers.dev", localPort: 3500 },
  { key: "anyfile", name: "AnyFile", desc: "File tools", prodUrl: "https://anyfile.laflabs-tech.workers.dev", localPort: 3000 },
  { key: "clipnote", name: "Clipnote", desc: "Screen video", prodUrl: "https://clipnote.laflabs-tech.workers.dev", localPort: 8787 },
  { key: "sharexe", name: "shareXe", desc: "Quick share", prodUrl: "https://mworld-sharexe.laflabs-tech.workers.dev", localPort: 3600 },
];

const POPOVER_W = 344;
const POPOVER_H = 368;

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
  currentApp: MWorldAppKey;
  compact?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number }>({
    top: 56,
    left: 12,
    width: POPOVER_W,
  });
  const wrapRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const detectDark = useCallback(() => {
    const anchor = wrapRef.current;
    return (
      currentApp === "calendar" ||
      Boolean(
        anchor?.closest('[data-theme="dark"], .dark') ||
          document.documentElement.classList.contains("dark") ||
          document.documentElement.dataset.theme === "dark",
      )
    );
  }, [currentApp]);

  const syncPosition = useCallback(() => {
    const anchor = wrapRef.current;
    if (!anchor || typeof window === "undefined") return;
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(POPOVER_W, window.innerWidth - 24);
    const preferredLeft = align === "right" ? rect.right - width : rect.left;
    const left = Math.max(12, Math.min(preferredLeft, window.innerWidth - width - 12));
    const top =
      rect.bottom + 8 + POPOVER_H > window.innerHeight - 12
        ? Math.max(12, rect.top - POPOVER_H - 8)
        : rect.bottom + 8;
    setCoords({ top, left, width });
    setIsDark(detectDark());
  }, [align, detectDark]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsDark(detectDark());
        setCmdOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detectDark]);

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
            style={{ position: "fixed", top: coords.top, left: coords.left, width: coords.width, zIndex: 9998 }}
          >
            <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3 shadow-2xl">
              <div className="flex items-center justify-between px-1.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <span>MWorld Suite</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {APPS.map((app) => {
                  const active = app.key === currentApp;
                  return (
                    <a
                      key={app.key}
                      href={appHref(app)}
                      target={active ? undefined : "_blank"}
                      rel={active ? undefined : "noopener noreferrer"}
                      onClick={() => setOpen(false)}
                      className={`group relative flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 text-center transition-colors ${
                        active
                          ? "bg-zinc-100/95 dark:bg-white/[0.08]"
                          : "hover:bg-zinc-100/70 dark:hover:bg-white/[0.05]"
                      }`}
                    >
                      {active && (
                        <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                      <MWorldAppIcon app={app.key} size={38} className="shadow-xs" />
                      <div className="min-w-0 w-full">
                        <div className="truncate text-[12.5px] font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
                          {app.name}
                        </div>
                        <div className="mt-0.5 truncate text-[10.5px] leading-tight text-zinc-500 dark:text-zinc-400">
                          {app.desc}
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>

              <div className="mt-2.5 border-t border-zinc-200/80 dark:border-zinc-800 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    setIsDark(detectDark());
                    setCmdOpen(true);
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    <svg className="h-3.5 w-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    Search across MWorld
                  </span>
                  <kbd className="rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-sans text-zinc-500 dark:text-zinc-400">
                    ⌘K
                  </kbd>
                </button>
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
            onClick={() => {
              setIsDark(detectDark());
              setCmdOpen(true);
            }}
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
      <MWorldCommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} isDark={isDark} />
    </>
  );
}
