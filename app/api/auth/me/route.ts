import { jsonError, mauthEnabled, requireAuth, sessionFromRequest } from "@/lib/auth";
import { sessionCookieHeader, signSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = {
      authenticated: true,
      bi_id: auth.biId,
      person_key: auth.personKey,
      display_name: auth.displayName,
      email: auth.email,
      entity_type: auth.entityType,
      mauth_enabled: mauthEnabled(),
    };
    const res = Response.json(body);
    if (!sessionFromRequest(req) && !mauthEnabled()) {
      res.headers.set("Set-Cookie", sessionCookieHeader(signSession(auth)));
    }
    return res;
  } catch (error) {
    return jsonError(error);
  }
}
