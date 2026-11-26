"use client";

import { use, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Lock } from "lucide-react";
import { PagePreview } from "@/components/page-preview";
import { syncCustomFonts } from "@/lib/custom-fonts";
import type { CustomFontItem, DesignRecord } from "@/lib/types";

export default function SlateEmbedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [design, setDesign] = useState<DesignRecord | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ w: 680, h: 380 });

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const et = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("et") ?? "" : "";
        const apiUrl = et
          ? `/api/share/${encodeURIComponent(id)}?et=${encodeURIComponent(et)}`
          : `/api/share/${encodeURIComponent(id)}`;
        const res = await fetch(apiUrl, { credentials: "include" });
        const data = (await res.json().catch(() => ({}))) as {
          design?: DesignRecord;
          customFonts?: CustomFontItem[];
          error?: string;
        };
        if (!active) return;
        if (res.ok && data.design) {
          if (data.customFonts?.length) {
            void syncCustomFonts(data.customFonts);
          }
          setDesign(data.design);
        } else if (res.status === 403) {
          setIsPrivate(true);
          setError("This Slate design is private. Enable link sharing in Slate to embed it for others.");
        } else {
          setError(data.error || "Sign in or enable link sharing in Slate to view this design.");
        }
      } catch {
        if (active) setError("Could not load design.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setStageSize({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [design]);

  const totalPages = design?.pages?.length ?? 0;

  useEffect(() => {
    if (totalPages <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setPageIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "ArrowRight") {
        setPageIndex((i) => Math.min(totalPages - 1, i + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [totalPages]);

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-zinc-950 text-xs text-zinc-400">
        Loading Slate presentation…
      </div>
    );
  }

  if (!design || error) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-zinc-950 p-6 text-center text-xs text-zinc-300">
        {isPrivate ? <Lock className="h-5 w-5 text-zinc-400" /> : null}
        <p className="max-w-sm leading-relaxed">{error || "Design not available"}</p>
        <a
          href={`/share/${encodeURIComponent(id)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-pink-600 px-3 py-1.5 font-medium text-white hover:bg-pink-500 transition-colors"
        >
          Open shared link in Slate
        </a>
      </div>
    );
  }

  const pages = design.pages?.length ? design.pages : [];
  const safeIndex = Math.min(pageIndex, Math.max(0, pages.length - 1));
  const current = pages[safeIndex];

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-zinc-800/90 bg-zinc-900/70 px-3 text-xs">
        <div className="flex min-w-0 items-center gap-2">
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-pink-600 text-[10px] font-bold text-white">
            S
          </span>
          <span className="truncate font-medium">{design.title}</span>
          <span className="hidden rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline">
            Read-only
          </span>
          {pages.length > 1 && (
            <span className="shrink-0 tabular-nums text-zinc-400">
              {safeIndex + 1} / {pages.length}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {pages.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                disabled={safeIndex === 0}
                className="cursor-pointer rounded p-1 hover:bg-zinc-800 disabled:opacity-30"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                disabled={safeIndex >= pages.length - 1}
                className="cursor-pointer rounded p-1 hover:bg-zinc-800 disabled:opacity-30"
                aria-label="Next slide"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <a
            href={`/share/${encodeURIComponent(id)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-[11px] font-medium hover:bg-zinc-700 transition-colors"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div ref={stageRef} className="flex flex-1 min-h-0 items-center justify-center overflow-hidden p-3 sm:p-4">
        {current ? (
          <PagePreview
            page={current}
            width={design.width}
            height={design.height}
            maxWidth={Math.max(200, stageSize.w - 32)}
            maxHeight={Math.max(140, stageSize.h - 24)}
            className="rounded-lg shadow-2xl ring-1 ring-white/10"
          />
        ) : null}
      </div>
    </div>
  );
}
