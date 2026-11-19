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
    label: "Logo Canvas",
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
