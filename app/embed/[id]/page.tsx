"use client";

import { use, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { PagePreview } from "@/components/page-preview";
import type { DesignRecord } from "@/lib/types";

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

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let res = await fetch(`/api/designs/${encodeURIComponent(id)}`, { credentials: "include" });
        if (!res.ok) {
          res = await fetch(`/api/share/${encodeURIComponent(id)}`, { credentials: "include" });
        }
        const data = (await res.json().catch(() => ({}))) as { design?: DesignRecord; error?: string };
        if (!active) return;
        if (res.ok && data.design) {
          setDesign(data.design);
        } else {
          setError(data.error || "Sign in to view this Slate design.");
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-xs text-zinc-400">
        Loading Slate design…
      </div>
    );
  }

  if (!design || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 p-4 text-center text-xs text-zinc-300">
        <p>{error || "Design not available"}</p>
        <a
          href={`/design/${encodeURIComponent(id)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-pink-600 px-3 py-1.5 font-medium text-white"
        >
          Open in Slate
        </a>
      </div>
    );
  }

  const pages = design.pages?.length ? design.pages : [];
  const current = pages[Math.min(pageIndex, Math.max(0, pages.length - 1))];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-pink-600 text-[10px] font-bold text-white">
            S
          </span>
          <span className="truncate font-medium">{design.title}</span>
          {pages.length > 1 && (
            <span className="text-zinc-400">
              {pageIndex + 1}/{pages.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {pages.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                disabled={pageIndex === 0}
                className="rounded p-1 hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPageIndex((i) => Math.min(pages.length - 1, i + 1))}
                disabled={pageIndex >= pages.length - 1}
                className="rounded p-1 hover:bg-zinc-800 disabled:opacity-30 cursor-pointer"
                aria-label="Next slide"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <a
            href={`/design/${encodeURIComponent(id)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md bg-zinc-800 px-2 py-1 text-[11px] font-medium hover:bg-zinc-700"
          >
            Open <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 overflow-hidden">
        {current ? (
          <PagePreview
            page={current}
            width={design.width}
            height={design.height}
            maxWidth={760}
            maxHeight={460}
            className="rounded-lg shadow-2xl ring-1 ring-white/10"
          />
        ) : null}
      </div>
    </div>
  );
}
