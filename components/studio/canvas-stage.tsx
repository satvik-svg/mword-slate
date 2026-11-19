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
