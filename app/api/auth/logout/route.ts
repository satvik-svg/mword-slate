import { clearSsoCookieHeader } from "@/lib/mworld-ecosystem";
import { clearSessionCookieHeader } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const res = Response.json({ ok: true });
  res.headers.append("Set-Cookie", clearSessionCookieHeader());
  res.headers.append("Set-Cookie", clearSsoCookieHeader(req));
  return res;
}
