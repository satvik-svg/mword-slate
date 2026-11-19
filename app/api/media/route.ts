import { jsonError, requireAuth } from "@/lib/auth";
import { createMedia, deleteMedia, listMedia } from "@/lib/store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 14 * 1024 * 1024;

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const media = await listMedia(auth.biId);
    return Response.json({ media });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as {
      name?: string;
      mimeType?: string;
      dataUrl?: string;
      width?: number;
      height?: number;
      sizeBytes?: number;
    };
    if (!body.dataUrl || typeof body.dataUrl !== "string") {
      return Response.json({ error: "Missing media data" }, { status: 400 });
    }
    if (body.dataUrl.length > MAX_BYTES) {
      return Response.json({ error: "File exceeds 14 MB limit" }, { status: 413 });
    }
    const asset = await createMedia(auth.biId, {
      name: body.name || "Upload",
      mimeType: body.mimeType || "image/png",
      dataUrl: body.dataUrl,
      width: body.width,
      height: body.height,
      sizeBytes: body.sizeBytes,
    });
    return Response.json({ asset }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req);
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!id) return Response.json({ error: "Missing media id" }, { status: 400 });
    await deleteMedia(auth.biId, id);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
