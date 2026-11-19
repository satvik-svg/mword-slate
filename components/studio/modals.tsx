"use client";

import { useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileText,
  History,
  Image as ImageIcon,
  Link2,
  Maximize2,
  MessageSquare,
  Plus,
  Presentation,
  RotateCcw,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { PagePreview } from "@/components/page-preview";
import {
  exportDesignAsPdf,
  exportDesignAsPptx,
  exportPageAsImage,
  exportPageAsSvg,
} from "@/lib/exporter";
import { FORMAT_PRESETS } from "@/lib/presets";
import type {
  AccessLevel,
  DesignComment,
  DesignPage,
  DesignVersion,
  ShareConfig,
} from "@/lib/types";

function useEscapeClose(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
}

export function ExportModal({
  open,
  onClose,
  title,
  pages,
  activePageIndex,
  width,
  height,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  pages: DesignPage[];
  activePageIndex: number;
  width: number;
  height: number;
}) {
  const [format, setFormat] = useState<"png" | "jpeg" | "svg" | "pdf" | "pptx">("png");
  const [scale, setScale] = useState(2);
  const [transparentBg, setTransparentBg] = useState(false);
  const [quality, setQuality] = useState(0.92);
  const [busy, setBusy] = useState(false);

  useEscapeClose(open, onClose);

  if (!open) return null;

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "slate-design";
  const page = pages[activePageIndex] ?? pages[0];

  const handleDownload = async () => {
    setBusy(true);
    try {
      if (format === "png" || format === "jpeg") {
        await exportPageAsImage(page, width, height, format, slug, {
          scale,
          transparentBg,
          quality,
        });
      } else if (format === "svg") {
        exportPageAsSvg(page, width, height, slug, transparentBg);
      } else if (format === "pdf") {
        await exportDesignAsPdf(pages, width, height, slug);
      } else if (format === "pptx") {
        await exportDesignAsPptx(pages, width, height, slug);
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--fg)]">Download / Export</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-1.5">
          {(
            [
              { id: "png", label: "PNG" },
              { id: "jpeg", label: "JPG" },
              { id: "svg", label: "SVG" },
              { id: "pdf", label: "PDF" },
              { id: "pptx", label: "PPTX" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`rounded-xl border py-2.5 text-xs font-bold transition cursor-pointer ${
                format === f.id
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--muted)] hover:text-[var(--fg)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3 text-xs text-[var(--muted)]">
          {(format === "png" || format === "jpeg") && (
            <div>
              <div className="flex justify-between font-medium text-[var(--fg)]">
                <span>Resolution Scale</span>
                <span>
                  {scale}× ({Math.round(width * scale)} × {Math.round(height * scale)} px)
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    onClick={() => setScale(s)}
                    className={`rounded-lg border py-1.5 font-semibold cursor-pointer ${
                      scale === s
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                        : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          )}

          {(format === "png" || format === "svg") && (
            <label className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5 cursor-pointer">
              <span className="font-medium text-[var(--fg)]">Transparent background</span>
              <input
                type="checkbox"
                checked={transparentBg}
                onChange={(e) => setTransparentBg(e.target.checked)}
                className="accent-[var(--accent)]"
              />
            </label>
          )}

          {format === "jpeg" && (
            <div>
              <div className="flex justify-between font-medium text-[var(--fg)]">
                <span>JPG Quality</span>
                <span>{Math.round(quality * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={1}
                step={0.02}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="mt-1 w-full accent-[var(--accent)]"
              />
            </div>
          )}

          {format === "pdf" && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] p-3 text-[var(--fg)]">
              <FileText className="h-4 w-4 text-[var(--accent)]" />
              Exports all {pages.length} page{pages.length > 1 ? "s" : ""} as a crisp multi-page PDF.
            </div>
          )}

          {format === "pptx" && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] p-3 text-[var(--fg)]">
              <Presentation className="h-4 w-4 text-[var(--accent)]" />
              Exports all {pages.length} slide{pages.length > 1 ? "s" : ""} as an editable PowerPoint (.pptx) file.
            </div>
          )}

          {(format === "png" || format === "jpeg" || format === "svg") && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] p-3">
              <ImageIcon className="h-4 w-4 text-[var(--accent)]" />
              Exports current page ({page?.name || `Page ${activePageIndex + 1}`}).
            </div>
          )}
        </div>

        <button
          onClick={handleDownload}
          disabled={busy}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-95 disabled:opacity-60 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          {busy ? "Rendering…" : `Download ${format.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
}

export function ShareModal({
  open,
  onClose,
  designId,
  shareConfig,
  onChangeShare,
}: {
  open: boolean;
  onClose: () => void;
  designId: string;
  shareConfig: ShareConfig;
  onChangeShare: (next: ShareConfig) => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"view" | "comment" | "edit" | "full">("edit");
  const [copied, setCopied] = useState(false);

  useEscapeClose(open, onClose);

  if (!open) return null;

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/share/${designId}` : `/share/${designId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const addPerson = () => {
    const clean = email.trim().toLowerCase();
    if (!clean || !clean.includes("@")) return;
    const filtered = shareConfig.people.filter((p) => p.email.toLowerCase() !== clean);
    onChangeShare({ ...shareConfig, people: [...filtered, { email: clean, access: role }] });
    setEmail("");
  };

  return (
    <div
