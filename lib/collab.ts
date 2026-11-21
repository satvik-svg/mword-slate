import type { DesignComment, DesignPage, ShareConfig } from "@/lib/types";

export type CollabRole = "view" | "comment" | "edit" | "full";

export type CollabPeer = {
  clientId: string;
  name: string;
  email: string;
  color: string;
  role: CollabRole;
  pageId: string;
  x: number;
  y: number;
  cursorVisible?: boolean;
  selectedIds: string[];
  lastSeen: number;
};

export type CollabClientMessage =
  | {
      type: "cursor";
      pageId: string;
      x: number;
      y: number;
      cursorVisible?: boolean;
      selectedIds?: string[];
    }
  | {
      type: "page_sync";
      pageId: string;
      page: DesignPage;
    }
  | {
      type: "design_sync";
      title?: string;
      width?: number;
      height?: number;
      pages: DesignPage[];
    }
  | {
      type: "asset_chunk";
      hash: string;
      index: number;
      total: number;
      data: string;
    }
  | {
      type: "request_asset";
      hash: string;
    }
  | {
      type: "chunk";
      transferId: string;
      index: number;
      total: number;
      data: string;
    }
  | {
      type: "comments_sync";
      comments: DesignComment[];
    }
  | {
      type: "ping";
    };

export type CollabServerMessage =
  | {
      type: "welcome";
      clientId: string;
      role: CollabRole;
      color: string;
      seq: number;
      peers: CollabPeer[];
    }
  | {
      type: "peer_join";
      peer: CollabPeer;
    }
  | {
      type: "peer_leave";
      clientId: string;
    }
  | {
      type: "cursor";
      clientId: string;
      pageId: string;
      x: number;
      y: number;
      cursorVisible: boolean;
      selectedIds: string[];
    }
  | {
      type: "page_sync";
      fromClientId: string;
      fromName: string;
      seq: number;
      pageId: string;
      page: DesignPage;
    }
  | {
      type: "design_sync";
      fromClientId: string;
      fromName: string;
      seq: number;
      title?: string;
      width?: number;
      height?: number;
      pages: DesignPage[];
    }
  | {
      type: "asset_chunk";
      fromClientId: string;
      hash: string;
      index: number;
      total: number;
      data: string;
    }
  | {
      type: "request_asset";
      fromClientId: string;
      hash: string;
    }
  | {
      type: "chunk";
      fromClientId: string;
      fromName: string;
      seq: number;
      transferId: string;
      index: number;
      total: number;
      data: string;
    }
  | {
      type: "comments_sync";
      fromClientId: string;
      fromName: string;
      comments: DesignComment[];
    }
  | {
      type: "pong";
    };

export const ASSET_REF_PREFIX = "__SLATE_ASSET_REF__:";
export const COLLAB_CHUNK_BYTES = 180_000;
const ASSET_STRIP_THRESHOLD = 4_000;

const COLLAB_PALETTE = [
  "#2563EB",
  "#E11D48",
  "#059669",
  "#D97706",
  "#7C3AED",
  "#0891B2",
  "#DB2777",
  "#4F46E5",
];

export function collabColorForSeed(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return COLLAB_PALETTE[Math.abs(h) % COLLAB_PALETTE.length];
}

export function resolveCollabAccess(params: {
  designBiId: string;
  shareConfig: ShareConfig;
  viewerBiId?: string;
  viewerEmail?: string;
}): CollabRole | null {
  const { designBiId, shareConfig, viewerBiId, viewerEmail } = params;
  if (viewerBiId && viewerBiId === designBiId) return "full";

  const cleanEmail = (viewerEmail ?? "").trim().toLowerCase();
  if (cleanEmail) {
    const invited = (shareConfig.people ?? []).find(
      (p) => p.email.trim().toLowerCase() === cleanEmail,
    );
    if (invited) return invited.access;
  }

  const link = shareConfig.linkAccess;
  if (link === "edit") return "edit";
  if (link === "comment") return "comment";
  if (link === "view" || link === "template") return "view";
  return null;
}

export function canRoleBroadcastDesign(role: CollabRole): boolean {
  return role === "edit" || role === "full";
}

export function canRoleBroadcastComments(role: CollabRole): boolean {
  return role === "comment" || role === "edit" || role === "full";
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Deterministic compact fingerprint for large base64 data URLs so unchanged photos
 * aren't re-transmitted on every live edit (keeping WebSocket frames tiny and well
 * below Cloudflare Durable Objects' 1 MiB per-message cap).
 */
export function hashAssetDataUrl(dataUrl: string): string {
  let h1 = 2166136261;
  let h2 = 0x9e3779b9;
  const step = Math.max(1, Math.floor(dataUrl.length / 2048));
  for (let i = 0; i < dataUrl.length; i += step) {
    const c = dataUrl.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ (c + i), 2246822519);
  }
  const tailStart = Math.max(0, dataUrl.length - 64);
  for (let i = tailStart; i < dataUrl.length; i++) {
    const c = dataUrl.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2246822519);
  }
  return `${(h1 >>> 0).toString(36)}_${(h2 >>> 0).toString(36)}_${dataUrl.length.toString(36)}`;
}

export function isLargeInlineAsset(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:") && value.length >= ASSET_STRIP_THRESHOLD;
}

export function isAssetRef(value: unknown): value is string {
  return typeof value === "string" && value.startsWith(ASSET_REF_PREFIX);
}

/** Indexes all large inline data URLs from pages into an in-memory cache (hash -> dataUrl). */
export function collectPageAssets(pages: DesignPage[], cache: Map<string, string>): void {
  for (const page of pages) {
    if (isLargeInlineAsset(page.backgroundImage)) {
      cache.set(hashAssetDataUrl(page.backgroundImage), page.backgroundImage);
    }
    for (const el of page.elements) {
      if (el.type === "image") {
        if (isLargeInlineAsset(el.src)) {
          cache.set(hashAssetDataUrl(el.src), el.src);
        }
        if (isLargeInlineAsset(el.originalSrc)) {
          cache.set(hashAssetDataUrl(el.originalSrc), el.originalSrc);
        }
      }
    }
  }
}

/**
 * Replaces large inline base64 strings on a page with compact `__SLATE_ASSET_REF__:<hash>`
 * tokens and returns any newly introduced assets not yet present in `announcedHashes`.
 */
export function stripPageMediaForSync(
  page: DesignPage,
  cache: Map<string, string>,
  announcedHashes: Set<string>,
): { page: DesignPage; newAssets: { hash: string; dataUrl: string }[] } {
  const newAssets: { hash: string; dataUrl: string }[] = [];
  const register = (dataUrl: string): string => {
    const hash = hashAssetDataUrl(dataUrl);
    cache.set(hash, dataUrl);
    if (!announcedHashes.has(hash)) {
      announcedHashes.add(hash);
      newAssets.push({ hash, dataUrl });
    }
    return `${ASSET_REF_PREFIX}${hash}`;
  };

  let bgChanged = false;
  let nextBg = page.backgroundImage;
  if (isLargeInlineAsset(page.backgroundImage)) {
    nextBg = register(page.backgroundImage);
    bgChanged = true;
  }

  let elChanged = false;
  const nextElements = page.elements.map((el) => {
    if (el.type !== "image") return el;
    let src = el.src;
    let originalSrc = el.originalSrc;
    let changed = false;
    if (isLargeInlineAsset(src)) {
      src = register(src);
      changed = true;
    }
    if (isLargeInlineAsset(originalSrc)) {
      originalSrc = register(originalSrc);
      changed = true;
    }
    if (!changed) return el;
    elChanged = true;
    return { ...el, src, originalSrc };
  });

  if (!bgChanged && !elChanged) {
    return { page, newAssets };
  }
  return {
    page: {
      ...page,
      backgroundImage: nextBg,
      elements: nextElements,
    },
    newAssets,
  };
}

/**
 * Restores `__SLATE_ASSET_REF__:<hash>` tokens back into real data URLs from `cache`.
 * Any hashes missing from `cache` are collected in `missingHashes` so the client can request them.
 */
export function hydratePageMedia(
  page: DesignPage,
  cache: Map<string, string>,
): { page: DesignPage; missingHashes: string[] } {
  const missing = new Set<string>();
  const resolve = (val: string | undefined): string | undefined => {
    if (!val) return val;
    if (val.startsWith("data:") && val.length >= ASSET_STRIP_THRESHOLD) {
      cache.set(hashAssetDataUrl(val), val);
      return val;
    }
    if (!val.startsWith(ASSET_REF_PREFIX)) return val;
    const hash = val.slice(ASSET_REF_PREFIX.length);
    const found = cache.get(hash);
    if (found) return found;
    missing.add(hash);
    return val;
  };

  const nextBg = resolve(page.backgroundImage);
  const nextElements = page.elements.map((el) => {
    if (el.type !== "image") return el;
    const src = resolve(el.src) ?? el.src;
    const originalSrc = resolve(el.originalSrc);
    if (src === el.src && originalSrc === el.originalSrc) return el;
    return { ...el, src, originalSrc };
  });

  return {
    page: {
      ...page,
      backgroundImage: nextBg,
      elements: nextElements,
    },
    missingHashes: Array.from(missing),
  };
}

export function chunkString(input: string, maxChunkSize = COLLAB_CHUNK_BYTES): string[] {
  if (input.length <= maxChunkSize) return [input];
  const out: string[] = [];
  for (let i = 0; i < input.length; i += maxChunkSize) {
    out.push(input.slice(i, i + maxChunkSize));
  }
  return out;
}

