import JSZip from "jszip";
import { getVectorIcon, VECTOR_ICONS } from "@/lib/icons";
import { makeId } from "@/lib/id";
import type { CanvasElement, DesignPage } from "@/lib/types";

export type LogoStyle =
  | "all"
  | "minimal"
  | "geometric"
  | "emblem"
  | "monogram"
  | "wordmark"
  | "modern";

export type LogoColorMood =
  | "auto"
  | "slate"
  | "ocean"
  | "emerald"
  | "sunset"
  | "monochrome"
  | "royal"
  | "earth";

export type LogoConcept = {
  id: string;
  label: string;
  style: Exclude<LogoStyle, "all">;
  layout: "stacked" | "horizontal" | "badge" | "monogram-square" | "monogram-circle" | "wordmark-accent";
  brandName: string;
  tagline: string;
  iconId: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  fontFamily: string;
  taglineFont: string;
  letterSpacing: number;
  uppercase: boolean;
  shapeKind: "rect" | "circle" | "hexagon" | "diamond" | "pill";
};

const PALETTES: Record<
  Exclude<LogoColorMood, "auto">,
  { primary: string; accent: string; bg: string; text: string }[]
> = {
  slate: [
    { primary: "#0F172A", accent: "#4F46E5", bg: "#FFFFFF", text: "#0F172A" },
    { primary: "#4F46E5", accent: "#06B6D4", bg: "#0F172A", text: "#F8FAFC" },
    { primary: "#1E293B", accent: "#38BDF8", bg: "#F8FAFC", text: "#0F172A" },
  ],
  ocean: [
    { primary: "#0369A1", accent: "#06B6D4", bg: "#FFFFFF", text: "#0C4A6E" },
    { primary: "#0284C7", accent: "#38BDF8", bg: "#082F49", text: "#F0F9FF" },
  ],
  emerald: [
    { primary: "#065F46", accent: "#10B981", bg: "#FFFFFF", text: "#064E3B" },
    { primary: "#10B981", accent: "#34D399", bg: "#022C22", text: "#ECFDF5" },
  ],
  sunset: [
    { primary: "#EA580C", accent: "#F43F5E", bg: "#FFFFFF", text: "#1C1917" },
    { primary: "#F97316", accent: "#FACC15", bg: "#18181B", text: "#FAFAFA" },
  ],
  monochrome: [
    { primary: "#111827", accent: "#52525B", bg: "#FFFFFF", text: "#111827" },
    { primary: "#FFFFFF", accent: "#A1A1AA", bg: "#09090B", text: "#FFFFFF" },
  ],
  royal: [
    { primary: "#6D28D9", accent: "#EC4899", bg: "#FFFFFF", text: "#1E1B4B" },
    { primary: "#8B5CF6", accent: "#F59E0B", bg: "#130D2E", text: "#F5F3FF" },
  ],
  earth: [
    { primary: "#78350F", accent: "#D97706", bg: "#FAF8F5", text: "#292524" },
    { primary: "#D97706", accent: "#FDE68A", bg: "#1C1917", text: "#FAF8F5" },
  ],
};

const ALL_PALETTES = Object.values(PALETTES).flat();

const LOGO_FONTS: Record<Exclude<LogoStyle, "all">, { font: string; tag: string; upper: boolean; track: number }> = {
  minimal: { font: "Plus Jakarta Sans", tag: "Inter", upper: false, track: -1 },
  geometric: { font: "Space Grotesk", tag: "DM Sans", upper: true, track: 6 },
  emblem: { font: "Montserrat", tag: "Inter", upper: true, track: 8 },
  monogram: { font: "Outfit", tag: "Inter", upper: true, track: 5 },
  wordmark: { font: "Playfair Display", tag: "Poppins", upper: false, track: 0 },
  modern: { font: "Syne", tag: "DM Sans", upper: false, track: -1 },
};

export function matchIconsForKeywords(industry: string, brandName: string): string[] {
  const tokens = `${industry} ${brandName}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2);

  const scored = VECTOR_ICONS.map((icon) => {
    let score = 0;
    for (const token of tokens) {
      if (icon.id.includes(token) || icon.category.includes(token)) score += 5;
      if (icon.label.toLowerCase().includes(token)) score += 4;
      for (const tag of icon.tags) {
        if (tag === token) score += 6;
        else if (tag.includes(token) || token.includes(tag)) score += 3;
      }
    }
    return { id: icon.id, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const matched = scored.filter((s) => s.score > 0).map((s) => s.id);
  const defaults = ["layers", "sparkle", "prism", "orbit", "hexagon-core", "bolt", "compass", "infinity"];
  const combined = [...matched, ...defaults];
  return Array.from(new Set(combined)).slice(0, 12);
}

export function getInitials(brandName: string): string {
  const words = brandName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "SL";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function generateLogoConcepts(input: {
  brandName: string;
  tagline?: string;
  industry?: string;
  style?: LogoStyle;
  mood?: LogoColorMood;
  seed?: number;
}): LogoConcept[] {
  const brandName = input.brandName.trim() || "Slate";
  const tagline = (input.tagline ?? "").trim();
  const icons = matchIconsForKeywords(input.industry || "", brandName);
  const seed = input.seed ?? 0;

  const palettes =
    !input.mood || input.mood === "auto" ? ALL_PALETTES : PALETTES[input.mood];

  const blueprints: {
    label: string;
    style: Exclude<LogoStyle, "all">;
    layout: LogoConcept["layout"];
    shapeKind: LogoConcept["shapeKind"];
  }[] = [
    { label: "Stacked Emblem", style: "minimal", layout: "stacked", shapeKind: "rect" },
    { label: "Studio Horizontal", style: "modern", layout: "horizontal", shapeKind: "rect" },
    { label: "Hex Crest", style: "geometric", layout: "badge", shapeKind: "hexagon" },
    { label: "Bold Monogram", style: "monogram", layout: "monogram-square", shapeKind: "rect" },
    { label: "Editorial Wordmark", style: "wordmark", layout: "wordmark-accent", shapeKind: "pill" },
    { label: "Circular Seal", style: "emblem", layout: "monogram-circle", shapeKind: "circle" },
    { label: "Diamond Mark", style: "geometric", layout: "stacked", shapeKind: "diamond" },
    { label: "Clean Lockup", style: "minimal", layout: "horizontal", shapeKind: "circle" },
    { label: "Pill Badge", style: "modern", layout: "badge", shapeKind: "pill" },
    { label: "Dark Monogram", style: "monogram", layout: "monogram-square", shapeKind: "hexagon" },
    { label: "Signature Serif", style: "wordmark", layout: "wordmark-accent", shapeKind: "rect" },
    { label: "Orbit Emblem", style: "emblem", layout: "stacked", shapeKind: "circle" },
  ];

  const filtered =
    input.style && input.style !== "all"
      ? [
          ...blueprints.filter((b) => b.style === input.style),
          ...blueprints.filter((b) => b.style !== input.style),
        ]
      : blueprints;

  return filtered.slice(0, 12).map((bp, i) => {
    const pal = palettes[(i + seed) % palettes.length];
    const typo = LOGO_FONTS[bp.style];
    const iconId = icons[(i + seed) % icons.length];
    return {
      id: `concept_${i}_${seed}`,
      label: bp.label,
      style: bp.style,
      layout: bp.layout,
      brandName,
      tagline,
      iconId,
      primaryColor: pal.primary,
      accentColor: pal.accent,
      bgColor: pal.bg,
      textColor: pal.text,
      fontFamily: typo.font,
      taglineFont: typo.tag,
      letterSpacing: typo.track,
      uppercase: typo.upper,
      shapeKind: bp.shapeKind,
    };
  });
}

export function logoConceptToDesignPage(concept: LogoConcept): DesignPage {
  const elements: CanvasElement[] = [];
  const nameText = concept.uppercase ? concept.brandName.toUpperCase() : concept.brandName;
  const initials = getInitials(concept.brandName);
  const isDarkBg = isColorDark(concept.bgColor);
  const iconStrokeOnFill = isColorDark(concept.primaryColor) ? "#FFFFFF" : "#0F172A";

  if (concept.layout === "horizontal") {
    elements.push({
      id: makeId("el"),
      type: "shape",
      name: "Logo Mark Frame",
      shape: concept.shapeKind === "circle" ? "circle" : "rect",
      x: 130,
      y: 390,
      width: 190,
      height: 190,
      rotation: 0,
      opacity: 1,
      fill: concept.primaryColor,
      gradientTo: concept.accentColor,
      gradientAngle: 135,
      stroke: "transparent",
      strokeWidth: 0,
      borderRadius: 42,
    });
    elements.push({
      id: makeId("el"),
      type: "icon",
      name: "Logo Symbol",
      iconId: concept.iconId,
      x: 175,
      y: 435,
      width: 100,
      height: 100,
      rotation: 0,
      opacity: 1,
      color: iconStrokeOnFill,
      strokeWidth: 2,
    });
    elements.push({
      id: makeId("el"),
      type: "text",
      name: "Brand Name",
      text: nameText,
      x: 360,
      y: concept.tagline ? 410 : 438,
      width: 540,
      height: 110,
      rotation: 0,
      opacity: 1,
      fontFamily: concept.fontFamily,
      fontSize: nameText.length > 10 ? 64 : 84,
      fontWeight: 700,
      color: concept.textColor,
      align: "left",
      lineHeight: 1.05,
      letterSpacing: concept.letterSpacing,
    });
    if (concept.tagline) {
      elements.push({
        id: makeId("el"),
        type: "text",
        name: "Tagline",
        text: concept.tagline.toUpperCase(),
        x: 364,
        y: 525,
        width: 520,
        height: 44,
        rotation: 0,
        opacity: 0.72,
        fontFamily: concept.taglineFont,
        fontSize: 22,
        fontWeight: 500,
        color: concept.textColor,
        align: "left",
        lineHeight: 1.2,
        letterSpacing: 4,
      });
    }
  } else if (concept.layout === "monogram-square" || concept.layout === "monogram-circle") {
    elements.push({
      id: makeId("el"),
      type: "shape",
      name: "Monogram Crest",
      shape: concept.layout === "monogram-circle" ? "circle" : concept.shapeKind,
      x: 340,
      y: 210,
      width: 320,
      height: 320,
      rotation: 0,
      opacity: 1,
      fill: concept.primaryColor,
      gradientTo: concept.accentColor,
      gradientAngle: 135,
      stroke: isDarkBg ? "rgba(255,255,255,0.2)" : "transparent",
      strokeWidth: isDarkBg ? 4 : 0,
      borderRadius: 68,
    });
    elements.push({
      id: makeId("el"),
      type: "text",
      name: "Monogram Letters",
      text: initials,
      x: 340,
      y: 295,
      width: 320,
      height: 150,
      rotation: 0,
      opacity: 1,
      fontFamily: concept.fontFamily,
      fontSize: 128,
      fontWeight: 800,
      color: iconStrokeOnFill,
      align: "center",
      lineHeight: 1.0,
      letterSpacing: 4,
    });
    elements.push({
      id: makeId("el"),
      type: "text",
      name: "Brand Name",
      text: nameText,
      x: 100,
      y: 590,
      width: 800,
      height: 110,
      rotation: 0,
      opacity: 1,
      fontFamily: concept.fontFamily,
      fontSize: nameText.length > 12 ? 62 : 78,
      fontWeight: 700,
      color: concept.textColor,
      align: "center",
      lineHeight: 1.1,
      letterSpacing: concept.letterSpacing,
    });
    if (concept.tagline) {
      elements.push({
        id: makeId("el"),
        type: "text",
        name: "Tagline",
        text: concept.tagline.toUpperCase(),
        x: 160,
        y: 710,
        width: 680,
        height: 48,
        rotation: 0,
        opacity: 0.72,
        fontFamily: concept.taglineFont,
        fontSize: 22,
        fontWeight: 500,
        color: concept.textColor,
        align: "center",
        lineHeight: 1.2,
        letterSpacing: 5,
      });
    }
  } else if (concept.layout === "wordmark-accent") {
    elements.push({
      id: makeId("el"),
      type: "shape",
      name: "Accent Bar",
      shape: "pill",
      x: 420,
      y: 350,
      width: 160,
      height: 14,
      rotation: 0,
      opacity: 1,
      fill: concept.accentColor,
      stroke: "transparent",
      strokeWidth: 0,
      borderRadius: 99,
    });
    elements.push({
      id: makeId("el"),
      type: "text",
      name: "Wordmark",
      text: nameText,
      x: 80,
      y: 400,
      width: 840,
      height: 140,
      rotation: 0,
      opacity: 1,
      fontFamily: concept.fontFamily,
      fontSize: nameText.length > 12 ? 84 : 112,
      fontWeight: 700,
      color: concept.textColor,
      align: "center",
      lineHeight: 1.05,
      letterSpacing: concept.letterSpacing,
    });
    if (concept.tagline) {
      elements.push({
        id: makeId("el"),
        type: "text",
        name: "Tagline",
        text: concept.tagline.toUpperCase(),
        x: 140,
        y: 560,
        width: 720,
        height: 50,
        rotation: 0,
        opacity: 0.72,
        fontFamily: concept.taglineFont,
        fontSize: 24,
        fontWeight: 500,
        color: concept.accentColor,
        align: "center",
        lineHeight: 1.2,
        letterSpacing: 6,
      });
    }
  } else if (concept.layout === "badge") {
    elements.push({
      id: makeId("el"),
      type: "shape",
      name: "Outer Badge",
      shape: concept.shapeKind,
      x: 240,
      y: 190,
      width: 520,
      height: 520,
      rotation: 0,
      opacity: 1,
      fill: "transparent",
      stroke: concept.primaryColor,
      strokeWidth: 14,
      borderRadius: 64,
    });
    elements.push({
      id: makeId("el"),
      type: "icon",
      name: "Badge Icon",
      iconId: concept.iconId,
      x: 420,
      y: 280,
      width: 160,
      height: 160,
      rotation: 0,
      opacity: 1,
      color: concept.accentColor,
      strokeWidth: 2,
    });
    elements.push({
      id: makeId("el"),
      type: "text",
      name: "Brand Name",
      text: nameText,
      x: 140,
      y: 470,
      width: 720,
      height: 100,
      rotation: 0,
      opacity: 1,
      fontFamily: concept.fontFamily,
      fontSize: nameText.length > 12 ? 54 : 70,
      fontWeight: 800,
      color: concept.textColor,
      align: "center",
      lineHeight: 1.05,
      letterSpacing: concept.letterSpacing,
    });
    if (concept.tagline) {
      elements.push({
        id: makeId("el"),
        type: "text",
        name: "Tagline",
        text: concept.tagline.toUpperCase(),
        x: 160,
        y: 750,
        width: 680,
        height: 46,
        rotation: 0,
        opacity: 0.72,
        fontFamily: concept.taglineFont,
        fontSize: 22,
        fontWeight: 500,
        color: concept.textColor,
        align: "center",
        lineHeight: 1.2,
        letterSpacing: 5,
      });
    }
  } else {
    // Stacked default
    elements.push({
      id: makeId("el"),
      type: "shape",
      name: "Mark Backdrop",
      shape: concept.shapeKind,
      x: 370,
      y: 220,
      width: 260,
      height: 260,
      rotation: 0,
      opacity: 1,
      fill: concept.primaryColor,
      gradientTo: concept.accentColor,
      gradientAngle: 135,
      stroke: "transparent",
      strokeWidth: 0,
      borderRadius: 56,
    });
    elements.push({
      id: makeId("el"),
      type: "icon",
      name: "Mark Symbol",
      iconId: concept.iconId,
      x: 432,
      y: 282,
      width: 136,
      height: 136,
      rotation: 0,
      opacity: 1,
      color: iconStrokeOnFill,
      strokeWidth: 2,
    });
    elements.push({
      id: makeId("el"),
      type: "text",
      name: "Brand Name",
      text: nameText,
      x: 100,
      y: 545,
      width: 800,
      height: 115,
      rotation: 0,
      opacity: 1,
      fontFamily: concept.fontFamily,
      fontSize: nameText.length > 12 ? 64 : 84,
      fontWeight: 700,
      color: concept.textColor,
      align: "center",
      lineHeight: 1.08,
      letterSpacing: concept.letterSpacing,
    });
    if (concept.tagline) {
      elements.push({
        id: makeId("el"),
        type: "text",
        name: "Tagline",
        text: concept.tagline.toUpperCase(),
        x: 140,
        y: 672,
        width: 720,
        height: 46,
        rotation: 0,
        opacity: 0.72,
        fontFamily: concept.taglineFont,
        fontSize: 22,
        fontWeight: 500,
        color: concept.textColor,
        align: "center",
        lineHeight: 1.2,
        letterSpacing: 5,
      });
    }
  }

  return {
    id: makeId("pg"),
    name: `${concept.brandName} Logo`,
    background: concept.bgColor,
    elements,
  };
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isColorDark(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

export function renderLogoConceptSvg(
  concept: LogoConcept,
  opts?: { transparent?: boolean; darkMode?: boolean; iconOnly?: boolean },
): string {
  const icon = getVectorIcon(concept.iconId);
  const nameText = escapeXml(concept.uppercase ? concept.brandName.toUpperCase() : concept.brandName);
  const tagText = escapeXml(concept.tagline.toUpperCase());
  const initials = escapeXml(getInitials(concept.brandName));
  const bg = opts?.transparent
    ? "none"
    : opts?.darkMode
      ? "#0F172A"
      : concept.bgColor;
  const textCol = opts?.darkMode ? "#F8FAFC" : concept.textColor;
  const iconCol = isColorDark(concept.primaryColor) ? "#FFFFFF" : "#0F172A";

  const shapeEl = (x: number, y: number, size: number, fill: string, stroke = "none", sw = 0) => {
    if (concept.shapeKind === "circle") {
      return `<circle cx="${x + size / 2}" cy="${y + size / 2}" r="${size / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    }
    if (concept.shapeKind === "hexagon") {
      const cx = x + size / 2;
      const cy = y + size / 2;
      const r = size / 2;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const a = ((i * 60 - 30) * Math.PI) / 180;
        return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      return `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    }
    if (concept.shapeKind === "diamond") {
      const cx = x + size / 2;
      const cy = y + size / 2;
      const r = size / 2;
      return `<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
    }
    return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
  };

  const iconPaths = (x: number, y: number, size: number, col: string) =>
    `<g transform="translate(${x},${y}) scale(${(size / 24).toFixed(3)})" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon.paths
      .map((d) => `<path d="${d}"/>`)
      .join("")}</g>`;

  if (opts?.iconOnly) {
    const inner =
      concept.layout === "monogram-square" || concept.layout === "monogram-circle"
        ? `<text x="500" y="575" text-anchor="middle" font-family="${concept.fontFamily}, sans-serif" font-size="310" font-weight="800" fill="${iconCol}">${initials}</text>`
        : iconPaths(280, 280, 440, iconCol);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${concept.primaryColor}"/><stop offset="100%" stop-color="${concept.accentColor}"/></linearGradient></defs>
      ${shapeEl(110, 110, 780, "url(#g)")}
      ${inner}
    </svg>`;
  }

  let body = "";
  if (concept.layout === "horizontal") {
    body = `
      ${shapeEl(120, 395, 190, "url(#g)")}
      ${iconPaths(165, 440, 100, iconCol)}
      <text x="355" y="${tagText ? 495 : 520}" font-family="${concept.fontFamily}, sans-serif" font-size="${nameText.length > 10 ? 64 : 84}" font-weight="700" letter-spacing="${concept.letterSpacing}" fill="${textCol}">${nameText}</text>
      ${tagText ? `<text x="358" y="552" font-family="${concept.taglineFont}, sans-serif" font-size="22" font-weight="500" letter-spacing="4" opacity="0.72" fill="${textCol}">${tagText}</text>` : ""}
    `;
  } else if (concept.layout === "monogram-square" || concept.layout === "monogram-circle") {
    body = `
      ${shapeEl(340, 210, 320, "url(#g)")}
      <text x="500" y="420" text-anchor="middle" font-family="${concept.fontFamily}, sans-serif" font-size="136" font-weight="800" fill="${iconCol}">${initials}</text>
      <text x="500" y="655" text-anchor="middle" font-family="${concept.fontFamily}, sans-serif" font-size="${nameText.length > 12 ? 60 : 78}" font-weight="700" letter-spacing="${concept.letterSpacing}" fill="${textCol}">${nameText}</text>
      ${tagText ? `<text x="500" y="725" text-anchor="middle" font-family="${concept.taglineFont}, sans-serif" font-size="22" font-weight="500" letter-spacing="5" opacity="0.72" fill="${textCol}">${tagText}</text>` : ""}
    `;
  } else if (concept.layout === "wordmark-accent") {
    body = `
      <rect x="420" y="348" width="160" height="14" rx="7" fill="${concept.accentColor}"/>
      <text x="500" y="510" text-anchor="middle" font-family="${concept.fontFamily}, sans-serif" font-size="${nameText.length > 12 ? 84 : 112}" font-weight="700" letter-spacing="${concept.letterSpacing}" fill="${textCol}">${nameText}</text>
      ${tagText ? `<text x="500" y="592" text-anchor="middle" font-family="${concept.taglineFont}, sans-serif" font-size="24" font-weight="500" letter-spacing="6" opacity="0.8" fill="${concept.accentColor}">${tagText}</text>` : ""}
    `;
  } else if (concept.layout === "badge") {
    body = `
      ${shapeEl(240, 190, 520, "none", concept.primaryColor, 14)}
      ${iconPaths(420, 275, 160, concept.accentColor)}
      <text x="500" y="548" text-anchor="middle" font-family="${concept.fontFamily}, sans-serif" font-size="${nameText.length > 12 ? 52 : 68}" font-weight="800" letter-spacing="${concept.letterSpacing}" fill="${textCol}">${nameText}</text>
      ${tagText ? `<text x="500" y="782" text-anchor="middle" font-family="${concept.taglineFont}, sans-serif" font-size="22" font-weight="500" letter-spacing="5" opacity="0.72" fill="${textCol}">${tagText}</text>` : ""}
    `;
  } else {
    body = `
      ${shapeEl(370, 220, 260, "url(#g)")}
      ${iconPaths(432, 282, 136, iconCol)}
      <text x="500" y="625" text-anchor="middle" font-family="${concept.fontFamily}, sans-serif" font-size="${nameText.length > 12 ? 64 : 84}" font-weight="700" letter-spacing="${concept.letterSpacing}" fill="${textCol}">${nameText}</text>
      ${tagText ? `<text x="500" y="700" text-anchor="middle" font-family="${concept.taglineFont}, sans-serif" font-size="22" font-weight="500" letter-spacing="5" opacity="0.72" fill="${textCol}">${tagText}</text>` : ""}
    `;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width="1000" height="1000">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${concept.primaryColor}"/><stop offset="100%" stop-color="${concept.accentColor}"/></linearGradient></defs>
    ${bg !== "none" ? `<rect width="1000" height="1000" fill="${bg}"/>` : ""}
    ${body}
  </svg>`;
}

async function svgToPngBlob(svg: string, size: number): Promise<Blob> {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("SVG rasterize failed"));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");
    ctx.drawImage(img, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG encode failed"))), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadLogoPackZip(concept: LogoConcept): Promise<void> {
  const zip = new JSZip();
  const slug = concept.brandName.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "logo";

  const primarySvg = renderLogoConceptSvg(concept, { transparent: false });
  const transparentSvg = renderLogoConceptSvg(concept, { transparent: true });
  const darkSvg = renderLogoConceptSvg(concept, { darkMode: true });
  const iconSvg = renderLogoConceptSvg(concept, { transparent: true, iconOnly: true });

  zip.file(`${slug}-logo.svg`, primarySvg);
  zip.file(`${slug}-logo-transparent.svg`, transparentSvg);
  zip.file(`${slug}-logo-dark.svg`, darkSvg);
  zip.file(`${slug}-icon.svg`, iconSvg);

  zip.file(`${slug}-logo-1024.png`, await svgToPngBlob(primarySvg, 1024));
  zip.file(`${slug}-logo-transparent-1024.png`, await svgToPngBlob(transparentSvg, 1024));
  zip.file(`${slug}-logo-dark-1024.png`, await svgToPngBlob(darkSvg, 1024));
  zip.file(`${slug}-icon-512.png`, await svgToPngBlob(iconSvg, 512));
  zip.file(`${slug}-icon-192.png`, await svgToPngBlob(iconSvg, 192));
  zip.file(`${slug}-favicon-64.png`, await svgToPngBlob(iconSvg, 64));

  const out = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(out);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}-logo-pack.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
