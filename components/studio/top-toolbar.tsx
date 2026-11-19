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
