"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  ArrowLeft,
  Bold,
  Copy,
  Download,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  HelpCircle,
  History,
  Italic,
  Lock,
  Maximize,
  MessageSquare,
  Moon,
  Paintbrush,
  Play,
  Plus,
  Redo2,
  Share2,
  SlidersHorizontal,
  Strikethrough,
  Sun,
  Trash2,
  Underline,
  Undo2,
  Ungroup,
  Unlock,
} from "lucide-react";
import { SlateMark } from "@/components/slate-logo";
import { useAuth } from "@/components/auth-provider";
import { GOOGLE_FONTS } from "@/lib/presets";
import type {
  CanvasElement,
  ChartElement,
  DesignPage,
  IconElement,
  ImageElement,
  QrCodeElement,
  ShapeElement,
  TableElement,
  TextElement,
} from "@/lib/types";

export function TopToolbar({
  title,
  onTitleChange,
  saveStatus,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenResize,
  onOpenVersions,
  onToggleComments,
  commentCount,
  onOpenPresent,
  onOpenShare,
  onOpenExport,
  readOnly,
  page,
  onUpdatePage,
  selectedElements,
  onUpdateElement,
  onDuplicateSelected,
  onDeleteSelected,
  onGroupToggle,
  onAlign,
  onCopyStyle,
  onPasteStyle,
  hasCopiedStyle,
  onOpenPhotoTab,
}: {
  title: string;
  onTitleChange: (title: string) => void;
  saveStatus: "saved" | "saving" | "unsaved";
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenResize: () => void;
  onOpenVersions: () => void;
  onToggleComments: () => void;
  commentCount: number;
  onOpenPresent: () => void;
  onOpenShare: () => void;
  onOpenExport: () => void;
  readOnly?: boolean;
  page: DesignPage;
  onUpdatePage: (patch: Partial<DesignPage>) => void;
  selectedElements: CanvasElement[];
  onUpdateElement: (id: string, patch: Partial<CanvasElement>, commit?: boolean) => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onGroupToggle: () => void;
  onAlign: (mode: "left" | "centerX" | "right" | "top" | "centerY" | "bottom") => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  hasCopiedStyle: boolean;
  onOpenPhotoTab: () => void;
}) {
  const { theme, toggleTheme } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);
  const single = selectedElements.length === 1 ? selectedElements[0] : null;
  const isGrouped = selectedElements.length > 0 && selectedElements.every((e) => !!e.groupId);

  useEffect(() => {
    if (!helpOpen) return;
    const onDown = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setHelpOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelpOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [helpOpen]);

  return (
    <div className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)]">
      {/* Row 1: Studio Main Header */}
      <div className="flex h-13 items-center justify-between gap-2 px-3">
        <div className="flex items-center gap-2 min-w-0">
          <Link
            href="/"
            title="Back to Slate Home"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
          >
            <ArrowLeft className="h-4 w-4" />
            <SlateMark size={22} />
          </Link>

          <div className="h-5 w-px bg-[var(--border)]" />

          {!readOnly && (
            <div className="flex items-center gap-0.5">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (⌘Z)"
                aria-label="Undo"
                className="rounded-lg p-1.5 text-[var(--fg)] hover:bg-[var(--surface-2)] disabled:opacity-30 cursor-pointer"
              >
                <Undo2 className="h-4 w-4" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (⇧⌘Z)"
                aria-label="Redo"
                className="rounded-lg p-1.5 text-[var(--fg)] hover:bg-[var(--surface-2)] disabled:opacity-30 cursor-pointer"
              >
                <Redo2 className="h-4 w-4" />
              </button>
              <button
                onClick={onOpenResize}
                className="ml-1 inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1 text-xs font-semibold text-[var(--fg)] hover:border-[var(--accent)] cursor-pointer"
              >
                <Maximize className="h-3.5 w-3.5 text-[var(--accent)]" /> Resize
              </button>
            </div>
          )}

          <input
            value={title}
            readOnly={readOnly}
            onChange={(e) => onTitleChange(e.target.value)}
            className="ml-1 min-w-[120px] max-w-[260px] truncate rounded-lg bg-transparent px-2 py-1 text-sm font-semibold text-[var(--fg)] outline-none hover:bg-[var(--surface-2)] focus:bg-[var(--surface-2)]"
          />

          {!readOnly && (
            <span className="hidden text-[11px] text-[var(--muted)] sm:inline">
              {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Editing"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <div ref={helpRef} className="relative">
            <button
              onClick={() => setHelpOpen((o) => !o)}
              title="Quick guide & shortcuts"
              aria-label="Quick guide and shortcuts"
              className={`rounded-lg p-2 cursor-pointer ${
                helpOpen
                  ? "bg-[var(--surface-2)] text-[var(--fg)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
              }`}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
            {helpOpen && (
              <div className="absolute right-0 top-10 z-50 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-xs shadow-xl">
                <div className="font-semibold text-[var(--fg)]">Quick Tips</div>
                <ul className="mt-2 space-y-1.5 text-[11px] text-[var(--muted)]">
                  <li>• <span className="text-[var(--fg)]">Double-click</span> any text or table cell to edit</li>
                  <li>• <span className="text-[var(--fg)]">Drag corners</span> to resize (<kbd className="rounded border border-[var(--border)] px-1 text-[10px]">Shift</kbd> locks ratio)</li>
                  <li>• Hold <kbd className="rounded border border-[var(--border)] px-1 text-[10px]">Space</kbd> + drag to pan the canvas</li>
                </ul>
                <div className="mt-3 border-t border-[var(--border)] pt-2.5">
                  <div className="mb-1.5 font-semibold text-[var(--fg)]">Shortcuts</div>
                  <div className="grid grid-cols-[1fr_auto] gap-y-1 text-[11px] text-[var(--muted)]">
                    <span>Undo / Redo</span>
                    <kbd className="font-mono text-[10px] text-[var(--fg)]">⌘Z / ⇧⌘Z</kbd>
                    <span>Duplicate selected</span>
                    <kbd className="font-mono text-[10px] text-[var(--fg)]">⌘D</kbd>
                    <span>Group / Ungroup</span>
                    <kbd className="font-mono text-[10px] text-[var(--fg)]">⌘G</kbd>
                    <span>Fit canvas to screen</span>
                    <kbd className="font-mono text-[10px] text-[var(--fg)]">⌘0</kbd>
                    <span>Delete selected</span>
                    <kbd className="font-mono text-[10px] text-[var(--fg)]">Delete</kbd>
                  </div>
                </div>
              </div>
            )}
          </div>
          {!readOnly && (
            <button
              onClick={onOpenVersions}
              title="Version History"
              aria-label="Version History"
              className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
            >
              <History className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onToggleComments}
            title="Comments"
            aria-label="Comments"
            className="relative rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
          >
            <MessageSquare className="h-4 w-4" />
            {commentCount > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[9px] font-bold text-[var(--accent-fg)]">
                {commentCount}
              </span>
            )}
          </button>
          <button
            onClick={toggleTheme}
            title="Toggle dark/light mode"
            aria-label="Toggle dark or light mode"
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            onClick={onOpenPresent}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-2)] cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" /> Present
          </button>
          {!readOnly && (
            <button
              onClick={onOpenShare}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-2)] cursor-pointer"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          )}
          <button
            onClick={onOpenExport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-fg)] hover:opacity-90 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Row 2: Contextual Property Bar */}
      {!readOnly && (
        <div className="flex min-h-11 flex-wrap items-center gap-2 border-t border-[var(--border)] bg-[var(--surface-2)]/60 px-3 py-1.5 text-xs">
          {/* No selection: Page background controls */}
          {selectedElements.length === 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold text-[var(--muted)]">Page Background:</span>
              <label className="inline-flex items-center gap-1.5 text-[var(--fg)]">
                Color
                <input
                  type="color"
                  value={page.background || "#FFFFFF"}
                  onChange={(e) => onUpdatePage({ background: e.target.value })}
                  className="h-6 w-6 cursor-pointer rounded border border-[var(--border)]"
                />
              </label>
              <label className="inline-flex items-center gap-1.5 text-[var(--fg)]">
                Gradient To
                <input
                  type="color"
                  value={page.backgroundGradientTo || page.background || "#FFFFFF"}
                  onChange={(e) => onUpdatePage({ backgroundGradientTo: e.target.value })}
                  className="h-6 w-6 cursor-pointer rounded border border-[var(--border)]"
                />
              </label>
              {page.backgroundGradientTo && (
                <button
                  onClick={() => onUpdatePage({ backgroundGradientTo: undefined })}
                  className="rounded-md bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                >
                  Clear Gradient
                </button>
              )}
              <div className="h-4 w-px bg-[var(--border)]" />
              <label className="inline-flex items-center gap-1.5 text-[var(--muted)]">
                Slide Transition
                <select
                  value={page.transition || "none"}
                  onChange={(e) =>
                    onUpdatePage({ transition: e.target.value as DesignPage["transition"] })
                  }
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--fg)]"
                >
                  <option value="none">None</option>
                  <option value="fade">Fade</option>
                  <option value="slide">Slide</option>
                  <option value="zoom">Zoom</option>
                </select>
              </label>
            </div>
          )}

          {/* TEXT controls */}
          {single?.type === "text" && (() => {
            const t = single as TextElement;
            return (
              <>
                <select
                  value={t.fontFamily}
                  onChange={(e) => onUpdateElement(t.id, { fontFamily: e.target.value }, true)}
                  className="max-w-[150px] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--fg)]"
                >
                  {!GOOGLE_FONTS.some((f) => f.name === t.fontFamily) && (
                    <option value={t.fontFamily}>{t.fontFamily}</option>
                  )}
                  {GOOGLE_FONTS.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  min={8}
                  max={360}
                  value={t.fontSize}
                  onChange={(e) => onUpdateElement(t.id, { fontSize: Math.max(8, Number(e.target.value)) }, true)}
                  className="w-16 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs text-[var(--fg)]"
                  title="Font size"
                />

                <input
                  type="color"
                  value={t.color}
                  onChange={(e) => onUpdateElement(t.id, { color: e.target.value })}
                  title="Text color"
                  className="h-6 w-6 cursor-pointer rounded border border-[var(--border)]"
                />

                <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
                  <button
                    onClick={() =>
                      onUpdateElement(t.id, { fontWeight: t.fontWeight >= 700 ? 400 : 700 }, true)
                    }
                    className={`rounded p-1 cursor-pointer ${t.fontWeight >= 700 ? "bg-[var(--accent-soft)] text-[var(--accent)]" : ""}`}
                    title="Bold"
                  >
                    <Bold className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onUpdateElement(t.id, { italic: !t.italic }, true)}
                    className={`rounded p-1 cursor-pointer ${t.italic ? "bg-[var(--accent-soft)] text-[var(--accent)]" : ""}`}
                    title="Italic"
                  >
                    <Italic className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onUpdateElement(t.id, { underline: !t.underline }, true)}
                    className={`rounded p-1 cursor-pointer ${t.underline ? "bg-[var(--accent-soft)] text-[var(--accent)]" : ""}`}
                    title="Underline"
                  >
                    <Underline className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onUpdateElement(t.id, { strikethrough: !t.strikethrough }, true)}
                    className={`rounded p-1 cursor-pointer ${t.strikethrough ? "bg-[var(--accent-soft)] text-[var(--accent)]" : ""}`}
                    title="Strikethrough"
                  >
                    <Strikethrough className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
                  {(["left", "center", "right"] as const).map((a) => {
                    const Ico = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
                    return (
                      <button
                        key={a}
                        onClick={() => onUpdateElement(t.id, { align: a }, true)}
                        className={`rounded p-1 cursor-pointer ${t.align === a ? "bg-[var(--accent-soft)] text-[var(--accent)]" : ""}`}
                      >
                        <Ico className="h-3.5 w-3.5" />
                      </button>
                    );
                  })}
                </div>

                <label className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)]" title="Curve text">
                  Curve
                  <input
                    type="range"
                    min={-80}
                    max={80}
                    value={t.curve ?? 0}
                    onChange={(e) => onUpdateElement(t.id, { curve: Number(e.target.value) })}
                    className="w-16 accent-[var(--accent)]"
                  />
                </label>

                <button
                  onClick={() =>
                    onUpdateElement(
                      t.id,
                      t.shadowBlur
                        ? { shadowBlur: 0, shadowColor: undefined }
                        : { shadowBlur: 14, shadowColor: "rgba(0,0,0,0.35)", shadowOffsetY: 5 },
                      true,
                    )
                  }
                  className={`rounded-lg border px-2 py-1 text-[11px] font-medium cursor-pointer ${
                    t.shadowBlur ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface)]"
                  }`}
                >
                  Shadow
                </button>

                <button
                  onClick={() =>
                    onUpdateElement(
                      t.id,
                      t.backgroundColor
                        ? { backgroundColor: undefined }
                        : { backgroundColor: "#FEF08A", backgroundPadding: 10, backgroundRadius: 10 },
                      true,
                    )
                  }
                  className={`rounded-lg border px-2 py-1 text-[11px] font-medium cursor-pointer ${
                    t.backgroundColor ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] bg-[var(--surface)]"
                  }`}
                >
                  Highlight
                </button>
              </>
            );
          })()}

          {/* SHAPE controls */}
          {single?.type === "shape" && (() => {
            const s = single as ShapeElement;
            return (
              <>
                <label className="inline-flex items-center gap-1">
                  Fill
                  <input
                    type="color"
                    value={s.fill === "transparent" ? "#4F46E5" : s.fill}
                    onChange={(e) => onUpdateElement(s.id, { fill: e.target.value })}
                    className="h-6 w-6 cursor-pointer rounded"
                  />
                </label>
                <label className="inline-flex items-center gap-1">
                  Gradient
                  <input
                    type="color"
                    value={s.gradientTo || s.fill || "#06B6D4"}
                    onChange={(e) => onUpdateElement(s.id, { gradientTo: e.target.value })}
                    className="h-6 w-6 cursor-pointer rounded"
                  />
                </label>
                {s.gradientTo && (
                  <button
                    onClick={() => onUpdateElement(s.id, { gradientTo: undefined }, true)}
                    className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-0.5 text-[11px] cursor-pointer"
                  >
                    Solid
                  </button>
                )}
                <label className="inline-flex items-center gap-1">
                  Border
                  <input
                    type="color"
                    value={s.stroke === "transparent" ? "#0F172A" : s.stroke}
                    onChange={(e) =>
                      onUpdateElement(s.id, { stroke: e.target.value, strokeWidth: Math.max(2, s.strokeWidth || 2) })
                    }
                    className="h-6 w-6 cursor-pointer rounded"
                  />
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={s.strokeWidth}
                    onChange={(e) => onUpdateElement(s.id, { strokeWidth: Number(e.target.value) }, true)}
                    className="w-12 rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5"
                  />
                </label>
                {s.shape === "rect" && (
                  <label className="inline-flex items-center gap-1">
                    Radius
                    <input
                      type="range"
                      min={0}
                      max={120}
                      value={s.borderRadius ?? 0}
                      onChange={(e) => onUpdateElement(s.id, { borderRadius: Number(e.target.value) })}
                      className="w-16 accent-[var(--accent)]"
                    />
                  </label>
                )}
              </>
            );
          })()}

          {/* IMAGE controls */}
          {single?.type === "image" && (() => {
            const im = single as ImageElement;
            return (
              <>
                <button
                  onClick={onOpenPhotoTab}
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 py-1 text-xs font-medium text-[var(--accent-fg)] cursor-pointer"
                >
