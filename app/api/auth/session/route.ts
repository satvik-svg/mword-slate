import { jsonError, mauthEnabled, openUserSession } from "@/lib/auth";
import { ssoCookieHeader } from "@/lib/mworld-ecosystem";
import { sessionCookieHeader, signSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await openUserSession(req);
    const body = {
      authenticated: true,
      bi_id: auth.biId,
      person_key: auth.personKey,
      display_name: auth.displayName,
      email: auth.email,
      entity_type: auth.entityType,
      mauth_enabled: mauthEnabled(),
    };
    if (!mauthEnabled()) return Response.json(body);
    const token = signSession(auth);
    const res = Response.json(body);
    res.headers.append("Set-Cookie", sessionCookieHeader(token));
    res.headers.append("Set-Cookie", ssoCookieHeader(token, req));
    return res;
  } catch (error) {
    return jsonError(error);
  }
}
