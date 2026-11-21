"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  FileText,
  Grid,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { PagePreview } from "@/components/page-preview";
import type { DesignPage } from "@/lib/types";

const THUMB_MAX_H = 56;
const THUMB_MAX_W = 100;

const MemoPagePreview = memo(PagePreview);

function SlideThumbCard({
  page,
  index,
  width,
  height,
  active,
  canDelete,
  readOnly,
  isDragging,
  dropEdge,
  onSelect,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  page: DesignPage;
  index: number;
  width: number;
  height: number;
  active: boolean;
  canDelete: boolean;
  readOnly: boolean;
  isDragging: boolean;
  dropEdge: "left" | "right" | null;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) {
      cardRef.current?.scrollIntoView({
        behavior: "smooth",
        inline: "nearest",
        block: "nearest",
      });
    }
  }, [active]);

  const scale = Math.min(THUMB_MAX_W / Math.max(1, width), THUMB_MAX_H / Math.max(1, height));
  const thumbW = Math.max(36, Math.round(width * scale));
  const thumbH = Math.max(36, Math.round(height * scale));

  return (
    <div
      ref={cardRef}
      draggable={!readOnly}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className="relative flex shrink-0 items-center"
    >
      {dropEdge === "left" && (
        <div className="pointer-events-none absolute -left-1.5 top-0.5 bottom-0.5 z-20 w-0.5 rounded-full bg-[var(--focus)]" />
      )}
      {dropEdge === "right" && (
        <div className="pointer-events-none absolute -right-1.5 top-0.5 bottom-0.5 z-20 w-0.5 rounded-full bg-[var(--focus)]" />
      )}
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
        title={`${index + 1}. ${page.name}${!readOnly ? " — drag to reorder" : ""}`}
        style={{ width: thumbW, height: thumbH }}
        className={`group relative flex items-center justify-center overflow-hidden rounded-md bg-[var(--stage)] transition select-none ${
          readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
        } ${
          active
            ? "ring-2 ring-[var(--focus)] ring-offset-1 ring-offset-[var(--surface)] shadow-xs"
            : "ring-1 ring-[var(--border-strong)]/80 hover:ring-[var(--fg)]/40"
        } ${isDragging ? "opacity-40 scale-95" : ""}`}
      >
        <MemoPagePreview
          page={page}
          width={width}
          height={height}
          maxWidth={THUMB_MAX_W}
          maxHeight={THUMB_MAX_H}
          className="pointer-events-none"
        />

        {/* Compact slide index badge (Canva-style bottom-left corner) */}
        <span
          className={`pointer-events-none absolute bottom-1 left-1 rounded px-1 py-px text-[9px] font-semibold leading-tight backdrop-blur-xs ${
            active
              ? "bg-[var(--focus)] text-white"
              : "bg-black/60 text-white"
          }`}
        >
          {index + 1}
        </span>

        {/* Subtle hover quick actions (top-right) */}
        {!readOnly && (
          <div className="absolute right-1 top-1 flex items-center gap-0.5 rounded bg-black/70 p-0.5 text-white opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              draggable={false}
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicate page"
              aria-label={`Duplicate ${page.name}`}
              className="rounded p-0.5 hover:bg-white/20 cursor-pointer"
            >
              <Copy className="h-2.5 w-2.5" />
            </button>
            {canDelete && (
              <button
                type="button"
                draggable={false}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                title="Delete page"
                aria-label={`Delete ${page.name}`}
                className="rounded p-0.5 hover:bg-rose-500 cursor-pointer"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PageStrip({
  pages,
  activePageIdx,
  width,
  height,
  readOnly,
  open,
  onToggleOpen,
  notesOpen,
  hasActiveNotes,
  onToggleNotes,
  gridView,
  onToggleGridView,
  zoom,
  onZoomChange,
  onFitZoom,
  onSelectPage,
  onAddPage,
  onDuplicatePage,
  onDeletePage,
  onReorderPage,
}: {
  pages: DesignPage[];
  activePageIdx: number;
  width: number;
  height: number;
  readOnly: boolean;
  open: boolean;
  onToggleOpen: () => void;
  notesOpen: boolean;
  hasActiveNotes: boolean;
  onToggleNotes: () => void;
  gridView: boolean;
  onToggleGridView: () => void;
  zoom: number;
  onZoomChange: (nextZoom: number) => void;
  onFitZoom: () => void;
  onSelectPage: (idx: number) => void;
  onAddPage: () => void;
  onDuplicatePage: (idx: number) => void;
  onDeletePage: (idx: number) => void;
  onReorderPage: (fromIdx: number, toIdx: number) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropSlot, setDropSlot] = useState<number | null>(null);

  const scale = Math.min(THUMB_MAX_W / Math.max(1, width), THUMB_MAX_H / Math.max(1, height));
  const addTileH = Math.max(36, Math.round(height * scale));
  const zoomPct = Math.round(zoom * 100);

  const commitDrop = (fromOverride?: number | null) => {
    const from = fromOverride ?? dragIdx;
    if (from !== null && dropSlot !== null) {
      const target = dropSlot > from ? dropSlot - 1 : dropSlot;
      if (target !== from && target >= 0 && target < pages.length) {
        onReorderPage(from, target);
      }
    }
    setDragIdx(null);
    setDropSlot(null);
  };

  return (
    <div className="relative shrink-0 border-t border-[var(--border)] bg-[var(--surface)]">
      {/* Centered Canva-style collapse/expand handle */}
      <button
        type="button"
        onClick={onToggleOpen}
        title={open ? "Hide pages strip" : "Show pages strip"}
        aria-label={open ? "Hide pages strip" : "Show pages strip"}
        className="absolute -top-4 left-1/2 z-10 flex h-4 w-10 -translate-x-1/2 items-center justify-center rounded-t-md border border-b-0 border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition hover:text-[var(--fg)] cursor-pointer"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>

      {/* Collapsible Visual Slide Filmstrip */}
      {open && (
        <div
          onDragOver={(e) => {
            if (dragIdx === null) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            if (dragIdx === null) return;
            e.preventDefault();
            const raw = e.dataTransfer.getData("text/plain");
            const parsed = raw !== "" && Number.isInteger(Number(raw)) ? Number(raw) : null;
            commitDrop(parsed);
          }}
          className="flex items-center gap-2.5 overflow-x-auto border-b border-[var(--border)]/70 px-3.5 py-2"
        >
          {pages.map((p, idx) => {
            const isNoOpSlot =
              dragIdx !== null && (dropSlot === dragIdx || dropSlot === dragIdx + 1);
            const dropEdge: "left" | "right" | null =
              dragIdx !== null && dropSlot !== null && !isNoOpSlot
                ? dropSlot === idx
                  ? "left"
                  : dropSlot === idx + 1 && idx === pages.length - 1
                    ? "right"
                    : null
                : null;

            return (
              <SlideThumbCard
                key={p.id}
                page={p}
                index={idx}
                width={width}
                height={height}
                active={idx === activePageIdx}
                canDelete={pages.length > 1}
                readOnly={readOnly}
                isDragging={dragIdx === idx}
                dropEdge={dropEdge}
                onSelect={() => onSelectPage(idx)}
                onDuplicate={() => onDuplicatePage(idx)}
                onDelete={() => onDeletePage(idx)}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "move";
                  // Required by Firefox to initiate HTML5 drag-and-drop
                  e.dataTransfer.setData("text/plain", String(idx));
                  setDragIdx(idx);
                  setDropSlot(idx);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "move";
                  const rect = e.currentTarget.getBoundingClientRect();
                  const isRightHalf = e.clientX > rect.left + rect.width / 2;
                  const nextSlot = isRightHalf ? idx + 1 : idx;
                  if (dropSlot !== nextSlot) setDropSlot(nextSlot);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const raw = e.dataTransfer.getData("text/plain");
                  const parsed =
                    raw !== "" && Number.isInteger(Number(raw)) ? Number(raw) : null;
                  commitDrop(parsed);
                }}
                onDragEnd={() => {
                  setDragIdx(null);
                  setDropSlot(null);
                }}
              />
            );
          })}

          {!readOnly && (
            <button
              type="button"
              onClick={onAddPage}
              onDragOver={(e) => {
                if (dragIdx === null) return;
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                if (dropSlot !== pages.length) setDropSlot(pages.length);
              }}
              onDrop={(e) => {
                if (dragIdx === null) return;
                e.preventDefault();
                e.stopPropagation();
                const raw = e.dataTransfer.getData("text/plain");
                const parsed =
                  raw !== "" && Number.isInteger(Number(raw)) ? Number(raw) : null;
                commitDrop(parsed);
              }}
              title="Add new page"
              aria-label="Add new page"
              style={{ height: addTileH }}
              className="flex w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)]/60 text-[var(--muted)] transition hover:border-[var(--fg)]/50 hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Slim Bottom Utility Footer */}
      <div className="flex h-9 items-center justify-between gap-3 px-3 text-xs">
        <div className="flex items-center gap-1.5">
          {!readOnly && (
            <button
              type="button"
              onClick={onToggleNotes}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition cursor-pointer ${
                notesOpen
                  ? "bg-[var(--accent-soft)] text-[var(--fg)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Notes</span>
              {hasActiveNotes && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--focus)]" />
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onToggleOpen}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
            title={open ? "Hide slide previews" : "Show slide previews"}
          >
            <span>
              Page {activePageIdx + 1} / {pages.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom slider + controls */}
          <div className="hidden items-center gap-1.5 sm:flex">
            <button
              type="button"
              onClick={() => onZoomChange(Math.max(0.15, +(zoom - 0.1).toFixed(2)))}
              title="Zoom out"
              aria-label="Zoom out"
              className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="range"
              min={15}
              max={200}
              step={1}
              value={Math.min(200, Math.max(15, zoomPct))}
              onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
              aria-label="Canvas zoom"
              className="h-1 w-24 cursor-pointer accent-[var(--fg)]"
            />
            <button
              type="button"
              onClick={() => onZoomChange(Math.min(2.5, +(zoom + 0.1).toFixed(2)))}
              title="Zoom in"
              aria-label="Zoom in"
              className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>

          <button
            type="button"
            onClick={onFitZoom}
            title="Fit canvas to screen (⌘0)"
            className="min-w-[42px] rounded-md px-1.5 py-1 text-center text-[11px] font-semibold tabular-nums text-[var(--fg)] hover:bg-[var(--surface-2)] cursor-pointer"
          >
            {zoomPct}%
          </button>

          <div className="mx-0.5 h-3.5 w-px bg-[var(--border)]" />

          <button
            type="button"
            onClick={onToggleGridView}
            title={gridView ? "Back to editor" : "Grid view"}
            className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition cursor-pointer ${
              gridView
                ? "bg-[var(--accent-soft)] text-[var(--fg)]"
                : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
            }`}
          >
            <Grid className="h-3.5 w-3.5" />
            <span>Grid</span>
          </button>
        </div>
      </div>
    </div>
  );
}
