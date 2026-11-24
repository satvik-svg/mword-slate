"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignHorizontalSpaceAround,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  AlignVerticalSpaceAround,
  ArrowLeft,
  Bold,
  Copy,
  Crop,
  Download,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  HelpCircle,
  History,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
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
  Sparkles,
  Strikethrough,
  Sun,
  Trash2,
  Underline,
  Undo2,
  Ungroup,
  Unlock,
  Wand2,
} from "lucide-react";
import { SlateMark } from "@/components/slate-logo";
import { MWorldAppSwitcher } from "@/components/mworld-app-switcher";
import { useAuth } from "@/components/auth-provider";
import { initialsFromName, type CollabPeer } from "@/lib/collab";
import { GOOGLE_FONTS } from "@/lib/presets";
import type {
  CanvasElement,
  ChartElement,
  CustomFontItem,
  DesignPage,
  IconElement,
  ImageElement,
  QrCodeElement,
  ShapeElement,
  TableElement,
  TextElement,
} from "@/lib/types";

function toggleListPrefix(text: string, kind: "bullet" | "numbered"): string {
  const lines = text.split("\n");
  const isAllBullet = lines.every((l) => !l.trim() || /^\s*[•\-*]\s+/.test(l));
  const isAllNumbered = lines.every((l) => !l.trim() || /^\s*\d+\.\s+/.test(l));

  const stripPrefix = (l: string) => l.replace(/^\s*(?:[•\-*]|\d+\.)\s+/, "");

  if (kind === "bullet") {
    if (isAllBullet) return lines.map(stripPrefix).join("\n");
    return lines.map((l) => (l.trim() ? `• ${stripPrefix(l)}` : l)).join("\n");
  }
  if (isAllNumbered) return lines.map(stripPrefix).join("\n");
  let idx = 0;
  return lines
    .map((l) => {
      if (!l.trim()) return l;
      idx += 1;
      return `${idx}. ${stripPrefix(l)}`;
    })
    .join("\n");
}

function normalizeColorHex(color: string | undefined, fallback: string): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }
  return fallback;
}

export function TopToolbar({
  title,
  onTitleChange,
  saveStatus,
  onRetrySave,
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
  onCommitHistory,
  onDuplicateSelected,
  onDeleteSelected,
  onGroupToggle,
  onAlign,
  onDistribute,
  onReorderLayer,
  onCopyStyle,
  onPasteStyle,
  hasCopiedStyle,
  onOpenPhotoTab,
  croppingId,
  onToggleCropImage,
  onOpenMagicEraser,
  dataEditorOpen,
  onToggleDataEditor,
  customFonts,
  remotePeers = [],
  collabConnected = false,
}: {
  title: string;
  onTitleChange: (title: string) => void;
  saveStatus: "saved" | "saving" | "unsaved" | "error";
  onRetrySave?: () => void;
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
  onCommitHistory?: () => void;
  onDuplicateSelected: () => void;
  onDeleteSelected: () => void;
  onGroupToggle: () => void;
  onAlign: (mode: "left" | "centerX" | "right" | "top" | "centerY" | "bottom") => void;
  onDistribute?: (axis: "h" | "v") => void;
  onReorderLayer?: (id: string, dir: "front" | "up" | "down" | "back") => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  hasCopiedStyle: boolean;
  onOpenPhotoTab: () => void;
  croppingId?: string | null;
  onToggleCropImage?: (id: string) => void;
  onOpenMagicEraser?: (img: ImageElement) => void;
  dataEditorOpen?: boolean;
  onToggleDataEditor?: () => void;
  customFonts?: CustomFontItem[];
  remotePeers?: CollabPeer[];
  collabConnected?: boolean;
}) {
  const { theme, toggleTheme } = useAuth();
  const [helpOpen, setHelpOpen] = useState(false);
  const [textFxOpen, setTextFxOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [aspectLocked, setAspectLocked] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);
  const textFxRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<HTMLDivElement>(null);
  const single = selectedElements.length === 1 ? selectedElements[0] : null;
  const isGrouped = selectedElements.length > 0 && selectedElements.every((e) => !!e.groupId);

  useEffect(() => {
    if (!helpOpen && !textFxOpen && !positionOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (helpOpen && helpRef.current && !helpRef.current.contains(target)) setHelpOpen(false);
      if (textFxOpen && textFxRef.current && !textFxRef.current.contains(target)) setTextFxOpen(false);
      if (positionOpen && positionRef.current && !positionRef.current.contains(target)) setPositionOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHelpOpen(false);
        setTextFxOpen(false);
        setPositionOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [helpOpen, textFxOpen, positionOpen]);

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
          <MWorldAppSwitcher currentApp="slate" compact />

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
            saveStatus === "error" ? (
              <button
                type="button"
                onClick={onRetrySave}
                className="rounded-md bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-500/25 dark:text-rose-400 cursor-pointer"
              >
                Save failed · Retry
              </button>
            ) : (
              <span className="hidden text-[11px] text-[var(--muted)] sm:inline">
                {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Editing"}
              </span>
            )
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {remotePeers.length > 0 && (
            <div
              className="mr-1 flex items-center -space-x-1.5"
              title={`Collaborating live: ${remotePeers.map((p) => p.name).join(", ")}`}
            >
              {remotePeers.slice(0, 4).map((peer) => (
                <div
                  key={peer.clientId}
                  title={`${peer.name} (${peer.role})`}
                  style={{ background: peer.color }}
                  className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--surface)] text-[10px] font-bold text-white shadow-xs"
                >
                  {initialsFromName(peer.name)}
                </div>
              ))}
              {remotePeers.length > 4 && (
                <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--surface)] bg-[var(--surface-2)] text-[10px] font-semibold text-[var(--fg)]">
                  +{remotePeers.length - 4}
                </div>
              )}
            </div>
          )}
          {collabConnected && remotePeers.length === 0 && (
            <span
              title="Live collaboration connected"
              className="mr-1 hidden items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)] md:inline-flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live
            </span>
          )}
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
                  {!GOOGLE_FONTS.some((f) => f.name === t.fontFamily) &&
                    !(customFonts ?? []).some((f) => f.name === t.fontFamily) && (
                      <option value={t.fontFamily}>{t.fontFamily}</option>
                    )}
                  {customFonts && customFonts.length > 0 && (
                    <optgroup label="Custom Fonts">
                      {customFonts.map((f) => (
                        <option key={f.id} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Built-in Fonts">
                    {GOOGLE_FONTS.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.name}
                      </option>
                    ))}
                  </optgroup>
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
                  onBlur={() => onCommitHistory?.()}
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

                {/* Case toggle + Bullet / Numbered Lists */}
                <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      const next =
                        t.textTransform === "uppercase"
                          ? "lowercase"
                          : t.textTransform === "lowercase"
                            ? "none"
                            : "uppercase";
                      onUpdateElement(t.id, { textTransform: next }, true);
                    }}
                    title={`Text case: ${t.textTransform || "normal"} (click to cycle)`}
                    className={`rounded px-1.5 py-0.5 text-[11px] font-semibold cursor-pointer ${
                      t.textTransform && t.textTransform !== "none"
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "text-[var(--fg)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    {t.textTransform === "uppercase"
                      ? "AA"
                      : t.textTransform === "lowercase"
                        ? "aa"
                        : "Aa"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateElement(t.id, { text: toggleListPrefix(t.text, "bullet") }, true)
                    }
                    title="Toggle bulleted list"
                    className="rounded p-1 hover:bg-[var(--surface-2)] cursor-pointer"
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateElement(t.id, { text: toggleListPrefix(t.text, "numbered") }, true)
                    }
                    title="Toggle numbered list"
                    className="rounded p-1 hover:bg-[var(--surface-2)] cursor-pointer"
                  >
                    <ListOrdered className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Rich Text Spacing & Effects Popover */}
                <div ref={textFxRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setTextFxOpen((o) => !o)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-medium cursor-pointer ${
                      textFxOpen ||
                      t.shadowBlur ||
                      t.backgroundColor ||
                      t.strokeWidth ||
                      (t.curve && Math.abs(t.curve) > 2)
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg)]"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Spacing & Effects
                  </button>

                  {textFxOpen && (
                    <div className="absolute left-0 top-9 z-50 w-72 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-xs shadow-2xl">
                      {/* Line Height */}
                      <div>
                        <div className="flex justify-between text-[11px] font-medium text-[var(--fg)]">
                          <span>Line Height</span>
                          <span className="font-mono text-[var(--muted)]">
                            {(t.lineHeight || 1.2).toFixed(2)}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.8}
                          max={2.5}
                          step={0.05}
                          value={t.lineHeight || 1.2}
                          onChange={(e) => onUpdateElement(t.id, { lineHeight: Number(e.target.value) })}
                          onPointerUp={() => onCommitHistory?.()}
                          onKeyUp={() => onCommitHistory?.()}
                          className="mt-1 w-full accent-[var(--accent)]"
                        />
                      </div>

                      {/* Letter Spacing */}
                      <div>
                        <div className="flex justify-between text-[11px] font-medium text-[var(--fg)]">
                          <span>Letter Spacing</span>
                          <span className="font-mono text-[var(--muted)]">
                            {t.letterSpacing || 0}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={-4}
                          max={24}
                          step={0.5}
                          value={t.letterSpacing || 0}
                          onChange={(e) => onUpdateElement(t.id, { letterSpacing: Number(e.target.value) })}
                          onPointerUp={() => onCommitHistory?.()}
                          onKeyUp={() => onCommitHistory?.()}
                          className="mt-1 w-full accent-[var(--accent)]"
                        />
                      </div>

                      {/* Curve */}
                      <div>
                        <div className="flex justify-between text-[11px] font-medium text-[var(--fg)]">
                          <span>Curve Text</span>
                          <span className="font-mono text-[var(--muted)]">{t.curve ?? 0}</span>
                        </div>
                        <input
                          type="range"
                          min={-80}
                          max={80}
                          value={t.curve ?? 0}
                          onChange={(e) => onUpdateElement(t.id, { curve: Number(e.target.value) })}
                          onPointerUp={() => onCommitHistory?.()}
                          onKeyUp={() => onCommitHistory?.()}
                          className="mt-1 w-full accent-[var(--accent)]"
                        />
                      </div>

                      <div className="h-px bg-[var(--border)]" />

                      {/* Text Outline / Stroke */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-[var(--fg)]">Outline / Stroke</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={normalizeColorHex(t.strokeColor, "#0F172A")}
                              onChange={(e) =>
                                onUpdateElement(t.id, {
                                  strokeColor: e.target.value,
                                  strokeWidth: Math.max(1, t.strokeWidth || 2),
                                })
                              }
                              onBlur={() => onCommitHistory?.()}
                              className="h-5 w-5 cursor-pointer rounded border border-[var(--border)]"
                              title="Outline color"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateElement(
                                  t.id,
                                  t.strokeWidth
                                    ? { strokeWidth: 0, strokeColor: undefined }
                                    : { strokeWidth: 2, strokeColor: "#0F172A" },
                                  true,
                                )
                              }
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                                t.strokeWidth
                                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                                  : "border-[var(--border)] text-[var(--muted)]"
                              }`}
                            >
                              {t.strokeWidth ? "On" : "Off"}
                            </button>
                          </div>
                        </div>
                        {(t.strokeWidth ?? 0) > 0 && (
                          <input
                            type="range"
                            min={0.5}
                            max={8}
                            step={0.5}
                            value={t.strokeWidth ?? 2}
                            onChange={(e) => onUpdateElement(t.id, { strokeWidth: Number(e.target.value) })}
                            onPointerUp={() => onCommitHistory?.()}
                            onKeyUp={() => onCommitHistory?.()}
                            className="w-full accent-[var(--accent)]"
                          />
                        )}
                      </div>

                      {/* Text Highlight */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-[var(--fg)]">Highlight Fill</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={normalizeColorHex(t.backgroundColor, "#FEF08A")}
                              onChange={(e) =>
                                onUpdateElement(t.id, {
                                  backgroundColor: e.target.value,
                                  backgroundPadding: t.backgroundPadding ?? 10,
                                  backgroundRadius: t.backgroundRadius ?? 10,
                                })
                              }
                              onBlur={() => onCommitHistory?.()}
                              className="h-5 w-5 cursor-pointer rounded border border-[var(--border)]"
                              title="Highlight color"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateElement(
                                  t.id,
                                  t.backgroundColor
                                    ? { backgroundColor: undefined }
                                    : { backgroundColor: "#FEF08A", backgroundPadding: 10, backgroundRadius: 10 },
                                  true,
                                )
                              }
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                                t.backgroundColor
                                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                                  : "border-[var(--border)] text-[var(--muted)]"
                              }`}
                            >
                              {t.backgroundColor ? "On" : "Off"}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Text Shadow */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-[var(--fg)]">Drop Shadow</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={normalizeColorHex(t.shadowColor, "#0F172A")}
                              onChange={(e) =>
                                onUpdateElement(t.id, {
                                  shadowColor: e.target.value,
                                  shadowBlur: Math.max(4, t.shadowBlur || 14),
                                  shadowOffsetY: t.shadowOffsetY ?? 5,
                                })
                              }
                              onBlur={() => onCommitHistory?.()}
                              className="h-5 w-5 cursor-pointer rounded border border-[var(--border)]"
                              title="Shadow color"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateElement(
                                  t.id,
                                  t.shadowBlur
                                    ? { shadowBlur: 0, shadowColor: undefined }
                                    : { shadowBlur: 14, shadowColor: "#0F172A", shadowOffsetY: 5 },
                                  true,
                                )
                              }
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold cursor-pointer ${
                                t.shadowBlur
                                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                                  : "border-[var(--border)] text-[var(--muted)]"
                              }`}
                            >
                              {t.shadowBlur ? "On" : "Off"}
                            </button>
                          </div>
                        </div>
                        {(t.shadowBlur ?? 0) > 0 && (
                          <input
                            type="range"
                            min={2}
                            max={36}
                            step={1}
                            value={t.shadowBlur ?? 14}
                            onChange={(e) => onUpdateElement(t.id, { shadowBlur: Number(e.target.value) })}
                            onPointerUp={() => onCommitHistory?.()}
                            onKeyUp={() => onCommitHistory?.()}
                            className="w-full accent-[var(--accent)]"
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
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
                    onBlur={() => onCommitHistory?.()}
                    className="h-6 w-6 cursor-pointer rounded"
                  />
                </label>
                <label className="inline-flex items-center gap-1">
                  Gradient
                  <input
                    type="color"
                    value={s.gradientTo || s.fill || "#06B6D4"}
                    onChange={(e) => onUpdateElement(s.id, { gradientTo: e.target.value })}
                    onBlur={() => onCommitHistory?.()}
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
                    onBlur={() => onCommitHistory?.()}
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
                      onPointerUp={() => onCommitHistory?.()}
                      onKeyUp={() => onCommitHistory?.()}
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
                  <SlidersHorizontal className="h-3.5 w-3.5" /> Edit Photo / Filters / BG
                </button>
                {onToggleCropImage && !im.locked && (
                  <button
                    type="button"
                    onClick={() => onToggleCropImage(im.id)}
                    title="Double-click image or click here to pan & zoom photo inside its frame"
                    className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium cursor-pointer ${
                      croppingId === im.id
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:border-[var(--accent)]"
                    }`}
                  >
                    <Crop className="h-3.5 w-3.5" />
                    {croppingId === im.id ? "Done Framing" : "Pan / Zoom"}
                  </button>
                )}
                {onOpenMagicEraser && !im.locked && (
                  <button
                    type="button"
                    onClick={() => onOpenMagicEraser(im)}
                    title="Open Magic Eraser, Restore Brush & Magic Wand cutout editor"
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-xs font-medium text-[var(--fg)] hover:border-[var(--accent)] cursor-pointer"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Magic Eraser
                  </button>
                )}
                <button
                  onClick={() =>
                    onUpdateElement(im.id, { fit: im.fit === "cover" ? "contain" : "cover" }, true)
                  }
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 cursor-pointer"
                >
                  Fit: {im.fit}
                </button>
                <label className="inline-flex items-center gap-1">
                  Radius
                  <input
                    type="range"
                    min={0}
                    max={120}
                    value={im.borderRadius ?? 0}
                    onChange={(e) => onUpdateElement(im.id, { borderRadius: Number(e.target.value) })}
                    onPointerUp={() => onCommitHistory?.()}
                    onKeyUp={() => onCommitHistory?.()}
                    className="w-16 accent-[var(--accent)]"
                  />
                </label>
              </>
            );
          })()}

          {/* ICON controls */}
          {single?.type === "icon" && (() => {
            const ic = single as IconElement;
            return (
              <>
                <label className="inline-flex items-center gap-1">
                  Stroke
                  <input
                    type="color"
                    value={ic.color}
                    onChange={(e) => onUpdateElement(ic.id, { color: e.target.value })}
                    onBlur={() => onCommitHistory?.()}
                    className="h-6 w-6 cursor-pointer rounded"
                  />
                </label>
                <label className="inline-flex items-center gap-1">
                  Weight
                  <input
                    type="range"
                    min={1}
                    max={4}
                    step={0.25}
                    value={ic.strokeWidth}
                    onChange={(e) => onUpdateElement(ic.id, { strokeWidth: Number(e.target.value) })}
                    onPointerUp={() => onCommitHistory?.()}
                    onKeyUp={() => onCommitHistory?.()}
                    className="w-16 accent-[var(--accent)]"
                  />
                </label>
              </>
            );
          })()}

          {/* TABLE controls */}
          {single?.type === "table" && (() => {
            const tb = single as TableElement;
            return (
              <>
                <button
                  onClick={onToggleDataEditor}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium cursor-pointer ${
                    dataEditorOpen
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                      : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {dataEditorOpen ? "Hide Table Editor" : "Edit Table"}
                </button>
                <button
                  onClick={() =>
                    onUpdateElement(
                      tb.id,
                      { rows: [...tb.rows, Array(tb.rows[0]?.length || 3).fill("Cell")] } as Partial<TableElement>,
                      true,
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Row
                </button>
                <button
                  onClick={() =>
                    onUpdateElement(
                      tb.id,
                      { rows: tb.rows.map((r, i) => [...r, i === 0 ? "Header" : "Cell"]) } as Partial<TableElement>,
                      true,
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Column
                </button>
                <label className="inline-flex items-center gap-1">
                  Header
                  <input
                    type="color"
                    value={tb.headerBg}
                    onChange={(e) => onUpdateElement(tb.id, { headerBg: e.target.value } as Partial<TableElement>)}
                    onBlur={() => onCommitHistory?.()}
                    className="h-6 w-6 cursor-pointer rounded"
                  />
                </label>
              </>
            );
          })()}

          {/* CHART controls */}
          {single?.type === "chart" && (() => {
            const ch = single as ChartElement;
            return (
              <>
                <button
                  onClick={onToggleDataEditor}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-medium cursor-pointer ${
                    dataEditorOpen
                      ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                      : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--fg)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {dataEditorOpen ? "Hide Chart Data" : "Edit Data"}
                </button>
                <select
                  value={ch.chartKind}
                  onChange={(e) =>
                    onUpdateElement(ch.id, { chartKind: e.target.value as ChartElement["chartKind"] } as Partial<ChartElement>, true)
                  }
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                >
                  <option value="bar">Bar Chart</option>
                  <option value="line">Line Chart</option>
                  <option value="pie">Pie Chart</option>
                  <option value="donut">Donut Chart</option>
                </select>
                <input
                  value={ch.title || ""}
                  onChange={(e) => onUpdateElement(ch.id, { title: e.target.value } as Partial<ChartElement>)}
                  onBlur={() => onCommitHistory?.()}
                  placeholder="Chart title"
                  className="w-36 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                />
                <label className="inline-flex items-center gap-1" title="Label & title text color">
                  Text
                  <input
                    type="color"
                    value={ch.textColor || "#0F172A"}
                    onChange={(e) => onUpdateElement(ch.id, { textColor: e.target.value } as Partial<ChartElement>)}
                    onBlur={() => onCommitHistory?.()}
                    className="h-6 w-6 cursor-pointer rounded"
                  />
                </label>
                <button
                  onClick={() =>
                    onUpdateElement(
                      ch.id,
                      {
                        data: [
                          ...ch.data,
                          { label: `Item ${ch.data.length + 1}`, value: 50 },
                        ],
                      } as Partial<ChartElement>,
                      true,
                    )
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 cursor-pointer"
                >
                  <Plus className="h-3 w-3" /> Add Item
                </button>
              </>
            );
          })()}

          {/* QR CODE controls */}
          {single?.type === "qrcode" && (() => {
            const qr = single as QrCodeElement;
            return (
              <>
                <input
                  value={qr.value}
                  onChange={(e) => onUpdateElement(qr.id, { value: e.target.value } as Partial<QrCodeElement>)}
                  onBlur={() => onCommitHistory?.()}
                  placeholder="QR URL or text"
                  className="w-56 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1"
                />
                <input
                  type="color"
                  value={qr.fgColor}
                  onChange={(e) => onUpdateElement(qr.id, { fgColor: e.target.value } as Partial<QrCodeElement>)}
                  onBlur={() => onCommitHistory?.()}
                  className="h-6 w-6 cursor-pointer rounded"
                />
              </>
            );
          })()}

          {/* Common selection controls */}
          {selectedElements.length > 0 && (
            <div className="ml-auto flex items-center gap-1.5">
              {single && (
                <>
                  <label className="inline-flex items-center gap-1 text-[11px] text-[var(--muted)]" title="Opacity">
                    Opacity
                    <input
                      type="range"
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={single.opacity ?? 1}
                      onChange={(e) => onUpdateElement(single.id, { opacity: Number(e.target.value) })}
                      onPointerUp={() => onCommitHistory?.()}
                      onKeyUp={() => onCommitHistory?.()}
                      className="w-14 accent-[var(--accent)]"
                    />
                  </label>
                  <button
                    onClick={() => onUpdateElement(single.id, { flipX: !single.flipX }, true)}
                    title="Flip Horizontal"
                    className="rounded p-1.5 hover:bg-[var(--surface-3)] cursor-pointer"
                  >
                    <FlipHorizontal2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => onUpdateElement(single.id, { flipY: !single.flipY }, true)}
                    title="Flip Vertical"
                    className="rounded p-1.5 hover:bg-[var(--surface-3)] cursor-pointer"
                  >
                    <FlipVertical2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={onCopyStyle}
                    title="Copy Style"
                    className="rounded p-1.5 hover:bg-[var(--surface-3)] cursor-pointer"
                  >
                    <Paintbrush className="h-3.5 w-3.5" />
                  </button>
                  {hasCopiedStyle && (
                    <button
                      onClick={onPasteStyle}
                      className="rounded-lg bg-[var(--accent-soft)] px-2 py-1 text-[11px] font-semibold text-[var(--accent)] cursor-pointer"
                    >
                      Paste Style
                    </button>
                  )}

                  {/* Precision Position Inspector (X / Y / W / H / Rotation + Aspect Lock) */}
                  <div ref={positionRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setPositionOpen((o) => !o)}
                      title="Precision Position, Size & Rotation"
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 font-mono text-[11px] font-medium cursor-pointer ${
                        positionOpen
                          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg)]"
                      }`}
                    >
                      {Math.round(single.width)}×{Math.round(single.height)}
                    </button>

                    {positionOpen && (
                      <div className="absolute right-0 top-9 z-50 w-64 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-xs shadow-2xl">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[var(--fg)]">Position & Size</span>
                          <button
                            type="button"
                            onClick={() => setAspectLocked((l) => !l)}
                            title={aspectLocked ? "Unlock aspect ratio" : "Lock aspect ratio"}
                            className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium cursor-pointer ${
                              aspectLocked
                                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                                : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)]"
                            }`}
                          >
                            {aspectLocked ? (
                              <Link2 className="h-3 w-3" />
                            ) : (
                              <Link2Off className="h-3 w-3" />
                            )}
                            Ratio
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-0.5">
                            <span className="text-[10px] font-medium text-[var(--muted)]">X (px)</span>
                            <input
                              type="number"
                              disabled={!!single.locked}
                              value={Math.round(single.x)}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                if (Number.isFinite(v)) onUpdateElement(single.id, { x: Math.round(v) });
                              }}
                              onBlur={() => onCommitHistory?.()}
                              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                            />
                          </label>
                          <label className="space-y-0.5">
                            <span className="text-[10px] font-medium text-[var(--muted)]">Y (px)</span>
                            <input
                              type="number"
                              disabled={!!single.locked}
                              value={Math.round(single.y)}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                if (Number.isFinite(v)) onUpdateElement(single.id, { y: Math.round(v) });
                              }}
                              onBlur={() => onCommitHistory?.()}
                              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                            />
                          </label>
                          <label className="space-y-0.5">
                            <span className="text-[10px] font-medium text-[var(--muted)]">Width (px)</span>
                            <input
                              type="number"
                              min={12}
                              disabled={!!single.locked}
                              value={Math.round(single.width)}
                              onChange={(e) => {
                                const nextW = Math.max(12, Math.round(Number(e.target.value) || 12));
                                if (aspectLocked && single.width > 0) {
                                  const ratio = single.height / single.width;
                                  onUpdateElement(single.id, {
                                    width: nextW,
                                    height: Math.max(12, Math.round(nextW * ratio)),
                                  });
                                } else {
                                  onUpdateElement(single.id, { width: nextW });
                                }
                              }}
                              onBlur={() => onCommitHistory?.()}
                              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                            />
                          </label>
                          <label className="space-y-0.5">
                            <span className="text-[10px] font-medium text-[var(--muted)]">Height (px)</span>
                            <input
                              type="number"
                              min={12}
                              disabled={!!single.locked}
                              value={Math.round(single.height)}
                              onChange={(e) => {
                                const nextH = Math.max(12, Math.round(Number(e.target.value) || 12));
                                if (aspectLocked && single.height > 0) {
                                  const ratio = single.width / single.height;
                                  onUpdateElement(single.id, {
                                    width: Math.max(12, Math.round(nextH * ratio)),
                                    height: nextH,
                                  });
                                } else {
                                  onUpdateElement(single.id, { height: nextH });
                                }
                              }}
                              onBlur={() => onCommitHistory?.()}
                              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                            />
                          </label>
                        </div>

                        <label className="block space-y-0.5">
                          <div className="flex justify-between text-[10px] font-medium text-[var(--muted)]">
                            <span>Rotation (°)</span>
                            <span className="font-mono">{Math.round(single.rotation || 0)}°</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="range"
                              min={0}
                              max={359}
                              disabled={!!single.locked}
                              value={Math.round(((single.rotation || 0) % 360 + 360) % 360)}
                              onChange={(e) =>
                                onUpdateElement(single.id, { rotation: Number(e.target.value) })
                              }
                              onPointerUp={() => onCommitHistory?.()}
                              onKeyUp={() => onCommitHistory?.()}
                              className="flex-1 accent-[var(--accent)]"
                            />
                            <input
                              type="number"
                              disabled={!!single.locked}
                              value={Math.round(single.rotation || 0)}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                if (Number.isFinite(v)) {
                                  onUpdateElement(single.id, {
                                    rotation: ((Math.round(v) % 360) + 360) % 360,
                                  });
                                }
                              }}
                              onBlur={() => onCommitHistory?.()}
                              className="w-14 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-1 font-mono text-xs text-[var(--fg)] outline-none focus:border-[var(--accent)]"
                            />
                          </div>
                        </label>

                        {onReorderLayer && (
                          <div className="border-t border-[var(--border)] pt-2.5">
                            <div className="mb-1.5 text-[10px] font-medium text-[var(--muted)]">Layer Order</div>
                            <div className="grid grid-cols-4 gap-1">
                              {(
                                [
                                  { id: "front", label: "Front" },
                                  { id: "up", label: "Fwd" },
                                  { id: "down", label: "Back" },
                                  { id: "back", label: "Bottom" },
                                ] as const
                              ).map((btn) => (
                                <button
                                  key={btn.id}
                                  type="button"
                                  onClick={() => onReorderLayer(single.id, btn.id)}
                                  className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] py-1 text-[10px] font-medium text-[var(--fg)] hover:border-[var(--accent)] cursor-pointer"
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5">
                <button
                  onClick={() => onAlign("left")}
                  title={selectedElements.length > 1 ? "Align Left Edges" : "Align Left to Page"}
                  aria-label="Align Left"
                  className="rounded p-1 hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  <AlignHorizontalJustifyStart className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onAlign("centerX")}
                  title={selectedElements.length > 1 ? "Align Horizontal Centers" : "Center Horizontally on Page"}
                  aria-label="Center Horizontally"
                  className="rounded p-1 hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  <AlignHorizontalJustifyCenter className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onAlign("right")}
                  title={selectedElements.length > 1 ? "Align Right Edges" : "Align Right to Page"}
                  aria-label="Align Right"
                  className="rounded p-1 hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  <AlignHorizontalJustifyEnd className="h-3.5 w-3.5" />
                </button>
                <div className="mx-0.5 h-3.5 w-px bg-[var(--border)]" />
                <button
                  onClick={() => onAlign("top")}
                  title={selectedElements.length > 1 ? "Align Top Edges" : "Align Top to Page"}
                  aria-label="Align Top"
                  className="rounded p-1 hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  <AlignVerticalJustifyStart className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onAlign("centerY")}
                  title={selectedElements.length > 1 ? "Align Vertical Centers" : "Center Vertically on Page"}
                  aria-label="Center Vertically"
                  className="rounded p-1 hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  <AlignVerticalJustifyCenter className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onAlign("bottom")}
                  title={selectedElements.length > 1 ? "Align Bottom Edges" : "Align Bottom to Page"}
                  aria-label="Align Bottom"
                  className="rounded p-1 hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  <AlignVerticalJustifyEnd className="h-3.5 w-3.5" />
                </button>
                {selectedElements.length >= 3 && onDistribute && (
                  <>
                    <div className="mx-0.5 h-3.5 w-px bg-[var(--border)]" />
                    <button
                      onClick={() => onDistribute("h")}
                      title="Distribute Horizontally"
                      aria-label="Distribute Horizontally"
                      className="rounded p-1 hover:bg-[var(--surface-2)] cursor-pointer"
                    >
                      <AlignHorizontalSpaceAround className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDistribute("v")}
                      title="Distribute Vertically"
                      aria-label="Distribute Vertically"
                      className="rounded p-1 hover:bg-[var(--surface-2)] cursor-pointer"
                    >
                      <AlignVerticalSpaceAround className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>

              {(selectedElements.length > 1 || isGrouped) && (
                <button
                  onClick={onGroupToggle}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium cursor-pointer"
                >
                  {isGrouped ? <Ungroup className="h-3.5 w-3.5" /> : <Group className="h-3.5 w-3.5" />}
                  {isGrouped ? "Ungroup" : "Group"}
                </button>
              )}

              {single && (
                <button
                  onClick={() => onUpdateElement(single.id, { locked: !single.locked }, true)}
                  title={single.locked ? "Unlock" : "Lock"}
                  className="rounded p-1.5 hover:bg-[var(--surface-3)] cursor-pointer"
                >
                  {single.locked ? <Lock className="h-3.5 w-3.5 text-amber-500" /> : <Unlock className="h-3.5 w-3.5" />}
                </button>
              )}

              <button
                onClick={onDuplicateSelected}
                title="Duplicate (⌘D)"
                className="rounded p-1.5 hover:bg-[var(--surface-3)] cursor-pointer"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDeleteSelected}
                title="Delete"
                className="rounded p-1.5 text-rose-500 hover:bg-rose-500/10 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
