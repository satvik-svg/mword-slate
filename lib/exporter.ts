import { jsPDF } from "jspdf";
import QRCode from "qrcode";
import { getVectorIcon } from "@/lib/icons";
import { cssFilterFromImageFilters } from "@/lib/presets";
import { loadImage } from "@/lib/photo-tools";
import type {
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

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
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
    ctx.drawImage(img, dx, dy, dw, dh);
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
    const radius = Math.min(chartW, chartH) * 0.44;
    const cx = el.width * 0.42;
    const cy = chartY + chartH / 2;
    let start = -Math.PI / 2;
    data.forEach((d, idx) => {
      const slice = (Math.max(0, d.value) / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = d.color || palette[idx % palette.length];
      ctx.fill();
      start += slice;
    });
    if (el.chartKind === "donut") {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.52, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
    }
    // Legend
    const lx = cx + radius + 24;
    data.forEach((d, idx) => {
      const ly = chartY + 12 + idx * 28;
      ctx.fillStyle = d.color || palette[idx % palette.length];
      ctx.fillRect(lx, ly, 14, 14);
      ctx.fillStyle = el.textColor;
      ctx.font = `500 15px "Inter", sans-serif`;
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      ctx.fillText(`${d.label} (${d.value})`, lx + 22, ly - 1);
    });
    return;
  }

  if (el.chartKind === "line") {
    ctx.strokeStyle = el.accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    data.forEach((d, idx) => {
      const px = chartX + (idx / Math.max(1, data.length - 1)) * chartW;
      const py = chartY + chartH - (d.value / maxVal) * chartH;
      if (idx === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    data.forEach((d, idx) => {
      const px = chartX + (idx / Math.max(1, data.length - 1)) * chartW;
      const py = chartY + chartH - (d.value / maxVal) * chartH;
      ctx.fillStyle = el.accentColor;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = el.textColor;
      ctx.font = `500 14px "Inter", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(d.label, px, chartY + chartH + 8);
    });
    return;
  }

  // Bar chart
  const gap = 16;
  const barW = Math.max(14, (chartW - gap * (data.length - 1)) / data.length);
  data.forEach((d, idx) => {
    const bh = (d.value / maxVal) * chartH;
    const bx = chartX + idx * (barW + gap);
    const by = chartY + chartH - bh;
    ctx.fillStyle = d.color || el.accentColor || palette[idx % palette.length];
    drawRoundedRect(ctx, bx, by, barW, bh, 8);
    ctx.fill();
    ctx.fillStyle = el.textColor;
    ctx.font = `600 14px "Inter", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(d.label, bx + barW / 2, chartY + chartH + 8);
    if (el.showValues) {
      ctx.textBaseline = "bottom";
      ctx.fillText(String(d.value), bx + barW / 2, by - 4);
    }
  });
}

async function renderQrElement(ctx: CanvasRenderingContext2D, el: QrCodeElement) {
  try {
    const dataUrl = await QRCode.toDataURL(el.value || "https://mworld-slate.laflabs-tech.workers.dev", {
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

export function exportPageAsSvg(
  page: DesignPage,
  width: number,
  height: number,
  filename: string,
  transparentBg = false,
): void {
  const defs: string[] = [];
  const items: string[] = [];

  if (!transparentBg) {
    if (page.backgroundGradientTo) {
      defs.push(
        `<linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${page.background}"/><stop offset="100%" stop-color="${page.backgroundGradientTo}"/></linearGradient>`,
      );
      items.push(`<rect width="${width}" height="${height}" fill="url(#bgGrad)"/>`);
    } else {
      items.push(`<rect width="${width}" height="${height}" fill="${page.background || "#FFFFFF"}"/>`);
    }
  }

  page.elements.forEach((el, idx) => {
    if (el.hidden) return;
    const cx = el.x + el.width / 2;
    const cy = el.y + el.height / 2;
    const transform = `translate(${el.x},${el.y}) rotate(${el.rotation || 0},${el.width / 2},${el.height / 2})`;

    if (el.type === "shape") {
      let fill = el.fill;
      if (el.gradientTo) {
        const gid = `sg_${idx}`;
        defs.push(
          `<linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${el.fill}"/><stop offset="100%" stop-color="${el.gradientTo}"/></linearGradient>`,
        );
        fill = `url(#${gid})`;
      }
      const strokeAttr = `stroke="${el.stroke || "none"}" stroke-width="${el.strokeWidth || 0}"`;
      if (el.shape === "circle") {
        items.push(
          `<ellipse cx="${cx}" cy="${cy}" rx="${el.width / 2}" ry="${el.height / 2}" fill="${fill}" ${strokeAttr} opacity="${el.opacity}"/>`,
        );
      } else if (el.shape === "line") {
        items.push(
          `<line x1="${el.x}" y1="${cy}" x2="${el.x + el.width}" y2="${cy}" stroke="${el.stroke || el.fill}" stroke-width="${Math.max(2, el.strokeWidth)}" opacity="${el.opacity}"/>`,
        );
      } else {
        const rx = el.shape === "pill" ? Math.min(el.width, el.height) / 2 : el.borderRadius ?? 0;
        items.push(
          `<rect x="0" y="0" width="${el.width}" height="${el.height}" rx="${rx}" fill="${fill}" ${strokeAttr} opacity="${el.opacity}" transform="${transform}"/>`,
        );
      }
    } else if (el.type === "text") {
      const anchor = el.align === "center" ? "middle" : el.align === "right" ? "end" : "start";
      const tx = el.align === "center" ? el.width / 2 : el.align === "right" ? el.width : 0;
      const lines = el.text.split("\n");
      const tspans = lines
        .map(
          (line, li) =>
            `<tspan x="${tx}" dy="${li === 0 ? el.fontSize : Math.round(el.fontSize * el.lineHeight)}">${escapeXml(line)}</tspan>`,
        )
        .join("");
      items.push(
        `<text transform="${transform}" opacity="${el.opacity}" text-anchor="${anchor}" font-family="${escapeXml(el.fontFamily)}, sans-serif" font-size="${el.fontSize}" font-weight="${el.fontWeight}" fill="${el.color}" letter-spacing="${el.letterSpacing || 0}">${tspans}</text>`,
      );
    } else if (el.type === "icon") {
      const icon = getVectorIcon(el.iconId);
      const sx = el.width / 24;
      const sy = el.height / 24;
      items.push(
        `<g transform="${transform} scale(${sx.toFixed(3)},${sy.toFixed(3)})" fill="none" stroke="${el.color}" stroke-width="${el.strokeWidth || 2}" stroke-linecap="round" stroke-linejoin="round" opacity="${el.opacity}">${icon.paths.map((d) => `<path d="${d}"/>`).join("")}</g>`,
      );
    } else if (el.type === "image") {
      items.push(
        `<image href="${escapeXml(el.src)}" x="0" y="0" width="${el.width}" height="${el.height}" preserveAspectRatio="xMidYMid slice" opacity="${el.opacity}" transform="${transform}"/>`,
      );
    } else if (el.type === "draw" && el.points.length > 1) {
      const d = el.points
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" ");
      items.push(
        `<path d="${d}" fill="none" stroke="${el.color}" stroke-width="${el.strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${el.opacity}" transform="${transform}"/>`,
      );
    }
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"><defs>${defs.join("")}</defs>${items.join("")}</svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `${filename}.svg`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    const canvas = await renderPageToCanvas(pages[i], width, height, { scale: 1.5 });
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(dataUrl, "JPEG", 0, 0, width, height);
  }
  pdf.save(`${filename}.pdf`);
}

function cleanHex(color?: string, fallback = "0F172A"): string {
  if (!color) return fallback;
  const m = color.trim().match(/^#([0-9a-fA-F]{6})$/);
  return m ? m[1].toUpperCase() : fallback;
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

  for (const page of pages) {
    const slide = pptx.addSlide();
    slide.background = { color: cleanHex(page.background, "FFFFFF") };
    if (page.notes) slide.addNotes(page.notes);

    for (const el of page.elements) {
      if (el.hidden) continue;
      const x = pxToInX(el.x);
      const y = pxToInY(el.y);
      const w = Math.max(0.1, pxToInX(el.width));
      const h = Math.max(0.1, pxToInY(el.height));

      if (el.type === "text") {
        slide.addText(el.text, {
          x,
          y,
          w,
          h,
          fontFace: el.fontFamily,
          fontSize: pxToPt(el.fontSize),
          bold: el.fontWeight >= 600,
          italic: !!el.italic,
          underline: el.underline ? { style: "sng" } : undefined,
          color: cleanHex(el.color, "0F172A"),
          align: el.align,
          rotate: el.rotation || 0,
          valign: "top",
        });
      } else if (el.type === "shape") {
        const shapeName =
          el.shape === "circle"
            ? pptx.ShapeType.ellipse
            : el.shape === "triangle"
              ? pptx.ShapeType.triangle
              : el.shape === "diamond"
                ? pptx.ShapeType.diamond
                : el.shape === "star"
                  ? pptx.ShapeType.star5
                  : el.shape === "line"
                    ? pptx.ShapeType.line
                    : el.borderRadius && el.borderRadius > 4
                      ? pptx.ShapeType.roundRect
                      : pptx.ShapeType.rect;
        slide.addShape(shapeName, {
          x,
          y,
          w,
          h,
          fill:
            el.fill && el.fill !== "transparent"
              ? { color: cleanHex(el.fill, "4F46E5"), transparency: Math.round((1 - (el.opacity ?? 1)) * 100) }
              : undefined,
          line:
            el.stroke && el.stroke !== "transparent" && el.strokeWidth > 0
              ? { color: cleanHex(el.stroke), pt: Math.max(1, el.strokeWidth * 0.5) }
              : undefined,
          rotate: el.rotation || 0,
        });
      } else if (el.type === "image" && el.src.startsWith("data:")) {
        slide.addImage({
          data: el.src,
          x,
          y,
          w,
          h,
          rotate: el.rotation || 0,
        });
      } else if (el.type === "table") {
        slide.addTable(
          el.rows.map((r, ri) =>
            r.map((cell) => ({
              text: cell,
              options: {
                fill: { color: cleanHex(ri === 0 ? el.headerBg : el.cellBg, "FFFFFF") },
                color: cleanHex(ri === 0 ? el.headerColor : el.cellColor, "0F172A"),
                bold: ri === 0,
                fontSize: Math.max(9, pxToPt(el.fontSize)),
              },
            })),
          ),
          { x, y, w, h, border: { type: "solid", color: cleanHex(el.borderColor, "CBD5E1"), pt: 1 } },
        );
      }
    }
  }

  await pptx.writeFile({ fileName: `${filename}.pptx` });
}
