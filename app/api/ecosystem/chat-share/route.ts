import { jsonError, requireAuth } from "@/lib/auth";
import { callEcosystemService, resolveAppOrigin } from "@/lib/mworld-ecosystem";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as {
      designId?: string;
      conversationId?: string;
      title?: string;
    };
    if (!body.designId || !body.conversationId) {
      return Response.json({ error: "designId and conversationId are required" }, { status: 400 });
    }

    const origin = resolveAppOrigin("slate");
    const url = `${origin}/share/${encodeURIComponent(body.designId)}`;
    const res = await callEcosystemService("chat", "/api/internal/messages", {
      method: "POST",
      user: auth,
      body: {
        conversationId: body.conversationId,
        type: "mworld_card",
        body: JSON.stringify({
          app: "slate",
          appName: "Slate",
          id: body.designId,
          title: body.title || "Slate Design",
          subtitle: "Shared from mWorld Slate",
          url,
          embedUrl: `${origin}/embed/${encodeURIComponent(body.designId)}`,
          accent: "#db2777",
        }),
      },
    });
    if (!res.ok) {
      return Response.json({ error: res.error || "Could not share to mWorld Chat" }, { status: res.status || 502 });
    }
    return Response.json({ ok: true, url });
  } catch (err) {
    return jsonError(err);
  }
}
