"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Eraser,
  FileArchive,
  FileText,
  History,
  Image as ImageIcon,
  LayoutGrid,
  Link2,
  Maximize2,
  MessageSquare,
  Pause,
  PenTool,
  Play,
  Plus,
  Pointer,
  Presentation,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { PagePreview } from "@/components/page-preview";
import {
  exportDesignAsPdf,
  exportDesignAsPptx,
  exportPageAsImage,
  exportPageAsSvg,
  exportPagesAsZip,
  parsePageRange,
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
  const [pageScope, setPageScope] = useState<"current" | "all" | "range">("current");
  const [rangeText, setRangeText] = useState(`1-${pages.length}`);
  const [scale, setScale] = useState(2);
  const [transparentBg, setTransparentBg] = useState(false);
  const [quality, setQuality] = useState(0.92);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    if (open) {
      setRangeText(`1-${pages.length}`);
      setProgress(null);
    }
  }, [open, pages.length]);

  useEscapeClose(open, onClose);

  const selectedIndices = useMemo(() => {
    if (pages.length <= 1) return [0];
    if (pageScope === "current") {
      return [Math.max(0, Math.min(pages.length - 1, activePageIndex))];
    }
    if (pageScope === "all") {
      return pages.map((_, i) => i);
    }
    return parsePageRange(rangeText, pages.length);
  }, [pages, pageScope, activePageIndex, rangeText]);

  if (!open) return null;

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "slate-design";
  const selectedPages = selectedIndices.map((idx) => pages[idx]).filter(Boolean);
  const willZip =
    (format === "png" || format === "jpeg" || format === "svg") && selectedIndices.length > 1;

  const handleSelectFormat = (next: typeof format) => {
    setFormat(next);
    if (pages.length > 1) {
      if ((next === "pdf" || next === "pptx") && pageScope === "current") {
        setPageScope("all");
      } else if ((next === "png" || next === "jpeg" || next === "svg") && pageScope === "all") {
        setPageScope("current");
      }
    }
  };

  const handleDownload = async () => {
    if (selectedPages.length === 0) return;
    setBusy(true);
    setProgress(null);
    try {
      if (format === "png" || format === "jpeg") {
        if (selectedIndices.length > 1) {
          await exportPagesAsZip(pages, selectedIndices, width, height, format, slug, {
            scale,
            transparentBg,
            quality,
            onProgress: (current, total) => setProgress({ current, total }),
          });
        } else {
          await exportPageAsImage(selectedPages[0], width, height, format, slug, {
            scale,
            transparentBg,
            quality,
          });
        }
      } else if (format === "svg") {
        if (selectedIndices.length > 1) {
          await exportPagesAsZip(pages, selectedIndices, width, height, "svg", slug, {
            transparentBg,
            onProgress: (current, total) => setProgress({ current, total }),
          });
        } else {
          exportPageAsSvg(selectedPages[0], width, height, slug, transparentBg);
        }
      } else if (format === "pdf") {
        await exportDesignAsPdf(selectedPages, width, height, slug);
      } else if (format === "pptx") {
        await exportDesignAsPptx(selectedPages, width, height, slug);
      }
      onClose();
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  const formatLabel = format === "jpeg" ? "JPG" : format.toUpperCase();
  const downloadCta = busy
    ? progress
      ? `Rendering ${progress.current} / ${progress.total}…`
      : "Rendering…"
    : willZip
      ? `Download ${selectedPages.length} ${formatLabel}s (.zip)`
      : format === "pdf" || format === "pptx"
        ? `Download ${formatLabel} (${selectedPages.length} ${selectedPages.length === 1 ? "page" : "pages"})`
        : `Download ${formatLabel}`;

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
              onClick={() => handleSelectFormat(f.id)}
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
          {/* Page Selection (shown when multi-page design) */}
          {pages.length > 1 && (
            <div>
              <div className="flex items-center justify-between font-medium text-[var(--fg)]">
                <span>Pages</span>
                <span className="text-[11px] text-[var(--muted)]">
                  {selectedPages.length} of {pages.length} selected
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: "current", label: `Page ${activePageIndex + 1}` },
                    {
                      id: "all",
                      label:
                        format === "png" || format === "jpeg" || format === "svg"
                          ? `All (${pages.length}) .zip`
                          : `All (${pages.length})`,
                    },
                    { id: "range", label: "Custom" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPageScope(opt.id)}
                    className={`rounded-lg border py-1.5 text-[11px] font-semibold cursor-pointer ${
                      pageScope === opt.id
                        ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                        : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {pageScope === "range" && (
                <div className="mt-2">
                  <input
                    value={rangeText}
                    onChange={(e) => setRangeText(e.target.value)}
                    placeholder={`e.g. 1-3, ${pages.length}`}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                  />
                  {selectedPages.length === 0 && (
                    <p className="mt-1 text-[11px] text-rose-500">
                      Enter page numbers between 1 and {pages.length} (e.g. 1-2, 4).
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

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
              <FileText className="h-4 w-4 shrink-0 text-[var(--accent)]" />
              Exports {selectedPages.length} page{selectedPages.length !== 1 ? "s" : ""} as a crisp 2× PDF with selectable text.
            </div>
          )}

          {format === "pptx" && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] p-3 text-[var(--fg)]">
              <Presentation className="h-4 w-4 shrink-0 text-[var(--accent)]" />
              Exports {selectedPages.length} slide{selectedPages.length !== 1 ? "s" : ""} as an editable PowerPoint (.pptx) deck.
            </div>
          )}

          {(format === "png" || format === "jpeg" || format === "svg") && (
            <div className="flex items-center gap-2 rounded-xl bg-[var(--surface-2)] p-3">
              {willZip ? (
                <FileArchive className="h-4 w-4 shrink-0 text-[var(--accent)]" />
              ) : (
                <ImageIcon className="h-4 w-4 shrink-0 text-[var(--accent)]" />
              )}
              {willZip
                ? `Bundles ${selectedPages.length} pages into a single numbered .zip archive.`
                : `Exports ${selectedPages[0]?.name || `Page ${activePageIndex + 1}`}.`}
            </div>
          )}
        </div>

        <button
          onClick={handleDownload}
          disabled={busy || selectedPages.length === 0}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--accent-fg)] hover:opacity-95 disabled:opacity-50 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          {downloadCta}
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
  onChangeShare: (next: ShareConfig) => Promise<boolean> | void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"view" | "comment" | "edit" | "full">("edit");
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const pendingSaveRef = useRef<Promise<boolean> | null>(null);

  useEscapeClose(open, onClose);

  if (!open) return null;

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/share/${designId}` : `/share/${designId}`;

  const commitShareChange = (next: ShareConfig) => {
    setSaveState("saving");
    const promise = Promise.resolve(onChangeShare(next)).then((res) => {
      const ok = res !== false;
      setSaveState(ok ? "saved" : "error");
      return ok;
    });
    pendingSaveRef.current = promise;
    void promise.finally(() => {
      if (pendingSaveRef.current === promise) pendingSaveRef.current = null;
    });
  };

  const copyLink = async () => {
    if (pendingSaveRef.current) {
      await pendingSaveRef.current;
    }
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
    commitShareChange({ ...shareConfig, people: [...filtered, { email: clean, access: role }] });
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
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[var(--fg)]">Share Design</h3>
            {saveState === "saving" && (
              <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)]">
                Saving…
              </span>
            )}
            {saveState === "saved" && (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                Saved
              </span>
            )}
            {saveState === "error" && (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-600 dark:text-rose-400">
                Save failed
              </span>
            )}
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

        {/* Invite people */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-[var(--fg)]">Invite people by email</label>
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPerson()}
              placeholder="teammate@company.com"
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
                        commitShareChange({
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
              commitShareChange({ ...shareConfig, linkAccess: e.target.value as AccessLevel })
            }
            className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--fg)] outline-none"
          >
            <option value="off">Private — Only workspace & invited people</option>
            <option value="view">Anyone with link can view</option>
            <option value="comment">Anyone with link can comment</option>
            <option value="edit">Anyone with link can edit</option>
            <option value="template">Anyone with link can use as template</option>
          </select>

          <p className="mt-1.5 text-[11px] text-[var(--muted)]">
            {shareConfig.linkAccess === "off"
              ? "Currently private: only your workspace and invited emails above can open this link."
              : shareConfig.linkAccess === "edit"
                ? "Anyone who opens the link below can view and edit live without being invited."
                : shareConfig.linkAccess === "comment"
                  ? "Anyone who opens the link below can view and post comments."
                  : shareConfig.linkAccess === "template"
                    ? "Anyone who opens the link below can preview and clone as a template."
                    : "Anyone who opens the link below can view in read-only mode."}
          </p>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
            <span className="flex-1 truncate text-xs text-[var(--muted)]">{shareUrl}</span>
            <button
              onClick={() => void copyLink()}
              disabled={saveState === "saving"}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--accent-fg)] disabled:opacity-60 cursor-pointer"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {saveState === "saving" ? "Saving…" : copied ? "Copied" : "Copy"}
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
          />
          <button
            onClick={() => {
              onSaveVersion(label.trim() || `Snapshot ${versions.length + 1}`);
              setLabel("");
            }}
            className="inline-flex items-center gap-1 rounded-xl bg-[var(--accent)] px-3 py-2 text-xs font-semibold text-[var(--accent-fg)] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Save
          </button>
        </div>

        <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
          {versions.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--muted)]">
              No saved checkpoints yet. Save a version before big changes.
            </p>
          ) : (
            versions.map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5"
              >
                <div>
                  <div className="text-xs font-semibold text-[var(--fg)]">{v.label}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--muted)]">
                    <Clock className="h-3 w-3" />
                    {new Date(v.createdAt).toLocaleString()} • {v.pages.length}p
                  </div>
                </div>
                <button
                  onClick={() => {
                    onRestoreVersion(v);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--fg)] hover:border-[var(--accent)] cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" /> Restore
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

type PresenterStroke = {
  color: string;
  points: { x: number; y: number }[];
};

const PRESENTER_INK_COLORS = ["#F43F5E", "#FACC15", "#38BDF8", "#FFFFFF"];

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PresentOverlay({
  open,
  onClose,
  pages,
  initialIndex,
  width,
  height,
}: {
  open: boolean;
  onClose: () => void;
  pages: DesignPage[];
  initialIndex: number;
  width: number;
  height: number;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [direction, setDirection] = useState<"next" | "prev">("next");
  const [hasNavigated, setHasNavigated] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showStrip, setShowStrip] = useState(false);
  const [tool, setTool] = useState<"pointer" | "laser" | "draw">("pointer");
  const [inkColor, setInkColor] = useState(PRESENTER_INK_COLORS[0]);
  const [annotations, setAnnotations] = useState<Record<string, PresenterStroke[]>>({});
  const [liveDraw, setLiveDraw] = useState<PresenterStroke | null>(null);
  const [laserTrail, setLaserTrail] = useState<{ x: number; y: number; ts: number }[]>([]);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [timerPaused, setTimerPaused] = useState(false);
  const [viewport, setViewport] = useState({ w: 1280, h: 720 });
  const slideFrameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setIndex(initialIndex);
      setDirection("next");
      setHasNavigated(false);
      setTool("pointer");
      setAnnotations({});
      setLiveDraw(null);
      setLaserTrail([]);
      setElapsedSec(0);
      setTimerPaused(false);
    }
  }, [open, initialIndex]);

  // Elapsed presentation timer
  useEffect(() => {
    if (!open || timerPaused) return;
    const id = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [open, timerPaused]);

  // Fade out laser trail points over ~350ms
  useEffect(() => {
    if (!open || tool !== "laser" || laserTrail.length === 0) return;
    const id = window.setInterval(() => {
      const cutoff = Date.now() - 360;
      setLaserTrail((prev) => prev.filter((p) => p.ts >= cutoff));
    }, 40);
    return () => window.clearInterval(id);
  }, [open, tool, laserTrail.length]);

  useEffect(() => {
    if (!open) return;
    const sync = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    sync();
    window.addEventListener("resize", sync);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        setDirection("next");
        setHasNavigated(true);
        setIndex((i) => Math.min(pages.length - 1, i + 1));
      }
      if (e.key === "ArrowLeft") {
        setDirection("prev");
        setHasNavigated(true);
        setIndex((i) => Math.max(0, i - 1));
      }
      if (e.key.toLowerCase() === "l") {
        setTool((t) => (t === "laser" ? "pointer" : "laser"));
      }
      if (e.key.toLowerCase() === "d") {
        setTool((t) => (t === "draw" ? "pointer" : "draw"));
      }
      if (e.key.toLowerCase() === "g") {
        setShowStrip((s) => !s);
      }
      if (e.key.toLowerCase() === "n") {
        setShowNotes((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, pages.length, onClose]);

  if (!open) return null;
  const page = pages[index] ?? pages[0];
  const extraChromeH = (showNotes ? 96 : 0) + (showStrip ? 96 : 0);
  const maxW = viewport.w - 80;
  const maxH = Math.max(200, viewport.h - 116 - extraChromeH);

  const transition = page.transition ?? "none";
  const animClass = !hasNavigated
    ? ""
    : transition === "fade"
      ? "present-anim-fade"
      : transition === "slide"
        ? direction === "prev"
          ? "present-anim-slide-prev"
          : "present-anim-slide-next"
        : transition === "zoom"
          ? "present-anim-zoom"
          : "";

  const jumpTo = (target: number) => {
    if (target === index || target < 0 || target >= pages.length) return;
    setDirection(target > index ? "next" : "prev");
    setHasNavigated(true);
    setIndex(target);
  };
  const goPrev = () => jumpTo(Math.max(0, index - 1));
  const goNext = () => jumpTo(Math.min(pages.length - 1, index + 1));

  const toSlidePoint = (clientX: number, clientY: number) => {
    const rect = slideFrameRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((clientX - rect.left) / rect.width) * width,
      y: ((clientY - rect.top) / rect.height) * height,
    };
  };

  const handleSlidePointerDown = (e: React.PointerEvent) => {
    if (tool !== "draw") return;
    const pt = toSlidePoint(e.clientX, e.clientY);
    if (!pt) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setLiveDraw({ color: inkColor, points: [pt] });
  };

  const handleSlidePointerMove = (e: React.PointerEvent) => {
    const pt = toSlidePoint(e.clientX, e.clientY);
    if (!pt) return;
    if (tool === "laser") {
      setLaserTrail((prev) => [...prev.slice(-18), { x: pt.x, y: pt.y, ts: Date.now() }]);
    } else if (tool === "draw" && liveDraw) {
      setLiveDraw((prev) => (prev ? { ...prev, points: [...prev.points, pt] } : null));
    }
  };

  const handleSlidePointerUp = () => {
    if (liveDraw && liveDraw.points.length > 1) {
      setAnnotations((prev) => ({
        ...prev,
        [page.id]: [...(prev[page.id] ?? []), liveDraw],
      }));
    }
    setLiveDraw(null);
  };

  const slideStrokes = annotations[page.id] ?? [];
  const latestLaser = laserTrail[laserTrail.length - 1];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#060911] text-white select-none">
      <div className="flex flex-1 items-center justify-center overflow-hidden p-5">
        <div
          ref={slideFrameRef}
          key={`${page.id}_${index}`}
          onPointerDown={handleSlidePointerDown}
          onPointerMove={handleSlidePointerMove}
          onPointerUp={handleSlidePointerUp}
          onPointerLeave={() => {
            if (tool === "laser") setLaserTrail([]);
          }}
          className={`relative overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10 ${animClass} ${
            tool === "laser"
              ? "cursor-none"
              : tool === "draw"
                ? "cursor-crosshair touch-none"
                : "cursor-default"
          }`}
        >
          <PagePreview page={page} width={width} height={height} maxWidth={maxW} maxHeight={maxH} />

          {/* Ephemeral Presenter Draw & Laser SVG Overlay */}
          {(slideStrokes.length > 0 || liveDraw || laserTrail.length > 0) && (
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              {slideStrokes.map((st, sIdx) => (
                <path
                  key={sIdx}
                  d={st.points
                    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                    .join(" ")}
                  fill="none"
                  stroke={st.color}
                  strokeWidth={Math.max(4, width * 0.0045)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.92}
                />
              ))}
              {liveDraw && liveDraw.points.length > 1 && (
                <path
                  d={liveDraw.points
                    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                    .join(" ")}
                  fill="none"
                  stroke={liveDraw.color}
                  strokeWidth={Math.max(4, width * 0.0045)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.92}
                />
              )}
              {laserTrail.length > 1 &&
                laserTrail.slice(1).map((pt, i) => {
                  const prev = laserTrail[i];
                  const ratio = (i + 1) / laserTrail.length;
                  return (
                    <line
                      key={`${pt.ts}_${i}`}
                      x1={prev.x}
                      y1={prev.y}
                      x2={pt.x}
                      y2={pt.y}
                      stroke="#FF2D55"
                      strokeWidth={Math.max(4, width * 0.006 * ratio)}
                      strokeLinecap="round"
                      opacity={ratio * 0.65}
                    />
                  );
                })}
              {latestLaser && (
                <g>
                  <circle
                    cx={latestLaser.x}
                    cy={latestLaser.y}
                    r={Math.max(12, width * 0.012)}
                    fill="#FF2D55"
                    opacity={0.28}
                  />
                  <circle
                    cx={latestLaser.x}
                    cy={latestLaser.y}
                    r={Math.max(5, width * 0.0055)}
                    fill="#FF2D55"
                    stroke="#FFFFFF"
                    strokeWidth={Math.max(1.5, width * 0.0018)}
                  />
                </g>
              )}
            </svg>
          )}
        </div>
      </div>

      {/* Speaker Notes Drawer */}
      {showNotes && (
        <div className="mx-auto mb-2 w-full max-w-3xl rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs text-slate-300">
          <div className="font-semibold text-white">Speaker Notes ({page.name})</div>
          <p className="mt-1 max-h-16 overflow-y-auto whitespace-pre-wrap">
            {page.notes || "No speaker notes for this slide."}
          </p>
        </div>
      )}

      {/* Slide Jump Filmstrip */}
      {showStrip && (
        <div className="border-t border-white/10 bg-black/60 px-6 py-2.5">
          <div className="flex items-center gap-2.5 overflow-x-auto pb-0.5">
            {pages.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => jumpTo(idx)}
                className={`relative shrink-0 overflow-hidden rounded-md transition cursor-pointer ${
                  idx === index
                    ? "ring-2 ring-white scale-[1.03]"
                    : "ring-1 ring-white/15 opacity-70 hover:opacity-100"
                }`}
                title={`Slide ${idx + 1}: ${p.name}`}
              >
                <PagePreview page={p} width={width} height={height} maxWidth={96} maxHeight={54} />
                <span className="absolute bottom-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {idx + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Presenter Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/60 px-5 py-2.5">
        <div className="flex items-center gap-3 text-xs text-slate-300">
          <span className="font-medium text-white">
            {index + 1} / {pages.length}
          </span>
          <span className="hidden text-slate-400 sm:inline">{page.name}</span>
          {transition !== "none" && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] capitalize text-slate-300">
              {transition}
            </span>
          )}
          <div className="h-4 w-px bg-white/15" />
          {/* Elapsed Timer */}
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-white/8 px-2 py-1 font-mono text-[11px] text-white">
            <Clock className="h-3 w-3 text-slate-400" />
            <span>{formatElapsed(elapsedSec)}</span>
            <button
              type="button"
              onClick={() => setTimerPaused((p) => !p)}
              title={timerPaused ? "Resume timer" : "Pause timer"}
              className="rounded p-0.5 text-slate-300 hover:bg-white/15 hover:text-white cursor-pointer"
            >
              {timerPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
            </button>
            <button
              type="button"
              onClick={() => setElapsedSec(0)}
              title="Reset timer"
              className="rounded p-0.5 text-slate-300 hover:bg-white/15 hover:text-white cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Center: Laser & Draw Tools */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded-lg bg-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setTool("pointer")}
              title="Pointer"
              className={`rounded-md px-2 py-1 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer ${
                tool === "pointer" ? "bg-white text-black" : "text-slate-300 hover:text-white"
              }`}
            >
              <Pointer className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTool((t) => (t === "laser" ? "pointer" : "laser"))}
              title="Laser Pointer (L)"
              className={`rounded-md px-2 py-1 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer ${
                tool === "laser" ? "bg-rose-500 text-white" : "text-slate-300 hover:text-white"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" /> Laser
            </button>
            <button
              type="button"
              onClick={() => setTool((t) => (t === "draw" ? "pointer" : "draw"))}
              title="Annotate Slide (D)"
              className={`rounded-md px-2 py-1 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer ${
                tool === "draw" ? "bg-white text-black" : "text-slate-300 hover:text-white"
              }`}
            >
              <PenTool className="h-3.5 w-3.5" /> Draw
            </button>
          </div>

          {tool === "draw" && (
            <div className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1">
              {PRESENTER_INK_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setInkColor(c)}
                  className={`h-4 w-4 rounded-full border cursor-pointer ${
                    inkColor === c ? "scale-110 border-white ring-2 ring-white/40" : "border-white/30"
                  }`}
                  style={{ background: c }}
                  title={`Ink ${c}`}
                />
              ))}
              {slideStrokes.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setAnnotations((prev) => ({
                        ...prev,
                        [page.id]: (prev[page.id] ?? []).slice(0, -1),
                      }))
                    }
                    title="Undo annotation"
                    className="ml-1 rounded p-0.5 text-slate-300 hover:bg-white/15 hover:text-white cursor-pointer"
                  >
                    <Undo2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setAnnotations((prev) => ({
                        ...prev,
                        [page.id]: [],
                      }))
                    }
                    title="Clear slide ink"
                    className="rounded p-0.5 text-slate-300 hover:bg-white/15 hover:text-rose-400 cursor-pointer"
                  >
                    <Eraser className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Right: Navigation, Strip, Notes, Fullscreen, Exit */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={goPrev}
            disabled={index === 0}
            title="Previous slide (←)"
            className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={goNext}
            disabled={index === pages.length - 1}
            title="Next slide (→)"
            className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowStrip((s) => !s)}
            title="Slide Strip (G)"
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
              showStrip ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Slides
          </button>
          <button
            onClick={() => setShowNotes((s) => !s)}
            title="Speaker Notes (N)"
            className={`rounded-lg px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
              showNotes ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen();
            }}
            className="rounded-lg bg-white/10 p-1.5 hover:bg-white/20 cursor-pointer"
            title="Toggle Fullscreen"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-semibold hover:bg-rose-600 cursor-pointer"
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );
}

export function CommentsDrawer({
  open,
  onClose,
  comments,
  activePageId,
  commentMode,
  canComment = true,
  onToggleCommentMode,
  onReply,
  onResolve,
}: {
  open: boolean;
  onClose: () => void;
  comments: DesignComment[];
  activePageId: string;
  commentMode: boolean;
  canComment?: boolean;
  onToggleCommentMode: () => void;
  onReply: (commentId: string, text: string) => void;
  onResolve: (commentId: string) => void;
}) {
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  if (!open) return null;

  const pageComments = comments.filter((c) => c.pageId === activePageId);

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-bold text-[var(--fg)]">
          <MessageSquare className="h-4 w-4 text-[var(--accent)]" />
          Comments ({pageComments.filter((c) => !c.resolved).length})
        </div>
        <button onClick={onClose} className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] cursor-pointer">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="border-b border-[var(--border)] p-3">
        {canComment ? (
          <button
            onClick={onToggleCommentMode}
            className={`w-full rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
              commentMode
                ? "bg-[#4F46E5] text-white"
                : "border border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)] hover:border-[var(--accent)]"
            }`}
          >
            {commentMode ? "Pin Mode Active — Click Canvas" : "+ Pin New Comment on Page"}
          </button>
        ) : (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-center text-[11px] text-[var(--muted)]">
            View-only link — commenting is disabled
          </div>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {pageComments.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--muted)]">
            No comments on this page yet.
          </p>
        ) : (
          pageComments.map((c, idx) => (
            <div
              key={c.id}
              className={`rounded-xl border p-3 text-xs ${
                c.resolved
                  ? "border-[var(--border)] bg-[var(--surface-2)]/50 opacity-60"
                  : "border-[var(--border)] bg-[var(--surface-2)]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--fg)]">
                  #{idx + 1} {c.authorName}
                </span>
                {canComment && !c.resolved && (
                  <button
                    onClick={() => onResolve(c.id)}
                    className="text-[11px] font-medium text-emerald-600 hover:underline cursor-pointer"
                  >
                    Resolve
                  </button>
                )}
              </div>
              <p className="mt-1 text-[var(--fg)]">{c.text}</p>

              {c.replies.length > 0 && (
                <div className="mt-2 space-y-1.5 border-t border-[var(--border)] pt-2">
                  {c.replies.map((r) => (
                    <div key={r.id} className="text-[11px]">
                      <span className="font-semibold text-[var(--fg)]">{r.authorName}: </span>
                      <span className="text-[var(--muted)]">{r.text}</span>
                    </div>
                  ))}
                </div>
              )}

              {canComment && !c.resolved && (
                <div className="mt-2 flex gap-1">
                  <input
                    value={replyDrafts[c.id] || ""}
                    onChange={(e) =>
                      setReplyDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && replyDrafts[c.id]?.trim()) {
                        onReply(c.id, replyDrafts[c.id].trim());
                        setReplyDrafts((prev) => ({ ...prev, [c.id]: "" }));
                      }
                    }}
                    placeholder="Reply…"
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] outline-none"
                  />
                  <button
                    onClick={() => {
                      if (!replyDrafts[c.id]?.trim()) return;
                      onReply(c.id, replyDrafts[c.id].trim());
                      setReplyDrafts((prev) => ({ ...prev, [c.id]: "" }));
                    }}
                    className="rounded-lg bg-[var(--accent)] p-1.5 text-[var(--accent-fg)] cursor-pointer"
                  >
                    <Send className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
