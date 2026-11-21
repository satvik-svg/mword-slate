"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { SlateMark } from "@/components/slate-logo";
import { StudioEditor } from "@/components/studio/studio-editor";
import { syncCustomFonts } from "@/lib/custom-fonts";
import type { CustomFontItem, DesignRecord } from "@/lib/types";

export default function ShareDesignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, login } = useAuth();

  const [design, setDesign] = useState<DesignRecord | null>(null);
  const [customFonts, setCustomFonts] = useState<CustomFontItem[]>([]);
  const [access, setAccess] = useState<"full" | "edit" | "comment" | "view" | "template" | "none">("none");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    void fetch(`/api/share/${encodeURIComponent(id)}`, { credentials: "include" })
      .then(async (res) => {
        const body = (await res.json().catch(() => ({}))) as {
          design?: DesignRecord;
          access?: typeof access;
          customFonts?: CustomFontItem[];
          error?: string;
        };
        if (!res.ok || !body.design) {
          setError(body.error || "Unable to open shared design");
          return;
        }
        if (body.customFonts?.length) {
          setCustomFonts(body.customFonts);
          void syncCustomFonts(body.customFonts);
        }
        setDesign(body.design);
        setAccess(body.access || "view");
      })
      .catch(() => setError("Could not load shared design"))
      .finally(() => setLoading(false));
  }, [id]);

  const cloneAsTemplate = async () => {
    if (!design) return;
    if (!user) {
      await login();
      return;
    }
    setCloning(true);
    try {
      const res = await fetch("/api/designs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${design.title} (Copy)`,
          category: design.category,
          width: design.width,
          height: design.height,
          pages: design.pages,
          thumbnail: design.thumbnail,
        }),
      });
      const data = (await res.json().catch(() => null)) as { design?: DesignRecord } | null;
      if (data?.design) router.push(`/design/${data.design.id}`);
    } finally {
      setCloning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--bg)]">
        <SlateMark size={38} />
        <span className="text-xs text-[var(--muted)]">Opening shared design…</span>
      </div>
    );
  }

  if (error || !design) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--bg)] p-6 text-center">
        <SlateMark size={40} />
        <h1 className="text-lg font-bold text-[var(--fg)]">{error || "Design not accessible"}</h1>
        <p className="max-w-sm text-xs text-[var(--muted)]">
          If this design was shared with your account, sign in to view or edit it.
        </p>
        <div className="flex gap-2">
          {!user && (
            <button
              onClick={() => void login()}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-[var(--accent-fg)] cursor-pointer"
            >
              Sign in to view
            </button>
          )}
          <Link
            href="/"
            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--fg)]"
          >
            Go to Slate
          </Link>
        </div>
      </div>
    );
  }

  const readOnly = access !== "full" && access !== "edit";
  const canComment = access === "full" || access === "edit" || access === "comment";

  return (
    <div className="relative h-dvh">
      {access === "template" && (
        <div className="fixed bottom-16 right-6 z-40">
          <button
            onClick={() => void cloneAsTemplate()}
            disabled={cloning}
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-xs font-medium text-[var(--accent-fg)] shadow-lg hover:opacity-90 cursor-pointer"
          >
            <Copy className="h-4 w-4" />
            {cloning ? "Copying…" : "Use This Template in My Workspace"}
          </button>
        </div>
      )}
      <StudioEditor
        initialDesign={design}
        initialCustomFonts={customFonts}
        readOnly={readOnly}
        canComment={canComment}
        shareEndpoint={`/api/share/${design.id}`}
      />
    </div>
  );
}
