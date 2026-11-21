/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { DurableObject } from "cloudflare:workers";
import {
  canRoleBroadcastComments,
  canRoleBroadcastDesign,
  collabColorForSeed,
  type CollabClientMessage,
  type CollabPeer,
  type CollabRole,
} from "./collab";

const SCHEMA = [
  `create table if not exists designs (
    id text primary key,
    bi_id text not null,
    title text not null,
    category text not null default 'custom',
    folder_id text,
    starred integer not null default 0,
    trashed integer not null default 0,
    width integer not null,
    height integer not null,
    page_count integer not null default 1,
    thumbnail text not null default '',
    pages_json text not null,
    comments_json text not null default '[]',
    versions_json text not null default '[]',
    share_config_json text not null default '{"linkAccess":"off","people":[]}',
    created_by text not null default '',
    updated_by text not null default '',
    created_at integer not null,
    updated_at integer not null
  )`,
  `create index if not exists designs_bi_idx on designs (bi_id, trashed, updated_at desc)`,
  `create table if not exists folders (
    id text primary key,
    bi_id text not null,
    name text not null,
    created_at integer not null
  )`,
  `create index if not exists folders_bi_idx on folders (bi_id, created_at desc)`,
  `create table if not exists brand_kits (
    bi_id text primary key,
    name text not null default 'My Brand',
    logos_json text not null default '[]',
    colors_json text not null default '["#0F172A","#4F46E5","#06B6D4","#F43F5E","#F8FAFC"]',
    fonts_json text not null default '{"heading":"Plus Jakarta Sans","subheading":"Inter","body":"Inter"}',
    updated_at integer not null
  )`,
  `create table if not exists media_assets (
    id text primary key,
    bi_id text not null,
    name text not null,
    mime_type text not null,
    data_url text not null,
    width integer not null default 0,
    height integer not null default 0,
    size_bytes integer not null default 0,
    created_at integer not null
  )`,
  `create index if not exists media_bi_idx on media_assets (bi_id, created_at desc)`,
  `create table if not exists team_templates (
    id text primary key,
    bi_id text not null,
    title text not null,
    category text not null default 'custom',
    width integer not null,
    height integer not null,
    thumbnail text not null default '',
    pages_json text not null,
    created_at integer not null
  )`,
  `create index if not exists templates_bi_idx on team_templates (bi_id, created_at desc)`,
];

export type SqlValue = string | number | null;
export type SqlRow = Record<string, SqlValue>;
export type SqlStatement = { sql: string; params?: SqlValue[] };

function bind(params: SqlValue[] = []) {
  return params.map((value) => (value === undefined ? null : value));
}

function safeSend(ws: WebSocket, payload: unknown) {
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    // ignore closed/broken socket
  }
}

export class SlateDB extends DurableObject {
  private ready = false;
  private roomSeq = 0;

  private nextSeq(): number {
    this.roomSeq = Math.max(this.roomSeq + 1, Date.now());
    return this.roomSeq;
  }

  private ensureSchema() {
    if (this.ready) return;
    this.ctx.storage.sql.exec("PRAGMA foreign_keys = ON");
    for (const statement of SCHEMA) {
      this.ctx.storage.sql.exec(statement);
    }
    // Idempotent migration for existing databases lacking page_count
    const cols = this.ctx.storage.sql.exec("PRAGMA table_info(designs)").toArray() as { name?: string }[];
    if (!cols.some((c) => c.name === "page_count")) {
      this.ctx.storage.sql.exec("alter table designs add column page_count integer not null default 1");
      this.ctx.storage.sql.exec(
        "update designs set page_count = max(1, coalesce(json_array_length(pages_json), 1))",
      );
    }
    this.ready = true;
  }

  async query(sql: string, params: SqlValue[] = []): Promise<SqlRow[]> {
    this.ensureSchema();
    return this.ctx.storage.sql.exec(sql, ...bind(params)).toArray() as SqlRow[];
  }

  async transact(statements: SqlStatement[]): Promise<SqlRow[][]> {
    this.ensureSchema();
    return this.ctx.storage.transactionSync(() =>
      statements.map((statement) => {
        const rows = this.ctx.storage.sql.exec(statement.sql, ...bind(statement.params)).toArray();
        return rows as SqlRow[];
      }),
    );
  }

  // ---- Hibernatable Multiplayer Collaboration Room (keyed by "collab:<designId>") ----

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    const name = (request.headers.get("x-collab-name") || "Guest").slice(0, 48);
    const email = (request.headers.get("x-collab-email") || "").slice(0, 120);
    const roleHeader = request.headers.get("x-collab-role") || "view";
    const role: CollabRole =
      roleHeader === "full" || roleHeader === "edit" || roleHeader === "comment"
        ? roleHeader
        : "view";
    const clientId = `peer_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const color = collabColorForSeed(email || `${name}:${clientId}`);

    const peer: CollabPeer = {
      clientId,
      name,
      email,
      color,
      role,
      pageId: "",
      x: 0,
      y: 0,
      cursorVisible: false,
      selectedIds: [],
      lastSeen: Date.now(),
    };

    const existingSockets = this.ctx.getWebSockets();
    const existingPeers: CollabPeer[] = [];
    for (const sock of existingSockets) {
      const att = sock.deserializeAttachment() as CollabPeer | null;
      if (att?.clientId) existingPeers.push(att);
    }

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(peer);

    safeSend(server, {
      type: "welcome",
      clientId,
      role,
      color,
      seq: this.roomSeq,
      peers: existingPeers,
    });

    for (const sock of existingSockets) {
      safeSend(sock, { type: "peer_join", peer });
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, rawMessage: string | ArrayBuffer) {
    if (typeof rawMessage !== "string" || rawMessage.length > 950_000) return;

    let msg: CollabClientMessage;
    try {
      msg = JSON.parse(rawMessage) as CollabClientMessage;
    } catch {
      return;
    }

    const peer = ws.deserializeAttachment() as CollabPeer | null;
    if (!peer?.clientId) return;

    if (msg.type === "ping") {
      safeSend(ws, { type: "pong" });
      return;
    }

    const others = this.ctx.getWebSockets().filter((s) => s !== ws);

    if (msg.type === "cursor") {
      const nextPeer: CollabPeer = {
        ...peer,
        pageId: typeof msg.pageId === "string" ? msg.pageId : peer.pageId,
        x: Number.isFinite(msg.x) ? msg.x : peer.x,
        y: Number.isFinite(msg.y) ? msg.y : peer.y,
        cursorVisible: msg.cursorVisible !== false,
        selectedIds: Array.isArray(msg.selectedIds)
          ? msg.selectedIds.filter((id): id is string => typeof id === "string").slice(0, 64)
          : peer.selectedIds,
        lastSeen: Date.now(),
      };
      ws.serializeAttachment(nextPeer);
      const out = {
        type: "cursor",
        clientId: nextPeer.clientId,
        pageId: nextPeer.pageId,
        x: nextPeer.x,
        y: nextPeer.y,
        cursorVisible: nextPeer.cursorVisible,
        selectedIds: nextPeer.selectedIds,
      };
      for (const sock of others) safeSend(sock, out);
      return;
    }

    if (msg.type === "page_sync") {
      if (!canRoleBroadcastDesign(peer.role) || !msg.pageId || !msg.page) return;
      const out = {
        type: "page_sync",
        fromClientId: peer.clientId,
        fromName: peer.name,
        seq: this.nextSeq(),
        pageId: msg.pageId,
        page: msg.page,
      };
      for (const sock of others) safeSend(sock, out);
      return;
    }

    if (msg.type === "design_sync") {
      if (!canRoleBroadcastDesign(peer.role) || !Array.isArray(msg.pages)) return;
      const out = {
        type: "design_sync",
        fromClientId: peer.clientId,
        fromName: peer.name,
        seq: this.nextSeq(),
        title: typeof msg.title === "string" ? msg.title : undefined,
        width: typeof msg.width === "number" ? msg.width : undefined,
        height: typeof msg.height === "number" ? msg.height : undefined,
        pages: msg.pages,
      };
      for (const sock of others) safeSend(sock, out);
      return;
    }

    if (msg.type === "asset_chunk") {
      if (
        !canRoleBroadcastDesign(peer.role) ||
        typeof msg.hash !== "string" ||
        typeof msg.data !== "string" ||
        msg.data.length > 260_000
      ) {
        return;
      }
      const out = {
        type: "asset_chunk",
        fromClientId: peer.clientId,
        hash: msg.hash,
        index: msg.index,
        total: msg.total,
        data: msg.data,
      };
      for (const sock of others) safeSend(sock, out);
      return;
    }

    if (msg.type === "request_asset") {
      if (typeof msg.hash !== "string" || !msg.hash) return;
      const out = {
        type: "request_asset",
        fromClientId: peer.clientId,
        hash: msg.hash,
      };
      for (const sock of others) safeSend(sock, out);
      return;
    }

    if (msg.type === "chunk") {
      if (
        !canRoleBroadcastDesign(peer.role) ||
        typeof msg.transferId !== "string" ||
        typeof msg.data !== "string" ||
        msg.data.length > 260_000
      ) {
        return;
      }
      const out = {
        type: "chunk",
        fromClientId: peer.clientId,
        fromName: peer.name,
        seq: msg.index === msg.total - 1 ? this.nextSeq() : this.roomSeq,
        transferId: msg.transferId,
        index: msg.index,
        total: msg.total,
        data: msg.data,
      };
      for (const sock of others) safeSend(sock, out);
      return;
    }

    if (msg.type === "comments_sync") {
      if (!canRoleBroadcastComments(peer.role) || !Array.isArray(msg.comments)) return;
      const out = {
        type: "comments_sync",
        fromClientId: peer.clientId,
        fromName: peer.name,
        comments: msg.comments,
      };
      for (const sock of others) safeSend(sock, out);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string) {
    this.broadcastLeave(ws);
    try {
      ws.close(code, reason);
    } catch {
      // ignore
    }
  }

  async webSocketError(ws: WebSocket) {
    this.broadcastLeave(ws);
    try {
      ws.close(1011, "WebSocket error");
    } catch {
      // ignore
    }
  }

  private broadcastLeave(ws: WebSocket) {
    const peer = ws.deserializeAttachment() as CollabPeer | null;
    if (!peer?.clientId) return;
    const others = this.ctx.getWebSockets().filter((s) => s !== ws);
    for (const sock of others) {
      safeSend(sock, { type: "peer_leave", clientId: peer.clientId });
    }
  }
}
