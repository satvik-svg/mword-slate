import { jsonError, optionalAuth } from "@/lib/auth";
import { getDesignById, updateSharedDesignById } from "@/lib/store";
import type { DesignComment, DesignPage } from "@/lib/types";

export const dynamic = "force-dynamic";

function resolveAccess(
  record: { shareConfig: { linkAccess: string; people: { email: string; access: string }[] } },
  ownerBiId: string,
  auth: { biId: string; email: string } | null,
): "full" | "edit" | "comment" | "view" | "template" | "none" {
  if (auth && auth.biId === ownerBiId) return "full";
  if (auth?.email) {
    const person = record.shareConfig.people.find(
      (p) => p.email.trim().toLowerCase() === auth.email.trim().toLowerCase(),
    );
    if (person) {
      if (person.access === "full") return "full";
      if (person.access === "edit") return "edit";
      if (person.access === "comment") return "comment";
      return "view";
    }
  }
  const link = record.shareConfig.linkAccess;
  if (link === "edit") return "edit";
  if (link === "comment") return "comment";
  if (link === "template") return "template";
  if (link === "view") return "view";
  return "none";
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await optionalAuth(req);
    const { id } = await context.params;
    const found = await getDesignById(id);
    if (!found || found.record.trashed) {
      return Response.json({ error: "Shared design not found" }, { status: 404 });
    }
    const access = resolveAccess(found.record, found.biId, auth);
    if (access === "none") {
      return Response.json({ error: "This design is private" }, { status: 403 });
    }
    return Response.json({ design: found.record, access });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const auth = await optionalAuth(req);
    const { id } = await context.params;
    const found = await getDesignById(id);
    if (!found || found.record.trashed) {
      return Response.json({ error: "Shared design not found" }, { status: 404 });
    }
    const access = resolveAccess(found.record, found.biId, auth);
    const body = (await req.json().catch(() => ({}))) as {
      pages?: DesignPage[];
      title?: string;
      thumbnail?: string;
      comments?: DesignComment[];
    };

    const actor = auth?.email || auth?.displayName || "Guest";
    if (body.comments && (access === "full" || access === "edit" || access === "comment")) {
      const updated = await updateSharedDesignById(id, { comments: body.comments }, actor);
      return Response.json({ design: updated, access });
    }
    if (access === "full" || access === "edit") {
      const updated = await updateSharedDesignById(
        id,
        { pages: body.pages, title: body.title, thumbnail: body.thumbnail },
        actor,
      );
      return Response.json({ design: updated, access });
    }
    return Response.json({ error: "Insufficient permissions" }, { status: 403 });
  } catch (error) {
    return jsonError(error);
  }
}
