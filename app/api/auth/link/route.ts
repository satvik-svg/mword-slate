import { createAuthLink, requestOrigin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const fresh = new URL(req.url).searchParams.get("fresh") === "1";
    const link = await createAuthLink(requestOrigin(req), fresh);
    return Response.json({ link });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start login";
    return Response.json({ error: message }, { status: 500 });
  }
}
