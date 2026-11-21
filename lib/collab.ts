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
      type: "design_sync";
      rev: number;
      title?: string;
      width?: number;
      height?: number;
      pages: DesignPage[];
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
      type: "design_sync";
      fromClientId: string;
      fromName: string;
      rev: number;
      title?: string;
      width?: number;
      height?: number;
      pages: DesignPage[];
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
