import type { CanvasElement } from "@/lib/types";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export type BoxBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
};

export type AlignMode = "left" | "centerX" | "right" | "top" | "centerY" | "bottom";

export type SpacingGuide = {
  orientation: "h" | "v";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  distance: number;
};

export function computeRotatedResize(params: {
  handle: ResizeHandle;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  rotationDeg: number;
  dx: number;
  dy: number;
  lockAspect?: boolean;
  minW?: number;
  minH?: number;
}): { x: number; y: number; width: number; height: number } {
  const {
    handle,
    origX,
    origY,
    origW,
    origH,
    rotationDeg,
    dx,
    dy,
    lockAspect = false,
    minW = 24,
    minH = 16,
  } = params;

  const rad = ((rotationDeg || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Project world-space pointer delta into the element's rotated local frame
  const ldx = dx * cos + dy * sin;
  const ldy = -dx * sin + dy * cos;

  let w = origW;
  let h = origH;
  let dcxLocal = 0;
  let dcyLocal = 0;

  if (handle.includes("e")) {
    w = Math.max(minW, origW + ldx);
    dcxLocal = (w - origW) / 2;
  } else if (handle.includes("w")) {
    w = Math.max(minW, origW - ldx);
    dcxLocal = -(w - origW) / 2;
  }

  if (handle.includes("s")) {
    h = Math.max(minH, origH + ldy);
    dcyLocal = (h - origH) / 2;
  } else if (handle.includes("n")) {
    h = Math.max(minH, origH - ldy);
    dcyLocal = -(h - origH) / 2;
  }

  const isCorner = handle.length === 2;
  if (isCorner && lockAspect) {
    const ratio = origW / Math.max(1, origH);
    h = Math.max(minH, w / ratio);
    dcyLocal = handle.includes("s") ? (h - origH) / 2 : -(h - origH) / 2;
  }

  // Rotate local center shift back into world space so the opposite anchor stays pinned
  const dcxWorld = dcxLocal * cos - dcyLocal * sin;
  const dcyWorld = dcxLocal * sin + dcyLocal * cos;

  const origCx = origX + origW / 2;
  const origCy = origY + origH / 2;
  const nextCx = origCx + dcxWorld;
  const nextCy = origCy + dcyWorld;

  return {
    x: nextCx - w / 2,
    y: nextCy - h / 2,
    width: w,
    height: h,
  };
}

export function getElementAABB(el: Pick<CanvasElement, "x" | "y" | "width" | "height" | "rotation">): BoxBounds {
  const rad = ((el.rotation || 0) * Math.PI) / 180;
  if (Math.abs(rad) < 1e-6) {
    return {
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      cx: el.x + el.width / 2,
      cy: el.y + el.height / 2,
    };
  }
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const bw = el.width * cos + el.height * sin;
  const bh = el.width * sin + el.height * cos;
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  return {
    x: cx - bw / 2,
    y: cy - bh / 2,
    width: bw,
    height: bh,
    cx,
    cy,
  };
}

export function getSelectionBounds(
  elements: Pick<CanvasElement, "x" | "y" | "width" | "height" | "rotation">[],
): BoxBounds | null {
  if (!elements.length) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const el of elements) {
    const aabb = getElementAABB(el);
    if (aabb.x < minX) minX = aabb.x;
    if (aabb.y < minY) minY = aabb.y;
    if (aabb.x + aabb.width > maxX) maxX = aabb.x + aabb.width;
    if (aabb.y + aabb.height > maxY) maxY = aabb.y + aabb.height;
  }
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  return {
    x: minX,
    y: minY,
    width,
    height,
    cx: minX + width / 2,
    cy: minY + height / 2,
  };
}

export type GroupResizeItemSnapshot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
};

export function computeGroupResize(params: {
  handle: ResizeHandle;
  groupBounds: BoxBounds;
  items: GroupResizeItemSnapshot[];
  dx: number;
  dy: number;
  lockAspect?: boolean;
}): {
  bounds: BoxBounds;
  updates: { id: string; x: number; y: number; width: number; height: number; fontSize?: number }[];
} {
  const { handle, groupBounds, items, dx, dy, lockAspect = false } = params;
  const next = computeRotatedResize({
    handle,
    origX: groupBounds.x,
    origY: groupBounds.y,
    origW: groupBounds.width,
    origH: groupBounds.height,
    rotationDeg: 0,
    dx,
    dy,
    lockAspect,
    minW: 32,
    minH: 24,
  });

  const scaleX = next.width / Math.max(1, groupBounds.width);
  const scaleY = next.height / Math.max(1, groupBounds.height);
  const isCorner = handle.length === 2;
  const fontScale = Math.min(scaleX, scaleY);

  const updates = items.map((item) => {
    const relCx = item.x + item.width / 2 - groupBounds.x;
    const relCy = item.y + item.height / 2 - groupBounds.y;
    const nextW = Math.max(12, item.width * scaleX);
    const nextH = Math.max(12, item.height * scaleY);
    const nextCx = next.x + relCx * scaleX;
    const nextCy = next.y + relCy * scaleY;
    return {
      id: item.id,
      x: Math.round(nextCx - nextW / 2),
      y: Math.round(nextCy - nextH / 2),
      width: Math.round(nextW),
      height: Math.round(nextH),
      fontSize:
        isCorner && item.fontSize
          ? Math.max(10, Math.round(item.fontSize * fontScale))
          : item.fontSize,
    };
  });

  return {
    bounds: {
      x: next.x,
      y: next.y,
      width: next.width,
      height: next.height,
      cx: next.x + next.width / 2,
      cy: next.y + next.height / 2,
    },
    updates,
  };
}

export type GroupRotateItemSnapshot = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
};

export function computeGroupRotation(params: {
  pivotX: number;
  pivotY: number;
  deltaDeg: number;
  items: GroupRotateItemSnapshot[];
}): { id: string; x: number; y: number; rotation: number }[] {
  const { pivotX, pivotY, deltaDeg, items } = params;
  const rad = (deltaDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return items.map((item) => {
    const cx = item.x + item.width / 2;
    const cy = item.y + item.height / 2;
    const vx = cx - pivotX;
    const vy = cy - pivotY;
    const nextCx = pivotX + vx * cos - vy * sin;
    const nextCy = pivotY + vx * sin + vy * cos;
    const nextRot = (((item.rotation || 0) + deltaDeg) % 360 + 360) % 360;
    return {
      id: item.id,
      x: Math.round(nextCx - item.width / 2),
      y: Math.round(nextCy - item.height / 2),
      rotation: Math.round(nextRot),
    };
  });
}

export function computeAlignElements(
  elements: CanvasElement[],
  selectedIds: string[],
  mode: AlignMode,
  canvasWidth: number,
  canvasHeight: number,
): CanvasElement[] {
  const targets = elements.filter((el) => selectedIds.includes(el.id) && !el.locked);
  if (!targets.length) return elements;

  // Single selection aligns to canvas; multi-selection aligns relative to shared bounding box
  const refBox: BoxBounds =
    targets.length === 1
      ? {
          x: 0,
          y: 0,
          width: canvasWidth,
          height: canvasHeight,
          cx: canvasWidth / 2,
          cy: canvasHeight / 2,
        }
      : getSelectionBounds(targets)!;

  const targetIds = new Set(targets.map((t) => t.id));
  return elements.map((el) => {
    if (!targetIds.has(el.id)) return el;
    const aabb = getElementAABB(el);
    let dx = 0;
    let dy = 0;
    if (mode === "left") dx = refBox.x - aabb.x;
    else if (mode === "centerX") dx = refBox.cx - aabb.cx;
    else if (mode === "right") dx = refBox.x + refBox.width - (aabb.x + aabb.width);
    else if (mode === "top") dy = refBox.y - aabb.y;
    else if (mode === "centerY") dy = refBox.cy - aabb.cy;
    else if (mode === "bottom") dy = refBox.y + refBox.height - (aabb.y + aabb.height);
    return {
      ...el,
      x: Math.round(el.x + dx),
      y: Math.round(el.y + dy),
    };
  });
}

export function computeDistributeElements(
  elements: CanvasElement[],
  selectedIds: string[],
  axis: "h" | "v",
): CanvasElement[] {
  const targets = elements.filter((el) => selectedIds.includes(el.id) && !el.locked);
  if (targets.length < 3) return elements;

  const items = targets.map((el) => ({ el, aabb: getElementAABB(el) }));
  if (axis === "h") {
    items.sort((a, b) => a.aabb.x - b.aabb.x);
    const first = items[0].aabb;
    const last = items[items.length - 1].aabb;
    const totalSpan = last.x + last.width - first.x;
    const totalWidths = items.reduce((sum, item) => sum + item.aabb.width, 0);
    const gap = (totalSpan - totalWidths) / (items.length - 1);

    const shifts = new Map<string, number>();
    let cursor = first.x;
    for (let i = 0; i < items.length; i++) {
      const { el, aabb } = items[i];
      if (i > 0 && i < items.length - 1) {
        shifts.set(el.id, Math.round(cursor - aabb.x));
      }
      cursor += aabb.width + gap;
    }
    return elements.map((el) => {
      const dx = shifts.get(el.id);
      return dx !== undefined ? { ...el, x: el.x + dx } : el;
    });
  }

  items.sort((a, b) => a.aabb.y - b.aabb.y);
  const first = items[0].aabb;
  const last = items[items.length - 1].aabb;
  const totalSpan = last.y + last.height - first.y;
  const totalHeights = items.reduce((sum, item) => sum + item.aabb.height, 0);
  const gap = (totalSpan - totalHeights) / (items.length - 1);

  const shifts = new Map<string, number>();
  let cursor = first.y;
  for (let i = 0; i < items.length; i++) {
    const { el, aabb } = items[i];
    if (i > 0 && i < items.length - 1) {
      shifts.set(el.id, Math.round(cursor - aabb.y));
    }
    cursor += aabb.height + gap;
  }
  return elements.map((el) => {
    const dy = shifts.get(el.id);
    return dy !== undefined ? { ...el, y: el.y + dy } : el;
  });
}

export function computeSpacingGuides(
  movingBox: BoxBounds,
  movingIds: Set<string>,
  allElements: CanvasElement[],
  canvasWidth: number,
  canvasHeight: number,
): SpacingGuide[] {
  const mLeft = movingBox.x;
  const mRight = movingBox.x + movingBox.width;
  const mTop = movingBox.y;
  const mBottom = movingBox.y + movingBox.height;

  let bestLeft: SpacingGuide | null = null;
  let bestRight: SpacingGuide | null = null;
  let bestTop: SpacingGuide | null = null;
  let bestBottom: SpacingGuide | null = null;

  const others = allElements.filter((el) => !movingIds.has(el.id) && !el.hidden);
  for (const other of others) {
    const b = getElementAABB(other);
    const oLeft = b.x;
    const oRight = b.x + b.width;
    const oTop = b.y;
    const oBottom = b.y + b.height;

    // Horizontal neighbors (must share vertical overlap)
    const overlapTop = Math.max(mTop, oTop);
    const overlapBottom = Math.min(mBottom, oBottom);
    if (overlapBottom - overlapTop > 2) {
      const midY = (overlapTop + overlapBottom) / 2;
      if (oRight <= mLeft) {
        const dist = Math.round(mLeft - oRight);
        if (dist >= 2 && (!bestLeft || dist < bestLeft.distance)) {
          bestLeft = { orientation: "h", x1: oRight, y1: midY, x2: mLeft, y2: midY, distance: dist };
        }
      } else if (oLeft >= mRight) {
        const dist = Math.round(oLeft - mRight);
        if (dist >= 2 && (!bestRight || dist < bestRight.distance)) {
          bestRight = { orientation: "h", x1: mRight, y1: midY, x2: oLeft, y2: midY, distance: dist };
        }
      }
    }

    // Vertical neighbors (must share horizontal overlap)
    const overlapLeft = Math.max(mLeft, oLeft);
    const overlapRight = Math.min(mRight, oRight);
    if (overlapRight - overlapLeft > 2) {
      const midX = (overlapLeft + overlapRight) / 2;
      if (oBottom <= mTop) {
        const dist = Math.round(mTop - oBottom);
        if (dist >= 2 && (!bestTop || dist < bestTop.distance)) {
          bestTop = { orientation: "v", x1: midX, y1: oBottom, x2: midX, y2: mTop, distance: dist };
        }
      } else if (oTop >= mBottom) {
        const dist = Math.round(oTop - mBottom);
        if (dist >= 2 && (!bestBottom || dist < bestBottom.distance)) {
          bestBottom = { orientation: "v", x1: midX, y1: mBottom, x2: midX, y2: oTop, distance: dist };
        }
      }
    }
  }

  // Fallback to canvas edges if no neighbor on that side (and element is inside canvas)
  if (!bestLeft && mLeft >= 2 && mLeft <= canvasWidth) {
    const dist = Math.round(mLeft);
    if (dist <= 360) {
      bestLeft = { orientation: "h", x1: 0, y1: movingBox.cy, x2: mLeft, y2: movingBox.cy, distance: dist };
    }
  }
  if (!bestRight && mRight <= canvasWidth - 2 && mRight >= 0) {
    const dist = Math.round(canvasWidth - mRight);
    if (dist <= 360) {
      bestRight = { orientation: "h", x1: mRight, y1: movingBox.cy, x2: canvasWidth, y2: movingBox.cy, distance: dist };
    }
  }
  if (!bestTop && mTop >= 2 && mTop <= canvasHeight) {
    const dist = Math.round(mTop);
    if (dist <= 360) {
      bestTop = { orientation: "v", x1: movingBox.cx, y1: 0, x2: movingBox.cx, y2: mTop, distance: dist };
    }
  }
  if (!bestBottom && mBottom <= canvasHeight - 2 && mBottom >= 0) {
    const dist = Math.round(canvasHeight - mBottom);
    if (dist <= 360) {
      bestBottom = { orientation: "v", x1: movingBox.cx, y1: mBottom, x2: movingBox.cx, y2: canvasHeight, distance: dist };
    }
  }

  return [bestLeft, bestRight, bestTop, bestBottom].filter((g): g is SpacingGuide => g !== null);
}
