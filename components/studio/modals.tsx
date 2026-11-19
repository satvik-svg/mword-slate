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
  const [showNotes, setShowNotes] = useState(false);
  const [viewport, setViewport] = useState({ w: 1280, h: 720 });

  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  useEffect(() => {
    if (!open) return;
    const sync = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    sync();
    window.addEventListener("resize", sync);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === " ") setIndex((i) => Math.min(pages.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, pages.length, onClose]);

  if (!open) return null;
  const page = pages[index] ?? pages[0];
  const maxW = viewport.w - 80;
  const maxH = viewport.h - (showNotes ? 200 : 110);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#060911] text-white">
      <div className="flex flex-1 items-center justify-center p-6">
        <div
          key={page.id}
          className="overflow-hidden rounded-lg shadow-2xl ring-1 ring-white/10 transition-all duration-300"
        >
          <PagePreview page={page} width={width} height={height} maxWidth={maxW} maxHeight={maxH} />
        </div>
      </div>

      {showNotes && (
        <div className="mx-auto mb-2 w-full max-w-3xl rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
          <div className="font-semibold text-white">Speaker Notes ({page.name})</div>
          <p className="mt-1 whitespace-pre-wrap">{page.notes || "No speaker notes for this slide."}</p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-white/10 bg-black/50 px-6 py-3">
        <div className="text-xs text-slate-400">
          Slide {index + 1} / {pages.length} — {page.name}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-lg bg-white/10 p-2 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))}
            disabled={index === pages.length - 1}
            className="rounded-lg bg-white/10 p-2 hover:bg-white/20 disabled:opacity-30 cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowNotes((s) => !s)}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20 cursor-pointer"
          >
            {showNotes ? "Hide Notes" : "Notes"}
          </button>
          <button
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen();
            }}
            className="rounded-lg bg-white/10 p-2 hover:bg-white/20 cursor-pointer"
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
  onToggleCommentMode,
  onReply,
  onResolve,
}: {
  open: boolean;
  onClose: () => void;
  comments: DesignComment[];
  activePageId: string;
  commentMode: boolean;
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
                {!c.resolved && (
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

              {!c.resolved && (
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
