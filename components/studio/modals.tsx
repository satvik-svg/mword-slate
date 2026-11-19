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
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[var(--fg)]">Share Design</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Invite people */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-[var(--fg)]">Invite people by email</label>
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPerson()}
              placeholder="teammate@mworld.cloud"
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--accent)]"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2 text-xs text-[var(--fg)]"
            >
              <option value="view">Can view</option>
              <option value="comment">Can comment</option>
              <option value="edit">Can edit</option>
              <option value="full">Full access</option>
            </select>
            <button
              onClick={addPerson}
              className="rounded-xl bg-[var(--accent)] px-3 text-xs font-semibold text-[var(--accent-fg)] cursor-pointer"
            >
              Add
            </button>
          </div>

          {shareConfig.people.length > 0 && (
            <div className="mt-3 max-h-32 space-y-1.5 overflow-y-auto">
              {shareConfig.people.map((p) => (
                <div
                  key={p.email}
                  className="flex items-center justify-between rounded-lg bg-[var(--surface-2)] px-3 py-1.5 text-xs"
                >
                  <span className="truncate text-[var(--fg)]">{p.email}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] capitalize text-[var(--muted)]">{p.access}</span>
                    <button
                      onClick={() =>
                        onChangeShare({
                          ...shareConfig,
                          people: shareConfig.people.filter((x) => x.email !== p.email),
                        })
                      }
                      className="text-[var(--muted)] hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Link access */}
        <div className="mt-5 border-t border-[var(--border)] pt-4">
          <label className="text-xs font-semibold text-[var(--fg)]">Collaboration Link</label>
          <select
            value={shareConfig.linkAccess}
            onChange={(e) =>
              onChangeShare({ ...shareConfig, linkAccess: e.target.value as AccessLevel })
            }
            className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--fg)] outline-none"
          >
            <option value="off">Private — Only workspace & invited people</option>
            <option value="view">Anyone with link can view</option>
            <option value="comment">Anyone with link can comment</option>
            <option value="edit">Anyone with link can edit</option>
            <option value="template">Anyone with link can use as template</option>
          </select>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
            <span className="flex-1 truncate text-xs text-[var(--muted)]">{shareUrl}</span>
            <button
              onClick={copyLink}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-fg)] cursor-pointer"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MagicResizeModal({
  open,
  onClose,
  currentWidth,
  currentHeight,
  onResize,
}: {
  open: boolean;
  onClose: () => void;
  currentWidth: number;
  currentHeight: number;
  onResize: (width: number, height: number, asCopy: boolean) => Promise<void> | void;
}) {
  const [w, setW] = useState(currentWidth);
  const [h, setH] = useState(currentHeight);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setW(currentWidth);
      setH(currentHeight);
    }
  }, [open, currentWidth, currentHeight]);

  useEscapeClose(open, onClose);

  if (!open) return null;

  const submit = async (asCopy: boolean) => {
    setBusy(true);
    try {
      await onResize(Math.max(100, w), Math.max(100, h), asCopy);
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
        className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[var(--fg)]">Magic Resize</h3>
            <p className="text-xs text-[var(--muted)]">
              Automatically reflows your layout & typography to any format.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-[11px] font-semibold text-[var(--muted)]">Width (px)</label>
            <input
              type="number"
              value={w}
              onChange={(e) => setW(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--fg)]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[var(--muted)]">Height (px)</label>
            <input
              type="number"
              value={h}
              onChange={(e) => setH(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--fg)]"
            />
          </div>
        </div>

        <div className="mt-4 max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {FORMAT_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setW(p.width);
                setH(p.height);
              }}
              className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition cursor-pointer ${
                w === p.width && h === p.height
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--fg)] font-semibold"
                  : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)] hover:border-[var(--accent)]/50"
              }`}
            >
              <span>{p.label}</span>
              <span className="text-[var(--muted)]">{p.sublabel}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => submit(false)}
            disabled={busy}
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--surface-3)] cursor-pointer"
          >
            Resize This Design
          </button>
          <button
            onClick={() => submit(true)}
            disabled={busy}
            className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-95 cursor-pointer"
          >
            Copy & Resize
          </button>
        </div>
      </div>
    </div>
  );
}

export function VersionHistoryModal({
  open,
  onClose,
  versions,
  onSaveVersion,
  onRestoreVersion,
}: {
  open: boolean;
  onClose: () => void;
  versions: DesignVersion[];
  onSaveVersion: (label: string) => void;
  onRestoreVersion: (v: DesignVersion) => void;
}) {
  const [label, setLabel] = useState("");
  useEscapeClose(open, onClose);
  if (!open) return null;

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
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[var(--accent)]" />
            <h3 className="text-base font-bold text-[var(--fg)]">Version History</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            title="Close (Esc)"
            className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Checkpoint name (e.g. Client v2)"
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--fg)] outline-none"
