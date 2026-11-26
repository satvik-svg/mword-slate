import { createHmac, timingSafeEqual } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export type MWorldAppKey = "chat" | "calendar" | "room" | "paper" | "board" | "slate";

export type MWorldAppDef = {
  key: MWorldAppKey;
  name: string;
  shortName: string;
  description: string;
  defaultOrigin: string;
  workersDevOrigin: string;
  envVar: string;
  bindingName: string;
  accent: string;
  badge: string;
};

export const MWORLD_APPS: MWorldAppDef[] = [
  {
    key: "chat",
    name: "mWorld Chat",
    shortName: "Chat",
    description: "Messages, groups, calls & directory",
    defaultOrigin: "https://mworld-whatsapp.laflabs-tech.workers.dev",
    workersDevOrigin: "https://mworld-whatsapp.laflabs-tech.workers.dev",
    envVar: "CHAT_APP_URL",
    bindingName: "CHAT_SVC",
    accent: "#0d9488",
    badge: "C",
  },
  {
    key: "calendar",
    name: "Calendar",
    shortName: "Calendar",
    description: "Schedule, tasks & booking links",
    defaultOrigin: "https://mworld-calendar.laflabs-tech.workers.dev",
    workersDevOrigin: "https://mworld-calendar.laflabs-tech.workers.dev",
    envVar: "CALENDAR_APP_URL",
    bindingName: "CALENDAR_SVC",
    accent: "#2563eb",
    badge: "Cal",
  },
  {
    key: "room",
    name: "Room",
    shortName: "Room",
    description: "Video meetings, captions & polls",
    defaultOrigin: "https://mworld-room.laflabs-tech.workers.dev",
    workersDevOrigin: "https://mworld-room.laflabs-tech.workers.dev",
    envVar: "ROOM_APP_URL",
    bindingName: "ROOM_SVC",
    accent: "#059669",
    badge: "R",
  },
  {
    key: "paper",
    name: "Paper",
    shortName: "Paper",
    description: "Docs, wikis & databases",
    defaultOrigin: "https://mworld-notion.laflabs-tech.workers.dev",
    workersDevOrigin: "https://mworld-notion.laflabs-tech.workers.dev",
    envVar: "PAPER_APP_URL",
    bindingName: "PAPER_SVC",
    accent: "#18181b",
    badge: "P",
  },
  {
    key: "board",
    name: "Board",
    shortName: "Board",
    description: "Infinite whiteboards & diagrams",
    defaultOrigin: "https://mworld-board.laflabs-tech.workers.dev",
    workersDevOrigin: "https://mworld-board.laflabs-tech.workers.dev",
    envVar: "BOARD_APP_URL",
    bindingName: "BOARD_SVC",
    accent: "#7c3aed",
    badge: "B",
  },
  {
    key: "slate",
    name: "Slate",
    shortName: "Slate",
    description: "Visual studio, decks & brand kit",
    defaultOrigin: "https://slate.laflabs-tech.workers.dev",
    workersDevOrigin: "https://slate.laflabs-tech.workers.dev",
    envVar: "SLATE_APP_URL",
    bindingName: "SLATE_SVC",
    accent: "#db2777",
    badge: "S",
  },
];

export const MWORLD_SSO_COOKIE = "mworld_session";
export const MWORLD_SSO_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export type MWorldUserContext = {
  biId: string;
  personKey: string;
  displayName: string;
  email: string;
  entityType: "user" | "agent";
  userId?: string;
  sid?: string;
};

export type EcosystemUnfurl = {
  app: MWorldAppKey;
  appName: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
  embedUrl?: string;
  badge?: string;
  accent?: string;
};

export type EcosystemSearchResult = {
  app: MWorldAppKey;
  appName: string;
  id: string;
  title: string;
  subtitle: string;
  url: string;
  updatedAt?: number;
};

type FetchBinding = {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
};

export async function getCloudflareEnv(): Promise<Record<string, unknown>> {
  try {
    const ctx = await getCloudflareContext({ async: true });
    return (ctx?.env as unknown as Record<string, unknown>) ?? {};
  } catch {
    return {};
  }
}

function readEnvStr(key: string, cfEnv?: Record<string, unknown>): string {
  const cfVal = cfEnv?.[key];
  if (typeof cfVal === "string" && cfVal.trim()) return cfVal.trim();
  const procVal = process.env[key];
  if (typeof procVal === "string" && procVal.trim()) return procVal.trim();
  return "";
}

export function getAppDef(appKey: MWorldAppKey): MWorldAppDef {
  return MWORLD_APPS.find((a) => a.key === appKey) ?? MWORLD_APPS[0];
}

export function resolveAppOrigin(appKey: MWorldAppKey, cfEnv?: Record<string, unknown>): string {
  const def = getAppDef(appKey);
  const configured = readEnvStr(def.envVar, cfEnv).replace(/\/$/, "");
  return configured || def.defaultOrigin;
}

export function getSiblingLinksMap(cfEnv?: Record<string, unknown>): Record<MWorldAppKey, string> {
  return {
    chat: resolveAppOrigin("chat", cfEnv),
    calendar: resolveAppOrigin("calendar", cfEnv),
    room: resolveAppOrigin("room", cfEnv),
    paper: resolveAppOrigin("paper", cfEnv),
    board: resolveAppOrigin("board", cfEnv),
    slate: resolveAppOrigin("slate", cfEnv),
  };
}

export function resolveEcosystemSecret(cfEnv?: Record<string, unknown>): string {
  const val = readEnvStr("ECOSYSTEM_SECRET", cfEnv);
  if (val) return val;
  if (process.env.NODE_ENV === "production") return "";
  return "mworld-ecosystem-dev-secret";
}

export function encodeMWorldUserHeader(user: MWorldUserContext): string {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

function normalizeUserContext(raw: unknown): MWorldUserContext | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as Partial<MWorldUserContext>;
  const biId = typeof parsed.biId === "string" ? parsed.biId.trim() : "";
  const email = typeof parsed.email === "string" ? parsed.email.trim().toLowerCase() : "";
  const personKey = typeof parsed.personKey === "string" ? parsed.personKey.trim() : email || biId;
  const displayName = typeof parsed.displayName === "string" ? parsed.displayName.trim() : email || "mWorld user";
  const entityType = parsed.entityType === "agent" ? "agent" : "user";
  if (!biId && !email && !personKey) return null;
  return {
    biId: biId || (email ? `personal:${email}` : personKey),
    personKey: personKey || email || biId,
    displayName,
    email,
    entityType,
    userId: typeof parsed.userId === "string" ? parsed.userId : undefined,
    sid: typeof parsed.sid === "string" ? parsed.sid : undefined,
  };
}

export function decodeMWorldUserHeader(raw: string | null): MWorldUserContext | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    return normalizeUserContext(parsed);
  } catch {
    return null;
  }
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export type EmbedAppKey = "board" | "slate";

type EmbedTokenPayload = {
  app: EmbedAppKey;
  resourceId: string;
  user: MWorldUserContext;
  exp: number;
};

/** Sign a short-lived HMAC token authorizing a cross-origin embed iframe without cookies. */
export async function signEmbedToken(
  app: EmbedAppKey,
  resourceId: string,
  user: MWorldUserContext,
  ttlMs = 2 * 60 * 60 * 1000,
): Promise<string | null> {
  const cleanId = resourceId.trim();
  if (!cleanId) return null;
  const normalizedUser = normalizeUserContext(user);
  if (!normalizedUser) return null;
  const cfEnv = await getCloudflareEnv();
  const secret = resolveEcosystemSecret(cfEnv);
  if (!secret) return null;
  const payload: EmbedTokenPayload = {
    app,
    resourceId: cleanId,
    user: normalizedUser,
    exp: Date.now() + ttlMs,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

/** Verify a short-lived HMAC embed token scoped to a specific app and resource ID. */
export async function verifyEmbedToken(
  token: string | null | undefined,
  expectedApp: EmbedAppKey,
  expectedResourceId: string,
): Promise<MWorldUserContext | null> {
  const raw = typeof token === "string" ? token.trim() : "";
  const cleanId = expectedResourceId.trim();
  if (!raw || !cleanId) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0 || raw.indexOf(".", dot + 1) !== -1) return null;
  const encoded = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  if (!encoded || !sig) return null;

  const cfEnv = await getCloudflareEnv();
  const secret = resolveEcosystemSecret(cfEnv);
  if (!secret) return null;
  const expectedSig = createHmac("sha256", secret).update(encoded).digest("base64url");
  if (!safeEqual(sig, expectedSig)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<EmbedTokenPayload>;
    if (!payload || typeof payload !== "object") return null;
    if (payload.app !== expectedApp) return null;
    if (payload.resourceId !== cleanId) return null;
    if (typeof payload.exp !== "number" || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null;
    return normalizeUserContext(payload.user);
  } catch {
    return null;
  }
}

export async function verifyEcosystemRequest(
  req: Request,
): Promise<{ ok: true; user: MWorldUserContext | null } | { ok: false; status: number; error: string }> {
  const cfEnv = await getCloudflareEnv();
  const expected = resolveEcosystemSecret(cfEnv);
  const token = req.headers.get("x-mworld-service-token")?.trim() ?? "";
  if (!expected || !safeEqual(token, expected)) {
    return { ok: false, status: 401, error: "Unauthorized internal ecosystem call" };
  }
  const user = decodeMWorldUserHeader(req.headers.get("x-mworld-user"));
  return { ok: true, user };
}

export async function callEcosystemService<T = unknown>(
  appKey: MWorldAppKey,
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
    user?: MWorldUserContext | null;
    timeoutMs?: number;
  } = {},
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const cfEnv = await getCloudflareEnv();
  const def = getAppDef(appKey);
  const secret = resolveEcosystemSecret(cfEnv);
  const binding = cfEnv[def.bindingName] as FetchBinding | undefined;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = binding ? `https://internal.mworld.tech${cleanPath}` : `${resolveAppOrigin(appKey, cfEnv)}${cleanPath}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (secret) headers["X-MWorld-Service-Token"] = secret;
  if (options.user) headers["X-MWorld-User"] = encodeMWorldUserHeader(options.user);
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const init: RequestInit = {
    method: options.method ?? (options.body !== undefined ? "POST" : "GET"),
    headers,
    signal: AbortSignal.timeout(options.timeoutMs ?? 8000),
  };
  if (options.body !== undefined) {
    init.body = typeof options.body === "string" ? options.body : JSON.stringify(options.body);
  }

  try {
    const res = binding ? await binding.fetch(url, init) : await fetch(url, init);
    const data = (await res.json().catch(() => null)) as T | null;
    if (!res.ok) {
      const errMsg =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : `HTTP ${res.status}`;
      return { ok: false, status: res.status, data, error: errMsg };
    }
    return { ok: true, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      data: null,
      error: err instanceof Error ? err.message : "Service call failed",
    };
  }
}

export function detectMWorldUrl(rawUrl: string): { appKey: MWorldAppKey; url: URL } | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  const host = parsed.hostname.toLowerCase();
  for (const app of MWORLD_APPS) {
    try {
      const defHost = new URL(app.defaultOrigin).hostname.toLowerCase();
      const workerHost = new URL(app.workersDevOrigin).hostname.toLowerCase();
      if (host === defHost || host === workerHost) {
        return { appKey: app.key, url: parsed };
      }
    } catch {
      // ignore
    }
  }
  if (host === "localhost" || host === "127.0.0.1") {
    const portMap: Record<string, MWorldAppKey> = {
      "3300": "chat",
      "3100": "calendar",
      "3400": "room",
      "3200": "paper",
      "3120": "board",
      "3500": "slate",
    };
    const key = portMap[parsed.port];
    if (key) return { appKey: key, url: parsed };
  }
  return null;
}

export async function unfurlMWorldUrl(
  rawUrl: string,
  user?: MWorldUserContext | null,
): Promise<EcosystemUnfurl | null> {
  const matched = detectMWorldUrl(rawUrl);
  if (!matched) return null;
  const res = await callEcosystemService<EcosystemUnfurl>(
    matched.appKey,
    `/api/unfurl?url=${encodeURIComponent(rawUrl)}`,
    { method: "GET", user },
  );
  if (res.ok && res.data) return res.data;
  const def = getAppDef(matched.appKey);
  return {
    app: def.key,
    appName: def.name,
    id: matched.url.pathname.split("/").filter(Boolean).pop() ?? def.key,
    title: def.name,
    subtitle: matched.url.pathname,
    url: rawUrl,
    accent: def.accent,
  };
}

export async function searchAllEcosystemApps(
  query: string,
  user: MWorldUserContext,
): Promise<EcosystemSearchResult[]> {
  const clean = query.trim();
  if (!clean) return [];
  const calls = MWORLD_APPS.map(async (app) => {
    const res = await callEcosystemService<{ results?: EcosystemSearchResult[] }>(
      app.key,
      `/api/internal/search?q=${encodeURIComponent(clean)}`,
      { method: "GET", user, timeoutMs: 4000 },
    );
    return res.ok && Array.isArray(res.data?.results) ? res.data!.results : [];
  });
  const settled = await Promise.allSettled(calls);
  const combined: EcosystemSearchResult[] = [];
  for (const item of settled) {
    if (item.status === "fulfilled") combined.push(...item.value);
  }
  return combined.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, 30);
}

export function resolveCookieDomain(req?: Request): string {
  const candidates: string[] = [];
  if (req) {
    const xfHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = req.headers.get("host")?.split(",")[0]?.trim();
    if (xfHost) candidates.push(xfHost);
    if (host) candidates.push(host);
    try {
      candidates.push(new URL(req.url).host);
    } catch {
      // ignore
    }
  }
  if (process.env.APP_ORIGIN) {
    try {
      candidates.push(new URL(process.env.APP_ORIGIN).host);
    } catch {
      // ignore
    }
  }
  for (const raw of candidates) {
    const hostname = raw.split(":")[0].toLowerCase();
    if (hostname === "mworld.tech" || hostname.endsWith(".mworld.tech")) {
      return ".mworld.tech";
    }
  }
  return "";
}

export function isHttpsContext(req?: Request): boolean {
  if (req) {
    const xfProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
    if (xfProto === "https") return true;
    if (xfProto === "http") return false;
    try {
      if (new URL(req.url).protocol === "https:") return true;
    } catch {
      // ignore
    }
  }
  const appOrigin = (process.env.APP_ORIGIN ?? "").toLowerCase();
  if (appOrigin.startsWith("https://")) return true;
  return process.env.NODE_ENV === "production";
}

export function ssoCookieHeader(token: string, req?: Request, maxAgeSec = MWORLD_SSO_MAX_AGE_SEC): string {
  const secure = isHttpsContext(req) ? "; Secure" : "";
  const domain = resolveCookieDomain(req);
  const domainPart = domain ? `; Domain=${domain}` : "";
  return `${MWORLD_SSO_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAgeSec}${secure}${domainPart}`;
}

export function clearSsoCookieHeader(req?: Request): string {
  return ssoCookieHeader("", req, 0);
}

export const EMBED_FRAME_ANCESTORS =
  "'self' https://*.mworld.tech https://mworld.tech https://*.laflabs-tech.workers.dev http://localhost:* http://127.0.0.1:*";

export function buildEmbedCsp(): string {
  return `frame-ancestors ${EMBED_FRAME_ANCESTORS}`;
}
