import { jsonError, requireAuth } from "@/lib/auth";
import { deleteDesign, getDesign, updateDesign } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    const { id } = await context.params;
    const design = await getDesign(auth.biId, id);
    if (!design) return Response.json({ error: "Design not found" }, { status: 404 });
    return Response.json({ design });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    const { id } = await context.params;
    const patch = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const design = await updateDesign(auth.biId, id, patch, auth.email || auth.displayName);
    if (!design) return Response.json({ error: "Design not found" }, { status: 404 });
    return Response.json({ design });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth(req);
    const { id } = await context.params;
    const ok = await deleteDesign(auth.biId, id);
    if (!ok) return Response.json({ error: "Design not found" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
