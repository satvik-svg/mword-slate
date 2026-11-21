import type { DesignCategory, FilterPreset, ImageFilters } from "@/lib/types";

export type FormatPreset = {
  id: string;
  label: string;
  sublabel: string;
  category: DesignCategory;
  width: number;
  height: number;
  accent: string;
};

export const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: "presentation-16-9",
    label: "Presentation (16:9)",
    sublabel: "1920 × 1080 px",
    category: "presentation",
    width: 1920,
    height: 1080,
    accent: "#4F46E5",
  },
  {
    id: "instagram-post",
    label: "Instagram Post",
    sublabel: "1080 × 1080 px",
    category: "social",
    width: 1080,
    height: 1080,
    accent: "#EC4899",
  },
  {
    id: "instagram-story",
    label: "Instagram Story / Reel",
    sublabel: "1080 × 1920 px",
    category: "social",
    width: 1080,
    height: 1920,
    accent: "#F43F5E",
  },
  {
    id: "linkedin-post",
    label: "LinkedIn Post",
    sublabel: "1200 × 1200 px",
    category: "social",
    width: 1200,
    height: 1200,
    accent: "#0284C7",
  },
  {
    id: "linkedin-banner",
    label: "LinkedIn Banner",
    sublabel: "1584 × 396 px",
    category: "social",
    width: 1584,
    height: 396,
    accent: "#0369A1",
  },
  {
    id: "youtube-thumb",
    label: "YouTube Thumbnail",
    sublabel: "1280 × 720 px",
    category: "social",
    width: 1280,
    height: 720,
    accent: "#DC2626",
  },
  {
    id: "poster",
    label: "Poster",
    sublabel: "1080 × 1520 px",
    category: "marketing",
    width: 1080,
    height: 1520,
    accent: "#7C3AED",
  },
  {
    id: "flyer",
    label: "Flyer",
    sublabel: "1200 × 1600 px",
    category: "marketing",
    width: 1200,
    height: 1600,
    accent: "#EA580C",
  },
  {
    id: "business-card",
    label: "Business Card",
    sublabel: "1050 × 600 px",
    category: "marketing",
    width: 1050,
    height: 600,
    accent: "#0F172A",
  },
  {
    id: "a4-doc",
    label: "Document / Resume (A4)",
    sublabel: "1240 × 1754 px",
    category: "document",
    width: 1240,
    height: 1754,
    accent: "#059669",
  },
  {
    id: "logo-square",
    label: "Logo Mark",
    sublabel: "1000 × 1000 px",
    category: "logo",
    width: 1000,
    height: 1000,
    accent: "#06B6D4",
  },
  {
    id: "certificate",
    label: "Certificate",
    sublabel: "1600 × 1130 px",
    category: "document",
    width: 1600,
    height: 1130,
    accent: "#B45309",
  },
];

export const GOOGLE_FONTS: { name: string; category: string; weights?: string }[] = [
  { name: "Inter", category: "Sans" },
  { name: "Inter Tight", category: "Sans" },
  { name: "Plus Jakarta Sans", category: "Sans" },
  { name: "Space Grotesk", category: "Display" },
  { name: "DM Sans", category: "Sans" },
  { name: "Outfit", category: "Modern" },
  { name: "Poppins", category: "Sans" },
  { name: "Montserrat", category: "Geometric" },
  { name: "Roboto", category: "Sans" },
  { name: "Open Sans", category: "Sans" },
  { name: "Lato", category: "Sans" },
  { name: "Syne", category: "Display" },
  { name: "Bebas Neue", category: "Condensed", weights: "wght@400" },
  { name: "Oswald", category: "Condensed", weights: "wght@400;500;600;700" },
  { name: "Playfair Display", category: "Serif" },
  { name: "Fraunces", category: "Serif" },
  { name: "Lora", category: "Serif" },
  { name: "Merriweather", category: "Serif" },
  { name: "Cormorant Garamond", category: "Editorial" },
  { name: "Caveat", category: "Handwritten", weights: "wght@400;600;700" },
  { name: "Pacifico", category: "Script", weights: "wght@400" },
  { name: "Fragment Mono", category: "Mono", weights: "ital@0;1" },
  { name: "JetBrains Mono", category: "Mono" },
];

export const FONT_PAIRINGS: { name: string; heading: string; body: string }[] = [
  { name: "Modern Studio", heading: "Plus Jakarta Sans", body: "Inter" },
  { name: "Tech Forward", heading: "Space Grotesk", body: "DM Sans" },
  { name: "Editorial Classic", heading: "Playfair Display", body: "Lora" },
  { name: "Bold Impact", heading: "Bebas Neue", body: "Montserrat" },
  { name: "Luxury Serif", heading: "Cormorant Garamond", body: "Poppins" },
  { name: "Creative Lab", heading: "Syne", body: "Outfit" },
  { name: "Clean Product", heading: "Outfit", body: "Inter" },
  { name: "Code & Data", heading: "JetBrains Mono", body: "Inter" },
];

export const FILTER_PRESETS: {
  id: FilterPreset;
  label: string;
  values: Omit<ImageFilters, "preset">;
}[] = [
  {
    id: "none",
    label: "Original",
    values: { brightness: 100, contrast: 100, saturation: 100, blur: 0, hue: 0, vignette: 0 },
  },
  {
    id: "vivid",
    label: "Vivid",
    values: { brightness: 106, contrast: 118, saturation: 140, blur: 0, hue: 0, vignette: 0 },
  },
  {
    id: "warm",
    label: "Warm",
    values: { brightness: 105, contrast: 106, saturation: 118, blur: 0, hue: -10, vignette: 10 },
  },
  {
    id: "cool",
    label: "Cool",
    values: { brightness: 102, contrast: 108, saturation: 92, blur: 0, hue: 14, vignette: 8 },
  },
  {
    id: "bw",
    label: "Noir B&W",
    values: { brightness: 104, contrast: 128, saturation: 0, blur: 0, hue: 0, vignette: 20 },
  },
  {
    id: "vintage",
    label: "Vintage",
    values: { brightness: 98, contrast: 92, saturation: 72, blur: 0, hue: -14, vignette: 35 },
  },
  {
    id: "drama",
    label: "Drama",
    values: { brightness: 94, contrast: 142, saturation: 115, blur: 0, hue: 0, vignette: 40 },
  },
  {
    id: "fade",
    label: "Soft Fade",
    values: { brightness: 112, contrast: 84, saturation: 85, blur: 0, hue: 4, vignette: 0 },
  },
];

export function cssFilterFromImageFilters(f?: ImageFilters): string {
  if (!f) return "none";
  const parts: string[] = [];
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness}%)`);
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast}%)`);
  if (f.saturation !== 100) parts.push(`saturate(${f.saturation}%)`);
  if (f.hue !== 0) parts.push(`hue-rotate(${f.hue}deg)`);
  if (f.blur > 0) parts.push(`blur(${f.blur}px)`);
  return parts.length ? parts.join(" ") : "none";
}

export const GOOGLE_FONTS_URL =
  "https://fonts.googleapis.com/css2?" +
  GOOGLE_FONTS.map(
    (f) =>
      `family=${encodeURIComponent(f.name).replace(/%20/g, "+")}:${f.weights ?? "ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,700"}`,
  ).join("&") +
  "&display=swap";

export const SWATCH_PALETTES: { name: string; colors: string[] }[] = [
  { name: "Slate Monochrome", colors: ["#141417", "#2563EB", "#52525B", "#E4E4E7", "#FAFAFA"] },
  { name: "Warm Editorial", colors: ["#1C1917", "#C2410C", "#78716C", "#F5EFE6", "#FDFBF7"] },
  { name: "Forest Minimal", colors: ["#14261E", "#15803D", "#4D7C5D", "#E7F0EA", "#F9FBF9"] },
  { name: "Nordic Blue", colors: ["#0F172A", "#0369A1", "#64748B", "#E2E8F0", "#F8FAFC"] },
  { name: "Plum & Stone", colors: ["#1E1B24", "#7C3AED", "#71717A", "#EFEBF8", "#FAF9FC"] },
  { name: "Obsidian Gold", colors: ["#111113", "#B48A3E", "#52525B", "#F3ECD8", "#FCFBF8"] },
];
