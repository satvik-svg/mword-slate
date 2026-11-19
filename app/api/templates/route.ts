import { jsonError, requireAuth } from "@/lib/auth";
import { deleteTeamTemplate, listTeamTemplates, saveTeamTemplate } from "@/lib/store";
import type { DesignCategory, DesignPage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const templates = await listTeamTemplates(auth.biId);
    return Response.json({ templates });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      category?: DesignCategory;
      width?: number;
      height?: number;
      thumbnail?: string;
      pages?: DesignPage[];
    };
    if (!body.pages?.length) {
      return Response.json({ error: "Template pages required" }, { status: 400 });
    }
    const template = await saveTeamTemplate(auth.biId, {
      title: body.title || "Team Template",
      category: body.category || "custom",
      width: body.width || 1080,
      height: body.height || 1080,
      thumbnail: body.thumbnail || "",
      pages: body.pages,
    });
    return Response.json({ template }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req);
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!id) return Response.json({ error: "Missing template id" }, { status: 400 });
    await deleteTeamTemplate(auth.biId, id);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
