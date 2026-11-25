"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type AppKey = "chat" | "calendar" | "room" | "paper" | "board" | "slate";

type SearchHit = {
  app: AppKey;
  appName: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
};

const APP_BADGE: Record<AppKey, { label: string; short: string; bg: string }> = {
  chat: { label: "Chat", short: "C", bg: "#0d9488" },
  calendar: { label: "Calendar", short: "Cal", bg: "#2563eb" },
  room: { label: "Room", short: "R", bg: "#059669" },
  paper: { label: "Paper", short: "P", bg: "#27272a" },
  board: { label: "Board", short: "B", bg: "#7c3aed" },
  slate: { label: "Slate", short: "S", bg: "#db2777" },
};

const QUICK_APPS: { key: AppKey; name: string; prodUrl: string; localPort: number }[] = [
  { key: "chat", name: "Chat", prodUrl: "https://chat.mworld.tech/chat", localPort: 3300 },
  { key: "calendar", name: "Calendar", prodUrl: "https://cal.mworld.tech", localPort: 3100 },
  { key: "room", name: "Room", prodUrl: "https://room.mworld.tech", localPort: 3400 },
  { key: "paper", name: "Paper", prodUrl: "https://paper.mworld.tech", localPort: 3200 },
  { key: "board", name: "Board", prodUrl: "https://board.mworld.tech", localPort: 3120 },
  { key: "slate", name: "Slate", prodUrl: "https://slate.mworld.tech", localPort: 3500 },
];

function quickHref(app: (typeof QUICK_APPS)[number]): string {
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1") {
      return `http://${h}:${app.localPort}${app.key === "chat" ? "/chat" : ""}`;
    }
  }
  return app.prodUrl;
}

export function MWorldCommandBar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setActiveIndex(0);
    const timer = setTimeout(() => inputRef.current?.focus(), 20);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const clean = query.trim();
    if (!clean) {
      setResults([]);
      setLoading(false);
      setActiveIndex(0);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/ecosystem/search?q=${encodeURIComponent(clean)}`, { credentials: "include" })
        .then(async (res) => {
          if (!res.ok) return { results: [] };
          return (await res.json().catch(() => ({ results: [] }))) as { results?: SearchHit[] };
        })
        .then((data) => {
          if (!cancelled) {
            setResults(data.results ?? []);
            setActiveIndex(0);
          }
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  if (!open || !mounted || typeof document === "undefined") return null;

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/60 backdrop-blur-md pt-[12vh] px-4 animate-in fade-in duration-150"
      onMouseDown={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="MWorld Global Search"
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-zinc-200/80 dark:border-zinc-700/70 bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-zinc-200/80 dark:border-zinc-800 px-4 py-3.5">
          <svg className="h-4 w-4 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                return;
              }
              if (e.key === "ArrowDown" && results.length > 0) {
                e.preventDefault();
                setActiveIndex((i) => (i + 1) % results.length);
                return;
              }
              if (e.key === "ArrowUp" && results.length > 0) {
                e.preventDefault();
                setActiveIndex((i) => (i - 1 + results.length) % results.length);
                return;
              }
              if (e.key === "Enter" && results[activeIndex]?.url) {
                e.preventDefault();
                window.open(results[activeIndex].url, "_blank", "noopener,noreferrer");
                onClose();
              }
            }}
            placeholder="Search Chat, Calendar, Room, Paper, Board, and Slate…"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-md px-1.5 py-0.5 text-[11px] text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Clear
            </button>
          ) : null}
          <kbd className="rounded-md border border-zinc-300/80 dark:border-zinc-700 bg-zinc-100/80 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
            ESC
          </kbd>
        </div>

        <div className="max-h-[54vh] overflow-y-auto p-2.5">
          {!query.trim() ? (
            <div className="p-2 space-y-3">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Jump to app
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {QUICK_APPS.map((app) => {
                  const badge = APP_BADGE[app.key];
                  return (
                    <a
                      key={app.key}
                      href={quickHref(app)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className="flex items-center gap-2.5 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 px-3 py-2.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <span
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold text-white"
                        style={{ backgroundColor: badge.bg }}
                      >
                        {badge.short}
                      </span>
                      <span className="text-xs font-semibold">{app.name}</span>
                    </a>
                  );
                })}
              </div>
              <div className="pt-1 text-center text-[11px] text-zinc-400">
                Start typing to search across all 6 apps · ↑↓ to navigate · ↵ to open
              </div>
            </div>
          ) : loading ? (
            <div className="px-3 py-8 text-center text-xs text-zinc-500">
              Searching across MWorld…
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-zinc-500">
              No matching items found for “{query}”.
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((hit, idx) => {
                const badge = APP_BADGE[hit.app] ?? { label: hit.appName, short: "M", bg: "#3f3f46" };
                const active = idx === activeIndex;
                return (
                  <a
                    key={`${hit.app}-${hit.id}`}
                    href={hit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={onClose}
                    className={`flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      active
                        ? "bg-zinc-100 dark:bg-zinc-800"
                        : "hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="inline-flex h-7 min-w-[3.25rem] shrink-0 items-center justify-center rounded-lg px-2 text-[11px] font-semibold text-white"
                        style={{ backgroundColor: badge.bg }}
                      >
                        {badge.label}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{hit.title}</div>
                        {hit.subtitle ? (
                          <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">{hit.subtitle}</div>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] font-medium text-zinc-400">
                      {active ? "↵ Open" : "↗"}
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
