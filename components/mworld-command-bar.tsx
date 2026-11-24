"use client";

import { useEffect, useRef, useState } from "react";

type AppKey = "chat" | "calendar" | "room" | "paper" | "board" | "slate";

type SearchHit = {
  app: AppKey;
  appName: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
};

const APP_BADGE: Record<AppKey, { label: string; bg: string }> = {
  chat: { label: "Chat", bg: "#0d9488" },
  calendar: { label: "Calendar", bg: "#2563eb" },
  room: { label: "Room", bg: "#059669" },
  paper: { label: "Paper", bg: "#18181b" },
  board: { label: "Board", bg: "#7c3aed" },
  slate: { label: "Slate", bg: "#db2777" },
};

export function MWorldCommandBar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    const timer = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const clean = query.trim();
    if (!clean) {
      setResults([]);
      setLoading(false);
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
          if (!cancelled) setResults(data.results ?? []);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/50 backdrop-blur-xs pt-20 px-4"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
          <svg className="h-4 w-4 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && results[0]?.url) {
                window.open(results[0].url, "_blank", "noopener,noreferrer");
                onClose();
              }
            }}
            placeholder="Search across Chat, Calendar, Room, Paper, Board, and Slate…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
          />
          <kbd className="rounded border border-zinc-300 dark:border-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-500">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="px-3 py-6 text-center text-xs text-zinc-500">
              Type to search across your entire MWorld workspace.
            </div>
          ) : loading ? (
            <div className="px-3 py-6 text-center text-xs text-zinc-500">
              Searching all MWorld apps…
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-zinc-500">
              No matching items found for “{query}”.
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((hit) => {
                const badge = APP_BADGE[hit.app] ?? { label: hit.appName, bg: "#3f3f46" };
                return (
                  <a
                    key={`${hit.app}-${hit.id}`}
                    href={hit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold text-white"
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
                    <span className="shrink-0 text-[11px] text-zinc-400">Open ↗</span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
