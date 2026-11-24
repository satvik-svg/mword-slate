import { resolveAppOrigin, type EcosystemUnfurl } from "@/lib/mworld-ecosystem";
import { getDesignById } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const rawUrl = new URL(req.url).searchParams.get("url") ?? "";
  const origin = resolveAppOrigin("slate");
  let id = "";

  try {
    const parsed = new URL(rawUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if ((parts[0] === "design" || parts[0] === "share" || parts[0] === "embed") && parts[1]) {
      id = parts[1];
    }
  } catch {
    id = rawUrl.trim();
  }

  if (id) {
    try {
      const found = await getDesignById(id);
      if (found) {
        return Response.json({
          app: "slate",
          appName: "Slate",
          id,
          title: found.record.title || "Untitled Design",
          subtitle: `${found.record.category} · ${found.record.pageCount} page(s)`,
          url: `${origin}/design/${id}`,
          embedUrl: `${origin}/embed/${id}`,
          badge: "Design",
          accent: "#db2777",
        } satisfies EcosystemUnfurl);
      }
    } catch {
      // fall through
    }
  }

  return Response.json({
    app: "slate",
    appName: "Slate",
    id: id || "slate",
    title: "mWorld Slate",
    subtitle: "Visual design studio & presentations",
    url: origin,
    accent: "#db2777",
  } satisfies EcosystemUnfurl);
}
