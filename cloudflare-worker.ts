/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// Generated at build time by OpenNext.
import openNextWorker from "./.open-next/worker.js";
import { resolveCollabAccess } from "./lib/collab";
import { readCookie, readSessionToken, SESSION_COOKIE } from "./lib/session";

export { SlateDB } from "./lib/slate-do";

const worker = {
  async fetch(request: Request, env: Record<string, unknown>, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const upgrade = request.headers.get("Upgrade")?.toLowerCase();

    if (upgrade === "websocket" && url.pathname.startsWith("/api/collab/")) {
      const designId = decodeURIComponent(url.pathname.slice("/api/collab/".length)).trim();
      if (!designId || designId.includes("/")) {
        return new Response("Invalid design ID", { status: 400 });
      }

      const dbNamespace = env.SLATE_DB as {
        idFromName(name: string): unknown;
        get(id: unknown): {
          query(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>;
          fetch(req: Request): Promise<Response>;
        };
      } | undefined;

      if (!dbNamespace) {
        return new Response("Collaboration unavailable", { status: 503 });
      }

      // Check session cookie (and allow local dev bypass when MAUTH_ENABLED !== "true")
      if (typeof env.SESSION_SECRET === "string" && !process.env.SESSION_SECRET) {
        process.env.SESSION_SECRET = env.SESSION_SECRET;
      }
      const rawToken = readCookie(request, SESSION_COOKIE);
      const claims = rawToken ? readSessionToken(rawToken) : null;
      const mauthEnabled = String(env.MAUTH_ENABLED ?? "true") === "true";

      const viewerBiId = claims?.biId ?? (mauthEnabled ? undefined : "local-dev");
      const viewerEmail = claims?.email ?? (mauthEnabled ? "" : "dev@slate.local");
      const viewerName =
        claims?.displayName ||
        (url.searchParams.get("name") || "").trim().slice(0, 40) ||
        (mauthEnabled ? "Guest" : "Studio User");

      // Verify design exists and resolve viewer's collaboration role from primary DB
      const primaryStub = dbNamespace.get(dbNamespace.idFromName("primary"));
      const rows = await primaryStub.query(
        "select bi_id, share_config_json from designs where id = ? and trashed = 0 limit 1",
        [designId],
      );
      if (!rows.length) {
        return new Response("Design not found", { status: 404 });
      }

      const designBiId = String(rows[0].bi_id ?? "");
      let shareConfig = { linkAccess: "off", people: [] };
      try {
        shareConfig = JSON.parse(String(rows[0].share_config_json ?? "{}"));
      } catch {
        // default private
      }

      const role = resolveCollabAccess({
        designBiId,
        shareConfig,
        viewerBiId,
        viewerEmail,
      });

      if (!role) {
        return new Response("Forbidden", { status: 403 });
      }

      const headers = new Headers(request.headers);
      headers.set("x-collab-name", viewerName);
      headers.set("x-collab-email", viewerEmail);
      headers.set("x-collab-role", role);

      const roomStub = dbNamespace.get(dbNamespace.idFromName(`collab:${designId}`));
      return roomStub.fetch(new Request(request.url, { headers }));
    }

    return openNextWorker.fetch(request, env, ctx);
  },
};

export default worker;
