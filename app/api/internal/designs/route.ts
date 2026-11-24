import { resolveAppOrigin, verifyEcosystemRequest } from "@/lib/mworld-ecosystem";
import { createDesign } from "@/lib/store";
import type { DesignCategory, DesignPage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const eco = await verifyEcosystemRequest(req);
  if (!eco.ok) {
    return Response.json({ error: eco.error }, { status: eco.status });
  }
  if (!eco.user) {
    return Response.json({ error: "X-MWorld-User header is required" }, { status: 400 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      category?: DesignCategory;
      width?: number;
      height?: number;
      pages?: DesignPage[];
    };

    const design = await createDesign({
      biId: eco.user.biId,
      title: body.title || "Untitled Design",
      category: body.category || "presentation",
      width: body.width || 1280,
      height: body.height || 720,
      pages: body.pages,
      actor: eco.user.personKey,
    });

    const origin = resolveAppOrigin("slate");
    return Response.json(
      {
        id: design.id,
        title: design.title,
        url: `${origin}/design/${design.id}`,
        embedUrl: `${origin}/embed/${design.id}`,
        design,
      },
      { status: 201 },
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Could not create design" },
      { status: 500 },
    );
  }
}
