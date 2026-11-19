export type VectorIconDef = {
  id: string;
  label: string;
  category: "abstract" | "tech" | "business" | "nature" | "creative" | "social" | "commerce" | "food" | "health";
  tags: string[];
  paths: string[];
  filled?: boolean;
};

export const VECTOR_ICONS: VectorIconDef[] = [
  {
    id: "layers",
    label: "Layers",
    category: "abstract",
    tags: ["design", "slate", "stack", "studio", "tech"],
    paths: [
      "M12 2L2 7l10 5 10-5-10-5z",
      "M2 17l10 5 10-5",
      "M2 12l10 5 10-5",
    ],
  },
  {
    id: "sparkle",
    label: "Sparkle",
    category: "abstract",
    tags: ["magic", "creative", "star", "brand", "ai", "shine"],
    paths: [
      "M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z",
    ],
  },
  {
    id: "prism",
    label: "Prism",
    category: "abstract",
    tags: ["geometry", "crystal", "diamond", "luxury", "tech"],
    paths: [
      "M12 2L2 9l10 13L22 9 12 2z",
      "M2 9h20",
      "M12 2l-4 7 4 13 4-13-4-7z",
    ],
  },
  {
    id: "orbit",
    label: "Orbit",
    category: "tech",
    tags: ["space", "planet", "global", "saas", "network", "ai"],
    paths: [
      "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0",
      "M20.2 6.8c1.5 2.4-1.3 6.8-6.2 9.8s-10 3.5-11.5 1.1 1.3-6.8 6.2-9.8 10-3.5 11.5-1.1z",
    ],
  },
  {
    id: "bolt",
    label: "Bolt",
    category: "tech",
    tags: ["energy", "fast", "electric", "power", "startup", "gaming"],
    paths: ["M13 2L3 14h9l-1 8 10-12h-9l1-8z"],
  },
  {
    id: "hexagon-core",
    label: "Hex Core",
    category: "tech",
    tags: ["cube", "block", "crypto", "dev", "software", "data"],
    paths: [
      "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
      "M3.27 6.96L12 12.01l8.73-5.05",
      "M12 22.08V12",
    ],
  },
  {
    id: "cpu",
    label: "Microchip",
    category: "tech",
    tags: ["chip", "hardware", "compute", "software", "tech"],
    paths: [
      "M6 6h12v12H6z",
      "M9 9h6v6H9z",
      "M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4",
    ],
  },
  {
    id: "code",
    label: "Code",
    category: "tech",
    tags: ["dev", "programming", "software", "engineering"],
    paths: ["M16 18l6-6-6-6", "M8 6l-6 6 6 6", "M14 4l-4 16"],
  },
  {
    id: "cloud",
    label: "Cloud",
    category: "tech",
    tags: ["saas", "hosting", "sky", "network"],
    paths: ["M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"],
  },
  {
    id: "rocket",
    label: "Rocket",
    category: "business",
    tags: ["launch", "startup", "growth", "marketing", "space"],
    paths: [
      "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z",
      "M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z",
      "M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0",
      "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
    ],
  },
  {
    id: "trending",
    label: "Growth",
    category: "business",
    tags: ["finance", "chart", "analytics", "invest", "consulting"],
    paths: ["M23 6l-9.5 9.5-5-5L1 18", "M17 6h6v6"],
  },
  {
    id: "shield",
    label: "Shield",
    category: "business",
    tags: ["security", "trust", "finance", "legal", "protect"],
    paths: [
      "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
      "M9 12l2 2 4-4",
    ],
  },
  {
    id: "briefcase",
    label: "Briefcase",
    category: "business",
    tags: ["work", "agency", "corporate", "consulting", "finance"],
    paths: [
      "M2 7h20v14H2z",
      "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16",
    ],
  },
  {
    id: "compass",
    label: "Compass",
    category: "business",
    tags: ["travel", "strategy", "explore", "guide", "agency"],
    paths: [
      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
      "M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z",
    ],
  },
  {
    id: "crown",
    label: "Crown",
    category: "business",
    tags: ["luxury", "royal", "fashion", "premium", "brand"],
    paths: ["M2 18h20L19 7l-4.5 5L12 4 9.5 12 5 7 2 18z", "M4 21h16"],
  },
  {
    id: "target",
    label: "Target",
    category: "business",
    tags: ["marketing", "goal", "focus", "ads", "sales"],
    paths: [
      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
      "M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z",
      "M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z",
    ],
  },
  {
    id: "globe",
    label: "Globe",
    category: "business",
    tags: ["world", "mworld", "global", "travel", "international"],
    paths: [
      "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z",
      "M2 12h20",
      "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
    ],
  },
  {
    id: "leaf",
    label: "Leaf",
    category: "nature",
    tags: ["eco", "organic", "green", "wellness", "food", "nature"],
    paths: [
      "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z",
      "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12",
    ],
  },
  {
    id: "sun",
    label: "Sun",
    category: "nature",
    tags: ["bright", "energy", "eco", "summer", "wellness"],
    paths: [
      "M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z",
      "M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42",
    ],
  },
  {
    id: "mountain",
    label: "Mountain",
    category: "nature",
    tags: ["peak", "outdoor", "adventure", "real estate", "travel"],
    paths: ["M3 20l6-12 4 7 3-4 5 9H3z"],
  },
  {
    id: "flame",
    label: "Flame",
    category: "nature",
    tags: ["hot", "fire", "fitness", "food", "energy", "gaming"],
    paths: [
      "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
    ],
  },
  {
    id: "waves",
    label: "Waves",
    category: "nature",
    tags: ["water", "ocean", "flow", "audio", "wellness"],
    paths: [
      "M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
      "M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
      "M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1",
    ],
  },
  {
    id: "pen-nib",
    label: "Pen Nib",
    category: "creative",
    tags: ["design", "art", "studio", "agency", "writing"],
    paths: [
      "M12 19l7-7 3 3-7 7-3-3z",
      "M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z",
      "M2 2l7.586 7.586",
      "M11 11m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0",
    ],
  },
  {
    id: "camera",
    label: "Camera",
    category: "creative",
    tags: ["photo", "media", "video", "studio", "fashion"],
    paths: [
      "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z",
      "M12 13m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0",
    ],
  },
