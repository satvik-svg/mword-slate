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
