import type { CanvasElement, DesignPage } from "@/lib/types";

export function magicResizePages(
  pages: DesignPage[],
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number,
): DesignPage[] {
  if (oldWidth <= 0 || oldHeight <= 0) return pages;
  const scaleX = newWidth / oldWidth;
  const scaleY = newHeight / oldHeight;
  const uniform = Math.min(scaleX, scaleY);

  const resizeElement = (el: CanvasElement): CanvasElement => {
    // Full-bleed background shapes/images stretch to cover
    const isFullBleed = el.width >= oldWidth * 0.88 && el.height >= oldHeight * 0.88;
    if (isFullBleed) {
      return {
        ...el,
        x: Math.round(el.x * scaleX),
        y: Math.round(el.y * scaleY),
        width: Math.round(el.width * scaleX),
        height: Math.round(el.height * scaleY),
      };
    }

    const centerX = (el.x + el.width / 2) / oldWidth;
    const centerY = (el.y + el.height / 2) / oldHeight;
    const nextW = Math.max(24, Math.round(el.width * uniform));
    const nextH = Math.max(16, Math.round(el.height * uniform));
    const nextX = Math.round(centerX * newWidth - nextW / 2);
    const nextY = Math.round(centerY * newHeight - nextH / 2);

    if (el.type === "text") {
      return {
        ...el,
        x: Math.max(12, Math.min(newWidth - nextW - 12, nextX)),
        y: Math.max(12, Math.min(newHeight - nextH - 12, nextY)),
        width: Math.min(newWidth - 24, nextW),
        height: nextH,
        fontSize: Math.max(10, Math.round(el.fontSize * uniform)),
      };
    }

    if (el.type === "draw") {
      return {
        ...el,
        x: nextX,
        y: nextY,
        width: nextW,
        height: nextH,
        strokeWidth: Math.max(1, Math.round(el.strokeWidth * uniform)),
        points: el.points.map((p) => ({ x: p.x * uniform, y: p.y * uniform })),
      };
    }

    if (el.type === "table") {
      return {
        ...el,
        x: nextX,
        y: nextY,
        width: nextW,
        height: nextH,
        fontSize: Math.max(10, Math.round(el.fontSize * uniform)),
      };
    }

    return {
      ...el,
      x: nextX,
      y: nextY,
      width: nextW,
      height: nextH,
    };
  };

  return pages.map((page) => ({
    ...page,
    elements: page.elements.map(resizeElement),
  }));
}
