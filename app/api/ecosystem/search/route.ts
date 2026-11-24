import { jsonError, requireAuth } from "@/lib/auth";
import { searchAllEcosystemApps } from "@/lib/mworld-ecosystem";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const q = new URL(req.url).searchParams.get("q") ?? "";
    const results = await searchAllEcosystemApps(q, auth);
    return Response.json({ results });
  } catch (err) {
    return jsonError(err);
  }
}
