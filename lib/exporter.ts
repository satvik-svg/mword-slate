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

