"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Download,
  ExternalLink,
  Hexagon,
  Palette,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import {
  downloadLogoPackZip,
  generateLogoConcepts,
  logoConceptToDesignPage,
  renderLogoConceptSvg,
  svgToDataUrl,
  type LogoColorMood,
  type LogoConcept,
  type LogoStyle,
} from "@/lib/logo-generator";
import { makeId } from "@/lib/id";
import type { BrandLogoItem, DesignPage } from "@/lib/types";

const INDUSTRIES = [
  "Tech & SaaS",
  "Creative Studio",
  "Finance",
  "Food & Cafe",
  "Fashion & Luxury",
  "Health & Fitness",
  "Education",
  "Real Estate",
  "Eco & Nature",
  "Gaming",
  "Marketing",
  "Travel",
];

const STYLES: { id: LogoStyle; label: string }[] = [
  { id: "all", label: "All Styles" },
  { id: "minimal", label: "Minimal" },
  { id: "geometric", label: "Geometric" },
  { id: "monogram", label: "Monogram" },
  { id: "emblem", label: "Emblem" },
  { id: "wordmark", label: "Wordmark" },
  { id: "modern", label: "Modern" },
];

const MOODS: { id: LogoColorMood; label: string; dot: string }[] = [
  { id: "auto", label: "Auto Mix", dot: "linear-gradient(135deg,#141417,#2563EB)" },
  { id: "slate", label: "Slate", dot: "#2563EB" },
  { id: "ocean", label: "Ocean", dot: "#0284C7" },
  { id: "emerald", label: "Emerald", dot: "#15803D" },
  { id: "sunset", label: "Sunset", dot: "#C2410C" },
  { id: "royal", label: "Royal", dot: "#7C3AED" },
  { id: "earth", label: "Earth", dot: "#B45309" },
  { id: "monochrome", label: "Mono", dot: "#141417" },
];

export function LogoMakerModal({
  open,
  onClose,
  onOpenInEditor,
  onInsertOnCanvas,
  onSaveToBrandKit,
}: {
  open: boolean;
  onClose: () => void;
  onOpenInEditor: (title: string, page: DesignPage) => Promise<void> | void;
  onInsertOnCanvas?: (name: string, dataUrl: string) => void;
  onSaveToBrandKit?: (logos: BrandLogoItem[], colors: string[], font: string) => Promise<void> | void;
}) {
  const [brandName, setBrandName] = useState("Slate");
  const [tagline, setTagline] = useState("DESIGN STUDIO");
  const [industry, setIndustry] = useState("Creative Studio");
  const [style, setStyle] = useState<LogoStyle>("all");
  const [mood, setMood] = useState<LogoColorMood>("auto");
  const [seed, setSeed] = useState(0);
  const [previewMode, setPreviewMode] = useState<"default" | "dark" | "icon" | "card">("default");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  const concepts = useMemo(
    () =>
      generateLogoConcepts({
        brandName,
        tagline,
        industry,
        style,
        mood,
        seed,
      }),
    [brandName, tagline, industry, style, mood, seed],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const activeConcept: LogoConcept =
    concepts.find((c) => c.id === selectedId) ?? concepts[0];

  if (!open) return null;

  const handleEdit = async (concept: LogoConcept) => {
    const page = logoConceptToDesignPage(concept);
    await onOpenInEditor(`${concept.brandName} Logo`, page);
    onClose();
  };

  const handleInsert = (concept: LogoConcept) => {
    if (!onInsertOnCanvas) return;
    const svg = renderLogoConceptSvg(concept, {
      transparent: true,
      darkMode: previewMode === "dark",
      iconOnly: previewMode === "icon",
    });
    onInsertOnCanvas(`${concept.brandName} Logo`, svgToDataUrl(svg));
    onClose();
  };

  const handleDownloadPack = async (concept: LogoConcept) => {
    setDownloadingId(concept.id);
    try {
      await downloadLogoPackZip(concept);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSaveBrand = async (concept: LogoConcept) => {
    if (!onSaveToBrandKit) return;
    const now = Date.now();
    const logos: BrandLogoItem[] = [
      {
        id: makeId("logo"),
        name: `${concept.brandName} Primary`,
        variant: "primary",
        dataUrl: svgToDataUrl(renderLogoConceptSvg(concept, { transparent: true })),
        createdAt: now,
      },
      {
        id: makeId("logo"),
        name: `${concept.brandName} Dark`,
        variant: "dark",
        dataUrl: svgToDataUrl(renderLogoConceptSvg(concept, { darkMode: true })),
        createdAt: now,
      },
      {
        id: makeId("logo"),
        name: `${concept.brandName} Icon`,
        variant: "icon",
        dataUrl: svgToDataUrl(renderLogoConceptSvg(concept, { transparent: true, iconOnly: true })),
        createdAt: now,
      },
    ];
    await onSaveToBrandKit(
      logos,
      [concept.primaryColor, concept.accentColor, concept.textColor, concept.bgColor],
      concept.fontFamily,
    );
    setSavedId(concept.id);
    setTimeout(() => setSavedId(null), 2500);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--fg)]">
              <Hexagon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[var(--fg)]">Logo Studio</h2>
              <p className="text-xs text-[var(--muted)]">
                Editable vector logos with SVG + PNG brand packs
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Logo Studio"
            title="Close (Esc)"
            className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[310px_1fr]">
          {/* Controls */}
          <div className="flex flex-col gap-4 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface-2)]/50 p-5">
            <div>
              <label className="text-xs font-semibold text-[var(--fg)]">Brand Name</label>
              <input
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g. Slate, Nova, Peak"
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--fg)]">Tagline (optional)</label>
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. DESIGN STUDIO"
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--fg)]">Industry / Keyword</label>
              <input
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Type any keyword (coffee, tech, eco…)"
                className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)]"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    onClick={() => setIndustry(ind)}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                      industry === ind
                        ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--fg)]">Logo Style</label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyle(s.id)}
                    className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                      style === s.id
                        ? "bg-[var(--fg)] text-[var(--surface)]"
                        : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--fg)]">Color Mood</label>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {MOODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMood(m.id)}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] transition cursor-pointer ${
                      mood === m.id
                        ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--fg)] font-semibold"
                        : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ background: m.dot }}
                    />
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSeed((s) => s + 1)}
              className="mt-auto flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--surface-3)] cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Shuffle Variations
            </button>
          </div>

          {/* Results Grid + Selected Action Bar */}
          <div className="flex min-h-0 flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-5 py-3">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[var(--muted)] mr-1">Preview:</span>
                {(["default", "dark", "icon", "card"] as const).map((mode) => (
                  <button
                    key={mode}
