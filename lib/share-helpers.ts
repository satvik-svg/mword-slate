import type { CustomFontItem, DesignComment, DesignPage } from "@/lib/types";

/**
 * Safely merges comments submitted by a guest with "comment" access.
 * Guests may:
 *  - append brand-new comment threads
 *  - append new replies to existing comment threads
 *  - toggle `resolved` on existing threads
 * Guests may NOT delete or edit existing comments or replies.
 */
export function mergeGuestComments(
  existing: DesignComment[],
  incoming: DesignComment[],
  actor: { name: string; email: string },
): DesignComment[] {
  const safeName = actor.name.trim() || "Guest";
  const safeEmail = actor.email.trim();
  const isAuth = safeName !== "Guest" || safeEmail.length > 0;

  const incomingById = new Map<string, DesignComment>();
  for (const item of incoming) {
    if (item && typeof item.id === "string" && item.id.trim()) {
      incomingById.set(item.id, item);
    }
  }

  const merged: DesignComment[] = existing.map((orig) => {
    const inc = incomingById.get(orig.id);
    if (!inc) return orig;

    const existingReplyIds = new Set((orig.replies ?? []).map((r) => r.id));
    const appendedReplies = Array.isArray(inc.replies)
      ? inc.replies
          .filter(
            (r) =>
              r &&
              typeof r.id === "string" &&
              r.id.trim() &&
              !existingReplyIds.has(r.id) &&
              typeof r.text === "string" &&
              r.text.trim().length > 0,
          )
          .slice(0, 20)
          .map((r) => ({
            id: r.id.trim().slice(0, 64),
            authorName: isAuth ? safeName : (r.authorName?.trim() || "Guest").slice(0, 80),
            authorEmail: isAuth ? safeEmail : (r.authorEmail?.trim() || "").slice(0, 120),
            text: r.text.trim().slice(0, 2000),
            createdAt: typeof r.createdAt === "number" && Number.isFinite(r.createdAt) ? r.createdAt : Date.now(),
          }))
      : [];

    return {
      ...orig,
      resolved: typeof inc.resolved === "boolean" ? inc.resolved : orig.resolved,
      replies: [...(orig.replies ?? []), ...appendedReplies],
    };
  });

  const existingIds = new Set(existing.map((c) => c.id));
  const appendedComments = incoming
    .filter(
      (c) =>
        c &&
        typeof c.id === "string" &&
        c.id.trim() &&
        !existingIds.has(c.id) &&
        typeof c.text === "string" &&
        c.text.trim().length > 0,
    )
    .slice(0, 20)
    .map((c) => ({
      id: c.id.trim().slice(0, 64),
      pageId: typeof c.pageId === "string" ? c.pageId.slice(0, 64) : "",
      x: Number.isFinite(c.x) ? Math.max(0, Math.min(100, c.x)) : 50,
      y: Number.isFinite(c.y) ? Math.max(0, Math.min(100, c.y)) : 50,
      authorName: isAuth ? safeName : (c.authorName?.trim() || "Guest").slice(0, 80),
      authorEmail: isAuth ? safeEmail : (c.authorEmail?.trim() || "").slice(0, 120),
      text: c.text.trim().slice(0, 2000),
      resolved: false,
      createdAt: typeof c.createdAt === "number" && Number.isFinite(c.createdAt) ? c.createdAt : Date.now(),
      replies: [],
    }));

  return [...merged, ...appendedComments];
}

/**
 * Returns only the workspace custom fonts actually referenced by text elements
 * in the shared design so `/share/[id]` renders uploaded/Google custom fonts
 * without leaking unused workspace brand assets.
 */
export function extractReferencedCustomFonts(
  pages: DesignPage[],
  customFonts: CustomFontItem[] | undefined,
): CustomFontItem[] {
  if (!customFonts || customFonts.length === 0) return [];
  const used = new Set<string>();
  for (const page of pages) {
    for (const el of page.elements) {
      if ((el.type === "text" || el.type === "table") && el.fontFamily) {
        used.add(el.fontFamily.trim().toLowerCase());
      }
    }
  }
  if (used.size === 0) return [];
  return customFonts.filter((font) => used.has(font.name.trim().toLowerCase()));
}
