import { verifyEcosystemRequest } from "@/lib/mworld-ecosystem";
import { getBrandKit } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const eco = await verifyEcosystemRequest(req);
  if (!eco.ok) {
    return Response.json({ error: eco.error }, { status: eco.status });
  }
  if (!eco.user) {
    return Response.json({ error: "X-MWorld-User header is required" }, { status: 400 });
  }
  try {
    const brandKit = await getBrandKit(eco.user.biId);
    return Response.json({ brandKit });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Could not load brand kit" },
      { status: 500 },
    );
  }
}
