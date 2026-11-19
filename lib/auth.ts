import "server-only";

import { readCookie, readSessionToken, SESSION_COOKIE, type SessionClaims } from "@/lib/session";
import { tenantFromIdentity } from "@/lib/tenant";

export type AuthContext = {
  biId: string;
  personKey: string;
  displayName: string;
  email: string;
  entityType: "user" | "agent";
};

export class AuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

function mauthEnabledFlag(): boolean {
  return process.env.MAUTH_ENABLED === "true";
}

function mauthApiUrl(): string {
  return (process.env.MAUTH_API_URL ?? "https://api.mauth.mworld.cloud").replace(/\/$/, "");
}

function mauthVerifyUrl(): string {
  return process.env.MAUTH_VERIFY_URL ?? `${mauthApiUrl()}/mAuthAG/verifyToken`;
}

function pickString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function biIdFromUnknown(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  return (
    pickString(record.bi_id) ||
    pickString(record.biId) ||
    pickString(record.business_id) ||
    pickString(record.businessId)
  );
}

function businessId(value: unknown): string {
  const direct = biIdFromUnknown(value);
  if (direct) return direct;
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const lists = [record.businesses, record.bi_list, record.business_list];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      const id = typeof item === "string" ? item.trim() : biIdFromUnknown(item);
      if (id) return id;
    }
  }
  return "";
}

export function getTokenFromRequest(req: Request) {
  const headerAgentic = req.headers.get("mAuthAgenticToken")?.trim() ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  let queryAgentic = "";
  try {
    queryAgentic = new URL(req.url).searchParams.get("mAuthAgenticToken")?.trim() ?? "";
  } catch {
    queryAgentic = "";
  }
  return {
    agentic: headerAgentic || queryAgentic,
    user: bearer,
  };
}

async function verifyAgentic(token: string): Promise<AuthContext> {
  const response = await fetch(mauthVerifyUrl(), {
    method: "GET",
    headers: { mAuthAgenticToken: token },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => ({}))) as {
    success?: boolean;
    data?: { bi_id?: string; from?: "user" | "agent" };
    msg?: string;
  };
  if (!response.ok || !body.success || !body.data?.bi_id) {
    throw new AuthError(401, body.msg ?? "Invalid or expired mAuth session");
  }
  const entityType = body.data.from === "user" ? "user" : "agent";
  return {
    biId: body.data.bi_id,
    personKey: entityType === "agent" ? `agent:${body.data.bi_id}` : `user:${body.data.bi_id}`,
    displayName: entityType === "agent" ? "Agent" : "You",
    email: "",
    entityType,
  };
}

export function requestOrigin(req: Request): string {
  const app = (process.env.APP_ORIGIN ?? "").replace(/\/$/, "");
  if (app) return app;
  const hinted =
    req.headers.get("x-mworld-origin")?.trim() || req.headers.get("origin")?.trim() || "";
  if (hinted) return hinted.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

function claimsToAuth(claims: SessionClaims): AuthContext {
  return {
    biId: claims.biId,
    personKey: claims.personKey,
    displayName: claims.displayName,
    email: claims.email,
    entityType: claims.entityType,
  };
}

export function sessionFromRequest(req: Request): AuthContext | null {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return null;
  const claims = readSessionToken(token);
  if (!claims) return null;
  return claimsToAuth(claims);
}

export async function userTokenFromRequest(req: Request): Promise<string> {
  const header = getTokenFromRequest(req).user;
  if (header) return header;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return "";
  return (
    pickString(body.token) ||
    pickString(body.user_access_token) ||
    pickString(body.mauth_token)
  );
}

async function verifyUser(token: string, origin: string): Promise<AuthContext> {
  const payload = {
    origin,
    required_user_data: ["email"],
    optional_user_data: ["fullName", "phone", "citizen_id"],
  };
  const url =
    `${mauthApiUrl()}/mAuthUser/${encodeURIComponent(token)}` +
    `?payload=${encodeURIComponent(JSON.stringify(payload))}`;
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  const body = await response.json().catch(() => null);
  if (
    !response.ok ||
    (body && typeof body === "object" && (body as { success?: boolean }).success === false)
  ) {
    const message =
      body && typeof body === "object"
        ? pickString((body as { msg?: unknown }).msg) ||
          pickString((body as { message?: unknown }).message)
        : "";
    throw new AuthError(401, message || "Invalid mAuth session");
  }
  const record = (body ?? {}) as Record<string, unknown>;
  const user =
    (record.user_data as Record<string, unknown> | undefined) ??
    (record.data as Record<string, unknown> | undefined) ??
    (record.user as Record<string, unknown> | undefined) ??
    record;
  const email = pickString(user.email);
  const citizenId = pickString(user.citizen_id) || pickString(user.id);
  const biId = tenantFromIdentity({
    biId: businessId(record.bi_data) || businessId(user) || businessId(record),
    email,
    citizenId,
  });
  if (!biId) {
    throw new AuthError(401, "mAuth returned no identity");
  }
  const fullName = pickString(user.fullName) || pickString(user.full_name);
  return {
    biId,
    personKey: email || citizenId || biId,
    displayName: fullName || email || "You",
    email,
    entityType: "user",
  };
}

export function mauthEnabled(): boolean {
  return mauthEnabledFlag();
}

export function localDevAuth(): AuthContext {
  return {
    biId: "local-dev",
    personKey: "local",
    displayName: "Local Studio",
    email: "local@mworld.local",
    entityType: "user",
  };
}

export async function requireAuth(req: Request): Promise<AuthContext> {
  const session = sessionFromRequest(req);
  if (session) return session;
  if (!mauthEnabledFlag()) return localDevAuth();

  const tokens = getTokenFromRequest(req);
  if (tokens.agentic) return verifyAgentic(tokens.agentic);
  throw new AuthError(401, "Log in with mWorld");
}

export async function optionalAuth(req: Request): Promise<AuthContext | null> {
  try {
    return await requireAuth(req);
  } catch {
    return null;
  }
}

export async function openUserSession(req: Request): Promise<AuthContext> {
  if (!mauthEnabledFlag()) return localDevAuth();
  const user = await userTokenFromRequest(req);
  if (!user) throw new AuthError(401, "Log in with mWorld");
  return verifyUser(user, requestOrigin(req));
}

export function jsonError(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Something went wrong. Try again.";
  return Response.json({ error: message }, { status: 500 });
}

export async function createAuthLink(origin: string, fresh = false): Promise<string> {
  const params = new URLSearchParams({ origin, type: "native" });
  if (fresh) {
    params.set("prompt", "select_account");
    params.set("force", "true");
  }
  const url = `${mauthApiUrl()}/mAuthGen?${params.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const data = (await res.json().catch(() => null)) as { mAuth?: { auth_link?: string } } | null;
  const link = data?.mAuth?.auth_link;
  if (!res.ok || !link) throw new Error("mAuth did not return auth_link");
  const parsed = new URL(link);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith("mworld.cloud")) {
    throw new Error("mAuth did not return auth_link");
  }
  return parsed.toString();
}
