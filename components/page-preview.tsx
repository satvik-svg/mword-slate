"use client";

import { ElementRenderer } from "@/components/studio/element-renderer";
import type { DesignPage } from "@/lib/types";

export function pageBackgroundStyle(page: DesignPage): React.CSSProperties {
  if (page.backgroundImage) {
    return {
      backgroundColor: page.background || "#FFFFFF",
      backgroundImage: `url(${page.backgroundImage})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  if (page.backgroundGradientTo) {
    return {
      backgroundImage: `linear-gradient(${page.backgroundGradientAngle ?? 135}deg, ${page.background}, ${page.backgroundGradientTo})`,
    };
  }
  return { backgroundColor: page.background || "#FFFFFF" };
}

export function PagePreview({
  page,
  width,
  height,
  maxWidth = 260,
  maxHeight = 180,
  className = "",
}: {
  page: DesignPage;
  width: number;
  height: number;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
}) {
  const scale = Math.min(maxWidth / Math.max(1, width), maxHeight / Math.max(1, height));
  const boxW = Math.max(1, Math.round(width * scale));
  const boxH = Math.max(1, Math.round(height * scale));

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ width: boxW, height: boxH }}
    >
      <div
        className="pointer-events-none origin-top-left"
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          ...pageBackgroundStyle(page),
        }}
      >
        {page.elements
          .filter((el) => !el.hidden)
          .map((el) => (
            <div
              key={el.id}
              style={{
                position: "absolute",
                left: el.x,
                top: el.y,
                width: el.width,
                height: el.height,
                opacity: el.opacity ?? 1,
                transform: `rotate(${el.rotation || 0}deg) scaleX(${el.flipX ? -1 : 1}) scaleY(${el.flipY ? -1 : 1})`,
              }}
            >
              <ElementRenderer element={el} />
            </div>
          ))}
      </div>
    </div>
  );
}
