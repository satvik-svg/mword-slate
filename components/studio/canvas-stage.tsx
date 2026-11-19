"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, LayoutTemplate, Lock, MessageSquare, RotateCw, Type } from "lucide-react";
import { ElementRenderer } from "@/components/studio/element-renderer";
import { pageBackgroundStyle } from "@/components/page-preview";
import { makeId } from "@/lib/id";
import type {
  CanvasElement,
  DesignComment,
  DesignPage,
  DrawElement,
  TableElement,
} from "@/lib/types";

type GuideLine = { orientation: "v" | "h"; pos: number };

type DragMode =
  | null
  | {
      kind: "move";
      startX: number;
      startY: number;
      initial: { id: string; x: number; y: number }[];
    }
  | {
      kind: "resize";
      handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
      id: string;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
      origW: number;
      origH: number;
      origFontSize?: number;
    }
  | {
      kind: "rotate";
      id: string;
      cx: number;
      cy: number;
      startAngle: number;
      origRotation: number;
    }
  | {
      kind: "marquee";
      startX: number;
      startY: number;
      currX: number;
      currY: number;
    };

export function CanvasStage({
  page,
  width,
  height,
  zoom,
  selectedIds,
  onSelect,
  onUpdateElements,
  onCommitHistory,
  onAddElement,
  readOnly = false,
  drawTool,
  commentMode = false,
  comments = [],
  onPinComment,
  onSelectComment,
  onQuickAddHeading,
  onQuickOpenUploads,
  onQuickOpenTemplates,
}: {
  page: DesignPage;
  width: number;
  height: number;
  zoom: number;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onUpdateElements: (updater: (els: CanvasElement[]) => CanvasElement[]) => void;
  onCommitHistory: () => void;
  onAddElement: (el: CanvasElement) => void;
  readOnly?: boolean;
  drawTool: {
    active: boolean;
    brush: "pen" | "marker" | "highlighter";
    color: string;
    strokeWidth: number;
  };
  commentMode?: boolean;
  comments?: DesignComment[];
  onPinComment?: (xPct: number, yPct: number) => void;
  onSelectComment?: (id: string) => void;
  onQuickAddHeading?: () => void;
  onQuickOpenUploads?: () => void;
  onQuickOpenTemplates?: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragMode>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [spacePanning, setSpacePanning] = useState(false);
  const [panOrigin, setPanOrigin] = useState<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const [liveStroke, setLiveStroke] = useState<{ x: number; y: number }[] | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !editingId && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        setSpacePanning(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePanning(false);
        setPanOrigin(null);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [editingId]);

  const toCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = artboardRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left) / zoom,
        y: (clientY - rect.top) / zoom,
      };
    },
    [zoom],
  );

  useEffect(() => {
    if (!drag && !panOrigin && !liveStroke) return;

    const handleMove = (e: MouseEvent) => {
      if (panOrigin && stageRef.current) {
        stageRef.current.scrollLeft = panOrigin.scrollLeft - (e.clientX - panOrigin.x);
        stageRef.current.scrollTop = panOrigin.scrollTop - (e.clientY - panOrigin.y);
        return;
      }

      if (liveStroke) {
        const pt = toCanvasCoords(e.clientX, e.clientY);
        setLiveStroke((prev) => (prev ? [...prev, pt] : [pt]));
        return;
      }

      if (!drag) return;

      if (drag.kind === "marquee") {
        const pt = toCanvasCoords(e.clientX, e.clientY);
        setDrag({ ...drag, currX: pt.x, currY: pt.y });
        return;
      }

      if (drag.kind === "move") {
        const dx = (e.clientX - drag.startX) / zoom;
        const dy = (e.clientY - drag.startY) / zoom;

        // Magnetic snapping when moving a single item (or primary selected item)
        const activeGuides: GuideLine[] = [];
        let snapDx = dx;
        let snapDy = dy;
        const primary = drag.initial[0];
        const primaryEl = page.elements.find((el) => el.id === primary.id);
        if (primaryEl && !e.altKey) {
          const threshold = 7 / zoom;
          const candX = primary.x + dx;
          const candY = primary.y + dy;
          const candCx = candX + primaryEl.width / 2;
          const candCy = candY + primaryEl.height / 2;
          const candR = candX + primaryEl.width;
          const candB = candY + primaryEl.height;

          const vTargets: number[] = [0, width / 2, width];
          const hTargets: number[] = [0, height / 2, height];
          for (const other of page.elements) {
            if (drag.initial.some((i) => i.id === other.id) || other.hidden) continue;
            vTargets.push(other.x, other.x + other.width / 2, other.x + other.width);
            hTargets.push(other.y, other.y + other.height / 2, other.y + other.height);
          }

          for (const vt of vTargets) {
            if (Math.abs(candCx - vt) < threshold) {
              snapDx = vt - primaryEl.width / 2 - primary.x;
              activeGuides.push({ orientation: "v", pos: vt });
              break;
            }
            if (Math.abs(candX - vt) < threshold) {
              snapDx = vt - primary.x;
              activeGuides.push({ orientation: "v", pos: vt });
              break;
            }
            if (Math.abs(candR - vt) < threshold) {
              snapDx = vt - primaryEl.width - primary.x;
              activeGuides.push({ orientation: "v", pos: vt });
              break;
            }
          }
          for (const ht of hTargets) {
            if (Math.abs(candCy - ht) < threshold) {
              snapDy = ht - primaryEl.height / 2 - primary.y;
              activeGuides.push({ orientation: "h", pos: ht });
              break;
            }
            if (Math.abs(candY - ht) < threshold) {
              snapDy = ht - primary.y;
              activeGuides.push({ orientation: "h", pos: ht });
              break;
            }
            if (Math.abs(candB - ht) < threshold) {
              snapDy = ht - primaryEl.height - primary.y;
              activeGuides.push({ orientation: "h", pos: ht });
              break;
            }
          }
        }

        setGuides(activeGuides);
        const initMap = new Map(drag.initial.map((i) => [i.id, i]));
        onUpdateElements((els) =>
          els.map((el) => {
            const init = initMap.get(el.id);
            if (!init) return el;
            return {
              ...el,
              x: Math.round(init.x + snapDx),
              y: Math.round(init.y + snapDy),
            };
          }),
        );
        return;
      }

      if (drag.kind === "resize") {
        const dx = (e.clientX - drag.startX) / zoom;
        const dy = (e.clientY - drag.startY) / zoom;
        let x = drag.origX;
        let y = drag.origY;
        let w = drag.origW;
        let h = drag.origH;

        const isCorner = drag.handle.length === 2;
        if (drag.handle.includes("e")) w = Math.max(24, drag.origW + dx);
        if (drag.handle.includes("s")) h = Math.max(16, drag.origH + dy);
        if (drag.handle.includes("w")) {
          const nextW = Math.max(24, drag.origW - dx);
          x = drag.origX + (drag.origW - nextW);
          w = nextW;
        }
        if (drag.handle.includes("n")) {
          const nextH = Math.max(16, drag.origH - dy);
          y = drag.origY + (drag.origH - nextH);
          h = nextH;
        }

        if (isCorner && e.shiftKey) {
          const ratio = drag.origW / Math.max(1, drag.origH);
          h = Math.max(16, w / ratio);
        }

        onUpdateElements((els) =>
          els.map((el) => {
            if (el.id !== drag.id) return el;
            if (el.type === "text" && isCorner && drag.origFontSize) {
              const scale = w / Math.max(1, drag.origW);
              return {
                ...el,
                x: Math.round(x),
                y: Math.round(y),
                width: Math.round(w),
                height: Math.round(h),
                fontSize: Math.max(10, Math.round(drag.origFontSize * scale)),
              };
            }
            return {
              ...el,
              x: Math.round(x),
              y: Math.round(y),
              width: Math.round(w),
              height: Math.round(h),
            };
          }),
        );
        return;
      }

      if (drag.kind === "rotate") {
        const angle = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx) * (180 / Math.PI);
        let next = drag.origRotation + (angle - drag.startAngle);
        if (e.shiftKey) next = Math.round(next / 15) * 15;
        else next = Math.round(next);
        onUpdateElements((els) =>
          els.map((el) => (el.id === drag.id ? { ...el, rotation: ((next % 360) + 360) % 360 } : el)),
        );
      }
    };

    const handleUp = () => {
      if (panOrigin) {
        setPanOrigin(null);
        return;
      }
      if (liveStroke) {
        if (liveStroke.length > 2) {
          const xs = liveStroke.map((p) => p.x);
          const ys = liveStroke.map((p) => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          const maxX = Math.max(...xs);
          const maxY = Math.max(...ys);
          const drawEl: DrawElement = {
            id: makeId("el"),
            type: "draw",
            name: "Drawing",
            x: Math.round(minX),
            y: Math.round(minY),
            width: Math.max(10, Math.round(maxX - minX)),
            height: Math.max(10, Math.round(maxY - minY)),
            rotation: 0,
            opacity: 1,
            color: drawTool.color,
            strokeWidth: drawTool.strokeWidth,
            brush: drawTool.brush,
            points: liveStroke.map((p) => ({ x: p.x - minX, y: p.y - minY })),
          };
          onAddElement(drawEl);
        }
        setLiveStroke(null);
        return;
      }
      if (drag?.kind === "marquee") {
        const left = Math.min(drag.startX, drag.currX);
        const right = Math.max(drag.startX, drag.currX);
        const top = Math.min(drag.startY, drag.currY);
        const bottom = Math.max(drag.startY, drag.currY);
        if (right - left > 6 && bottom - top > 6) {
          const hits = page.elements
            .filter(
              (el) =>
                !el.hidden &&
                !el.locked &&
                el.x < right &&
                el.x + el.width > left &&
                el.y < bottom &&
                el.y + el.height > top,
            )
            .map((el) => el.id);
          onSelect(hits);
        }
      } else if (drag) {
        onCommitHistory();
      }
      setDrag(null);
      setGuides([]);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [drag, panOrigin, liveStroke, zoom, page.elements, width, height, drawTool, toCanvasCoords, onUpdateElements, onCommitHistory, onAddElement, onSelect]);

  const handleStageMouseDown = (e: React.MouseEvent) => {
    if (spacePanning && stageRef.current) {
      e.preventDefault();
      setPanOrigin({
        x: e.clientX,
        y: e.clientY,
        scrollLeft: stageRef.current.scrollLeft,
        scrollTop: stageRef.current.scrollTop,
      });
      return;
    }

    if (commentMode && onPinComment) {
      const pt = toCanvasCoords(e.clientX, e.clientY);
      if (pt.x >= 0 && pt.x <= width && pt.y >= 0 && pt.y <= height) {
        onPinComment((pt.x / width) * 100, (pt.y / height) * 100);
      }
      return;
    }

    if (drawTool.active && !readOnly) {
      const pt = toCanvasCoords(e.clientX, e.clientY);
      setLiveStroke([pt]);
      return;
    }

    setEditingId(null);
    onSelect([]);

    if (!readOnly) {
      const pt = toCanvasCoords(e.clientX, e.clientY);
      setDrag({ kind: "marquee", startX: pt.x, startY: pt.y, currX: pt.x, currY: pt.y });
    }
  };

  const handleElementMouseDown = (e: React.MouseEvent, el: CanvasElement) => {
    if (spacePanning || drawTool.active || commentMode) return;
    e.stopPropagation();

    // Expand group selection if element belongs to a group
    const groupIds = el.groupId
      ? page.elements.filter((item) => item.groupId === el.groupId && !item.hidden).map((i) => i.id)
      : [el.id];

    let nextSelected: string[];
    if (e.shiftKey) {
      nextSelected = selectedIds.includes(el.id)
        ? selectedIds.filter((id) => !groupIds.includes(id))
        : Array.from(new Set([...selectedIds, ...groupIds]));
    } else if (selectedIds.includes(el.id)) {
      nextSelected = selectedIds;
    } else {
      nextSelected = groupIds;
    }

    onSelect(nextSelected);
    if (editingId && editingId !== el.id) setEditingId(null);

    if (readOnly || el.locked) return;

    const movable = page.elements.filter((item) => nextSelected.includes(item.id) && !item.locked);
    if (movable.length === 0) return;

    setDrag({
      kind: "move",
      startX: e.clientX,
      startY: e.clientY,
      initial: movable.map((m) => ({ id: m.id, x: m.x, y: m.y })),
    });
  };

  const startResize = (
    e: React.MouseEvent,
    el: CanvasElement,
    handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w",
  ) => {
    e.stopPropagation();
    if (readOnly || el.locked) return;
    setDrag({
      kind: "resize",
      handle,
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
      origW: el.width,
      origH: el.height,
      origFontSize: el.type === "text" ? el.fontSize : undefined,
    });
  };

  const startRotate = (e: React.MouseEvent, el: CanvasElement) => {
    e.stopPropagation();
    if (readOnly || el.locked || !artboardRef.current) return;
    const rect = artboardRef.current.getBoundingClientRect();
    const cx = rect.left + (el.x + el.width / 2) * zoom;
    const cy = rect.top + (el.y + el.height / 2) * zoom;
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI);
    setDrag({
      kind: "rotate",
      id: el.id,
      cx,
      cy,
      startAngle,
      origRotation: el.rotation || 0,
    });
  };

  const singleSelected =
    selectedIds.length === 1
      ? page.elements.find((el) => el.id === selectedIds[0]) ?? null
      : null;

  const pageComments = comments.filter((c) => c.pageId === page.id && !c.resolved);

  return (
    <div
      ref={stageRef}
      onMouseDown={handleStageMouseDown}
      className={`relative flex-1 overflow-auto bg-[var(--stage)] ${
        spacePanning
          ? "cursor-grab"
          : drawTool.active || commentMode
            ? "cursor-crosshair"
            : "cursor-default"
      }`}
    >
      <div
        className="flex min-h-full min-w-full items-center justify-center p-10"
        style={{
          minWidth: Math.max(width * zoom + 80, 320),
          minHeight: Math.max(height * zoom + 80, 280),
        }}
      >
        <div
          ref={artboardRef}
          className="relative shadow-2xl ring-1 ring-black/10"
          style={{
            width: width * zoom,
