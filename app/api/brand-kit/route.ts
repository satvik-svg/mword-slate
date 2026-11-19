import { jsonError, requireAuth } from "@/lib/auth";
import { getBrandKit, saveBrandKit } from "@/lib/store";
import type { BrandKit } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const brandKit = await getBrandKit(auth.biId);
    return Response.json({ brandKit });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = (await req.json().catch(() => ({}))) as Partial<BrandKit>;
    const brandKit = await saveBrandKit(auth.biId, body);
    return Response.json({ brandKit });
  } catch (error) {
    return jsonError(error);
  }
}
