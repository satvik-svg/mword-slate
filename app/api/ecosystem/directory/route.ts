import { jsonError, requireAuth } from "@/lib/auth";
import { callEcosystemService } from "@/lib/mworld-ecosystem";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const q = new URL(req.url).searchParams.get("q") ?? "";
    const res = await callEcosystemService<{ users: unknown[] }>(
      "chat",
      `/api/internal/directory?q=${encodeURIComponent(q)}`,
      { method: "GET", user: auth },
    );
    return Response.json({ users: res.ok ? res.data?.users ?? [] : [] });
  } catch (err) {
    return jsonError(err);
  }
}
