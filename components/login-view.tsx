"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Moon, Sun } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PagePreview } from "@/components/page-preview";
import { SlateMark, SlateWordmark } from "@/components/slate-logo";
import { BUILTIN_TEMPLATES } from "@/lib/templates";

const SHOWCASE_DECK =
  BUILTIN_TEMPLATES.find((t) => t.id === "tpl-pitch-deck") ?? BUILTIN_TEMPLATES[0];

export function LoginView({
  errorReason,
  showBackLink = true,
}: {
  errorReason?: string | null;
  showBackLink?: boolean;
}) {
  const { login, theme, toggleTheme } = useAuth();
  const [busyMode, setBusyMode] = useState<"default" | "fresh" | null>(null);
  const [err, setErr] = useState<string | null>(errorReason ?? null);
  const [slideIdx, setSlideIdx] = useState(0);

  const activeSlide = SHOWCASE_DECK.pages[slideIdx] ?? SHOWCASE_DECK.pages[0];

  const handleLogin = async (fresh: boolean) => {
    setBusyMode(fresh ? "fresh" : "default");
    setErr(null);
    try {
      await login(fresh);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start sign-in");
      setBusyMode(null);
    }
  };

  return (
    <div className="grid min-h-dvh grid-cols-1 bg-[var(--surface)] text-[var(--fg)] lg:grid-cols-2">
      {/* Left: Quiet Obsidian Studio Drafting Table (Desktop) */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/10 bg-[#0d0d10] p-10 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0 studio-dots-dark opacity-70" />

        {/* Top Bar */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 select-none">
            <SlateMark size={26} />
            <span className="text-[15px] font-semibold tracking-[-0.025em] text-white">
              Slate
            </span>
          </Link>
          <span className="font-mono text-[11px] tracking-wider text-white/40">
            {SHOWCASE_DECK.width} × {SHOWCASE_DECK.height} PX
          </span>
        </div>

        {/* Center: Live-Rendered Slate Deck Showcase with Registration Marks */}
        <div className="relative z-10 mx-auto my-auto flex w-full max-w-[548px] flex-col items-center">
          <div className="relative w-full rounded-xl border border-white/12 bg-white/[0.025] p-3.5">
            {/* Subtle Studio Corner Crop Marks */}
            <span className="pointer-events-none absolute -top-2 -left-2 h-3 w-3 border-t border-l border-white/25" />
            <span className="pointer-events-none absolute -top-2 -right-2 h-3 w-3 border-t border-r border-white/25" />
            <span className="pointer-events-none absolute -bottom-2 -left-2 h-3 w-3 border-b border-l border-white/25" />
            <span className="pointer-events-none absolute -bottom-2 -right-2 h-3 w-3 border-b border-r border-white/25" />

            <div className="mb-2.5 flex items-center justify-between px-1 text-[11px] text-white/50">
              <span className="font-medium text-white/85">{SHOWCASE_DECK.title}</span>
              <span className="font-mono">
                0{slideIdx + 1} / 0{SHOWCASE_DECK.pages.length}
              </span>
            </div>

            <div className="flex items-center justify-center overflow-hidden rounded-lg bg-[#08080a] p-3 ring-1 ring-white/10">
              <PagePreview
                page={activeSlide}
                width={SHOWCASE_DECK.width}
                height={SHOWCASE_DECK.height}
                maxWidth={492}
                maxHeight={280}
                className="rounded-[3px] shadow-2xl"
              />
            </div>

            {/* Minimal Filmstrip Switcher */}
            <div className="mt-3 flex items-center justify-between gap-2 px-0.5">
              <div className="flex items-center gap-1.5">
                {SHOWCASE_DECK.pages.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSlideIdx(idx)}
                    aria-label={`Preview slide ${idx + 1}`}
                    className={`relative overflow-hidden rounded border transition cursor-pointer ${
                      idx === slideIdx
                        ? "border-white ring-1 ring-white/40"
                        : "border-white/15 opacity-55 hover:opacity-90"
                    }`}
                  >
                    <PagePreview
                      page={p}
                      width={SHOWCASE_DECK.width}
                      height={SHOWCASE_DECK.height}
                      maxWidth={68}
                      maxHeight={38}
                      className="pointer-events-none"
                    />
                  </button>
                ))}
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
                {activeSlide.name}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Metadata */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-white/40">
          <span>Presentations · Graphics · Photo · Brand Kit</span>
          <span className="font-mono">SLATE STUDIO</span>
        </div>
      </div>

      {/* Right: Clean, Uncluttered Sign-In Surface */}
      <div className="flex flex-col justify-between bg-[var(--surface)] px-6 py-7 sm:px-12">
        {/* Top Utility Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="lg:hidden">
              <Link href="/">
                <SlateWordmark size={24} />
              </Link>
            </div>
            {showBackLink && (
              <Link
                href="/"
                className="hidden items-center gap-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--fg)] lg:inline-flex"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to overview
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-md p-1.5 text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        {/* Centered Sign-In Column */}
        <div className="mx-auto w-full max-w-[360px] py-12">
          <div className="mb-6 hidden lg:block">
            <SlateMark size={32} />
          </div>

          <h1
            style={{ fontFamily: '"Inter Tight", "Plus Jakarta Sans", sans-serif' }}
            className="text-[28px] font-semibold tracking-[-0.03em] text-[var(--fg)]"
          >
            Sign in to Slate
          </h1>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted)]">
            Open your personal canvas or shared team workspace.
          </p>

          {err && (
            <div
              role="alert"
              className="mt-5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs leading-relaxed text-rose-600 dark:text-rose-400"
            >
              {err}
            </div>
          )}

          <div className="mt-7 space-y-2.5">
            <button
              type="button"
              onClick={() => void handleLogin(false)}
              disabled={busyMode !== null}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-4 text-[13px] font-medium text-[var(--accent-fg)] transition hover:opacity-90 disabled:opacity-55 cursor-pointer"
            >
              <span>{busyMode === "default" ? "Signing in…" : "Continue to Slate"}</span>
              {busyMode === null && <ArrowRight className="h-3.5 w-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => void handleLogin(true)}
              disabled={busyMode !== null}
              className="flex h-10 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-transparent px-4 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] disabled:opacity-50 cursor-pointer"
            >
              {busyMode === "fresh" ? "Opening account picker…" : "Use a different account"}
            </button>
          </div>

          <div className="mt-8 border-t border-[var(--border)] pt-5 text-[11px] leading-relaxed text-[var(--muted)]">
            Sessions are authenticated via <span className="text-[var(--fg)]">mAuth</span>.
            Personal and team workspaces stay synced across designs, brand kits, and shared
            templates.
          </div>
        </div>

        {/* Bottom Quiet Footer */}
        <div className="flex items-center justify-between text-[11px] text-[var(--muted)]">
          <span>Slate Studio</span>
          {showBackLink && (
            <Link href="/" className="transition hover:text-[var(--fg)] lg:hidden">
              Overview
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
