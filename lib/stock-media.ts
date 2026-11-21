export type StockCategory =
  | "all"
  | "business"
  | "workspace"
  | "nature"
  | "architecture"
  | "abstract"
  | "tech"
  | "minimal"
  | "people";

export type StockProvider = "unsplash" | "pexels" | "openverse" | "curated";

export type StockPhoto = {
  id: string;
  title: string;
  author: string;
  authorUrl?: string;
  source: StockProvider;
  thumbUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  color?: string;
  category: Exclude<StockCategory, "all">;
  tags: string[];
};

export const STOCK_CATEGORIES: { id: StockCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "business", label: "Business" },
  { id: "workspace", label: "Workspace" },
  { id: "tech", label: "Tech" },
  { id: "architecture", label: "Architecture" },
  { id: "nature", label: "Nature" },
  { id: "abstract", label: "Abstract" },
  { id: "minimal", label: "Minimal" },
  { id: "people", label: "People" },
];

const ALLOWED_STOCK_HOSTS = new Set([
  "images.unsplash.com",
  "images.pexels.com",
  "upload.wikimedia.org",
  "live.staticflickr.com",
  "farm66.staticflickr.com",
  "api.openverse.org",
  "cdn.stocksnap.io",
]);

export function isAllowedStockImageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_STOCK_HOSTS.has(host);
  } catch {
    return false;
  }
}

function unsplashPhoto(
  id: string,
  photoPath: string,
  title: string,
  author: string,
  category: Exclude<StockCategory, "all">,
  tags: string[],
  width = 1600,
  height = 1067,
  color = "#1E293B",
): StockPhoto {
  return {
    id,
    title,
    author,
    source: "curated",
    thumbUrl: `https://images.unsplash.com/${photoPath}?auto=format&fit=crop&w=480&q=75`,
    fullUrl: `https://images.unsplash.com/${photoPath}?auto=format&fit=crop&w=1600&q=85`,
    width,
    height,
    color,
    category,
    tags,
  };
}

export const CURATED_STOCK_PHOTOS: StockPhoto[] = [
  unsplashPhoto(
    "stk_ws_1",
    "photo-1497366216548-37526070297c",
    "Modern Glass Office",
    "Nastuh Abootalebi",
    "business",
    ["office", "meeting", "corporate", "glass", "interior", "startup", "team"],
    1600,
    1067,
    "#CBD5E1",
  ),
  unsplashPhoto(
    "stk_ws_2",
    "photo-1497215842964-222b430dc094",
    "Clean Studio Desk",
    "Alesia Kazantceva",
    "workspace",
    ["desk", "laptop", "minimal", "studio", "work", "office", "productivity"],
    1600,
    1067,
    "#E2E8F0",
  ),
  unsplashPhoto(
    "stk_ws_3",
    "photo-1522071820081-009f0129c71c",
    "Collaborative Team Session",
    "Annie Spratt",
    "people",
    ["team", "collaboration", "startup", "meeting", "laptop", "business", "founders"],
    1600,
    1067,
    "#334155",
  ),
  unsplashPhoto(
    "stk_ws_4",
    "photo-1498050108023-c5249f4df085",
    "Developer Laptop Setup",
    "Christopher Gower",
    "tech",
    ["code", "laptop", "macbook", "developer", "software", "programming", "desk"],
    1600,
    1067,
    "#0F172A",
  ),
  unsplashPhoto(
    "stk_ws_5",
    "photo-1551288049-bebda4e38f71",
    "Analytics Dashboard Screen",
    "Luke Chesser",
    "tech",
    ["analytics", "charts", "data", "dashboard", "metrics", "saas", "finance"],
    1600,
    1067,
    "#1E293B",
  ),
  unsplashPhoto(
    "stk_ws_6",
    "photo-1557804506-669a67965ba0",
    "Strategy Pitch Room",
    "Austin Distel",
    "business",
    ["pitch", "presentation", "strategy", "meeting", "conference", "founders"],
    1600,
    1067,
    "#1E293B",
  ),
  unsplashPhoto(
    "stk_arch_1",
    "photo-1486406146926-c627a92ad1ab",
    "Glass Skyscraper Facade",
    "Sean Pollock",
    "architecture",
    ["building", "skyscraper", "corporate", "city", "modern", "glass", "finance"],
    1600,
    1067,
    "#0F172A",
  ),
  unsplashPhoto(
    "stk_arch_2",
    "photo-1513694203232-719a280e022f",
    "Warm Minimal Interior",
    "Sidekix Media",
    "architecture",
    ["interior", "minimal", "living", "design", "room", "furniture", "warm"],
    1600,
    1067,
    "#E7E5E4",
  ),
  unsplashPhoto(
    "stk_arch_3",
    "photo-1503387762-592deb58ef4e",
    "Architectural Blueprint Lines",
    "Daniel McCullough",
    "architecture",
    ["architecture", "concrete", "geometry", "lines", "structure", "modern"],
    1600,
    1067,
    "#94A3B8",
  ),
  unsplashPhoto(
    "stk_abs_1",
    "photo-1618005182384-a83a8bd57fbe",
    "Liquid Indigo Waves",
    "Milad Fakurian",
    "abstract",
    ["3d", "gradient", "waves", "indigo", "blue", "background", "modern", "fluid"],
    1600,
    1067,
    "#1E3A8A",
  ),
  unsplashPhoto(
    "stk_abs_2",
    "photo-1557682250-33bd709cbe85",
    "Vibrant Mesh Gradient",
    "Luke Chesser",
    "abstract",
    ["gradient", "purple", "pink", "backdrop", "colorful", "deck", "hero"],
    1600,
    1067,
    "#7C3AED",
  ),
  unsplashPhoto(
    "stk_abs_3",
    "photo-1579546929518-9e396f3cc809",
    "Soft Pastel Aura",
    "Luke Chesser",
    "abstract",
    ["pastel", "gradient", "soft", "background", "aura", "social", "story"],
    1600,
    1067,
    "#F472B6",
  ),
  unsplashPhoto(
    "stk_abs_4",
    "photo-1618005198919-d3d4b5a92ead",
    "Sculpted Obsidian Ribbon",
    "Milad Fakurian",
    "abstract",
    ["dark", "3d", "abstract", "minimal", "obsidian", "keynote", "backdrop"],
    1600,
    1067,
    "#18181B",
  ),
  unsplashPhoto(
    "stk_nat_1",
    "photo-1506744038136-46273834b3fb",
    "Yosemite Valley Dawn",
    "Bailey Zindel",
    "nature",
    ["mountain", "lake", "landscape", "sunrise", "forest", "calm", "outdoors"],
    1600,
    1067,
    "#064E3B",
  ),
  unsplashPhoto(
    "stk_nat_2",
    "photo-1470071459604-3b5ec3a7fe05",
    "Misty Alpine Ridge",
    "Lukasz Szmigiel",
    "nature",
    ["fog", "mountains", "forest", "nature", "atmosphere", "editorial"],
    1600,
    1067,
    "#1E293B",
  ),
  unsplashPhoto(
    "stk_nat_3",
    "photo-1507525428034-b723cf961d3e",
    "Ocean Horizon Surf",
    "Sean Oulashin",
    "nature",
    ["ocean", "beach", "water", "summer", "travel", "sunset", "coast"],
    1600,
    1067,
    "#0EA5E9",
  ),
  unsplashPhoto(
    "stk_min_1",
    "photo-1507608616759-54f48f0af0ee",
    "Editorial Sky Balloons",
    "Ian Dooley",
    "minimal",
    ["minimal", "sky", "editorial", "clean", "poster", "travel"],
    1600,
    1067,
    "#BAE6FD",
  ),
  unsplashPhoto(
    "stk_min_2",
    "photo-1494438639946-1ebd1d20bf85",
    "Warm Matte Lamp Shadow",
    "David van Dijk",
    "minimal",
    ["minimal", "shadow", "warm", "product", "clean", "still life", "beige"],
    1600,
    1067,
    "#F5F5F4",
  ),
  unsplashPhoto(
    "stk_min_3",
    "photo-1523275335684-37898b6baf30",
    "Studio Product Watch",
    "Rachit Tank",
    "minimal",
    ["product", "watch", "studio", "ecommerce", "minimal", "white", "cutout"],
    1600,
    1067,
    "#F1F5F9",
  ),
  unsplashPhoto(
    "stk_min_4",
    "photo-1542291026-7eec264c27ff",
    "Red Sneaker Studio",
    "Domino Studio",
    "minimal",
    ["sneaker", "shoe", "product", "red", "ecommerce", "cutout", "poster"],
    1600,
    1067,
    "#DC2626",
  ),
  unsplashPhoto(
    "stk_tech_1",
    "photo-1518770660439-4636190af475",
    "Microchip Circuit Macro",
    "Alexandre Debieve",
    "tech",
    ["hardware", "chip", "ai", "technology", "circuit", "electronics", "dark"],
    1600,
    1067,
    "#0F172A",
  ),
  unsplashPhoto(
    "stk_tech_2",
    "photo-1550751827-4bd374c3f58b",
    "Cyber Network Glow",
    "Adi Goldstein",
    "tech",
    ["security", "cyber", "network", "ai", "data", "tech", "futuristic"],
    1600,
    1067,
    "#09090B",
  ),
  unsplashPhoto(
    "stk_ppl_1",
    "photo-1531482615713-2afd69097998",
    "Design Workshop Sprint",
    "Christina Wocintechchat",
    "people",
    ["workshop", "design", "women", "tech", "team", "presentation", "office"],
    1600,
    1067,
    "#334155",
  ),
  unsplashPhoto(
    "stk_ppl_2",
    "photo-1573496359142-b8d87734a5a2",
    "Executive Portrait",
    "Christina Wocintechchat",
    "people",
    ["portrait", "founder", "speaker", "headshot", "business", "profile"],
    1600,
    1067,
    "#475569",
  ),
  unsplashPhoto(
    "stk_ws_7",
    "photo-1495474472287-4d71bcdd2085",
    "Morning Coffee & Table",
    "Nathan Dumlao",
    "workspace",
    ["coffee", "cafe", "lifestyle", "table", "editorial", "brand", "warm"],
    1600,
    1067,
    "#78350F",
  ),
  unsplashPhoto(
    "stk_biz_2",
    "photo-1460925895917-afdab827c52f",
    "Growth Metrics Workspace",
    "Carlos Muza",
    "business",
    ["growth", "marketing", "laptop", "analytics", "finance", "saas", "deck"],
    1600,
    1067,
    "#E2E8F0",
  ),
];

export function filterCuratedStock(query: string, category: StockCategory): StockPhoto[] {
  const q = query.trim().toLowerCase();
  const terms = q.split(/\s+/).filter(Boolean);

  return CURATED_STOCK_PHOTOS.filter((photo) => {
    if (category !== "all" && photo.category !== category) return false;
    if (terms.length === 0) return true;
    const haystack = `${photo.title} ${photo.author} ${photo.category} ${photo.tags.join(" ")}`.toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}
