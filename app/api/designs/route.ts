import { jsonError, requireAuth } from "@/lib/auth";
import { createDesign, listDesigns } from "@/lib/store";
import type { DesignCategory, DesignPage } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const designs = await listDesigns(auth.biId);
    return Response.json({ designs });
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
      pages?: DesignPage[];
      folderId?: string | null;
      thumbnail?: string;
    };
    const design = await createDesign({
      biId: auth.biId,
      title: body.title || "Untitled Design",
      category: body.category || "custom",
      width: Number(body.width) || 1080,
      height: Number(body.height) || 1080,
      pages: body.pages,
      folderId: body.folderId ?? null,
      thumbnail: body.thumbnail || "",
      actor: auth.email || auth.displayName,
    });
    return Response.json({ design }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
