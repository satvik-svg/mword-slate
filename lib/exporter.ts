import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { getVectorIcon } from "@/lib/icons";
import { cssFilterFromImageFilters } from "@/lib/presets";
import { loadImage } from "@/lib/photo-tools";
import type {
  CanvasElement,
  ChartElement,
  DesignPage,
  DrawElement,
  IconElement,
  ImageElement,
  QrCodeElement,
  ShapeElement,
  TableElement,
  TextElement,
} from "@/lib/types";

function drawCustomRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  tl: number,
  tr: number,
  br: number,
  bl: number,
) {
  const maxR = Math.min(w / 2, h / 2);
  const rtl = Math.min(tl, maxR);
  const rtr = Math.min(tr, maxR);
  const rbr = Math.min(br, maxR);
  const rbl = Math.min(bl, maxR);
  ctx.beginPath();
  ctx.moveTo(x + rtl, y);
  ctx.lineTo(x + w - rtr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rtr);
  ctx.lineTo(x + w, y + h - rbr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rbr, y + h);
  ctx.lineTo(x + rbl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rbl);
  ctx.lineTo(x, y + rtl);
  ctx.quadraticCurveTo(x, y, x + rtl, y);
  ctx.closePath();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  drawCustomRoundedRect(ctx, x, y, w, h, r, r, r, r);
}

function buildPolygonPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  sides: number,
  offsetDeg = -90,
) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const angle = ((offsetDeg + (360 / sides) * i) * Math.PI) / 180;
    const px = cx + rx * Math.cos(angle);
    const py = cy + ry * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function buildStarPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  points = 5,
) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rFactor = i % 2 === 0 ? 1 : 0.44;
    const angle = ((-90 + (180 / points) * i) * Math.PI) / 180;
    const px = cx + rx * rFactor * Math.cos(angle);
    const py = cy + ry * rFactor * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function traceShapePath(ctx: CanvasRenderingContext2D, el: ShapeElement) {
  const { width: w, height: h } = el;
  const cx = w / 2;
  const cy = h / 2;
  switch (el.shape) {
    case "circle":
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.closePath();
      break;
    case "pill":
      drawRoundedRect(ctx, 0, 0, w, h, Math.min(w, h) / 2);
      break;
    case "triangle":
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      break;
    case "diamond":
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(w, cy);
      ctx.lineTo(cx, h);
      ctx.lineTo(0, cy);
      ctx.closePath();
      break;
    case "pentagon":
      buildPolygonPath(ctx, cx, cy, w / 2, h / 2, 5, -90);
      break;
    case "hexagon":
      buildPolygonPath(ctx, cx, cy, w / 2, h / 2, 6, -30);
      break;
    case "star":
      buildStarPath(ctx, cx, cy, w / 2, h / 2, 5);
      break;
    case "arrow":
      ctx.beginPath();
      ctx.moveTo(0, h * 0.28);
      ctx.lineTo(w * 0.62, h * 0.28);
      ctx.lineTo(w * 0.62, 0);
      ctx.lineTo(w, cy);
      ctx.lineTo(w * 0.62, h);
      ctx.lineTo(w * 0.62, h * 0.72);
      ctx.lineTo(0, h * 0.72);
      ctx.closePath();
      break;
    case "bubble": {
      const r = Math.min(24, w * 0.14, h * 0.16);
      const bh = h * 0.82;
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(w - r, 0);
      ctx.quadraticCurveTo(w, 0, w, r);
      ctx.lineTo(w, bh - r);
      ctx.quadraticCurveTo(w, bh, w - r, bh);
      ctx.lineTo(w * 0.34, bh);
      ctx.lineTo(w * 0.16, h);
      ctx.lineTo(w * 0.2, bh);
      ctx.lineTo(r, bh);
      ctx.quadraticCurveTo(0, bh, 0, bh - r);
      ctx.lineTo(0, r);
      ctx.quadraticCurveTo(0, 0, r, 0);
      ctx.closePath();
      break;
    }
    case "blob": {
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.04);
      ctx.bezierCurveTo(w * 0.88, h * 0.02, w * 1.02, h * 0.34, w * 0.92, h * 0.64);
      ctx.bezierCurveTo(w * 0.82, h * 0.95, w * 0.44, h * 1.02, w * 0.2, h * 0.88);
      ctx.bezierCurveTo(-w * 0.02, h * 0.74, w * 0.01, h * 0.34, w * 0.16, h * 0.16);
      ctx.bezierCurveTo(w * 0.28, h * 0.04, w * 0.38, h * 0.05, w * 0.5, h * 0.04);
      ctx.closePath();
      break;
    }
    case "line":
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      break;
    default:
      drawRoundedRect(ctx, 0, 0, w, h, el.borderRadius ?? 0);
      break;
  }
}

function makeLinearGradient(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  from: string,
  to: string,
  angleDeg = 135,
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const x0 = w / 2 - (dx * w) / 2;
  const y0 = h / 2 - (dy * h) / 2;
  const x1 = w / 2 + (dx * w) / 2;
  const y1 = h / 2 + (dy * h) / 2;
  const grad = ctx.createLinearGradient(x0, y0, x1, y1);
  grad.addColorStop(0, from);
  grad.addColorStop(1, to);
  return grad;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  for (const para of paragraphs) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    const words = para.split(" ");
    let current = words[0] ?? "";
    for (let i = 1; i < words.length; i++) {
      const next = `${current} ${words[i]}`;
      if (ctx.measureText(next).width <= maxWidth) {
        current = next;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }
  return lines;
}

function renderCurvedTextElement(ctx: CanvasRenderingContext2D, el: TextElement, rawText: string) {
  const curve = el.curve ?? 0;
  const x0 = 8;
  const y0 = el.height / 2;
  const x1 = el.width / 2;
  const y1 = y0 - (curve / 100) * (el.height * 0.9);
  const x2 = Math.max(x0 + 1, el.width - 8);
  const y2 = y0;

  // Build dense arc-length lookup table along the quadratic Bezier curve
  const STEPS = 180;
  const pts: { x: number; y: number; dist: number; angle: number }[] = [];
  let accum = 0;
  let prevX = x0;
  let prevY = y0;
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const mt = 1 - t;
    const px = mt * mt * x0 + 2 * mt * t * x1 + t * t * x2;
    const py = mt * mt * y0 + 2 * mt * t * y1 + t * t * y2;
    const tx = 2 * mt * (x1 - x0) + 2 * t * (x2 - x1);
    const ty = 2 * mt * (y1 - y0) + 2 * t * (y2 - y1);
    if (i > 0) accum += Math.hypot(px - prevX, py - prevY);
    pts.push({ x: px, y: py, dist: accum, angle: Math.atan2(ty, tx) });
    prevX = px;
    prevY = py;
  }

  const totalArc = accum || 1;
  const sampleAt = (d: number) => {
    const clamped = Math.max(0, Math.min(totalArc, d));
    let lo = 0;
    let hi = pts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pts[mid].dist < clamped) lo = mid + 1;
      else hi = mid;
    }
    const p = pts[lo];
    if (lo === 0) return p;
    const prev = pts[lo - 1];
    const span = Math.max(1e-5, p.dist - prev.dist);
    const f = (clamped - prev.dist) / span;
    return {
      x: prev.x + (p.x - prev.x) * f,
      y: prev.y + (p.y - prev.y) * f,
      angle: prev.angle + (p.angle - prev.angle) * f,
    };
  };

  const chars = Array.from(rawText.replace(/\n+/g, " "));
  const spacing = el.letterSpacing || 0;
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const totalTextWidth =
    widths.reduce((sum, w) => sum + w, 0) + Math.max(0, chars.length - 1) * spacing;
  let cursor = (totalArc - totalTextWidth) / 2;

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const cw = widths[i];
    const mid = cursor + cw / 2;
    const s = sampleAt(mid);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.angle);
    if (el.strokeColor && el.strokeWidth) {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.strokeText(ch, 0, 0);
    }
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    cursor += cw + spacing;
  }
}

function renderTextElement(ctx: CanvasRenderingContext2D, el: TextElement) {
  const rawText =
    el.textTransform === "uppercase"
      ? el.text.toUpperCase()
      : el.textTransform === "lowercase"
        ? el.text.toLowerCase()
        : el.text;

  if (el.backgroundColor && el.backgroundColor !== "transparent") {
    const pad = el.backgroundPadding ?? 10;
    ctx.fillStyle = el.backgroundColor;
    drawRoundedRect(ctx, -pad, -pad, el.width + pad * 2, el.height + pad * 2, el.backgroundRadius ?? 10);
    ctx.fill();
  }

  ctx.font = `${el.italic ? "italic " : ""}${el.fontWeight} ${el.fontSize}px "${el.fontFamily}", sans-serif`;
  ctx.fillStyle = el.color;
  ctx.textBaseline = "top";
  if ("letterSpacing" in ctx && el.letterSpacing) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${el.letterSpacing}px`;
  }

  if (el.shadowColor && el.shadowBlur) {
    ctx.shadowColor = el.shadowColor;
    ctx.shadowBlur = el.shadowBlur;
    ctx.shadowOffsetX = el.shadowOffsetX ?? 0;
    ctx.shadowOffsetY = el.shadowOffsetY ?? 4;
  }

  if (el.curve && Math.abs(el.curve) > 2) {
    renderCurvedTextElement(ctx, el, rawText);
    return;
  }

  const lines = wrapLines(ctx, rawText, Math.max(20, el.width));
  const lineH = el.fontSize * (el.lineHeight || 1.2);
  ctx.textAlign = el.align;
  const xPos = el.align === "center" ? el.width / 2 : el.align === "right" ? el.width : 0;

  lines.forEach((line, idx) => {
    const yPos = idx * lineH;
    if (el.strokeColor && el.strokeWidth) {
      ctx.strokeStyle = el.strokeColor;
      ctx.lineWidth = el.strokeWidth;
      ctx.strokeText(line, xPos, yPos);
    }
    ctx.fillText(line, xPos, yPos);
    if (el.underline || el.strikethrough) {
      const m = ctx.measureText(line);
      const lx =
        el.align === "center"
          ? xPos - m.width / 2
          : el.align === "right"
            ? xPos - m.width
            : xPos;
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = Math.max(1.5, el.fontSize * 0.06);
      const ly = el.underline ? yPos + el.fontSize * 1.04 : yPos + el.fontSize * 0.56;
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx + m.width, ly);
      ctx.stroke();
    }
  });
}

function renderShapeElement(ctx: CanvasRenderingContext2D, el: ShapeElement) {
  traceShapePath(ctx, el);
  if (el.shape !== "line" && el.fill && el.fill !== "transparent") {
    ctx.fillStyle = el.gradientTo
      ? makeLinearGradient(ctx, el.width, el.height, el.fill, el.gradientTo, el.gradientAngle)
      : el.fill;
    ctx.fill();
  }
  if ((el.stroke && el.stroke !== "transparent" && el.strokeWidth > 0) || el.shape === "line") {
    ctx.strokeStyle = el.stroke && el.stroke !== "transparent" ? el.stroke : el.fill;
    ctx.lineWidth = Math.max(1, el.strokeWidth || 4);
    if (el.strokeDash === "dashed") ctx.setLineDash([12, 8]);
    else if (el.strokeDash === "dotted") ctx.setLineDash([3, 6]);
    ctx.stroke();
  }
}

async function renderImageElement(ctx: CanvasRenderingContext2D, el: ImageElement) {
  try {
    const img = await loadImage(el.src);
    ctx.save();
    // Apply mask clip
    if (el.mask === "circle") {
      ctx.beginPath();
      ctx.ellipse(el.width / 2, el.height / 2, el.width / 2, el.height / 2, 0, 0, Math.PI * 2);
      ctx.clip();
    } else if (el.mask === "arch") {
      ctx.beginPath();
      ctx.arc(el.width / 2, el.width / 2, el.width / 2, Math.PI, 0, false);
      ctx.lineTo(el.width, el.height);
      ctx.lineTo(0, el.height);
      ctx.closePath();
      ctx.clip();
    } else if (el.mask === "hexagon") {
      buildPolygonPath(ctx, el.width / 2, el.height / 2, el.width / 2, el.height / 2, 6, -30);
      ctx.clip();
    } else if (el.mask === "star") {
      buildStarPath(ctx, el.width / 2, el.height / 2, el.width / 2, el.height / 2, 5);
      ctx.clip();
    } else if (el.mask === "blob") {
      traceShapePath(ctx, {
        ...el,
        type: "shape",
        shape: "blob",
        fill: "#000",
        stroke: "transparent",
        strokeWidth: 0,
      });
      ctx.clip();
    } else if (el.mask === "laptop") {
      drawCustomRoundedRect(ctx, 0, 0, el.width, el.height, 18, 18, 4, 4);
      ctx.clip();
    } else {
      const r = el.mask === "rounded" ? 36 : el.mask === "phone" ? 38 : el.borderRadius || 0;
      drawRoundedRect(ctx, 0, 0, el.width, el.height, r);
      ctx.clip();
    }

    ctx.filter = cssFilterFromImageFilters(el.filters);

    // Draw image with cover or contain
    const imgRatio = (img.naturalWidth || 1) / (img.naturalHeight || 1);
    const boxRatio = el.width / Math.max(1, el.height);
    let dx = 0;
    let dy = 0;
    let dw = el.width;
    let dh = el.height;
    if (el.fit === "cover") {
      if (imgRatio > boxRatio) {
        dw = el.height * imgRatio;
        dx = (el.width - dw) / 2;
      } else {
        dh = el.width / imgRatio;
        dy = (el.height - dh) / 2;
      }
    } else {
      if (imgRatio > boxRatio) {
        dh = el.width / imgRatio;
        dy = (el.height - dh) / 2;
      } else {
        dw = el.height * imgRatio;
        dx = (el.width - dw) / 2;
      }
    }
    const cropZoom = Math.max(1, el.cropZoom ?? 1);
    const cropOffX = ((el.cropOffsetX ?? 0) / 100) * el.width;
    const cropOffY = ((el.cropOffsetY ?? 0) / 100) * el.height;
    if (cropZoom !== 1 || cropOffX !== 0 || cropOffY !== 0) {
      ctx.save();
      ctx.translate(el.width / 2 + cropOffX, el.height / 2 + cropOffY);
      ctx.scale(cropZoom, cropZoom);
      ctx.translate(-el.width / 2, -el.height / 2);
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.restore();
    } else {
      ctx.drawImage(img, dx, dy, dw, dh);
    }
    ctx.filter = "none";

    // Vignette
    if (el.filters?.vignette > 0) {
      const grad = ctx.createRadialGradient(
        el.width / 2,
        el.height / 2,
        Math.min(el.width, el.height) * 0.25,
        el.width / 2,
        el.height / 2,
        Math.max(el.width, el.height) * 0.72,
      );
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, `rgba(0,0,0,${(el.filters.vignette / 100) * 0.75})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, el.width, el.height);
    }

    ctx.restore();

    if (el.mask === "phone") {
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = Math.max(8, el.width * 0.045);
      drawRoundedRect(ctx, 0, 0, el.width, el.height, 38);
      ctx.stroke();
    } else if (el.mask === "laptop") {
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = Math.max(6, Math.round(el.width * 0.03));
      drawCustomRoundedRect(ctx, 0, 0, el.width, el.height, 18, 18, 4, 4);
      ctx.stroke();
    } else if (el.stroke && el.strokeWidth) {
      ctx.strokeStyle = el.stroke;
      ctx.lineWidth = el.strokeWidth;
      drawRoundedRect(ctx, 0, 0, el.width, el.height, el.borderRadius || 0);
      ctx.stroke();
    }
  } catch {
    // Ignore unloaded broken image
  }
}

function renderIconElement(ctx: CanvasRenderingContext2D, el: IconElement) {
  const icon = getVectorIcon(el.iconId);
  ctx.save();
  ctx.scale(el.width / 24, el.height / 24);
  ctx.strokeStyle = el.color;
  ctx.lineWidth = el.strokeWidth || 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (el.fillColor && el.fillColor !== "transparent") {
    ctx.fillStyle = el.fillColor;
  }
  for (const d of icon.paths) {
    const path = new Path2D(d);
    if (el.fillColor && el.fillColor !== "transparent") ctx.fill(path);
    ctx.stroke(path);
  }
  ctx.restore();
}

function renderDrawElement(ctx: CanvasRenderingContext2D, el: DrawElement) {
  if (el.points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = el.color;
  ctx.lineWidth = el.strokeWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (el.brush === "highlighter") ctx.globalAlpha *= 0.42;
  ctx.beginPath();
  ctx.moveTo(el.points[0].x, el.points[0].y);
  for (let i = 1; i < el.points.length; i++) {
    ctx.lineTo(el.points[i].x, el.points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function renderTableElement(ctx: CanvasRenderingContext2D, el: TableElement) {
  const rows = el.rows.length;
  const cols = el.rows[0]?.length || 1;
  const rowH = el.height / Math.max(1, rows);
  const colW = el.width / Math.max(1, cols);

  el.rows.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      const x = cIdx * colW;
      const y = rIdx * rowH;
      ctx.fillStyle = rIdx === 0 ? el.headerBg : el.cellBg;
      ctx.fillRect(x, y, colW, rowH);
      ctx.strokeStyle = el.borderColor;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, colW, rowH);

      ctx.fillStyle = rIdx === 0 ? el.headerColor : el.cellColor;
      ctx.font = `${rIdx === 0 ? 700 : 400} ${el.fontSize}px "${el.fontFamily}", sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(cell, x + 12, y + rowH / 2, colW - 24);
    });
  });
}

function renderChartElement(ctx: CanvasRenderingContext2D, el: ChartElement) {
  const palette = ["#4F46E5", "#06B6D4", "#F43F5E", "#10B981", "#F59E0B", "#8B5CF6"];
  const titleOffset = el.title ? 40 : 12;
  if (el.title) {
    ctx.fillStyle = el.textColor;
    ctx.font = `700 22px "Plus Jakarta Sans", sans-serif`;
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText(el.title, 8, 6);
  }

  const data = el.data.length ? el.data : [{ label: "A", value: 10 }];
  const maxVal = Math.max(1, ...data.map((d) => d.value));
  const chartX = 16;
  const chartY = titleOffset + 8;
  const chartW = Math.max(40, el.width - 32);
  const chartH = Math.max(40, el.height - titleOffset - 42);

  if (el.chartKind === "pie" || el.chartKind === "donut") {
    const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
    const isDonut = el.chartKind === "donut";
    const availH = Math.max(40, el.height - titleOffset - 16);
    const radius = Math.max(20, Math.min(el.width * 0.28, availH * 0.44));
    const innerR = radius * 0.56;
    const cx = Math.max(radius + 16, el.width * 0.32);
    const cy = titleOffset + availH / 2;
    let start = -Math.PI / 2;
    data.forEach((d, idx) => {
      const slice = (Math.max(0, d.value) / total) * Math.PI * 2;
      if (slice <= 0.0001) return;
      ctx.beginPath();
      if (isDonut) {
        ctx.arc(cx, cy, radius, start, start + slice);
        ctx.arc(cx, cy, innerR, start + slice, start, true);
      } else {
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, start + slice);
      }
      ctx.closePath();
      ctx.fillStyle = d.color || palette[idx % palette.length];
      ctx.fill();
      start += slice;
    });
    // Legend
    const lx = cx + radius + 24;
    const rowH = Math.min(28, Math.max(18, Math.floor(availH / Math.max(1, data.length))));
    const fontSize = Math.min(15, Math.max(11, Math.floor(rowH * 0.58)));
    const legendTop = Math.max(titleOffset + 8, cy - (data.length * rowH) / 2);
    data.forEach((d, idx) => {
      const ly = legendTop + idx * rowH;
      ctx.fillStyle = d.color || palette[idx % palette.length];
      ctx.fillRect(lx, ly + Math.max(0, (rowH - 12) / 2), 12, 12);
      ctx.fillStyle = el.textColor;
      ctx.font = `500 ${fontSize}px "Inter", sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      const label = el.showValues !== false ? `${d.label} (${d.value})` : d.label;
      ctx.fillText(label, lx + 18, ly + rowH / 2);
    });
    return;
  }

  if (el.chartKind === "line") {
    // Subtle horizontal gridlines matching ChartView
    ctx.save();
    ctx.strokeStyle = el.textColor;
    ctx.globalAlpha *= 0.14;
    ctx.lineWidth = 1;
    for (const frac of [0, 0.5, 1]) {
      const gy = chartY + chartH * frac;
      ctx.beginPath();
      ctx.moveTo(chartX, gy);
      ctx.lineTo(chartX + chartW, gy);
      ctx.stroke();
    }
    ctx.restore();

    ctx.strokeStyle = el.accentColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    data.forEach((d, idx) => {
      const px = chartX + (idx / Math.max(1, data.length - 1)) * chartW;
      const py = chartY + chartH - (Math.max(0, d.value) / maxVal) * chartH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    data.forEach((d, idx) => {
      const px = chartX + (idx / Math.max(1, data.length - 1)) * chartW;
      const py = chartY + chartH - (Math.max(0, d.value) / maxVal) * chartH;
      ctx.fillStyle = d.color || el.accentColor;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = el.textColor;
      ctx.font = `500 14px "Inter", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(d.label, px, chartY + chartH + 8);
      if (el.showValues !== false) {
        ctx.font = `600 13px "Inter", sans-serif`;
        ctx.textBaseline = "bottom";
        ctx.fillText(String(d.value), px, py - 10);
      }
    });
    return;
  }

  // Bar chart baseline
  ctx.save();
  ctx.strokeStyle = el.textColor;
  ctx.globalAlpha *= 0.2;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(chartX - 2, chartY + chartH);
  ctx.lineTo(chartX + chartW + 2, chartY + chartH);
  ctx.stroke();
  ctx.restore();

  const gap = Math.max(6, Math.min(18, Math.floor(chartW / Math.max(4, data.length * 4))));
  const barW = Math.max(10, (chartW - gap * Math.max(0, data.length - 1)) / data.length);
  const labelFontSize = Math.min(14, Math.max(10, Math.floor(barW * 0.28)));
  data.forEach((d, idx) => {
    const bh = Math.max(4, (Math.max(0, d.value) / maxVal) * chartH);
    const bx = chartX + idx * (barW + gap);
    const by = chartY + chartH - bh;
    ctx.fillStyle = d.color || el.accentColor || palette[idx % palette.length];
    drawRoundedRect(ctx, bx, by, barW, bh, Math.min(8, barW / 4));
    ctx.fill();
    ctx.fillStyle = el.textColor;
    ctx.font = `500 ${labelFontSize}px "Inter", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(d.label, bx + barW / 2, chartY + chartH + 8);
    if (el.showValues !== false) {
      ctx.font = `700 ${labelFontSize}px "Inter", sans-serif`;
      ctx.textBaseline = "bottom";
      ctx.fillText(String(d.value), bx + barW / 2, by - 6);
    }
  });
}

async function renderQrElement(ctx: CanvasRenderingContext2D, el: QrCodeElement) {
  try {
    const dataUrl = await QRCode.toDataURL(el.value || "https://slate.laflabs-tech.workers.dev", {
      width: Math.max(128, Math.round(Math.max(el.width, el.height))),
      margin: 1,
      color: { dark: el.fgColor || "#0F172A", light: el.bgColor || "#FFFFFF" },
    });
    const img = await loadImage(dataUrl);
    ctx.drawImage(img, 0, 0, el.width, el.height);
  } catch {
    // ignore
  }
}

async function renderSingleElement(ctx: CanvasRenderingContext2D, el: CanvasElement) {
  switch (el.type) {
    case "text":
      renderTextElement(ctx, el);
      break;
    case "shape":
      renderShapeElement(ctx, el);
      break;
    case "image":
      await renderImageElement(ctx, el);
      break;
    case "icon":
      renderIconElement(ctx, el);
      break;
    case "draw":
      renderDrawElement(ctx, el);
      break;
    case "table":
      renderTableElement(ctx, el);
      break;
    case "chart":
      renderChartElement(ctx, el);
      break;
    case "qrcode":
      await renderQrElement(ctx, el);
      break;
  }
}

async function renderElementToPngDataUrl(
  el: CanvasElement,
  scale = 2,
): Promise<{ dataUrl: string; padX: number; padY: number; outW: number; outH: number }> {
  let pad = 4;
  if (el.type === "text") {
    const bgPad = el.backgroundColor && el.backgroundColor !== "transparent" ? (el.backgroundPadding ?? 10) : 0;
    const shadowPad = el.shadowBlur ? el.shadowBlur * 2 + Math.max(Math.abs(el.shadowOffsetX ?? 0), Math.abs(el.shadowOffsetY ?? 4)) : 0;
    const curvePad = el.curve && Math.abs(el.curve) > 2 ? Math.round(el.fontSize * 1.4) : 0;
    pad = Math.max(pad, bgPad + 4, shadowPad + 4, curvePad);
  } else if (el.type === "shape") {
    pad = Math.max(pad, Math.ceil((el.strokeWidth || 0) + 4));
  } else if (el.type === "image") {
    const bezel = el.mask === "phone" || el.mask === "laptop" ? Math.ceil(el.width * 0.05) : el.strokeWidth || 0;
    pad = Math.max(pad, bezel + 4);
  } else if (el.type === "draw") {
    pad = Math.max(pad, Math.ceil(el.strokeWidth + 4));
  }

  const outW = el.width + pad * 2;
  const outH = el.height + pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(outW * scale));
  canvas.height = Math.max(2, Math.round(outH * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.scale(scale, scale);
  ctx.globalAlpha = el.opacity ?? 1;
  ctx.translate(pad + el.width / 2, pad + el.height / 2);
  if (el.flipX || el.flipY) ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
  ctx.translate(-el.width / 2, -el.height / 2);
  await renderSingleElement(ctx, el);

  return {
    dataUrl: canvas.toDataURL("image/png"),
    padX: pad,
    padY: pad,
    outW,
    outH,
  };
}

async function renderPageBackgroundToDataUrl(
  page: DesignPage,
  width: number,
  height: number,
): Promise<string | null> {
  if (!page.backgroundImage && !page.backgroundGradientTo) return null;
  const maxDim = 1920;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(width * scale));
  canvas.height = Math.max(2, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  if (page.backgroundGradientTo) {
    ctx.fillStyle = makeLinearGradient(
      ctx,
      width,
      height,
      page.background,
      page.backgroundGradientTo,
      page.backgroundGradientAngle ?? 135,
    );
  } else {
    ctx.fillStyle = page.background || "#FFFFFF";
  }
  ctx.fillRect(0, 0, width, height);
  if (page.backgroundImage) {
    try {
      const bgImg = await loadImage(page.backgroundImage);
      const ir = bgImg.naturalWidth / Math.max(1, bgImg.naturalHeight);
      const cr = width / height;
      let dw = width;
      let dh = height;
      let dx = 0;
      let dy = 0;
      if (ir > cr) {
        dw = height * ir;
        dx = (width - dw) / 2;
      } else {
        dh = width / ir;
        dy = (height - dh) / 2;
      }
      ctx.drawImage(bgImg, dx, dy, dw, dh);
    } catch {
      // keep gradient / solid fallback
    }
  }
  return canvas.toDataURL("image/jpeg", 0.92);
}

export async function renderPageToCanvas(
  page: DesignPage,
  width: number,
  height: number,
  options?: { scale?: number; transparentBg?: boolean },
): Promise<HTMLCanvasElement> {
  const scale = options?.scale ?? 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.scale(scale, scale);

  // Page background
  if (!options?.transparentBg) {
    if (page.backgroundGradientTo) {
      ctx.fillStyle = makeLinearGradient(
        ctx,
        width,
        height,
        page.background,
        page.backgroundGradientTo,
        page.backgroundGradientAngle ?? 135,
      );
    } else {
      ctx.fillStyle = page.background || "#FFFFFF";
    }
    ctx.fillRect(0, 0, width, height);

    if (page.backgroundImage) {
      try {
        const bgImg = await loadImage(page.backgroundImage);
        const ir = bgImg.naturalWidth / Math.max(1, bgImg.naturalHeight);
        const cr = width / height;
        let dw = width;
        let dh = height;
        let dx = 0;
        let dy = 0;
        if (ir > cr) {
          dw = height * ir;
          dx = (width - dw) / 2;
        } else {
          dh = width / ir;
          dy = (height - dh) / 2;
        }
        ctx.drawImage(bgImg, dx, dy, dw, dh);
      } catch {
        // ignore
      }
    }
  }

  for (const el of page.elements) {
    if (el.hidden) continue;
    ctx.save();
    ctx.globalAlpha = el.opacity ?? 1;
    ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
    if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);
    if (el.flipX || el.flipY) ctx.scale(el.flipX ? -1 : 1, el.flipY ? -1 : 1);
    ctx.translate(-el.width / 2, -el.height / 2);

    await renderSingleElement(ctx, el);
    ctx.restore();
  }

  return canvas;
}

export async function generateThumbnail(
  page: DesignPage,
  width: number,
  height: number,
): Promise<string> {
  const maxThumb = 420;
  const scale = Math.min(0.45, maxThumb / Math.max(width, height));
  const canvas = await renderPageToCanvas(page, width, height, { scale });
  return canvas.toDataURL("image/jpeg", 0.72);
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export async function exportPageAsImage(
  page: DesignPage,
  width: number,
  height: number,
  format: "png" | "jpeg",
  filename: string,
  options?: { scale?: number; transparentBg?: boolean; quality?: number },
): Promise<void> {
  const canvas = await renderPageToCanvas(page, width, height, {
    scale: options?.scale ?? 2,
    transparentBg: format === "png" ? options?.transparentBg : false,
  });
  const mime = format === "png" ? "image/png" : "image/jpeg";
  const url = canvas.toDataURL(mime, options?.quality ?? 0.92);
  triggerDownload(url, `${filename}.${format === "jpeg" ? "jpg" : "png"}`);
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgLinearGradientCoords(angleDeg = 135) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x1: Math.round(50 - Math.cos(rad) * 50),
    y1: Math.round(50 - Math.sin(rad) * 50),
    x2: Math.round(50 + Math.cos(rad) * 50),
    y2: Math.round(50 + Math.sin(rad) * 50),
  };
}

function svgPolygonPoints(cx: number, cy: number, rx: number, ry: number, sides: number, offsetDeg = -90): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = ((offsetDeg + (360 / sides) * i) * Math.PI) / 180;
    pts.push(`${(cx + rx * Math.cos(a)).toFixed(1)},${(cy + ry * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

function svgStarPoints(cx: number, cy: number, rx: number, ry: number, points = 5): string {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const f = i % 2 === 0 ? 1 : 0.44;
    const a = ((-90 + (180 / points) * i) * Math.PI) / 180;
    pts.push(`${(cx + rx * f * Math.cos(a)).toFixed(1)},${(cy + ry * f * Math.sin(a)).toFixed(1)}`);
  }
  return pts.join(" ");
}

function svgBlobPath(w: number, h: number): string {
  return `M ${w * 0.5} ${h * 0.04} C ${w * 0.88} ${h * 0.02}, ${w * 1.02} ${h * 0.34}, ${w * 0.92} ${h * 0.64} C ${w * 0.82} ${h * 0.95}, ${w * 0.44} ${h * 1.02}, ${w * 0.2} ${h * 0.88} C ${-w * 0.02} ${h * 0.74}, ${w * 0.01} ${h * 0.34}, ${w * 0.16} ${h * 0.16} C ${w * 0.28} ${h * 0.04}, ${w * 0.38} ${h * 0.05}, ${w * 0.5} ${h * 0.04} Z`;
}

function svgBubblePath(w: number, h: number): string {
  const r = Math.min(24, w * 0.14, h * 0.16);
  const bh = h * 0.82;
  return `M ${r} 0 L ${w - r} 0 Q ${w} 0 ${w} ${r} L ${w} ${bh - r} Q ${w} ${bh} ${w - r} ${bh} L ${w * 0.34} ${bh} L ${w * 0.16} ${h} L ${w * 0.2} ${bh} L ${r} ${bh} Q 0 ${bh} 0 ${bh - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
}

function svgCustomRoundedRectPath(w: number, h: number, tl: number, tr: number, br: number, bl: number): string {
  const m = Math.min(w / 2, h / 2);
  const a = Math.min(tl, m);
  const b = Math.min(tr, m);
  const c = Math.min(br, m);
  const d = Math.min(bl, m);
  return `M ${a} 0 L ${w - b} 0 Q ${w} 0 ${w} ${b} L ${w} ${h - c} Q ${w} ${h} ${w - c} ${h} L ${d} ${h} Q 0 ${h} 0 ${h - d} L 0 ${a} Q 0 0 ${a} 0 Z`;
}

function approxWrapSvgLines(text: string, maxWidth: number, fontSize: number, letterSpacing = 0): string[] {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.font = `400 ${fontSize}px sans-serif`;
      return wrapLines(ctx, text, Math.max(20, maxWidth));
    }
  }
  const avgChar = Math.max(4, fontSize * 0.56 + letterSpacing);
  const maxChars = Math.max(1, Math.floor(maxWidth / avgChar));
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    const words = para.split(" ");
    let cur = words[0] ?? "";
    for (let i = 1; i < words.length; i++) {
      const next = `${cur} ${words[i]}`;
      if (next.length <= maxChars) cur = next;
      else {
        out.push(cur);
        cur = words[i];
      }
    }
    out.push(cur);
  }
  return out;
}

function buildElementSvgTransform(el: CanvasElement): string {
  const parts = [`translate(${el.x},${el.y})`];
  if (el.rotation) parts.push(`rotate(${el.rotation},${el.width / 2},${el.height / 2})`);
  if (el.flipX || el.flipY) {
    parts.push(`translate(${el.flipX ? el.width : 0},${el.flipY ? el.height : 0})`);
    parts.push(`scale(${el.flipX ? -1 : 1},${el.flipY ? -1 : 1})`);
  }
  return parts.join(" ");
}

function buildChartSvgMarkup(el: ChartElement): string {
  const palette = ["#4F46E5", "#06B6D4", "#F43F5E", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6"];
  const data = el.data.length ? el.data : [{ label: "A", value: 10 }];
  const maxVal = Math.max(1, ...data.map((d) => Math.max(0, d.value)));
  const titleH = el.title ? 40 : 12;
  const chartW = Math.max(40, el.width - 32);
  const parts: string[] = [];

  if (el.title) {
    parts.push(
      `<text x="8" y="26" fill="${escapeXml(el.textColor)}" font-family="Plus Jakarta Sans, sans-serif" font-size="22" font-weight="700">${escapeXml(el.title)}</text>`,
    );
  }

  if (el.chartKind === "pie" || el.chartKind === "donut") {
    const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
    const isDonut = el.chartKind === "donut";
    const availH = Math.max(40, el.height - titleH - 16);
    const r = Math.max(20, Math.min(el.width * 0.28, availH * 0.44));
    const innerR = r * 0.56;
    const cx = Math.max(r + 16, el.width * 0.32);
    const cy = titleH + availH / 2;
    let angle = -Math.PI / 2;

    data.forEach((d, idx) => {
      const slice = (Math.max(0, d.value) / total) * Math.PI * 2;
      if (slice <= 0.0001) return;
      const color = escapeXml(d.color || palette[idx % palette.length]);
      if (slice >= Math.PI * 1.999) {
        if (isDonut) {
          parts.push(
            `<circle cx="${cx}" cy="${cy}" r="${(r + innerR) / 2}" fill="none" stroke="${color}" stroke-width="${r - innerR}"/>`,
          );
        } else {
          parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`);
        }
      } else {
        const start = angle;
        const end = angle + slice;
        const large = slice > Math.PI ? 1 : 0;
        const x1 = cx + r * Math.cos(start);
        const y1 = cy + r * Math.sin(start);
        const x2 = cx + r * Math.cos(end);
        const y2 = cy + r * Math.sin(end);
        let pathD: string;
        if (isDonut) {
          const ix1 = cx + innerR * Math.cos(end);
          const iy1 = cy + innerR * Math.sin(end);
          const ix2 = cx + innerR * Math.cos(start);
          const iy2 = cy + innerR * Math.sin(start);
          pathD = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} L ${ix1.toFixed(2)} ${iy1.toFixed(2)} A ${innerR} ${innerR} 0 ${large} 0 ${ix2.toFixed(2)} ${iy2.toFixed(2)} Z`;
        } else {
          pathD = `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
        }
        parts.push(`<path d="${pathD}" fill="${color}"/>`);
      }
      angle += slice;
    });

    const lx = cx + r + 24;
    const rowH = Math.min(28, Math.max(18, Math.floor(availH / Math.max(1, data.length))));
    const fontSize = Math.min(14, Math.max(11, Math.floor(rowH * 0.56)));
    const legendTop = Math.max(titleH + 8, cy - (data.length * rowH) / 2);
    data.forEach((d, idx) => {
      const ly = legendTop + idx * rowH;
      const color = escapeXml(d.color || palette[idx % palette.length]);
      const label = el.showValues !== false ? `${d.label} (${d.value})` : d.label;
      parts.push(`<rect x="${lx}" y="${ly + Math.max(0, (rowH - 12) / 2)}" width="12" height="12" rx="3" fill="${color}"/>`);
      parts.push(
        `<text x="${lx + 18}" y="${ly + rowH / 2 + fontSize * 0.35}" fill="${escapeXml(el.textColor)}" font-size="${fontSize}" font-weight="500" font-family="Inter, sans-serif">${escapeXml(label)}</text>`,
      );
    });
    return parts.join("");
  }

  if (el.chartKind === "line") {
    const topPad = titleH + 22;
    const drawH = Math.max(30, el.height - topPad - 36);
    const pts = data.map((d, idx) => ({
      x: 20 + (idx / Math.max(1, data.length - 1)) * Math.max(10, chartW - 8),
      y: topPad + drawH - (Math.max(0, d.value) / maxVal) * drawH,
      label: d.label,
      value: d.value,
      color: d.color || el.accentColor,
    }));
    for (const frac of [0, 0.5, 1]) {
      const gy = topPad + drawH * frac;
      parts.push(
        `<line x1="16" x2="${el.width - 16}" y1="${gy}" y2="${gy}" stroke="${escapeXml(el.textColor)}" stroke-opacity="0.14" stroke-width="1"/>`,
      );
    }
    const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    parts.push(
      `<polyline points="${poly}" fill="none" stroke="${escapeXml(el.accentColor)}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
    pts.forEach((p) => {
      parts.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="6" fill="${escapeXml(p.color)}"/>`);
      parts.push(
        `<text x="${p.x.toFixed(1)}" y="${topPad + drawH + 24}" text-anchor="middle" fill="${escapeXml(el.textColor)}" font-size="13" font-family="Inter, sans-serif">${escapeXml(p.label)}</text>`,
      );
      if (el.showValues !== false) {
        parts.push(
          `<text x="${p.x.toFixed(1)}" y="${p.y - 12}" text-anchor="middle" fill="${escapeXml(el.textColor)}" font-size="13" font-weight="600" font-family="Inter, sans-serif">${p.value}</text>`,
        );
      }
    });
    return parts.join("");
  }

  // Bar chart
  const topPad = titleH + 24;
  const drawH = Math.max(30, el.height - topPad - 36);
  const gap = Math.max(6, Math.min(18, Math.floor(chartW / Math.max(4, data.length * 4))));
  const barW = Math.max(10, (chartW - gap * Math.max(0, data.length - 1)) / data.length);
  const labelFontSize = Math.min(14, Math.max(10, Math.floor(barW * 0.28)));
  parts.push(
    `<line x1="14" x2="${el.width - 14}" y1="${topPad + drawH}" y2="${topPad + drawH}" stroke="${escapeXml(el.textColor)}" stroke-opacity="0.2" stroke-width="1.5"/>`,
  );
  data.forEach((d, idx) => {
    const bh = Math.max(4, (Math.max(0, d.value) / maxVal) * drawH);
    const bx = 16 + idx * (barW + gap);
    const by = topPad + drawH - bh;
    const color = escapeXml(d.color || el.accentColor || palette[idx % palette.length]);
    parts.push(`<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="${Math.min(8, barW / 4).toFixed(1)}" fill="${color}"/>`);
    parts.push(
      `<text x="${(bx + barW / 2).toFixed(1)}" y="${topPad + drawH + 22}" text-anchor="middle" fill="${escapeXml(el.textColor)}" font-size="${labelFontSize}" font-weight="500" font-family="Inter, sans-serif">${escapeXml(d.label)}</text>`,
    );
    if (el.showValues !== false) {
      parts.push(
        `<text x="${(bx + barW / 2).toFixed(1)}" y="${by - 8}" text-anchor="middle" fill="${escapeXml(el.textColor)}" font-size="${labelFontSize}" font-weight="700" font-family="Inter, sans-serif">${d.value}</text>`,
      );
    }
  });
  return parts.join("");
}

function buildQrSvgMarkup(el: QrCodeElement): string {
  try {
    const qr = QRCode.create(el.value || "https://slate.laflabs-tech.workers.dev", {
      errorCorrectionLevel: "M",
    });
    const size = qr.modules.size;
    const margin = 1;
    const total = size + margin * 2;
    const cellW = el.width / total;
    const cellH = el.height / total;
    const bg = escapeXml(el.bgColor || "#FFFFFF");
    const fg = escapeXml(el.fgColor || "#0F172A");
    const rects: string[] = [`<rect x="0" y="0" width="${el.width}" height="${el.height}" fill="${bg}"/>`];
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (qr.modules.get(r, c)) {
          rects.push(
            `<rect x="${((c + margin) * cellW).toFixed(2)}" y="${((r + margin) * cellH).toFixed(2)}" width="${(cellW + 0.25).toFixed(2)}" height="${(cellH + 0.25).toFixed(2)}" fill="${fg}"/>`,
          );
        }
      }
    }
    return rects.join("");
  } catch {
    return `<rect x="0" y="0" width="${el.width}" height="${el.height}" fill="${escapeXml(el.bgColor || "#FFFFFF")}"/>`;
  }
}

export function buildPageSvgString(
  page: DesignPage,
  width: number,
  height: number,
  transparentBg = false,
): string {
  const defs: string[] = [];
  const items: string[] = [];

  if (!transparentBg) {
    if (page.backgroundGradientTo) {
      const c = svgLinearGradientCoords(page.backgroundGradientAngle ?? 135);
      defs.push(
        `<linearGradient id="bgGrad" x1="${c.x1}%" y1="${c.y1}%" x2="${c.x2}%" y2="${c.y2}%"><stop offset="0%" stop-color="${escapeXml(page.background)}"/><stop offset="100%" stop-color="${escapeXml(page.backgroundGradientTo)}"/></linearGradient>`,
      );
      items.push(`<rect width="${width}" height="${height}" fill="url(#bgGrad)"/>`);
    } else {
      items.push(`<rect width="${width}" height="${height}" fill="${escapeXml(page.background || "#FFFFFF")}"/>`);
    }
    if (page.backgroundImage) {
      items.push(
        `<image href="${escapeXml(page.backgroundImage)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice"/>`,
      );
    }
  }

  page.elements.forEach((el, idx) => {
    if (el.hidden) return;
    const transform = buildElementSvgTransform(el);
    const opacity = el.opacity ?? 1;

    if (el.type === "shape") {
      const w = el.width;
      const h = el.height;
      let fill = el.fill || "none";
      if (el.gradientTo) {
        const gid = `sg_${idx}`;
        const c = svgLinearGradientCoords(el.gradientAngle ?? 135);
        defs.push(
          `<linearGradient id="${gid}" x1="${c.x1}%" y1="${c.y1}%" x2="${c.x2}%" y2="${c.y2}%"><stop offset="0%" stop-color="${escapeXml(el.fill)}"/><stop offset="100%" stop-color="${escapeXml(el.gradientTo)}"/></linearGradient>`,
        );
        fill = `url(#${gid})`;
      }
      const dashAttr =
        el.strokeDash === "dashed"
          ? ` stroke-dasharray="10 8"`
          : el.strokeDash === "dotted"
            ? ` stroke-dasharray="3 6"`
            : "";
      const strokeAttr = `stroke="${escapeXml(el.stroke || "none")}" stroke-width="${el.strokeWidth || 0}"${dashAttr}`;
      let shapeNode = "";
      switch (el.shape) {
        case "circle":
          shapeNode = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" ${strokeAttr}/>`;
          break;
        case "line":
          shapeNode = `<line x1="0" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="${escapeXml(el.stroke && el.stroke !== "transparent" ? el.stroke : el.fill)}" stroke-width="${Math.max(2, el.strokeWidth || 4)}" stroke-linecap="round"${dashAttr}/>`;
          break;
        case "pill":
          shapeNode = `<rect x="0" y="0" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="${fill}" ${strokeAttr}/>`;
          break;
        case "triangle":
          shapeNode = `<polygon points="${w / 2},0 ${w},${h} 0,${h}" fill="${fill}" ${strokeAttr}/>`;
          break;
        case "diamond":
          shapeNode = `<polygon points="${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}" fill="${fill}" ${strokeAttr}/>`;
          break;
        case "pentagon":
          shapeNode = `<polygon points="${svgPolygonPoints(w / 2, h / 2, w / 2, h / 2, 5, -90)}" fill="${fill}" ${strokeAttr}/>`;
          break;
        case "hexagon":
          shapeNode = `<polygon points="${svgPolygonPoints(w / 2, h / 2, w / 2, h / 2, 6, -30)}" fill="${fill}" ${strokeAttr}/>`;
          break;
        case "star":
          shapeNode = `<polygon points="${svgStarPoints(w / 2, h / 2, w / 2, h / 2, 5)}" fill="${fill}" ${strokeAttr}/>`;
          break;
        case "arrow":
          shapeNode = `<polygon points="0,${h * 0.28} ${w * 0.62},${h * 0.28} ${w * 0.62},0 ${w},${h / 2} ${w * 0.62},${h} ${w * 0.62},${h * 0.72} 0,${h * 0.72}" fill="${fill}" ${strokeAttr}/>`;
          break;
        case "bubble":
          shapeNode = `<path d="${svgBubblePath(w, h)}" fill="${fill}" ${strokeAttr}/>`;
          break;
        case "blob":
          shapeNode = `<path d="${svgBlobPath(w, h)}" fill="${fill}" ${strokeAttr}/>`;
          break;
        default:
          shapeNode = `<rect x="0" y="0" width="${w}" height="${h}" rx="${el.borderRadius ?? 0}" fill="${fill}" ${strokeAttr}/>`;
          break;
      }
      items.push(`<g transform="${transform}" opacity="${opacity}">${shapeNode}</g>`);
    } else if (el.type === "text") {
      const rawText =
        el.textTransform === "uppercase"
          ? el.text.toUpperCase()
          : el.textTransform === "lowercase"
            ? el.text.toLowerCase()
            : el.text;
      const parts: string[] = [];
      if (el.backgroundColor && el.backgroundColor !== "transparent") {
        const pad = el.backgroundPadding ?? 10;
        parts.push(
          `<rect x="${-pad}" y="${-pad}" width="${el.width + pad * 2}" height="${el.height + pad * 2}" rx="${el.backgroundRadius ?? 10}" fill="${escapeXml(el.backgroundColor)}"/>`,
        );
      }
      let filterAttr = "";
      if (el.shadowColor && el.shadowBlur) {
        const fid = `txtShadow_${idx}`;
        defs.push(
          `<filter id="${fid}" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="${el.shadowOffsetX ?? 0}" dy="${el.shadowOffsetY ?? 4}" stdDeviation="${(el.shadowBlur / 2).toFixed(1)}" flood-color="${escapeXml(el.shadowColor)}"/></filter>`,
        );
        filterAttr = ` filter="url(#${fid})"`;
      }
      const strokeAttr =
        el.strokeColor && el.strokeWidth
          ? ` stroke="${escapeXml(el.strokeColor)}" stroke-width="${el.strokeWidth}" paint-order="stroke"`
          : "";
      const fontStyleAttr = el.italic ? ` font-style="italic"` : "";
      const deco =
        el.underline && el.strikethrough
          ? ` text-decoration="underline line-through"`
          : el.underline
            ? ` text-decoration="underline"`
            : el.strikethrough
              ? ` text-decoration="line-through"`
              : "";

      if (el.curve && Math.abs(el.curve) > 2) {
        const pid = `svgCurve_${idx}`;
        const midY = el.height / 2;
        const ctrlY = midY - (el.curve / 100) * (el.height * 0.9);
        defs.push(`<path id="${pid}" d="M 8 ${midY} Q ${el.width / 2} ${ctrlY} ${el.width - 8} ${midY}"/>`);
        parts.push(
          `<text font-family="${escapeXml(el.fontFamily)}, sans-serif" font-size="${el.fontSize}" font-weight="${el.fontWeight}"${fontStyleAttr}${deco} fill="${escapeXml(el.color)}"${strokeAttr} letter-spacing="${el.letterSpacing || 0}"${filterAttr}><textPath href="#${pid}" startOffset="50%" text-anchor="middle">${escapeXml(rawText.replace(/\n+/g, " "))}</textPath></text>`,
        );
      } else {
        const anchor = el.align === "center" ? "middle" : el.align === "right" ? "end" : "start";
        const tx = el.align === "center" ? el.width / 2 : el.align === "right" ? el.width : 0;
        const lines = approxWrapSvgLines(rawText, el.width, el.fontSize, el.letterSpacing || 0);
        const lineH = Math.round(el.fontSize * (el.lineHeight || 1.2));
        const tspans = lines
          .map((line, li) => `<tspan x="${tx}" dy="${li === 0 ? el.fontSize : lineH}">${escapeXml(line || " ")}</tspan>`)
          .join("");
        parts.push(
          `<text text-anchor="${anchor}" font-family="${escapeXml(el.fontFamily)}, sans-serif" font-size="${el.fontSize}" font-weight="${el.fontWeight}"${fontStyleAttr}${deco} fill="${escapeXml(el.color)}"${strokeAttr} letter-spacing="${el.letterSpacing || 0}"${filterAttr}>${tspans}</text>`,
        );
      }
      items.push(`<g transform="${transform}" opacity="${opacity}">${parts.join("")}</g>`);
    } else if (el.type === "icon") {
      const icon = getVectorIcon(el.iconId);
      const sx = el.width / 24;
      const sy = el.height / 24;
      const fillVal = el.fillColor && el.fillColor !== "transparent" ? escapeXml(el.fillColor) : "none";
      items.push(
        `<g transform="${transform} scale(${sx.toFixed(3)},${sy.toFixed(3)})" fill="${fillVal}" stroke="${escapeXml(el.color)}" stroke-width="${el.strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}">${icon.paths.map((d) => `<path d="${d}"/>`).join("")}</g>`,
      );
    } else if (el.type === "image") {
      const cid = `imgClip_${idx}`;
      const w = el.width;
      const h = el.height;
      let clipShape = `<rect x="0" y="0" width="${w}" height="${h}" rx="${el.borderRadius || 0}"/>`;
      let frameStroke = "";
      if (el.mask === "circle") {
        clipShape = `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${w / 2}" ry="${h / 2}"/>`;
      } else if (el.mask === "rounded") {
        clipShape = `<rect x="0" y="0" width="${w}" height="${h}" rx="36"/>`;
      } else if (el.mask === "arch") {
        const r = Math.min(w / 2, h);
        clipShape = `<path d="M 0 ${r} A ${r} ${r} 0 0 1 ${w} ${r} L ${w} ${h} L 0 ${h} Z"/>`;
      } else if (el.mask === "hexagon") {
        clipShape = `<polygon points="${svgPolygonPoints(w / 2, h / 2, w / 2, h / 2, 6, -30)}"/>`;
      } else if (el.mask === "star") {
        clipShape = `<polygon points="${svgStarPoints(w / 2, h / 2, w / 2, h / 2, 5)}"/>`;
      } else if (el.mask === "blob") {
        clipShape = `<path d="${svgBlobPath(w, h)}"/>`;
      } else if (el.mask === "phone") {
        clipShape = `<rect x="0" y="0" width="${w}" height="${h}" rx="38"/>`;
        frameStroke = `<rect x="0" y="0" width="${w}" height="${h}" rx="38" fill="none" stroke="#0F172A" stroke-width="${Math.max(8, Math.round(w * 0.045))}"/>`;
      } else if (el.mask === "laptop") {
        const lp = svgCustomRoundedRectPath(w, h, 18, 18, 4, 4);
        clipShape = `<path d="${lp}"/>`;
        frameStroke = `<path d="${lp}" fill="none" stroke="#0F172A" stroke-width="${Math.max(6, Math.round(w * 0.03))}"/>`;
      } else if (el.stroke && el.strokeWidth) {
        frameStroke = `<rect x="0" y="0" width="${w}" height="${h}" rx="${el.borderRadius || 0}" fill="none" stroke="${escapeXml(el.stroke)}" stroke-width="${el.strokeWidth}"/>`;
      }
      defs.push(`<clipPath id="${cid}">${clipShape}</clipPath>`);
      const cssFilter = cssFilterFromImageFilters(el.filters);
      const styleAttr = cssFilter && cssFilter !== "none" ? ` style="filter:${escapeXml(cssFilter)}"` : "";
      const aspectRatio = el.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice";
      const cropZoom = Math.max(1, el.cropZoom ?? 1);
      const cropOffX = ((el.cropOffsetX ?? 0) / 100) * w;
      const cropOffY = ((el.cropOffsetY ?? 0) / 100) * h;
      const cropTransform =
        cropZoom !== 1 || cropOffX !== 0 || cropOffY !== 0
          ? ` transform="translate(${(w / 2 + cropOffX).toFixed(2)},${(h / 2 + cropOffY).toFixed(2)}) scale(${cropZoom}) translate(${(-w / 2).toFixed(2)},${(-h / 2).toFixed(2)})"`
          : "";
      items.push(
        `<g transform="${transform}" opacity="${opacity}"><g clip-path="url(#${cid})"><image href="${escapeXml(el.src)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="${aspectRatio}"${cropTransform}${styleAttr}/></g>${frameStroke}</g>`,
      );
    } else if (el.type === "draw" && el.points.length > 1) {
      const d = el.points
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" ");
      const drawOpacity = el.brush === "highlighter" ? +(opacity * 0.42).toFixed(3) : opacity;
      items.push(
        `<path d="${d}" fill="none" stroke="${escapeXml(el.color)}" stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${drawOpacity}" transform="${transform}"/>`,
      );
    } else if (el.type === "table") {
      const rows = el.rows.length;
      const cols = el.rows[0]?.length || 1;
      const rowH = el.height / Math.max(1, rows);
      const colW = el.width / Math.max(1, cols);
      const cells: string[] = [];
      el.rows.forEach((row, rIdx) => {
        row.forEach((cell, cIdx) => {
          const cx = cIdx * colW;
          const cy = rIdx * rowH;
          const bg = escapeXml(rIdx === 0 ? el.headerBg : el.cellBg);
          const fg = escapeXml(rIdx === 0 ? el.headerColor : el.cellColor);
          cells.push(
            `<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${colW.toFixed(1)}" height="${rowH.toFixed(1)}" fill="${bg}" stroke="${escapeXml(el.borderColor)}" stroke-width="1.5"/>`,
          );
          cells.push(
            `<text x="${(cx + 12).toFixed(1)}" y="${(cy + rowH / 2 + el.fontSize * 0.35).toFixed(1)}" fill="${fg}" font-family="${escapeXml(el.fontFamily)}, sans-serif" font-size="${el.fontSize}" font-weight="${rIdx === 0 ? 700 : 400}">${escapeXml(cell)}</text>`,
          );
        });
      });
      items.push(`<g transform="${transform}" opacity="${opacity}">${cells.join("")}</g>`);
    } else if (el.type === "chart") {
      items.push(`<g transform="${transform}" opacity="${opacity}">${buildChartSvgMarkup(el)}</g>`);
    } else if (el.type === "qrcode") {
      items.push(`<g transform="${transform}" opacity="${opacity}">${buildQrSvgMarkup(el)}</g>`);
    }
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><defs>${defs.join("")}</defs>${items.join("")}</svg>`;
}

export function parsePageRange(input: string, totalPages: number): number[] {
  if (totalPages <= 0) return [];
  const trimmed = input.trim();
  if (!trimmed) return Array.from({ length: totalPages }, (_, i) => i);

  const result = new Set<number>();
  for (const rawPart of trimmed.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;
    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      let start = Number(rangeMatch[1]);
      let end = Number(rangeMatch[2]);
      if (start > end) [start, end] = [end, start];
      for (let p = Math.max(1, start); p <= Math.min(totalPages, end); p++) {
        result.add(p - 1);
      }
      continue;
    }
    const singleMatch = part.match(/^(\d+)$/);
    if (singleMatch) {
      const p = Number(singleMatch[1]);
      if (p >= 1 && p <= totalPages) result.add(p - 1);
    }
  }
  return Array.from(result).sort((a, b) => a - b);
}

export function exportPageAsSvg(
  page: DesignPage,
  width: number,
  height: number,
  filename: string,
  transparentBg = false,
): void {
  const svg = buildPageSvgString(page, width, height, transparentBg);
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${filename}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportPagesAsZip(
  pages: DesignPage[],
  indices: number[],
  width: number,
  height: number,
  format: "png" | "jpeg" | "svg",
  filename: string,
  options?: {
    scale?: number;
    transparentBg?: boolean;
    quality?: number;
    onProgress?: (current: number, total: number) => void;
  },
): Promise<void> {
  const validIndices = indices.filter((idx) => idx >= 0 && idx < pages.length);
  if (validIndices.length === 0) return;

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const padLen = String(pages.length).length;
  const ext = format === "jpeg" ? "jpg" : format;

  for (let i = 0; i < validIndices.length; i++) {
    const pageIdx = validIndices[i];
    const page = pages[pageIdx];
    options?.onProgress?.(i + 1, validIndices.length);
    const pageSlug = (page.name || `page-${pageIdx + 1}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || `page-${pageIdx + 1}`;
    const entryName = `${String(pageIdx + 1).padStart(Math.max(2, padLen), "0")}-${pageSlug}.${ext}`;

    if (format === "svg") {
      const svg = buildPageSvgString(page, width, height, options?.transparentBg ?? false);
      zip.file(entryName, svg);
    } else {
      const canvas = await renderPageToCanvas(page, width, height, {
        scale: options?.scale ?? 2,
        transparentBg: format === "png" ? options?.transparentBg : false,
      });
      const mime = format === "png" ? "image/png" : "image/jpeg";
      const dataUrl = canvas.toDataURL(mime, options?.quality ?? 0.92);
      const base64 = dataUrl.split(",")[1] || "";
      zip.file(entryName, base64, { base64: true });
    }
  }

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${filename}-${ext}.zip`);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function exportDesignAsPdf(
  pages: DesignPage[],
  width: number,
  height: number,
  filename: string,
): Promise<void> {
  const orientation = width >= height ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [width, height],
    hotfixes: ["px_scaling"],
  });

  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage([width, height], orientation);
    const canvas = await renderPageToCanvas(pages[i], width, height, { scale: 2 });
    const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
    pdf.addImage(dataUrl, "JPEG", 0, 0, width, height);

    // Overlay an invisible selectable/searchable text layer for visible straight text elements
    const measureCtx = canvas.getContext("2d");
    for (const el of pages[i].elements) {
      if (el.hidden || el.type !== "text" || !el.text.trim()) continue;
      if (el.curve && Math.abs(el.curve) > 2) continue;
      const rawText =
        el.textTransform === "uppercase"
          ? el.text.toUpperCase()
          : el.textTransform === "lowercase"
            ? el.text.toLowerCase()
            : el.text;
      let lines: string[];
      if (measureCtx) {
        measureCtx.save();
        measureCtx.font = `${el.italic ? "italic " : ""}${el.fontWeight} ${el.fontSize}px "${el.fontFamily}", sans-serif`;
        lines = wrapLines(measureCtx, rawText, Math.max(20, el.width));
        measureCtx.restore();
      } else {
        lines = rawText.split("\n");
      }
      pdf.setFont("helvetica", el.fontWeight >= 600 ? (el.italic ? "bolditalic" : "bold") : el.italic ? "italic" : "normal");
      pdf.setFontSize(Math.max(6, el.fontSize));
      const lineH = el.fontSize * (el.lineHeight || 1.2);
      const tx = el.align === "center" ? el.x + el.width / 2 : el.align === "right" ? el.x + el.width : el.x;
      lines.forEach((line, idx) => {
        if (!line.trim()) return;
        const ty = el.y + el.fontSize * 0.85 + idx * lineH;
        try {
          pdf.text(line, tx, ty, {
            align: el.align,
            angle: -(el.rotation || 0),
            renderingMode: "invisible",
          });
        } catch {
          // ignore unrepresentable glyphs in PDF standard font
        }
      });
    }
  }
  pdf.save(`${filename}.pdf`);
}

function cleanHex(color?: string, fallback = "0F172A"): string {
  if (!color) return fallback;
  const trimmed = color.trim();
  const m6 = trimmed.match(/^#([0-9a-fA-F]{6})$/);
  if (m6) return m6[1].toUpperCase();
  const m3 = trimmed.match(/^#([0-9a-fA-F]{3})$/);
  if (m3) {
    return m3[1]
      .split("")
      .map((ch) => ch + ch)
      .join("")
      .toUpperCase();
  }
  return fallback;
}

function hasActiveImageFilters(el: ImageElement): boolean {
  const f = el.filters;
  if (!f) return false;
  return (
    (f.preset && f.preset !== "none") ||
    (f.brightness ?? 100) !== 100 ||
    (f.contrast ?? 100) !== 100 ||
    (f.saturation ?? 100) !== 100 ||
    (f.blur ?? 0) > 0 ||
    (f.hue ?? 0) !== 0 ||
    (f.vignette ?? 0) > 0
  );
}

export async function exportDesignAsPptx(
  pages: DesignPage[],
  width: number,
  height: number,
  filename: string,
): Promise<void> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();

  const slideW = 13.333;
  const slideH = Math.max(4, +(slideW * (height / Math.max(1, width))).toFixed(3));
  pptx.defineLayout({ name: "SLATE_CUSTOM", width: slideW, height: slideH });
  pptx.layout = "SLATE_CUSTOM";

  const pxToInX = (px: number) => (px / width) * slideW;
  const pxToInY = (px: number) => (px / height) * slideH;
  const pxToPt = (px: number) => Math.max(8, Math.round(px * (slideH / height) * 72));

  const addRasterizedElement = async (
    slide: ReturnType<typeof pptx.addSlide>,
    el: CanvasElement,
  ) => {
    try {
      const { dataUrl, padX, padY, outW, outH } = await renderElementToPngDataUrl(el, 2);
      slide.addImage({
        data: dataUrl,
        x: pxToInX(el.x - padX),
        y: pxToInY(el.y - padY),
        w: Math.max(0.08, pxToInX(outW)),
        h: Math.max(0.08, pxToInY(outH)),
        rotate: el.rotation || 0,
      });
    } catch {
      // ignore element rasterization failures
    }
  };

  for (const page of pages) {
    const slide = pptx.addSlide();
    if (page.backgroundImage || page.backgroundGradientTo) {
      const bgData = await renderPageBackgroundToDataUrl(page, width, height);
      if (bgData) {
        slide.background = { data: bgData };
      } else {
        slide.background = { color: cleanHex(page.background, "FFFFFF") };
      }
    } else {
      slide.background = { color: cleanHex(page.background, "FFFFFF") };
    }
    if (page.notes) slide.addNotes(page.notes);

    for (const el of page.elements) {
      if (el.hidden) continue;
      const x = pxToInX(el.x);
      const y = pxToInY(el.y);
      const w = Math.max(0.1, pxToInX(el.width));
      const h = Math.max(0.1, pxToInY(el.height));

      if (el.type === "text") {
        const needsRaster =
          !!(el.curve && Math.abs(el.curve) > 2) ||
          !!(el.strokeColor && el.strokeWidth) ||
          !!(el.shadowColor && el.shadowBlur) ||
          !!(el.backgroundColor && el.backgroundColor !== "transparent") ||
          !!el.flipX ||
          !!el.flipY;
        if (needsRaster) {
          await addRasterizedElement(slide, el);
        } else {
          const textVal =
            el.textTransform === "uppercase"
              ? el.text.toUpperCase()
              : el.textTransform === "lowercase"
                ? el.text.toLowerCase()
                : el.text;
          slide.addText(textVal, {
            x,
            y,
            w,
            h,
            fontFace: el.fontFamily,
            fontSize: pxToPt(el.fontSize),
            bold: el.fontWeight >= 600,
            italic: !!el.italic,
            underline: el.underline ? { style: "sng" } : undefined,
            strike: el.strikethrough ? "sngStrike" : undefined,
            charSpacing: el.letterSpacing ? +(el.letterSpacing * (slideH / height) * 72).toFixed(1) : undefined,
            lineSpacingMultiple: el.lineHeight || undefined,
            color: cleanHex(el.color, "0F172A"),
            transparency: Math.round((1 - (el.opacity ?? 1)) * 100),
            align: el.align,
            rotate: el.rotation || 0,
            valign: "top",
          });
        }
      } else if (el.type === "shape") {
        if (el.gradientTo || el.shape === "blob" || el.flipX || el.flipY) {
          await addRasterizedElement(slide, el);
        } else {
          const shapeName =
            el.shape === "circle"
              ? pptx.ShapeType.ellipse
              : el.shape === "pill"
                ? pptx.ShapeType.roundRect
                : el.shape === "triangle"
                  ? pptx.ShapeType.triangle
                  : el.shape === "diamond"
                    ? pptx.ShapeType.diamond
                    : el.shape === "pentagon"
                      ? pptx.ShapeType.pentagon
                      : el.shape === "hexagon"
                        ? pptx.ShapeType.hexagon
                        : el.shape === "star"
                          ? pptx.ShapeType.star5
                          : el.shape === "arrow"
                            ? pptx.ShapeType.rightArrow
                            : el.shape === "bubble"
                              ? pptx.ShapeType.wedgeRoundRectCallout
                              : el.shape === "line"
                                ? pptx.ShapeType.line
                                : el.borderRadius && el.borderRadius > 4
                                  ? pptx.ShapeType.roundRect
                                  : pptx.ShapeType.rect;
          const dashType =
            el.strokeDash === "dashed"
              ? ("dash" as const)
              : el.strokeDash === "dotted"
                ? ("sysDot" as const)
                : ("solid" as const);
          const rectRadius =
            el.shape === "pill"
              ? 0.5
              : shapeName === pptx.ShapeType.roundRect && el.borderRadius
                ? Math.min(0.5, el.borderRadius / Math.max(1, Math.min(el.width, el.height)))
                : undefined;
          const hasLine =
            el.shape === "line" ||
            (el.stroke && el.stroke !== "transparent" && el.strokeWidth > 0);
          slide.addShape(shapeName, {
            x,
            y,
            w,
            h,
            rectRadius,
            fill:
              el.shape !== "line" && el.fill && el.fill !== "transparent"
                ? { color: cleanHex(el.fill, "4F46E5"), transparency: Math.round((1 - (el.opacity ?? 1)) * 100) }
                : undefined,
            line: hasLine
              ? {
                  color: cleanHex(el.stroke && el.stroke !== "transparent" ? el.stroke : el.fill),
                  pt: Math.max(1, (el.strokeWidth || 2) * 0.6),
                  dashType,
                }
              : undefined,
            rotate: el.rotation || 0,
          });
        }
      } else if (el.type === "image") {
        const needsRaster =
          !el.src.startsWith("data:") ||
          hasActiveImageFilters(el) ||
          (el.mask && el.mask !== "none") ||
          (el.borderRadius ?? 0) > 0 ||
          !!(el.stroke && el.strokeWidth) ||
          (el.opacity ?? 1) < 0.99 ||
          (el.cropZoom ?? 1) > 1.001 ||
          Math.abs(el.cropOffsetX ?? 0) > 0.01 ||
          Math.abs(el.cropOffsetY ?? 0) > 0.01 ||
          !!el.flipX ||
          !!el.flipY;
        if (needsRaster) {
          await addRasterizedElement(slide, el);
        } else {
          slide.addImage({
            data: el.src,
            x,
            y,
            w,
            h,
            rotate: el.rotation || 0,
          });
        }
      } else if (el.type === "table") {
        slide.addTable(
          el.rows.map((r, ri) =>
            r.map((cell) => ({
              text: cell,
              options: {
                fill: { color: cleanHex(ri === 0 ? el.headerBg : el.cellBg, "FFFFFF") },
                color: cleanHex(ri === 0 ? el.headerColor : el.cellColor, "0F172A"),
                bold: ri === 0,
                fontFace: el.fontFamily,
                fontSize: Math.max(9, pxToPt(el.fontSize)),
              },
            })),
          ),
          { x, y, w, h, border: { type: "solid", color: cleanHex(el.borderColor, "CBD5E1"), pt: 1 } },
        );
      } else if (el.type === "chart") {
        const data = el.data.length ? el.data : [{ label: "A", value: 10 }];
        const chartPalette = ["4F46E5", "06B6D4", "F43F5E", "10B981", "F59E0B", "8B5CF6"];
        try {
          const chartType =
            el.chartKind === "pie"
              ? pptx.ChartType.pie
              : el.chartKind === "donut"
                ? pptx.ChartType.doughnut
                : el.chartKind === "line"
                  ? pptx.ChartType.line
                  : pptx.ChartType.bar;
          const chartColors =
            el.chartKind === "pie" || el.chartKind === "donut"
              ? data.map((d, idx) => cleanHex(d.color, chartPalette[idx % chartPalette.length]))
              : [cleanHex(el.accentColor, "4F46E5")];
          slide.addChart(
            chartType,
            [
              {
                name: el.title || "Series 1",
                labels: data.map((d) => d.label),
                values: data.map((d) => d.value),
              },
            ],
            {
              x,
              y,
              w,
              h,
              showTitle: !!el.title,
              title: el.title || undefined,
              titleColor: cleanHex(el.textColor, "0F172A"),
              showValue: el.showValues !== false,
              showLegend: el.chartKind === "pie" || el.chartKind === "donut",
              legendPos: "r",
              chartColors,
              holeSize: el.chartKind === "donut" ? 55 : undefined,
              valAxisLabelColor: cleanHex(el.textColor, "0F172A"),
              catAxisLabelColor: cleanHex(el.textColor, "0F172A"),
            },
          );
        } catch {
          await addRasterizedElement(slide, el);
        }
      } else if (el.type === "icon" || el.type === "draw" || el.type === "qrcode") {
        await addRasterizedElement(slide, el);
      }
    }
  }

  await pptx.writeFile({ fileName: `${filename}.pptx` });
}
