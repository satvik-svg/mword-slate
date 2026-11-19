import type { CanvasElement, DesignPage, ShapeElement } from "./types";

type RGB = { r: number; g: number; b: number };

export function parseHexColor(hex?: string | null): RGB | null {
  if (!hex) return null;
  const clean = hex.trim().replace(/^#/, "");
  if (clean.length === 3 && /^[0-9a-f]{3}$/i.test(clean)) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if ((clean.length === 6 || clean.length === 8) && /^[0-9a-f]{6,8}$/i.test(clean)) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return null;
}

function toHex(rgb: RGB): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    "#" +
    [clamp(rgb.r), clamp(rgb.g), clamp(rgb.b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

export function mixHex(hexA: string, hexB: string, t: number): string {
  const a = parseHexColor(hexA);
  const b = parseHexColor(hexB);
  if (!a || !b) return hexA;
  return toHex({
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  });
}

export function relativeLuminance(hex: string): number {
  const rgb = parseHexColor(hex);
  if (!rgb) return 1;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function colorSaturation(hex: string): number {
  const rgb = parseHexColor(hex);
  if (!rgb) return 0;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const d = max - min;
  const l = (max + min) / 2;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

export function isLightColor(hex?: string | null): boolean {
  if (!hex || hex === "transparent" || hex === "none") return true;
  return relativeLuminance(hex) > 0.42;
}

export function pickContrastingText(bgHex: string, darkCandidate: string, lightCandidate = "#FFFFFF"): string {
  const cDark = contrastRatio(bgHex, darkCandidate);
  const cLight = contrastRatio(bgHex, lightCandidate);
  if (cDark >= cLight) {
    return cDark >= 4.5 ? darkCandidate : "#111114";
  }
  return cLight >= 4.5 ? lightCandidate : "#FFFFFF";
}

export type PaletteRoles = {
  ink: string;
  surface: string;
  card: string;
  darkCard: string;
  accent: string;
  secondary: string;
  muted: string;
};

/**
 * Derive semantic design roles from an arbitrary 2-10 color palette
 * so applying a brand palette preserves contrast and visual hierarchy.
 */
export function derivePaletteRoles(colors: string[], shuffleIndex = 0): PaletteRoles {
  const valid = colors.filter((c) => parseHexColor(c) !== null);
  const base = valid.length ? valid : ["#141417", "#2563EB", "#52525B", "#E4E4E7", "#FAFAFA"];

  const byLum = [...base].sort((a, b) => relativeLuminance(a) - relativeLuminance(b));
  const darkest = byLum[0];
  const lightest = byLum[byLum.length - 1];

  const ink = relativeLuminance(darkest) < 0.25 ? darkest : "#141417";
  const surface = relativeLuminance(lightest) > 0.72 ? lightest : "#FAFAFA";

  // Accent candidates: prefer saturated middle colors, falling back to distinct mid-tones
  const midColors = base.filter((c) => c !== darkest && c !== lightest);
  const accentPool = (midColors.length ? midColors : base).sort(
    (a, b) => colorSaturation(b) - colorSaturation(a),
  );

  const shift = accentPool.length > 0 ? shuffleIndex % accentPool.length : 0;
  const accent = accentPool[shift] ?? "#2563EB";
  const secondary = accentPool[(shift + 1) % accentPool.length] ?? mixHex(accent, ink, 0.25);

  const card = mixHex(surface, accent, 0.06);
  const darkCard = mixHex(ink, surface, 0.1);
  const muted = mixHex(ink, surface, 0.45);

  return { ink, surface, card, darkCard, accent, secondary, muted };
}

function isContainerShape(
  shape: ShapeElement,
  index: number,
  elements: CanvasElement[],
  pageWidth: number,
  pageHeight: number,
): boolean {
  if (shape.shape === "line" || shape.shape === "arrow") return false;
  const fill = shape.fill;
  if (!fill || fill === "transparent" || fill === "none") return false;

  // Check if any text element above this shape sits inside its bounds
  const containsText = elements.slice(index + 1).some((other) => {
    if (other.type !== "text" || other.hidden) return false;
    const cx = other.x + other.width / 2;
    const cy = other.y + other.height / 2;
    return (
      cx >= shape.x &&
      cx <= shape.x + shape.width &&
      cy >= shape.y &&
      cy <= shape.y + shape.height
    );
  });

  if (containsText) {
    // Small pill badges with text inside should keep accent styling, large cards stay subtle surfaces
    const areaRatio = (shape.width * shape.height) / Math.max(1, pageWidth * pageHeight);
    const neutralFill = colorSaturation(fill) < 0.22;
    return areaRatio >= 0.06 || neutralFill;
  }

  // Large neutral panel even without text directly centered inside
  const areaRatio = (shape.width * shape.height) / Math.max(1, pageWidth * pageHeight);
  return areaRatio >= 0.14 && colorSaturation(fill) < 0.22;
}

function findEnclosingShapeFill(
  el: CanvasElement,
  index: number,
  styledElements: CanvasElement[],
): string | null {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  for (let i = index - 1; i >= 0; i--) {
    const candidate = styledElements[i];
    if (candidate.type !== "shape" || candidate.hidden) continue;
    if (candidate.shape === "line" || candidate.shape === "arrow") continue;
    if (!candidate.fill || candidate.fill === "transparent" || candidate.fill === "none") continue;
    if (
      cx >= candidate.x &&
      cx <= candidate.x + candidate.width &&
      cy >= candidate.y &&
      cy <= candidate.y + candidate.height
    ) {
      return candidate.fill;
    }
  }
  return null;
}

export type ApplyStyleOptions = {
  colors?: string[];
  fonts?: { heading: string; body: string };
  applyColors?: boolean;
  applyFonts?: boolean;
  /** 0 = keep page polarity (light stays light, dark stays dark); 1 = tinted/accent variant; 2 = inverted dark/light */
  variant?: number;
  pageWidth?: number;
  pageHeight?: number;
};

/**
 * Apply brand colors and/or fonts to a page non-destructively:
 * - Preserves background images and transparent strokes
 * - Keeps content cards readable instead of flooding them with neon accents
 * - Picks WCAG-contrasting text colors based on each text box's actual backdrop
 * - Restyles shapes, text, icons, tables, charts, and QR codes
 */
export function applyStyleToPage(page: DesignPage, opts: ApplyStyleOptions): DesignPage {
  const applyColors = opts.applyColors !== false && !!opts.colors?.length;
  const applyFonts = opts.applyFonts !== false && !!opts.fonts;
  const variant = Math.max(0, opts.variant ?? 0) % 3;
  const pageWidth = opts.pageWidth ?? 1920;
  const pageHeight = opts.pageHeight ?? 1080;

