"use client";

import { useRef, useState } from "react";
import { Check, Plus, Trash2, Type, Upload, X } from "lucide-react";
import {
  cleanFontNameFromFile,
  fontFormatFromFile,
  loadCustomFont,
  readFontFileAsDataUrl,
} from "@/lib/custom-fonts";
import { makeId } from "@/lib/id";
import { GOOGLE_FONTS, SWATCH_PALETTES } from "@/lib/presets";
import type { BrandKit, CustomFontItem } from "@/lib/types";

const MAX_FONT_FILE_BYTES = 2 * 1024 * 1024;

function hexLum(hex: string): number {
  const clean = hex.replace("#", "").trim();
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return 0.5;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function readableOn(bgHex: string): string {
  return hexLum(bgHex) > 0.42 ? "#111114" : "#FAFAFA";
}

function pickBrandPreviewTokens(colors: string[]) {
  const valid = colors.filter((c) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(c));
  const sorted = [...valid].sort((a, b) => hexLum(a) - hexLum(b));
  const darkest = sorted[0] ?? "#141417";
  const lightest = sorted[sorted.length - 1] ?? "#FAFAFA";
  const accent =
    valid.find((c) => c !== darkest && c !== lightest && hexLum(c) > 0.06 && hexLum(c) < 0.75) ??
    valid[1] ??
    "#2563EB";
  const lightBg = hexLum(lightest) > 0.7 ? lightest : "#FAFAFA";
  const darkBg = hexLum(darkest) < 0.22 ? darkest : "#141417";
  return {
    lightBg,
    lightInk: readableOn(lightBg),
    darkBg,
    darkInk: readableOn(darkBg),
    accent,
    accentInk: readableOn(accent),
  };
}

export function BrandKitView({
  brandKit,
  brandSaved,
  onChangeDraft,
  onSaveBrand,
  onUploadLogo,
  onError,
}: {
  brandKit: BrandKit;
  brandSaved: boolean;
  onChangeDraft: (next: BrandKit) => void;
  onSaveBrand: (next: BrandKit) => Promise<void>;
  onUploadLogo: () => void;
  onError: (msg: string) => void;
}) {
  const fontInputRef = useRef<HTMLInputElement>(null);
  const [googleFontInput, setGoogleFontInput] = useState("");
  const [fontBusy, setFontBusy] = useState(false);

  const customFonts = brandKit.customFonts ?? [];
  const preview = pickBrandPreviewTokens(brandKit.colors);
  const primaryLogo = brandKit.logos[0] ?? null;

  const handleUploadFontFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FONT_FILE_BYTES) {
      onError("Font file is too large (max 2 MB). Try a .woff2 file.");
      return;
    }
    setFontBusy(true);
    try {
      const dataUrl = await readFontFileAsDataUrl(file);
      const name = cleanFontNameFromFile(file.name);
      const item: CustomFontItem = {
        id: makeId("font"),
        name,
        source: "upload",
        dataUrl,
        format: fontFormatFromFile(file.name),
        createdAt: Date.now(),
      };
      const ok = await loadCustomFont(item);
      if (!ok) {
        onError("Could not parse that font file. Use .ttf, .otf, .woff, or .woff2.");
        return;
      }
      const nextFonts = [item, ...customFonts.filter((f) => f.name !== name)].slice(0, 20);
      await onSaveBrand({ ...brandKit, customFonts: nextFonts, updatedAt: Date.now() });
    } catch {
      onError("Failed to import font file.");
    } finally {
      setFontBusy(false);
    }
  };

  const handleAddGoogleFont = async () => {
    const family = googleFontInput.trim();
    if (!family) return;
    if (
      GOOGLE_FONTS.some((f) => f.name.toLowerCase() === family.toLowerCase()) ||
      customFonts.some((f) => f.name.toLowerCase() === family.toLowerCase())
    ) {
      onError(`"${family}" is already available in your font list.`);
      return;
    }
    setFontBusy(true);
    try {
      const item: CustomFontItem = {
        id: makeId("font"),
        name: family,
        source: "google",
        createdAt: Date.now(),
      };
      const ok = await loadCustomFont(item);
      if (!ok) {
        onError(`Could not find "${family}" on Google Fonts. Check spelling and try again.`);
        return;
      }
      const nextFonts = [item, ...customFonts].slice(0, 20);
      await onSaveBrand({ ...brandKit, customFonts: nextFonts, updatedAt: Date.now() });
      setGoogleFontInput("");
    } finally {
      setFontBusy(false);
    }
  };

  const handleRemoveCustomFont = async (font: CustomFontItem) => {
    const nextFonts = customFonts.filter((f) => f.id !== font.id);
    const nextSlots = {
      heading: brandKit.fonts.heading === font.name ? "Plus Jakarta Sans" : brandKit.fonts.heading,
      subheading:
        brandKit.fonts.subheading === font.name ? "Inter" : brandKit.fonts.subheading,
      body: brandKit.fonts.body === font.name ? "Inter" : brandKit.fonts.body,
    };
    await onSaveBrand({
      ...brandKit,
      fonts: nextSlots,
      customFonts: nextFonts,
    });
  };

  return (
    <section className="space-y-6">
      <input
        ref={fontInputRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        onChange={handleUploadFontFile}
        className="hidden"
      />

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[var(--fg)]">Brand kit</h1>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Set your logos, colors, and typography once — reuse them in one click across every
            design.
          </p>
        </div>
        {brandSaved && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--fg)]">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            Saved
          </span>
        )}
      </div>

      {/* Balanced 2-Column Workspace Layout */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Left: Settings Sections */}
        <div className="space-y-5">
          {/* Identity & Logos */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-5">
            <div>
              <label
                htmlFor="brand-kit-name"
                className="block text-xs font-medium text-[var(--muted)]"
              >
                Brand name
              </label>
              <input
                id="brand-kit-name"
                value={brandKit.name}
                onChange={(e) => onChangeDraft({ ...brandKit, name: e.target.value })}
                onBlur={() => void onSaveBrand({ ...brandKit, updatedAt: Date.now() })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  }
                }}
                placeholder="e.g. Acme Studio"
                className="mt-1.5 block w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 px-3 py-2 text-sm font-medium text-[var(--fg)] outline-none transition focus:border-[var(--border-strong)] focus:bg-[var(--surface)]"
              />
            </div>

            <div className="border-t border-[var(--border)]/70 pt-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-semibold text-[var(--fg)]">Logos</h2>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    PNG or SVG marks available in the editor’s Brand tab.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onUploadLogo}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--fg)] transition hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload logo
                </button>
              </div>

              {brandKit.logos.length === 0 ? (
                <button
                  type="button"
                  onClick={onUploadLogo}
                  className="mt-3 flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-[var(--border-strong)]/80 bg-[var(--surface-2)]/30 py-7 text-center transition hover:border-[var(--fg)]/40 hover:bg-[var(--surface-2)]/60 cursor-pointer"
                >
                  <Upload className="h-4 w-4 text-[var(--muted)]" />
                  <span className="text-xs font-medium text-[var(--fg)]">Upload a brand logo</span>
                  <span className="text-[11px] text-[var(--muted)]">PNG, SVG, or WebP</span>
                </button>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {brandKit.logos.map((logo) => (
                    <div
                      key={logo.id}
                      className="group relative flex flex-col items-center rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 p-3 transition hover:border-[var(--border-strong)]"
                    >
                      <div className="flex h-16 w-full items-center justify-center rounded-md bg-[var(--surface)] p-2">
                        <img
                          src={logo.dataUrl}
                          alt={logo.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      <div
                        title={logo.name}
                        className="mt-2 w-full truncate text-center text-[11px] font-medium text-[var(--fg)]"
                      >
                        {logo.name}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          void onSaveBrand({
                            ...brandKit,
                            logos: brandKit.logos.filter((l) => l.id !== logo.id),
                            updatedAt: Date.now(),
                          })
                        }
                        title="Remove logo"
                        aria-label={`Remove ${logo.name}`}
                        className="absolute right-1.5 top-1.5 rounded-md bg-black/75 p-1 text-white opacity-0 transition hover:bg-rose-500 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {brandKit.logos.length < 12 && (
                    <button
                      type="button"
                      onClick={onUploadLogo}
                      className="flex min-h-[108px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/40 hover:text-[var(--fg)] cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="text-[11px] font-medium">Add logo</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Color Palette */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-semibold text-[var(--fg)]">Color palette</h2>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  Click any swatch to edit. Used for 1-click brand styling inside the editor.
                </p>
              </div>
              <span className="text-[11px] text-[var(--muted)]">
                {brandKit.colors.length} / 10
              </span>
            </div>

            <div className="flex flex-wrap items-start gap-3">
              {brandKit.colors.map((c, idx) => (
                <div key={`${idx}-${c}`} className="group flex flex-col items-center gap-1.5">
                  <div className="relative">
                    <label
                      title={`Edit color ${c}`}
                      style={{ backgroundColor: c }}
                      className="block h-11 w-11 cursor-pointer rounded-lg border border-black/15 shadow-xs transition group-hover:scale-[1.03]"
                    >
                      <input
                        type="color"
                        value={c}
                        onChange={(e) => {
                          const next = [...brandKit.colors];
                          next[idx] = e.target.value.toUpperCase();
                          void onSaveBrand({
                            ...brandKit,
                            colors: next,
                            updatedAt: Date.now(),
                          });
                        }}
                        className="sr-only"
                      />
                    </label>
                    {brandKit.colors.length > 2 && (
                      <button
                        type="button"
                        onClick={() =>
                          void onSaveBrand({
                            ...brandKit,
                            colors: brandKit.colors.filter((_, i) => i !== idx),
                            updatedAt: Date.now(),
                          })
                        }
                        title="Remove color"
                        aria-label={`Remove ${c}`}
                        className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-white opacity-0 shadow-xs transition hover:bg-rose-500 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                  <span className="font-mono text-[10px] uppercase text-[var(--muted)]">{c}</span>
                </div>
              ))}

              {brandKit.colors.length < 10 && (
                <button
                  type="button"
                  onClick={() =>
                    void onSaveBrand({
                      ...brandKit,
                      colors: [...brandKit.colors, "#2563EB"],
                      updatedAt: Date.now(),
                    })
                  }
                  title="Add color"
                  aria-label="Add color"
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-[var(--border-strong)] text-[var(--muted)] transition hover:border-[var(--fg)]/50 hover:bg-[var(--surface-2)]/50 hover:text-[var(--fg)] cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Quick Palette Presets */}
            <div className="border-t border-[var(--border)]/70 pt-3.5">
              <div className="mb-2 text-[11px] font-medium text-[var(--muted)]">Quick presets</div>
              <div className="flex flex-wrap gap-2">
                {SWATCH_PALETTES.map((pal) => (
                  <button
                    key={pal.name}
                    type="button"
                    onClick={() =>
                      void onSaveBrand({
                        ...brandKit,
                        colors: [...pal.colors],
                        updatedAt: Date.now(),
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/40 px-2.5 py-1.5 text-[11px] font-medium text-[var(--fg)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] cursor-pointer"
                  >
                    <span className="flex items-center -space-x-1">
                      {pal.colors.map((hex) => (
                        <span
                          key={hex}
                          style={{ backgroundColor: hex }}
                          className="h-3 w-3 rounded-full ring-1 ring-[var(--surface)]"
                        />
                      ))}
                    </span>
                    <span>{pal.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Typography & Custom Fonts */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-5">
            <div>
              <h2 className="text-xs font-semibold text-[var(--fg)]">Typography</h2>
              <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                Default brand typefaces for headings, subheadings, and body copy.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
              {(
                [
                  { slot: "heading", label: "Heading", sample: "Aa Bb", sizeClass: "text-base font-bold" },
                  {
                    slot: "subheading",
                    label: "Subheading",
                    sample: "Section title",
                    sizeClass: "text-sm font-semibold",
                  },
                  {
                    slot: "body",
                    label: "Body",
                    sample: "Clean readable copy",
                    sizeClass: "text-xs font-normal",
                  },
                ] as const
              ).map(({ slot, label, sample, sizeClass }) => (
                <div
                  key={slot}
                  className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/35 p-3"
                >
                  <label className="block text-[11px] font-medium text-[var(--muted)]">
                    {label}
                  </label>
                  <select
                    value={brandKit.fonts[slot]}
                    onChange={(e) =>
                      void onSaveBrand({
                        ...brandKit,
                        fonts: { ...brandKit.fonts, [slot]: e.target.value },
                        updatedAt: Date.now(),
                      })
                    }
                    className="mt-1.5 w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--border-strong)]"
                  >
                    {customFonts.length > 0 && (
                      <optgroup label="Custom Fonts">
                        {customFonts.map((f) => (
                          <option key={f.id} value={f.name}>
                            {f.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Built-in Fonts">
                      {GOOGLE_FONTS.map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <div
                    style={{ fontFamily: `"${brandKit.fonts[slot]}", sans-serif` }}
                    className={`mt-2.5 truncate text-[var(--fg)] ${sizeClass}`}
                  >
                    {sample}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Fonts Import */}
            <div className="border-t border-[var(--border)]/70 pt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-[var(--fg)]">Custom fonts</h3>
                  <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                    Upload .ttf, .otf, .woff, or .woff2 files, or add any Google Font by name.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={fontBusy}
                  onClick={() => fontInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--fg)] transition hover:bg-[var(--surface-2)] disabled:opacity-50 cursor-pointer"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload font
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  value={googleFontInput}
                  onChange={(e) => setGoogleFontInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleAddGoogleFont();
                    }
                  }}
                  placeholder="Add Google Font by name (e.g. Sora, Bricolage Grotesque…)"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 px-3 py-1.5 text-xs text-[var(--fg)] placeholder:text-[var(--muted)] outline-none transition focus:border-[var(--border-strong)] focus:bg-[var(--surface)]"
                />
                <button
                  type="button"
                  disabled={fontBusy || !googleFontInput.trim()}
                  onClick={() => void handleAddGoogleFont()}
                  className="shrink-0 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-fg)] transition hover:opacity-90 disabled:opacity-45 cursor-pointer"
                >
                  {fontBusy ? "Adding…" : "Add"}
                </button>
              </div>

              {customFonts.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {customFonts.map((f) => (
                    <div
                      key={f.id}
                      className="group inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/50 px-2.5 py-1.5 text-xs"
                    >
                      <Type className="h-3 w-3 text-[var(--muted)]" />
                      <span
                        style={{ fontFamily: `"${f.name}", sans-serif` }}
                        className="font-medium text-[var(--fg)]"
                      >
                        {f.name}
                      </span>
                      <span className="rounded bg-[var(--surface)] px-1.5 py-px text-[9px] font-medium uppercase text-[var(--muted)]">
                        {f.source === "upload" ? "File" : "Google"}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleRemoveCustomFont(f)}
                        title={`Remove ${f.name}`}
                        aria-label={`Remove ${f.name}`}
                        className="rounded p-0.5 text-[var(--muted)] opacity-60 transition hover:bg-rose-500/15 hover:text-rose-500 hover:opacity-100 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Brand Preview */}
        <aside className="lg:sticky lg:top-0 space-y-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--fg)]">Live preview</span>
              <span className="text-[11px] text-[var(--muted)]">Auto-synced</span>
            </div>

            {/* Light Slide Card Preview */}
            <div
              style={{ backgroundColor: preview.lightBg, color: preview.lightInk }}
              className="rounded-lg border border-black/10 p-4 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {primaryLogo ? (
                    <img
                      src={primaryLogo.dataUrl}
                      alt={primaryLogo.name}
                      className="h-6 max-w-[72px] object-contain"
                    />
                  ) : (
                    <span
                      style={{ backgroundColor: preview.accent }}
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                    />
                  )}
                  <span
                    style={{ fontFamily: `"${brandKit.fonts.subheading}", sans-serif` }}
                    className="truncate text-[11px] font-semibold opacity-75"
                  >
                    {brandKit.name.trim() || "My Brand"}
                  </span>
                </div>
                <span
                  style={{
                    backgroundColor: preview.accent,
                    color: preview.accentInk,
                    fontFamily: `"${brandKit.fonts.body}", sans-serif`,
                  }}
                  className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold"
                >
                  Brand
                </span>
              </div>

              <div
                style={{ fontFamily: `"${brandKit.fonts.heading}", sans-serif` }}
                className="mt-4 text-lg font-bold leading-tight tracking-tight"
              >
                Design with consistency.
              </div>
              <div
                style={{ fontFamily: `"${brandKit.fonts.subheading}", sans-serif` }}
                className="mt-1 text-xs font-medium opacity-80"
              >
                Unified colors, type, and marks.
              </div>
              <p
                style={{ fontFamily: `"${brandKit.fonts.body}", sans-serif` }}
                className="mt-2 text-[11px] leading-relaxed opacity-70"
              >
                Apply this kit to any slide or graphic inside the studio in one click.
              </p>
            </div>

            {/* Dark Slide Card Preview */}
            <div
              style={{ backgroundColor: preview.darkBg, color: preview.darkInk }}
              className="rounded-lg border border-white/10 p-4"
            >
              <div
                style={{
                  color: preview.accent,
                  fontFamily: `"${brandKit.fonts.subheading}", sans-serif`,
                }}
                className="text-[10px] font-semibold uppercase tracking-wider"
              >
                {brandKit.name.trim() || "My Brand"} • Dark Mode
              </div>
              <div
                style={{ fontFamily: `"${brandKit.fonts.heading}", sans-serif` }}
                className="mt-1.5 text-base font-bold leading-snug"
              >
                Presentations that stand out.
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span
                  style={{
                    backgroundColor: preview.accent,
                    color: preview.accentInk,
                    fontFamily: `"${brandKit.fonts.body}", sans-serif`,
                  }}
                  className="rounded-md px-2.5 py-1 text-[10px] font-semibold"
                >
                  Primary CTA
                </span>
                <span
                  style={{ fontFamily: `"${brandKit.fonts.body}", sans-serif` }}
                  className="text-[10px] opacity-70"
                >
                  {brandKit.fonts.heading} + {brandKit.fonts.body}
                </span>
              </div>
            </div>

            {/* Palette Strip */}
            <div className="flex h-3 overflow-hidden rounded-md border border-black/10">
              {brandKit.colors.map((c, idx) => (
                <div key={`${idx}-${c}`} style={{ backgroundColor: c }} className="flex-1" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
