import { jsonError, requireAuth } from "@/lib/auth";
import {
  filterCuratedStock,
  isAllowedStockImageUrl,
  type StockCategory,
  type StockPhoto,
  type StockProvider,
} from "@/lib/stock-media";

export const dynamic = "force-dynamic";

const MAX_PROXY_BYTES = 7 * 1024 * 1024;

function normalizeCategory(raw: string | null): StockCategory {
  const valid: StockCategory[] = [
    "all",
    "business",
    "workspace",
    "nature",
    "architecture",
    "abstract",
    "tech",
    "minimal",
    "people",
  ];
  return valid.includes(raw as StockCategory) ? (raw as StockCategory) : "all";
}

async function searchUnsplash(query: string, page: number, key: string): Promise<StockPhoto[]> {
  const q = query || "minimal design studio";
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&page=${page}&per_page=24&content_filter=high`;
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}`, "Accept-Version": "v1" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: {
      id: string;
      alt_description?: string | null;
      description?: string | null;
      width: number;
      height: number;
      color?: string;
      urls: { small: string; regular: string };
      user?: { name?: string; links?: { html?: string } };
    }[];
  };
  return (data.results ?? []).map((item) => ({
    id: `un_${item.id}`,
    title: (item.alt_description || item.description || "Unsplash Photo").slice(0, 64),
    author: item.user?.name || "Unsplash",
    authorUrl: item.user?.links?.html,
    source: "unsplash",
    thumbUrl: item.urls.small,
    fullUrl: item.urls.regular,
    width: item.width || 1600,
    height: item.height || 1067,
    color: item.color,
    category: "minimal",
    tags: [],
  }));
}

async function searchPexels(query: string, page: number, key: string): Promise<StockPhoto[]> {
  const q = query || "modern workspace";
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&page=${page}&per_page=24`;
  const res = await fetch(url, {
    headers: { Authorization: key },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    photos?: {
      id: number;
      alt?: string;
      photographer?: string;
      photographer_url?: string;
      width: number;
      height: number;
      avg_color?: string;
      src: { medium: string; large2x: string; large: string };
    }[];
  };
  return (data.photos ?? []).map((item) => ({
    id: `px_${item.id}`,
    title: (item.alt || "Pexels Photo").slice(0, 64),
    author: item.photographer || "Pexels",
    authorUrl: item.photographer_url,
    source: "pexels",
    thumbUrl: item.src.medium,
    fullUrl: item.src.large2x || item.src.large,
    width: item.width || 1600,
    height: item.height || 1067,
    color: item.avg_color,
    category: "minimal",
    tags: [],
  }));
}

async function searchOpenverse(query: string, page: number): Promise<StockPhoto[]> {
  const url = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license_type=commercial,modification&page=${page}&page_size=24`;
  const res = await fetch(url, {
    headers: { "User-Agent": "SlateStudio/1.0 (+https://slate.laflabs-tech.workers.dev)" },
    signal: AbortSignal.timeout(4500),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as {
    results?: {
      id: string;
      title?: string;
      creator?: string;
      creator_url?: string;
      url?: string;
      thumbnail?: string;
      width?: number;
      height?: number;
    }[];
  };
  const out: StockPhoto[] = [];
  for (const item of data.results ?? []) {
    const fullUrl = item.url || "";
    const thumbUrl = item.thumbnail || fullUrl;
    if (!fullUrl || !isAllowedStockImageUrl(fullUrl)) continue;
    out.push({
      id: `ov_${item.id}`,
      title: (item.title || "Openverse Photo").slice(0, 64),
      author: item.creator || "Openverse CC",
      authorUrl: item.creator_url,
      source: "openverse",
      thumbUrl: isAllowedStockImageUrl(thumbUrl) ? thumbUrl : fullUrl,
      fullUrl,
      width: item.width || 1400,
      height: item.height || 933,
      category: "minimal",
      tags: [],
    });
  }
  return out;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim();
    const category = normalizeCategory(url.searchParams.get("category"));
    const page = Math.max(1, Math.min(20, Number(url.searchParams.get("page") || "1") || 1));

    const unsplashKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
    const pexelsKey = process.env.PEXELS_API_KEY?.trim();

    let photos: StockPhoto[] = [];
    let provider: StockProvider = "curated";
    let hasMore = false;

    const effectiveQuery = q || (category !== "all" ? category : "");

    if (unsplashKey && (effectiveQuery || page > 1)) {
      try {
        photos = await searchUnsplash(effectiveQuery, page, unsplashKey);
        if (photos.length > 0) {
          provider = "unsplash";
          hasMore = photos.length >= 24;
        }
      } catch {
        // fallback below
      }
    } else if (pexelsKey && (effectiveQuery || page > 1)) {
      try {
        photos = await searchPexels(effectiveQuery, page, pexelsKey);
        if (photos.length > 0) {
          provider = "pexels";
          hasMore = photos.length >= 24;
        }
      } catch {
        // fallback below
      }
    } else if (q.length >= 2) {
      // Zero-config live search via Openverse CC0/CC-BY + curated matches
      const curatedMatches = page === 1 ? filterCuratedStock(q, category) : [];
      try {
        const live = await searchOpenverse(q, page);
        if (live.length > 0) {
          provider = "openverse";
          photos = [...curatedMatches, ...live];
          hasMore = live.length >= 16;
        } else {
          photos = curatedMatches;
        }
      } catch {
        photos = curatedMatches;
      }
    }

    if (photos.length === 0 && page === 1) {
      photos = filterCuratedStock(q, category);
      provider = "curated";
      hasMore = false;
    }

    return Response.json({ photos, provider, hasMore });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Fetches an allowlisted stock image URL server-side and returns a CORS-safe data URL
 * so Canvas exports (PNG/PDF/PPTX) and Magic Eraser pixel operations never hit tainted-canvas errors.
 */
export async function POST(req: Request) {
  try {
    await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as { url?: string };
    const targetUrl = typeof body.url === "string" ? body.url.trim() : "";

    if (!targetUrl || !isAllowedStockImageUrl(targetUrl)) {
      return Response.json({ error: "Unsupported stock image URL" }, { status: 400 });
    }

    const upstream = await fetch(targetUrl, {
      headers: {
        Accept: "image/jpeg,image/png,image/webp,image/*;q=0.8",
        "User-Agent": "SlateStudio/1.0",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(9000),
    });

    if (!upstream.ok) {
      return Response.json({ error: "Failed to fetch stock image" }, { status: 502 });
    }

    const finalUrl = upstream.url || targetUrl;
    if (!isAllowedStockImageUrl(finalUrl)) {
      return Response.json({ error: "Redirect target not allowed" }, { status: 400 });
    }

    const contentType = (upstream.headers.get("content-type") || "image/jpeg").split(";")[0].trim();
    if (!contentType.startsWith("image/")) {
      return Response.json({ error: "Upstream response is not an image" }, { status: 400 });
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength === 0 || buf.byteLength > MAX_PROXY_BYTES) {
      return Response.json({ error: "Stock image exceeds 7 MB limit" }, { status: 413 });
    }

    const base64 = Buffer.from(buf).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;
    return Response.json({ dataUrl, mimeType: contentType, sizeBytes: buf.byteLength });
  } catch (error) {
    return jsonError(error);
  }
}
