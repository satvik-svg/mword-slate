import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "slate_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

export type SessionClaims = {
  biId: string;
  personKey: string;
  displayName: string;
  email: string;
  entityType: "user" | "agent";
  exp: number;
};

function secret(): string {
  return process.env.SESSION_SECRET || "mworld-slate-dev-session";
}

export function signSession(claims: Omit<SessionClaims, "exp">, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ ...claims, exp: now + MAX_AGE_SEC * 1000 }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readSessionToken(token: string, now = Date.now()): SessionClaims | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  let claims: SessionClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionClaims;
  } catch {
    return null;
  }
  if (!claims?.biId || !claims.exp || claims.exp < now) return null;
  if (claims.entityType !== "user" && claims.entityType !== "agent") return null;
  return claims;
}

export function readCookie(req: Request, name: string): string {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function secureFlag(): string {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

export function sessionCookieHeader(token: string): string {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${secureFlag()}`;
}

export function clearSessionCookieHeader(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0${secureFlag()}`;
}
