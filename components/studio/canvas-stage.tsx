"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clipboard,
  Copy,
  Crop,
  Group,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  LayoutTemplate,
  Lock,
  MessageSquare,
  Paintbrush,
  RotateCcw,
  RotateCw,
  Send,
  Trash2,
  Type,
  Ungroup,
  Unlock,
  X,
} from "lucide-react";
import { ElementRenderer } from "@/components/studio/element-renderer";
import { pageBackgroundStyle } from "@/components/page-preview";
import type { CollabPeer } from "@/lib/collab";
import {
  computeGroupResize,
  computeGroupRotation,
  computeRotatedResize,
  computeSpacingGuides,
  getSelectionBounds,
  type BoxBounds,
  type GroupResizeItemSnapshot,
  type GroupRotateItemSnapshot,
  type ResizeHandle,
  type SpacingGuide,
} from "@/lib/geometry";
import { makeId } from "@/lib/id";
import type {
  CanvasElement,
  DesignComment,
  DesignPage,
  DrawElement,
  ImageElement,
  TableElement,
} from "@/lib/types";

type GuideLine = { orientation: "v" | "h"; pos: number };

type DragMode =
  | null
  | {
      kind: "move";
      startX: number;
      startY: number;
      initial: { id: string; x: number; y: number; width: number; height: number; rotation: number }[];
    }
  | {
      kind: "resize";
      handle: ResizeHandle;
      id: string;
      startX: number;
      startY: number;
      origX: number;
      origY: number;
      origW: number;
      origH: number;
      origRotation: number;
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
      kind: "group-resize";
      handle: ResizeHandle;
      startX: number;
      startY: number;
      groupBounds: BoxBounds;
      items: GroupResizeItemSnapshot[];
    }
  | {
      kind: "group-rotate";
      cxScreen: number;
      cyScreen: number;
      pivotX: number;
      pivotY: number;
      startAngle: number;
      items: GroupRotateItemSnapshot[];
    }
  | {
      kind: "crop-pan";
      id: string;
      startX: number;
      startY: number;
      origOffsetX: number;
      origOffsetY: number;
      elW: number;
      elH: number;
      cropZoom: number;
    }
  | {
      kind: "marquee";
      startX: number;
      startY: number;
      currX: number;
      currY: number;
    };

type ContextMenuState =
  | null
  | {
      x: number;
      y: number;
      targetId: string | null;
      canvasX: number;
      canvasY: number;
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
  onOpenDataEditor,
  // Context menu & framing callbacks
  onCopySelected,
  onPasteSelected,
  hasClipboard = false,
  onDuplicateSelected,
  onDeleteSelected,
  onGroupToggle,
  onReorderLayer,
  onCopyStyle,
  onPasteStyle,
  hasCopiedStyle = false,
  onSetImageAsBackground,
  onSelectAll,
  onResetBackground,
  onToggleLockSelected,
  canComment = false,
  // External crop mode trigger
  croppingId: externalCroppingId,
  onChangeCroppingId,
  // Live multiplayer collaboration
  remotePeers = [],
  onCursorMove,
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
  onPinComment?: (xPct: number, yPct: number, text: string) => void;
  onSelectComment?: (id: string) => void;
  onQuickAddHeading?: () => void;
  onQuickOpenUploads?: () => void;
  onQuickOpenTemplates?: () => void;
  onOpenDataEditor?: () => void;
  onCopySelected?: () => void;
  onPasteSelected?: () => void;
  hasClipboard?: boolean;
  onDuplicateSelected?: () => void;
  onDeleteSelected?: () => void;
  onGroupToggle?: () => void;
  onReorderLayer?: (id: string, dir: "front" | "up" | "down" | "back") => void;
  onCopyStyle?: () => void;
  onPasteStyle?: () => void;
  hasCopiedStyle?: boolean;
  onSetImageAsBackground?: (img: ImageElement) => void;
  onSelectAll?: () => void;
  onResetBackground?: () => void;
  onToggleLockSelected?: () => void;
  canComment?: boolean;
  croppingId?: string | null;
  onChangeCroppingId?: (id: string | null) => void;
  remotePeers?: CollabPeer[];
  onCursorMove?: (x: number, y: number, visible: boolean) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [internalCroppingId, setInternalCroppingId] = useState<string | null>(null);
  const croppingId = externalCroppingId !== undefined ? externalCroppingId : internalCroppingId;
  const setCroppingId = useCallback(
    (id: string | null) => {
      if (onChangeCroppingId) onChangeCroppingId(id);
      else setInternalCroppingId(id);
    },
    [onChangeCroppingId],
  );

  const [drag, setDrag] = useState<DragMode>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);
  const [spacingGuides, setSpacingGuides] = useState<SpacingGuide[]>([]);
  const [spacePanning, setSpacePanning] = useState(false);
  const [panOrigin, setPanOrigin] = useState<{
    x: number;
    y: number;
    scrollLeft: number;
    scrollTop: number;
  } | null>(null);
  const [liveStroke, setLiveStroke] = useState<{ x: number; y: number }[] | null>(null);
  const [pendingPin, setPendingPin] = useState<{ xPct: number; yPct: number } | null>(null);
  const [pinDraft, setPinDraft] = useState("");
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  useEffect(() => {
    if (!commentMode) {
      setPendingPin(null);
      setPinDraft("");
    }
  }, [commentMode]);

  // Exit crop mode if element is deselected or deleted
  useEffect(() => {
    if (croppingId && (!selectedIds.includes(croppingId) || !page.elements.some((e) => e.id === croppingId))) {
      setCroppingId(null);
    }
  }, [croppingId, selectedIds, page.elements, setCroppingId]);

  // Close context menu on outside click or Escape; Escape also exits crop mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (contextMenu) setContextMenu(null);
        else if (croppingId) {
          setCroppingId(null);
          onCommitHistory();
        }
      }
    };
    const onDown = (e: MouseEvent) => {
      if (contextMenu && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [contextMenu, croppingId, setCroppingId, onCommitHistory]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !editingId &&
        !pendingPin &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
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
  }, [editingId, pendingPin]);

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

    const handleMove = (e: PointerEvent) => {
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

      if (drag.kind === "crop-pan") {
        const dxCanvas = (e.clientX - drag.startX) / zoom;
        const dyCanvas = (e.clientY - drag.startY) / zoom;
        const maxPan = Math.max(25, 50 * drag.cropZoom);
        const nextOffX = Math.max(
          -maxPan,
          Math.min(maxPan, drag.origOffsetX + (dxCanvas / Math.max(1, drag.elW)) * 100),
        );
        const nextOffY = Math.max(
          -maxPan,
          Math.min(maxPan, drag.origOffsetY + (dyCanvas / Math.max(1, drag.elH)) * 100),
        );
        onUpdateElements((els) =>
          els.map((el) =>
            el.id === drag.id && el.type === "image"
              ? {
                  ...el,
                  cropOffsetX: Math.round(nextOffX * 10) / 10,
                  cropOffsetY: Math.round(nextOffY * 10) / 10,
                }
              : el,
          ),
        );
        return;
      }

      if (drag.kind === "move") {
        const dx = (e.clientX - drag.startX) / zoom;
        const dy = (e.clientY - drag.startY) / zoom;

        const activeGuides: GuideLine[] = [];
        let snapDx = dx;
        let snapDy = dy;
        const movingIds = new Set(drag.initial.map((i) => i.id));
        const initBounds = getSelectionBounds(drag.initial);

        if (initBounds && !e.altKey) {
          const threshold = 7 / zoom;
          const candX = initBounds.x + dx;
          const candY = initBounds.y + dy;
          const candCx = candX + initBounds.width / 2;
          const candCy = candY + initBounds.height / 2;
          const candR = candX + initBounds.width;
          const candB = candY + initBounds.height;

          const vTargets: number[] = [0, width / 2, width];
          const hTargets: number[] = [0, height / 2, height];
          for (const other of page.elements) {
            if (movingIds.has(other.id) || other.hidden) continue;
            vTargets.push(other.x, other.x + other.width / 2, other.x + other.width);
            hTargets.push(other.y, other.y + other.height / 2, other.y + other.height);
          }

          for (const vt of vTargets) {
            if (Math.abs(candCx - vt) < threshold) {
              snapDx = vt - initBounds.width / 2 - initBounds.x;
              activeGuides.push({ orientation: "v", pos: vt });
              break;
            }
            if (Math.abs(candX - vt) < threshold) {
              snapDx = vt - initBounds.x;
              activeGuides.push({ orientation: "v", pos: vt });
              break;
            }
            if (Math.abs(candR - vt) < threshold) {
              snapDx = vt - initBounds.width - initBounds.x;
              activeGuides.push({ orientation: "v", pos: vt });
              break;
            }
          }
          for (const ht of hTargets) {
            if (Math.abs(candCy - ht) < threshold) {
              snapDy = ht - initBounds.height / 2 - initBounds.y;
              activeGuides.push({ orientation: "h", pos: ht });
              break;
            }
            if (Math.abs(candY - ht) < threshold) {
              snapDy = ht - initBounds.y;
              activeGuides.push({ orientation: "h", pos: ht });
              break;
            }
            if (Math.abs(candB - ht) < threshold) {
              snapDy = ht - initBounds.height - initBounds.y;
              activeGuides.push({ orientation: "h", pos: ht });
              break;
            }
          }
        }

        setGuides(activeGuides);

        if (initBounds) {
          const movedBox: BoxBounds = {
            x: Math.round(initBounds.x + snapDx),
            y: Math.round(initBounds.y + snapDy),
            width: initBounds.width,
            height: initBounds.height,
            cx: Math.round(initBounds.cx + snapDx),
            cy: Math.round(initBounds.cy + snapDy),
          };
          setSpacingGuides(
            computeSpacingGuides(movedBox, movingIds, page.elements, width, height),
          );
        }

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
        const isCorner = drag.handle.length === 2;
        const nextBox = computeRotatedResize({
          handle: drag.handle,
          origX: drag.origX,
          origY: drag.origY,
          origW: drag.origW,
          origH: drag.origH,
          rotationDeg: drag.origRotation,
          dx,
          dy,
          lockAspect: isCorner && e.shiftKey,
        });

        onUpdateElements((els) =>
          els.map((el) => {
            if (el.id !== drag.id) return el;
            if (el.type === "text" && isCorner && drag.origFontSize) {
              const scale = nextBox.width / Math.max(1, drag.origW);
              return {
                ...el,
                x: Math.round(nextBox.x),
                y: Math.round(nextBox.y),
                width: Math.round(nextBox.width),
                height: Math.round(nextBox.height),
                fontSize: Math.max(10, Math.round(drag.origFontSize * scale)),
              };
            }
            return {
              ...el,
              x: Math.round(nextBox.x),
              y: Math.round(nextBox.y),
              width: Math.round(nextBox.width),
              height: Math.round(nextBox.height),
            };
          }),
        );
        return;
      }

      if (drag.kind === "group-resize") {
        const dx = (e.clientX - drag.startX) / zoom;
        const dy = (e.clientY - drag.startY) / zoom;
        const isCorner = drag.handle.length === 2;
        const { updates } = computeGroupResize({
          handle: drag.handle,
          groupBounds: drag.groupBounds,
          items: drag.items,
          dx,
          dy,
          lockAspect: isCorner && e.shiftKey,
        });
        const map = new Map(updates.map((u) => [u.id, u]));
        onUpdateElements((els) =>
          els.map((el) => {
            const u = map.get(el.id);
            if (!u) return el;
            if (el.type === "text" && u.fontSize !== undefined) {
              return { ...el, x: u.x, y: u.y, width: u.width, height: u.height, fontSize: u.fontSize };
            }
            return { ...el, x: u.x, y: u.y, width: u.width, height: u.height };
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
        return;
      }

      if (drag.kind === "group-rotate") {
        const angle =
          Math.atan2(e.clientY - drag.cyScreen, e.clientX - drag.cxScreen) * (180 / Math.PI);
        let delta = angle - drag.startAngle;
        if (e.shiftKey) delta = Math.round(delta / 15) * 15;
        const updates = computeGroupRotation({
          pivotX: drag.pivotX,
          pivotY: drag.pivotY,
          deltaDeg: delta,
          items: drag.items,
        });
        const map = new Map(updates.map((u) => [u.id, u]));
        onUpdateElements((els) =>
          els.map((el) => {
            const u = map.get(el.id);
            return u ? { ...el, x: u.x, y: u.y, rotation: u.rotation } : el;
          }),
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
      setSpacingGuides([]);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [
    drag,
    panOrigin,
    liveStroke,
    zoom,
    page.elements,
    width,
    height,
    drawTool,
    toCanvasCoords,
    onUpdateElements,
    onCommitHistory,
    onAddElement,
    onSelect,
  ]);

  const handleStagePointerDown = (e: React.PointerEvent) => {
    setContextMenu(null);
    if (e.pointerType === "mouse" && e.button !== 0) return;

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
        setPendingPin({
          xPct: (pt.x / width) * 100,
          yPct: (pt.y / height) * 100,
        });
        setPinDraft("");
      }
      return;
    }

    if (drawTool.active && !readOnly) {
      e.preventDefault();
      const pt = toCanvasCoords(e.clientX, e.clientY);
      setLiveStroke([pt]);
      return;
    }

    if (croppingId) {
      setCroppingId(null);
      onCommitHistory();
    }
    setEditingId(null);
    onSelect([]);

    if (!readOnly && e.pointerType !== "touch") {
      const pt = toCanvasCoords(e.clientX, e.clientY);
      setDrag({ kind: "marquee", startX: pt.x, startY: pt.y, currX: pt.x, currY: pt.y });
    }
  };

  const handleElementPointerDown = (e: React.PointerEvent, el: CanvasElement) => {
    setContextMenu(null);
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (spacePanning || drawTool.active || commentMode) return;
    e.stopPropagation();

    // If this image is currently in interactive frame pan/zoom mode, drag pans the photo inside its frame
    if (croppingId === el.id && el.type === "image" && !readOnly && !el.locked) {
      e.preventDefault();
      setDrag({
        kind: "crop-pan",
        id: el.id,
        startX: e.clientX,
        startY: e.clientY,
        origOffsetX: el.cropOffsetX ?? 0,
        origOffsetY: el.cropOffsetY ?? 0,
        elW: el.width,
        elH: el.height,
        cropZoom: Math.max(1, el.cropZoom ?? 1),
      });
      return;
    }

    if (croppingId && croppingId !== el.id) {
      setCroppingId(null);
      onCommitHistory();
    }

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
      initial: movable.map((m) => ({
        id: m.id,
        x: m.x,
        y: m.y,
        width: m.width,
        height: m.height,
        rotation: m.rotation || 0,
      })),
    });
  };

  const handleElementContextMenu = (e: React.MouseEvent, el: CanvasElement) => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    if (!selectedIds.includes(el.id)) {
      const groupIds = el.groupId
        ? page.elements.filter((item) => item.groupId === el.groupId && !item.hidden).map((i) => i.id)
        : [el.id];
      onSelect(groupIds);
    }
    const pt = toCanvasCoords(e.clientX, e.clientY);
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: el.id, canvasX: pt.x, canvasY: pt.y });
  };

  const handleStageContextMenu = (e: React.MouseEvent) => {
    if (readOnly) return;
    e.preventDefault();
    const pt = toCanvasCoords(e.clientX, e.clientY);
    setContextMenu({ x: e.clientX, y: e.clientY, targetId: null, canvasX: pt.x, canvasY: pt.y });
  };

  const startResize = (e: React.PointerEvent, el: CanvasElement, handle: ResizeHandle) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
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
      origRotation: el.rotation || 0,
      origFontSize: el.type === "text" ? el.fontSize : undefined,
    });
  };

  const startRotate = (e: React.PointerEvent, el: CanvasElement) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
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

  const selectedUnlocked = useMemo(
    () => page.elements.filter((el) => selectedIds.includes(el.id) && !el.hidden && !el.locked),
    [page.elements, selectedIds],
  );

  const multiGroupBounds = useMemo(
    () => (selectedIds.length > 1 && selectedUnlocked.length > 0 ? getSelectionBounds(selectedUnlocked) : null),
    [selectedIds.length, selectedUnlocked],
  );

  const startGroupResize = (e: React.PointerEvent, handle: ResizeHandle) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if (readOnly || !multiGroupBounds || selectedUnlocked.length === 0) return;
    setDrag({
      kind: "group-resize",
      handle,
      startX: e.clientX,
      startY: e.clientY,
      groupBounds: multiGroupBounds,
      items: selectedUnlocked.map((el) => ({
        id: el.id,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        fontSize: el.type === "text" ? el.fontSize : undefined,
      })),
    });
  };

  const startGroupRotate = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    if (readOnly || !multiGroupBounds || !artboardRef.current || selectedUnlocked.length === 0) return;
    const rect = artboardRef.current.getBoundingClientRect();
    const cxScreen = rect.left + multiGroupBounds.cx * zoom;
    const cyScreen = rect.top + multiGroupBounds.cy * zoom;
    const startAngle = Math.atan2(e.clientY - cyScreen, e.clientX - cxScreen) * (180 / Math.PI);
    setDrag({
      kind: "group-rotate",
      cxScreen,
      cyScreen,
      pivotX: multiGroupBounds.cx,
      pivotY: multiGroupBounds.cy,
      startAngle,
      items: selectedUnlocked.map((el) => ({
        id: el.id,
        x: el.x,
        y: el.y,
        width: el.width,
        height: el.height,
        rotation: el.rotation || 0,
      })),
    });
  };

  const submitPendingPin = () => {
    if (!pendingPin || !onPinComment) return;
    const trimmed = pinDraft.trim();
    if (!trimmed) return;
    onPinComment(pendingPin.xPct, pendingPin.yPct, trimmed);
    setPendingPin(null);
    setPinDraft("");
  };

  const singleSelected =
    selectedIds.length === 1
      ? page.elements.find((el) => el.id === selectedIds[0]) ?? null
      : null;

  const croppingElement =
    croppingId
      ? (page.elements.find((el) => el.id === croppingId && el.type === "image") as ImageElement | undefined) ??
        null
      : null;

  const pageComments = comments.filter((c) => c.pageId === page.id && !c.resolved);
  const samePagePeers = remotePeers.filter((p) => p.pageId === page.id);

  // Compute clamped viewport position for right-click context menu
  const menuPos = useMemo(() => {
    if (!contextMenu) return null;
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const menuW = 224;
    const menuH = contextMenu.targetId ? 380 : 180;
    return {
      left: Math.max(8, Math.min(contextMenu.x, vw - menuW - 8)),
      top: Math.max(8, Math.min(contextMenu.y, vh - menuH - 8)),
    };
  }, [contextMenu]);

  const contextTargetEl = contextMenu?.targetId
    ? page.elements.find((el) => el.id === contextMenu.targetId) ?? null
    : null;

  const selectedElementsForMenu = page.elements.filter((el) => selectedIds.includes(el.id));
  const allSelectedGrouped =
    selectedElementsForMenu.length > 0 && selectedElementsForMenu.every((el) => !!el.groupId);
  const allSelectedLocked =
    selectedElementsForMenu.length > 0 && selectedElementsForMenu.every((el) => !!el.locked);

  return (
    <div
      ref={stageRef}
      onPointerDown={handleStagePointerDown}
      onContextMenu={handleStageContextMenu}
      onPointerMove={(e) => {
        if (!onCursorMove) return;
        const pt = toCanvasCoords(e.clientX, e.clientY);
        onCursorMove(Math.round(pt.x), Math.round(pt.y), true);
      }}
      onPointerLeave={() => {
        if (onCursorMove) onCursorMove(0, 0, false);
      }}
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
          className={`relative shadow-2xl ring-1 ring-black/10 ${drawTool.active ? "touch-none" : ""}`}
          style={{
            width: width * zoom,
            height: height * zoom,
          }}
        >
          {/* Scaled Canvas Surface */}
          <div
            className={`origin-top-left ${page.background === "transparent" ? "checker-bg" : ""}`}
            style={{
              width,
              height,
              transform: `scale(${zoom})`,
              position: "relative",
              overflow: "hidden",
              ...pageBackgroundStyle(page),
            }}
          >
            {page.elements
              .filter((el) => !el.hidden)
              .map((el) => {
                const isSelected = selectedIds.includes(el.id);
                const isEditing = editingId === el.id;
                const isCropping = croppingId === el.id;
                const remoteSelectingPeer = samePagePeers.find((p) => p.selectedIds?.includes(el.id));
                return (
                  <div
                    key={el.id}
                    onPointerDown={(e) => handleElementPointerDown(e, el)}
                    onContextMenu={(e) => handleElementContextMenu(e, el)}
                    onWheel={(e) => {
                      if (!isCropping || el.type !== "image" || readOnly || el.locked) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const delta = e.deltaY < 0 ? 0.12 : -0.12;
                      const nextZoom = Math.max(1, Math.min(3, Math.round(((el.cropZoom ?? 1) + delta) * 100) / 100));
                      onUpdateElements((els) =>
                        els.map((item) =>
                          item.id === el.id && item.type === "image"
                            ? {
                                ...item,
                                cropZoom: nextZoom,
                                cropOffsetX: nextZoom === 1 ? 0 : item.cropOffsetX,
                                cropOffsetY: nextZoom === 1 ? 0 : item.cropOffsetY,
                              }
                            : item,
                        ),
                      );
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      if (readOnly || el.locked) return;
                      if (el.type === "text" || el.type === "table") {
                        setEditingId(el.id);
                      } else if (el.type === "chart") {
                        onOpenDataEditor?.();
                      } else if (el.type === "image") {
                        setCroppingId(el.id);
                      }
                    }}
                    className={!readOnly && !el.locked && !isEditing ? "touch-none" : undefined}
                    style={{
                      position: "absolute",
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      opacity: el.opacity ?? 1,
                      transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipX ? -1 : 1}) scaleY(${el.flipY ? -1 : 1})`,
                      outline:
                        isSelected && selectedIds.length > 1
                          ? `${1.25 / zoom}px dashed #2563EB`
                          : remoteSelectingPeer
                            ? `${1.75 / zoom}px solid ${remoteSelectingPeer.color}`
                            : undefined,
                      cursor: readOnly
                        ? "default"
                        : el.locked
                          ? "not-allowed"
                          : isCropping
                            ? "grab"
                            : isEditing
                              ? "text"
                              : "move",
                    }}
                  >
                    <ElementRenderer
                      element={el}
                      editing={isEditing}
                      onChangeText={(text) =>
                        onUpdateElements((els) =>
                          els.map((item) => (item.id === el.id ? { ...item, text } : item)),
                        )
                      }
                      onEndEdit={() => {
                        setEditingId(null);
                        onCommitHistory();
                      }}
                      onChangeTableCell={(r, c, value) =>
                        onUpdateElements((els) =>
                          els.map((item) => {
                            if (item.id !== el.id || item.type !== "table") return item;
                            const nextRows = (item as TableElement).rows.map((row, ri) =>
                              ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row,
                            );
                            return { ...item, rows: nextRows };
                          }),
                        )
                      }
                      onCommitTableCell={onCommitHistory}
                    />
                  </div>
                );
              })}

            {/* Live freehand stroke preview */}
            {liveStroke && liveStroke.length > 1 && (
              <svg className="pointer-events-none absolute inset-0" width={width} height={height}>
                <path
                  d={liveStroke
                    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
                    .join(" ")}
                  fill="none"
                  stroke={drawTool.color}
                  strokeWidth={drawTool.strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={drawTool.brush === "highlighter" ? 0.42 : 1}
                />
              </svg>
            )}

            {/* Magnetic Alignment Guides */}
            {guides.map((g, idx) =>
              g.orientation === "v" ? (
                <div
                  key={idx}
                  className="pointer-events-none absolute top-0 bottom-0"
                  style={{ left: g.pos, width: Math.max(1, 1.5 / zoom), background: "#EC4899" }}
                />
              ) : (
                <div
                  key={idx}
                  className="pointer-events-none absolute left-0 right-0"
                  style={{ top: g.pos, height: Math.max(1, 1.5 / zoom), background: "#EC4899" }}
                />
              ),
            )}

            {/* Marquee selection box */}
            {drag?.kind === "marquee" && (
              <div
                className="pointer-events-none absolute border border-blue-500 bg-blue-500/10"
                style={{
                  left: Math.min(drag.startX, drag.currX),
                  top: Math.min(drag.startY, drag.currY),
                  width: Math.abs(drag.currX - drag.startX),
                  height: Math.abs(drag.currY - drag.startY),
                }}
              />
            )}
          </div>

          {/* Unscaled Smart Spacing Guides (Canva/Figma-style red distance measurements) */}
          {spacingGuides.length > 0 && (
            <div className="pointer-events-none absolute inset-0 z-20 overflow-visible">
              {spacingGuides.map((g, idx) => {
                const x1 = g.x1 * zoom;
                const y1 = g.y1 * zoom;
                const x2 = g.x2 * zoom;
                const y2 = g.y2 * zoom;
                const len = g.orientation === "h" ? x2 - x1 : y2 - y1;
                if (len < 10) return null;
                return (
                  <div key={idx}>
                    {g.orientation === "h" ? (
                      <>
                        <div
                          className="absolute bg-[#F43F5E]"
                          style={{ left: x1, top: y1 - 0.5, width: len, height: 1.5 }}
                        />
                        <div
                          className="absolute bg-[#F43F5E]"
                          style={{ left: x1, top: y1 - 4, width: 1.5, height: 9 }}
                        />
                        <div
                          className="absolute bg-[#F43F5E]"
                          style={{ left: x2 - 1, top: y1 - 4, width: 1.5, height: 9 }}
                        />
                        <div
                          className="absolute -translate-x-1/2 -translate-y-1/2 rounded bg-[#F43F5E] px-1.5 py-0.5 font-mono text-[9px] font-bold leading-none text-white shadow-xs"
                          style={{ left: (x1 + x2) / 2, top: y1 - 11 }}
                        >
                          {g.distance}px
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className="absolute bg-[#F43F5E]"
                          style={{ left: x1 - 0.5, top: y1, width: 1.5, height: len }}
                        />
                        <div
                          className="absolute bg-[#F43F5E]"
                          style={{ left: x1 - 4, top: y1, width: 9, height: 1.5 }}
                        />
                        <div
                          className="absolute bg-[#F43F5E]"
                          style={{ left: x1 - 4, top: y2 - 1, width: 9, height: 1.5 }}
                        />
                        <div
                          className="absolute -translate-x-1/2 -translate-y-1/2 rounded bg-[#F43F5E] px-1.5 py-0.5 font-mono text-[9px] font-bold leading-none text-white shadow-xs"
                          style={{ left: x1 + 18, top: (y1 + y2) / 2 }}
                        >
                          {g.distance}px
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty-canvas beginner quick-start overlay (non-exported) */}
          {!readOnly &&
            !drawTool.active &&
            !commentMode &&
            page.elements.length === 0 &&
            !page.backgroundImage && (
              <div
                onPointerDown={(e) => e.stopPropagation()}
                className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none"
              >
                <div className="pointer-events-auto flex max-w-sm flex-col items-center rounded-2xl border border-black/10 bg-white/95 px-5 py-4 shadow-lg ring-1 ring-white/40 backdrop-blur-xs">
                  <p className="text-xs font-semibold text-neutral-900">Start designing</p>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    Pick a template on the left or drop something onto your page
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                    {onQuickAddHeading && (
                      <button
                        type="button"
                        onClick={onQuickAddHeading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-white transition hover:bg-neutral-800 cursor-pointer"
                      >
                        <Type className="h-3.5 w-3.5" /> Add heading
                      </button>
                    )}
                    {onQuickOpenUploads && (
                      <button
                        type="button"
                        onClick={onQuickOpenUploads}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-medium text-neutral-800 transition hover:bg-neutral-50 cursor-pointer"
                      >
                        <ImagePlus className="h-3.5 w-3.5 text-neutral-500" /> Upload image
                      </button>
                    )}
                    {onQuickOpenTemplates && (
                      <button
                        type="button"
                        onClick={onQuickOpenTemplates}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-medium text-neutral-800 transition hover:bg-neutral-50 cursor-pointer"
                      >
                        <LayoutTemplate className="h-3.5 w-3.5 text-neutral-500" /> Templates
                      </button>
                    )}
                  </div>
                  <p className="mt-3 text-[10px] text-neutral-400">
                    Double-click text to edit · Double-click photos to pan/zoom · Right-click for actions
                  </p>
                </div>
              </div>
            )}

          {/* Single-Selection Overlay (unscaled crisp handles) */}
          {singleSelected && !readOnly && !croppingElement && (
            <div
              className="pointer-events-none absolute"
              style={{
                left: singleSelected.x * zoom,
                top: singleSelected.y * zoom,
                width: singleSelected.width * zoom,
                height: singleSelected.height * zoom,
                transform: `rotate(${singleSelected.rotation || 0}deg)`,
              }}
            >
              <div className="absolute inset-0 border-[1.5px] border-[#2563EB]" />
              {singleSelected.locked ? (
                <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-white inline-flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Locked
                </div>
              ) : (
                <>
                  {(
                    [
                      { h: "nw", cls: "-left-1.5 -top-1.5 cursor-nwse-resize" },
                      { h: "n", cls: "left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize" },
                      { h: "ne", cls: "-right-1.5 -top-1.5 cursor-nesw-resize" },
                      { h: "e", cls: "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize" },
                      { h: "se", cls: "-right-1.5 -bottom-1.5 cursor-nwse-resize" },
                      { h: "s", cls: "left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize" },
                      { h: "sw", cls: "-left-1.5 -bottom-1.5 cursor-nesw-resize" },
                      { h: "w", cls: "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize" },
                    ] as const
                  ).map(({ h, cls }) => (
                    <div
                      key={h}
                      onPointerDown={(e) => startResize(e, singleSelected, h)}
                      className={`pointer-events-auto touch-none absolute h-2.5 w-2.5 rounded-[2px] border-[1.5px] border-[#2563EB] bg-white shadow-xs ${cls}`}
                    />
                  ))}

                  <button
                    type="button"
                    onPointerDown={(e) => startRotate(e, singleSelected)}
                    title="Drag to rotate (Shift snaps 15°)"
                    className="pointer-events-auto touch-none absolute -bottom-8 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-white text-neutral-700 shadow-sm hover:border-[#2563EB] hover:text-[#2563EB] cursor-grab"
                  >
                    <RotateCw className="h-3 w-3" />
                  </button>
                </>
              )}
            </div>
          )}

          {/* Interactive Image Frame Pan/Zoom Overlay */}
          {croppingElement && !readOnly && (
            <div
              className="pointer-events-none absolute z-30"
              style={{
                left: croppingElement.x * zoom,
                top: croppingElement.y * zoom,
                width: croppingElement.width * zoom,
                height: croppingElement.height * zoom,
                transform: `rotate(${croppingElement.rotation || 0}deg)`,
              }}
            >
              {/* Rule-of-thirds guide grid */}
              <div className="absolute inset-0 border-2 border-[#2563EB] shadow-[0_0_0_1px_rgba(255,255,255,0.6)]">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/50" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/50" />
              </div>

              {/* Floating Pan/Zoom Control Pill */}
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="pointer-events-auto absolute -bottom-12 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--fg)] shadow-xl"
              >
                <Crop className="h-3.5 w-3.5 text-[#2563EB]" />
                <span className="text-[var(--muted)]">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={croppingElement.cropZoom ?? 1}
                  onChange={(e) => {
                    const nextZ = Number(e.target.value);
                    onUpdateElements((els) =>
                      els.map((item) =>
                        item.id === croppingElement.id && item.type === "image"
                          ? {
                              ...item,
                              cropZoom: nextZ,
                              cropOffsetX: nextZ === 1 ? 0 : item.cropOffsetX,
                              cropOffsetY: nextZ === 1 ? 0 : item.cropOffsetY,
                            }
                          : item,
                      ),
                    );
                  }}
                  onPointerUp={onCommitHistory}
                  className="w-20 accent-[#2563EB]"
                />
                <span className="w-9 font-mono text-[10px] text-[var(--muted)]">
                  {Math.round((croppingElement.cropZoom ?? 1) * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateElements((els) =>
                      els.map((item) =>
                        item.id === croppingElement.id && item.type === "image"
                          ? { ...item, cropZoom: 1, cropOffsetX: 0, cropOffsetY: 0 }
                          : item,
                      ),
                    );
                    onCommitHistory();
                  }}
                  title="Reset framing"
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
                >
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCroppingId(null);
                    onCommitHistory();
                  }}
                  className="inline-flex items-center gap-1 rounded-md bg-[#2563EB] px-2 py-0.5 font-semibold text-white hover:opacity-95 cursor-pointer"
                >
                  <Check className="h-3 w-3" /> Done
                </button>
              </div>
            </div>
          )}

          {/* Multi-Select Group Bounding Box Overlay */}
          {multiGroupBounds && !readOnly && (
            <div
              className="pointer-events-none absolute z-10"
              style={{
                left: multiGroupBounds.x * zoom,
                top: multiGroupBounds.y * zoom,
                width: multiGroupBounds.width * zoom,
                height: multiGroupBounds.height * zoom,
              }}
            >
              <div className="absolute inset-0 border-[1.5px] border-[#2563EB]" />
              <div className="absolute -top-6 left-0 rounded bg-[#2563EB] px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-xs">
                {selectedIds.length} selected
              </div>
              {(
                [
                  { h: "nw", cls: "-left-1.5 -top-1.5 cursor-nwse-resize" },
                  { h: "n", cls: "left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize" },
                  { h: "ne", cls: "-right-1.5 -top-1.5 cursor-nesw-resize" },
                  { h: "e", cls: "-right-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize" },
                  { h: "se", cls: "-right-1.5 -bottom-1.5 cursor-nwse-resize" },
                  { h: "s", cls: "left-1/2 -bottom-1.5 -translate-x-1/2 cursor-ns-resize" },
                  { h: "sw", cls: "-left-1.5 -bottom-1.5 cursor-nesw-resize" },
                  { h: "w", cls: "-left-1.5 top-1/2 -translate-y-1/2 cursor-ew-resize" },
                ] as const
              ).map(({ h, cls }) => (
                <div
                  key={h}
                  onPointerDown={(e) => startGroupResize(e, h)}
                  className={`pointer-events-auto touch-none absolute h-2.5 w-2.5 rounded-[2px] border-[1.5px] border-[#2563EB] bg-white shadow-xs ${cls}`}
                />
              ))}
              <button
                type="button"
                onPointerDown={startGroupRotate}
                title="Drag to rotate selection (Shift snaps 15°)"
                className="pointer-events-auto touch-none absolute -bottom-8 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-white text-neutral-700 shadow-sm hover:border-[#2563EB] hover:text-[#2563EB] cursor-grab"
              >
                <RotateCw className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Live Multiplayer Remote Cursors */}
          {samePagePeers
            .filter((p) => p.cursorVisible !== false)
            .map((peer) => (
              <div
                key={peer.clientId}
                className="pointer-events-none absolute left-0 top-0 z-30 transition-transform duration-75 ease-out"
                style={{
                  transform: `translate(${peer.x * zoom}px, ${peer.y * zoom}px)`,
                }}
              >
                <svg width="18" height="20" viewBox="0 0 18 20" fill="none" className="-ml-0.5 -mt-0.5 drop-shadow">
                  <path
                    d="M2 1.5L15.5 10.5L9.5 11.8L6.5 17.5L2 1.5Z"
                    fill={peer.color}
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                <div
                  className="ml-3 -mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm"
                  style={{ background: peer.color }}
                >
                  {peer.name}
                </div>
              </div>
            ))}

          {/* Pinned Comment Markers */}
          {pageComments.map((c, idx) => (
            <button
              key={c.id}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                onSelectComment?.(c.id);
              }}
              style={{ left: `${c.x}%`, top: `${c.y}%` }}
              title={`${c.authorName}: ${c.text}`}
              className="absolute z-20 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#141417] text-[10px] font-semibold text-white shadow-md hover:scale-110 transition cursor-pointer"
            >
              {idx + 1}
            </button>
          ))}

          {/* Inline Comment Pin Composer Popover */}
          {commentMode && pendingPin && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{
                left: `${Math.min(76, Math.max(4, pendingPin.xPct))}%`,
                top: `${Math.min(82, Math.max(4, pendingPin.yPct))}%`,
              }}
              className="absolute z-30 w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 shadow-xl"
            >
              <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-[var(--fg)]">
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3 w-3 text-[#4F46E5]" />
                  New comment
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setPendingPin(null);
                    setPinDraft("");
                  }}
                  className="rounded p-0.5 text-[var(--muted)] hover:bg-[var(--surface-2)] cursor-pointer"
                  aria-label="Cancel comment"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <textarea
                autoFocus
                rows={2}
                value={pinDraft}
                onChange={(e) => setPinDraft(e.target.value)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === "Escape") {
                    setPendingPin(null);
                    setPinDraft("");
                  } else if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitPendingPin();
                  }
                }}
                placeholder="Write a comment…"
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:border-[#4F46E5]"
              />
              <div className="mt-2 flex items-center justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPendingPin(null);
                    setPinDraft("");
                  }}
                  className="rounded-lg px-2 py-1 text-[11px] font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!pinDraft.trim()}
                  onClick={submitPendingPin}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#4F46E5] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-95 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="h-3 w-3" /> Post
                </button>
              </div>
            </div>
          )}

          {/* Comment Mode Banner */}
          {commentMode && (
            <div className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-[#141417] px-3 py-1 text-xs font-medium text-white shadow-md">
              <MessageSquare className="h-3.5 w-3.5" />
              Click anywhere on the page to pin a comment
            </div>
          )}
        </div>
      </div>

      {/* Right-Click Context Menu */}
      {contextMenu && menuPos && !readOnly && (
        <div
          ref={menuRef}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ left: menuPos.left, top: menuPos.top }}
          className="fixed z-50 w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 text-xs text-[var(--fg)] shadow-2xl"
        >
          {contextTargetEl ? (
            <>
              <MenuItem
                icon={<Copy className="h-3.5 w-3.5" />}
                label="Copy"
                shortcut="⌘C"
                onClick={() => {
                  onCopySelected?.();
                  setContextMenu(null);
                }}
              />
              {hasClipboard && (
                <MenuItem
                  icon={<Clipboard className="h-3.5 w-3.5" />}
                  label="Paste"
                  shortcut="⌘V"
                  onClick={() => {
                    onPasteSelected?.();
                    setContextMenu(null);
                  }}
                />
              )}
              <MenuItem
                icon={<Copy className="h-3.5 w-3.5" />}
                label="Duplicate"
                shortcut="⌘D"
                onClick={() => {
                  onDuplicateSelected?.();
                  setContextMenu(null);
                }}
              />
              <div className="my-1 h-px bg-[var(--border)]" />
              <MenuItem
                icon={<Layers className="h-3.5 w-3.5" />}
                label="Bring to Front"
                onClick={() => {
                  onReorderLayer?.(contextTargetEl.id, "front");
                  setContextMenu(null);
                }}
              />
              <MenuItem
                icon={<Layers className="h-3.5 w-3.5 opacity-70" />}
                label="Bring Forward"
                onClick={() => {
                  onReorderLayer?.(contextTargetEl.id, "up");
                  setContextMenu(null);
                }}
              />
              <MenuItem
                icon={<Layers className="h-3.5 w-3.5 opacity-70" />}
                label="Send Backward"
                onClick={() => {
                  onReorderLayer?.(contextTargetEl.id, "down");
                  setContextMenu(null);
                }}
              />
              <MenuItem
                icon={<Layers className="h-3.5 w-3.5" />}
                label="Send to Back"
                onClick={() => {
                  onReorderLayer?.(contextTargetEl.id, "back");
                  setContextMenu(null);
                }}
              />
              <div className="my-1 h-px bg-[var(--border)]" />
              {(selectedIds.length > 1 || allSelectedGrouped) && (
                <MenuItem
                  icon={allSelectedGrouped ? <Ungroup className="h-3.5 w-3.5" /> : <Group className="h-3.5 w-3.5" />}
                  label={allSelectedGrouped ? "Ungroup" : "Group"}
                  shortcut="⌘G"
                  onClick={() => {
                    onGroupToggle?.();
                    setContextMenu(null);
                  }}
                />
              )}
              <MenuItem
                icon={allSelectedLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                label={allSelectedLocked ? "Unlock" : "Lock"}
                onClick={() => {
                  onToggleLockSelected?.();
                  setContextMenu(null);
                }}
              />
              {selectedIds.length === 1 && (
                <MenuItem
                  icon={<Paintbrush className="h-3.5 w-3.5" />}
                  label="Copy Style"
                  onClick={() => {
                    onCopyStyle?.();
                    setContextMenu(null);
                  }}
                />
              )}
              {hasCopiedStyle && (
                <MenuItem
                  icon={<Paintbrush className="h-3.5 w-3.5 text-[var(--accent)]" />}
                  label="Paste Style"
                  onClick={() => {
                    onPasteStyle?.();
                    setContextMenu(null);
                  }}
                />
              )}
              {contextTargetEl.type === "image" && !contextTargetEl.locked && (
                <>
                  <MenuItem
                    icon={<Crop className="h-3.5 w-3.5" />}
                    label="Pan / Zoom Frame"
                    onClick={() => {
                      setCroppingId(contextTargetEl.id);
                      setContextMenu(null);
                    }}
                  />
                  <MenuItem
                    icon={<ImageIcon className="h-3.5 w-3.5" />}
                    label="Set as Page Background"
                    onClick={() => {
                      onSetImageAsBackground?.(contextTargetEl);
                      setContextMenu(null);
                    }}
                  />
                </>
              )}
              <div className="my-1 h-px bg-[var(--border)]" />
              <MenuItem
                icon={<Trash2 className="h-3.5 w-3.5" />}
                label="Delete"
                shortcut="⌫"
                danger
                onClick={() => {
                  onDeleteSelected?.();
                  setContextMenu(null);
                }}
              />
            </>
          ) : (
            <>
              {hasClipboard && (
                <MenuItem
                  icon={<Clipboard className="h-3.5 w-3.5" />}
                  label="Paste"
                  shortcut="⌘V"
                  onClick={() => {
                    onPasteSelected?.();
                    setContextMenu(null);
                  }}
                />
              )}
              <MenuItem
                icon={<Layers className="h-3.5 w-3.5" />}
                label="Select All"
                shortcut="⌘A"
                onClick={() => {
                  onSelectAll?.();
                  setContextMenu(null);
                }}
              />
              {canComment && onPinComment && (
                <MenuItem
                  icon={<MessageSquare className="h-3.5 w-3.5" />}
                  label="Pin Comment Here"
                  onClick={() => {
                    const xPct = Math.max(2, Math.min(98, (contextMenu.canvasX / width) * 100));
                    const yPct = Math.max(2, Math.min(98, (contextMenu.canvasY / height) * 100));
                    setPendingPin({ xPct, yPct });
                    setPinDraft("");
                    setContextMenu(null);
                  }}
                />
              )}
              {(page.backgroundImage || page.backgroundGradientTo) && (
                <MenuItem
                  icon={<RotateCcw className="h-3.5 w-3.5" />}
                  label="Reset Page Background"
                  onClick={() => {
                    onResetBackground?.();
                    setContextMenu(null);
                  }}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon,
  label,
  shortcut,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition cursor-pointer ${
        danger
          ? "text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
          : "text-[var(--fg)] hover:bg-[var(--surface-2)]"
      }`}
    >
      <span className="inline-flex items-center gap-2">
        <span className={danger ? "" : "text-[var(--muted)]"}>{icon}</span>
        {label}
      </span>
      {shortcut && <kbd className="font-mono text-[10px] text-[var(--muted)]">{shortcut}</kbd>}
    </button>
  );
}
