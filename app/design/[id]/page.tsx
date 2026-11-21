"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { LoginView } from "@/components/login-view";
import { SlateMark } from "@/components/slate-logo";
import type { RailTab } from "@/components/studio/left-rail";
import { StudioEditor } from "@/components/studio/studio-editor";
import type { DesignRecord } from "@/lib/types";

export default function DesignPageRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [design, setDesign] = useState<DesignRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const requestedTab = (searchParams.get("tab") as RailTab | null) || "templates";

  useEffect(() => {
    if (authLoading || !user) return;
    setLoading(true);
    void fetch(`/api/designs/${encodeURIComponent(id)}`, { credentials: "include" })
      .then(async (res) => {
        if (res.status === 404) {
          // If the user opened a /design/<id> link shared from another workspace, route to /share/<id>
          router.replace(`/share/${encodeURIComponent(id)}`);
          return;
        }
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error || "Design not found");
          return;
        }
        const data = (await res.json()) as { design: DesignRecord };
        setDesign(data.design);
      })
      .catch(() => setError("Could not load design"))
      .finally(() => setLoading(false));
  }, [id, user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--bg)]">
        <SlateMark size={38} />
        <span className="text-xs text-[var(--muted)]">Opening studio…</span>
      </div>
    );
  }

  if (!user) return <LoginView showBackLink />;

  if (loading) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--bg)]">
        <SlateMark size={38} />
        <span className="text-xs text-[var(--muted)]">Loading studio…</span>
      </div>
    );
  }

  if (error || !design) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--bg)] p-6 text-center">
        <SlateMark size={40} />
        <h1 className="text-lg font-bold text-[var(--fg)]">{error || "Design not found"}</h1>
        <Link
          href="/"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-medium text-[var(--accent-fg)]"
        >
          Back to Slate
        </Link>
      </div>
    );
  }

  return <StudioEditor initialDesign={design} initialTab={requestedTab} />;
}
