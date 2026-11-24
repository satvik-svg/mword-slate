import { query } from "@/lib/db";
import { resolveAppOrigin, verifyEcosystemRequest, type EcosystemSearchResult } from "@/lib/mworld-ecosystem";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const eco = await verifyEcosystemRequest(req);
  if (!eco.ok) {
    return Response.json({ error: eco.error }, { status: eco.status });
  }
  if (!eco.user) {
    return Response.json({ results: [] });
  }

  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  if (!q) return Response.json({ results: [] });

  try {
    const like = `%${q.replace(/[%_]/g, "").slice(0, 80)}%`;
    const { rows } = await query<{
      id: string;
      title: string;
      category: string;
      page_count: number;
      updated_at: number;
    }>(
      `select id, title, category, page_count, updated_at from designs
       where bi_id = ? and trashed = 0 and lower(title) like ?
       order by updated_at desc limit 10`,
      [eco.user.biId, like],
    );
    const origin = resolveAppOrigin("slate");
    const results: EcosystemSearchResult[] = rows.map((r) => ({
      app: "slate",
      appName: "Slate",
      id: r.id,
      title: r.title || "Untitled Design",
      subtitle: `${r.category} · ${Math.max(1, Number(r.page_count ?? 1))} page(s)`,
      url: `${origin}/design/${r.id}`,
      updatedAt: Number(r.updated_at ?? 0),
    }));
    return Response.json({ results });
  } catch {
    return Response.json({ results: [] });
  }
}
