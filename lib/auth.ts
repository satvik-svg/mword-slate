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
