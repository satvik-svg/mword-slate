import { jsonError, requireAuth } from "@/lib/auth";
import { createFolder, deleteFolder, listFolders } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const folders = await listFolders(auth.biId);
    return Response.json({ folders });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as { name?: string };
    const folder = await createFolder(auth.biId, body.name || "New Folder");
    return Response.json({ folder }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth(req);
    const id = new URL(req.url).searchParams.get("id") || "";
    if (!id) return Response.json({ error: "Missing folder id" }, { status: 400 });
    await deleteFolder(auth.biId, id);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
