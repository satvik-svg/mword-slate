"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileDown,
  Layers,
  Moon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Type,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PagePreview } from "@/components/page-preview";
import { SlateWordmark } from "@/components/slate-logo";
import { cssFilterFromImageFilters, FILTER_PRESETS } from "@/lib/presets";
import { BUILTIN_TEMPLATES } from "@/lib/templates";
import type { ChartKind, DesignCategory, DesignPage, FilterPreset } from "@/lib/types";

type BrandTheme = {
  id: string;
  name: string;
  bg: string;
  fg: string;
  muted: string;
  accent: string;
  accent2: string;
  swatches: [string, string, string];
};

const STUDIO_THEMES: BrandTheme[] = [
  {
    id: "original",
    name: "Original",
    bg: "",
    fg: "",
    muted: "",
    accent: "",
    accent2: "",
    swatches: ["#0F172A", "#2563EB", "#E2E8F0"],
  },
  {
    id: "obsidian",
    name: "Obsidian Ink",
    bg: "#0D0D10",
    fg: "#F5F5F4",
    muted: "#A1A1AA",
    accent: "#E4E4E7",
    accent2: "#3F3F46",
    swatches: ["#0D0D10", "#E4E4E7", "#52525B"],
  },
  {
    id: "editorial",
    name: "Warm Press",
    bg: "#F5EFE6",
    fg: "#1C1917",
    muted: "#57534E",
    accent: "#C2410C",
    accent2: "#D6C7B2",
    swatches: ["#F5EFE6", "#1C1917", "#C2410C"],
  },
  {
    id: "nordic",
    name: "Nordic Slate",
    bg: "#0E1726",
    fg: "#F8FAFC",
    muted: "#94A3B8",
    accent: "#38BDF8",
    accent2: "#1E3A5F",
    swatches: ["#0E1726", "#38BDF8", "#94A3B8"],
  },
  {
    id: "forest",
    name: "Botanical",
    bg: "#11221B",
    fg: "#F4F7F4",
    muted: "#A3B8AD",
    accent: "#6EE7B7",
    accent2: "#1F3D31",
    swatches: ["#11221B", "#6EE7B7", "#A3B8AD"],
  },
];

const TYPE_PAIRINGS = [
  { id: "default", label: "Original", heading: "", body: "" },
  { id: "editorial", label: "Editorial Serif", heading: "Fraunces", body: "Inter" },
  { id: "swiss", label: "Swiss Grotesk", heading: "Space Grotesk", body: "DM Sans" },
  { id: "mono", label: "Technical Mono", heading: "JetBrains Mono", body: "Inter" },
];

const HERO_FORMATS = [
  { id: "tpl-pitch-deck", label: "Pitch Deck" },
  { id: "tpl-ig-launch", label: "Social Post" },
  { id: "tpl-infographic", label: "Data Visual" },
  { id: "tpl-poster", label: "Event Poster" },
];

const ARCHIVE_FILTERS: { id: "all" | DesignCategory; label: string }[] = [
  { id: "all", label: "All Formats" },
  { id: "presentation", label: "Decks" },
  { id: "social", label: "Social" },
  { id: "marketing", label: "Marketing" },
  { id: "document", label: "Documents" },
];

const ARCHIVE_IDS = [
  "tpl-pitch-deck",
  "tpl-ig-launch",
  "tpl-poster",
  "tpl-infographic",
  "tpl-quote-card",
  "tpl-business-card",
  "tpl-resume",
  "tpl-certificate",
];

const BRAND_KIT_SYSTEMS = [
  {
    id: "press",
    name: "Terracotta Press",
    tagline: "Editorial & Print",
    headingFont: "Fraunces",
    bodyFont: "Inter",
    bg: "#F5EFE6",
    ink: "#1C1917",
    accent: "#C2410C",
    secondary: "#E7DDD0",
    hexes: ["#1C1917", "#C2410C", "#78716C", "#F5EFE6"],
  },
  {
    id: "obsidian",
    name: "Obsidian Studio",
    tagline: "Architecture & Hardware",
    headingFont: "Inter Tight",
    bodyFont: "Inter",
    bg: "#121215",
    ink: "#F4F4F5",
    accent: "#E4E4E7",
    secondary: "#23232A",
    hexes: ["#121215", "#F4F4F5", "#71717A", "#27272A"],
  },
  {
    id: "nordic",
    name: "Nordic Marine",
    tagline: "Product & Finance",
    headingFont: "Space Grotesk",
    bodyFont: "DM Sans",
    bg: "#0F172A",
    ink: "#F8FAFC",
    accent: "#38BDF8",
    secondary: "#1E293B",
    hexes: ["#0F172A", "#38BDF8", "#94A3B8", "#F1F5F9"],
  },
  {
    id: "botanical",
    name: "Kanso Botanical",
    tagline: "Objects & Hospitality",
    headingFont: "Cormorant Garamond",
    bodyFont: "Inter",
    bg: "#13241C",
    ink: "#F3F6F4",
    accent: "#86EFAC",
    secondary: "#1E362B",
    hexes: ["#13241C", "#86EFAC", "#A3B8AD", "#E7F0EA"],
  },
];

const CHART_DATASETS: Record<
  "revenue" | "channels",
  {
    title: string;
    subtitle: string;
    lightData: { label: string; value: number; color: string }[];
    darkData: { label: string; value: number; color: string }[];
  }
> = {
  revenue: {
    title: "Quarterly ARR ($K)",
    subtitle: "Live editable data points",
    lightData: [
      { label: "Q1", value: 180, color: "#CBD5E1" },
      { label: "Q2", value: 265, color: "#94A3B8" },
      { label: "Q3", value: 390, color: "#2563EB" },
      { label: "Q4", value: 540, color: "#141417" },
    ],
    darkData: [
      { label: "Q1", value: 180, color: "#475569" },
      { label: "Q2", value: 265, color: "#94A3B8" },
      { label: "Q3", value: 390, color: "#38BDF8" },
      { label: "Q4", value: 540, color: "#F8FAFC" },
    ],
  },
  channels: {
    title: "Acquisition Mix (%)",
    subtitle: "Synced to palette swatches",
    lightData: [
      { label: "Direct", value: 42, color: "#141417" },
      { label: "Organic", value: 29, color: "#2563EB" },
      { label: "Referral", value: 18, color: "#64748B" },
      { label: "Partner", value: 11, color: "#CBD5E1" },
    ],
    darkData: [
      { label: "Direct", value: 42, color: "#F8FAFC" },
      { label: "Organic", value: 29, color: "#38BDF8" },
      { label: "Referral", value: 18, color: "#94A3B8" },
      { label: "Partner", value: 11, color: "#475569" },
    ],
  },
};

const EXPORT_TARGETS = [
  {
    ext: ".PPTX",
    title: "Editable PowerPoint",
    detail: "Preserves text boxes, charts, tables, slide order, and speaker notes.",
  },
  {
    ext: "PDF",
    title: "Print-Ready Multi-Page",
    detail: "Crisp vector typography and exact artboard dimensions for decks & posters.",
  },
  {
    ext: "PNG 2×",
    title: "Retina Raster & Cutouts",
    detail: "High-DPI social assets with optional transparent backgrounds.",
  },
  {
    ext: "SVG",
    title: "Lossless Vector",
    detail: "Clean scalable paths for logos, marks, and editorial diagrams.",
  },
];

const PHOTO_PRESETS: FilterPreset[] = ["none", "bw", "warm", "drama", "fade"];

function applyStudioMutations(
  basePage: DesignPage,
  opts: {
    theme: BrandTheme;
    typePair: (typeof TYPE_PAIRINGS)[number];
    headlineOverride: string | null;
    headlineAlign: "left" | "center" | "right" | null;
    hiddenIds: Set<string>;
  },
): DesignPage {
  const { theme, typePair, headlineOverride, headlineAlign, hiddenIds } = opts;
  const useTheme = theme.id !== "original";
  const useFont = typePair.id !== "default";

  // Find the primary (largest) text element to map headline edits
  let primaryTextId: string | null = null;
  let largestFont = -1;
  for (const el of basePage.elements) {
    if (el.type === "text" && el.fontSize > largestFont) {
      largestFont = el.fontSize;
      primaryTextId = el.id;
    }
  }

  return {
    ...basePage,
    background: useTheme ? theme.bg : basePage.background,
    backgroundGradientTo: useTheme ? undefined : basePage.backgroundGradientTo,
    elements: basePage.elements.map((el) => {
      const hidden = hiddenIds.has(el.id);

      if (el.type === "text") {
        const isPrimary = el.id === primaryTextId;
        const isHeading = isPrimary || el.fontSize >= 44;
        return {
          ...el,
          hidden,
          text: isPrimary && headlineOverride !== null ? headlineOverride : el.text,
          align: isPrimary && headlineAlign !== null ? headlineAlign : el.align,
          fontFamily: useFont ? (isHeading ? typePair.heading : typePair.body) : el.fontFamily,
          color: useTheme
            ? isPrimary
              ? theme.fg
              : el.fontSize <= 28
                ? theme.muted
                : theme.fg
            : el.color,
        };
      }

      if (el.type === "shape") {
        if (!useTheme) return { ...el, hidden };
        return {
          ...el,
          hidden,
          fill: el.shape === "pill" || el.height <= 4 ? theme.accent : theme.accent2,
          gradientTo: undefined,
        };
      }

      if (el.type === "chart") {
        if (!useTheme) return { ...el, hidden };
        return {
          ...el,
          hidden,
          accentColor: theme.accent,
          textColor: theme.fg,
          data: el.data.map((d, i) => ({
            ...d,
            color: i % 2 === 0 ? theme.accent : theme.muted,
          })),
        };
      }

      return { ...el, hidden };
    }),
  };
}

export function LandingPage() {
  const router = useRouter();
  const { login, theme, toggleTheme } = useAuth();
  const [launching, setLaunching] = useState(false);

  // Interactive Hero Workbench State
  const [selectedHeroId, setSelectedHeroId] = useState(HERO_FORMATS[0].id);
  const [pageOrderMap, setPageOrderMap] = useState<Record<string, number[]>>({});
  const [heroSlideIdx, setHeroSlideIdx] = useState(0);
  const [inspectorTab, setInspectorTab] = useState<"brand" | "type" | "layers">("brand");
  const [studioThemeId, setStudioThemeId] = useState("original");
  const [typePairId, setTypePairId] = useState("default");
  const [headlineOverride, setHeadlineOverride] = useState<string | null>(null);
  const [headlineAlign, setHeadlineAlign] = useState<"left" | "center" | "right" | null>(null);
  const [hiddenLayerIds, setHiddenLayerIds] = useState<string[]>([]);
  const [showGuides, setShowGuides] = useState(true);

  // Interactive Dark Workbench Band State
  const [brandKitId, setBrandKitId] = useState(BRAND_KIT_SYSTEMS[0].id);
  const [chartKind, setChartKind] = useState<ChartKind>("bar");
  const [chartDatasetKey, setChartDatasetKey] = useState<"revenue" | "channels">("revenue");
  const [photoPreset, setPhotoPreset] = useState<FilterPreset>("none");
  const [photoContrast, setPhotoContrast] = useState(108);
  const [exportExt, setExportExt] = useState(EXPORT_TARGETS[0].ext);

  // Editorial Format Archive State
  const [archiveFilter, setArchiveFilter] = useState<"all" | DesignCategory>("all");

  const heroTemplate =
    BUILTIN_TEMPLATES.find((t) => t.id === selectedHeroId) ?? BUILTIN_TEMPLATES[0];

  const orderedPages = useMemo(() => {
    const indices =
      pageOrderMap[heroTemplate.id] ?? heroTemplate.pages.map((_, idx) => idx);
    return indices
      .map((i) => heroTemplate.pages[i])
      .filter((p): p is DesignPage => Boolean(p));
  }, [heroTemplate, pageOrderMap]);

  const rawHeroPage = orderedPages[heroSlideIdx] ?? orderedPages[0];
  const activeStudioTheme =
    STUDIO_THEMES.find((t) => t.id === studioThemeId) ?? STUDIO_THEMES[0];
  const activeTypePair =
    TYPE_PAIRINGS.find((p) => p.id === typePairId) ?? TYPE_PAIRINGS[0];

  const hiddenSet = useMemo(() => new Set(hiddenLayerIds), [hiddenLayerIds]);

  const liveHeroPage = useMemo(
    () =>
      applyStudioMutations(rawHeroPage, {
        theme: activeStudioTheme,
        typePair: activeTypePair,
        headlineOverride,
        headlineAlign,
        hiddenIds: hiddenSet,
      }),
    [rawHeroPage, activeStudioTheme, activeTypePair, headlineOverride, headlineAlign, hiddenSet],
  );

  // Find current primary headline text for the Type inspector
  const currentPrimaryText = useMemo(() => {
    const texts = rawHeroPage.elements.filter((el) => el.type === "text");
    if (!texts.length) return null;
    return texts.reduce((a, b) => (b.fontSize > a.fontSize ? b : a));
  }, [rawHeroPage]);

  const isCustomized =
    studioThemeId !== "original" ||
    typePairId !== "default" ||
    headlineOverride !== null ||
    headlineAlign !== null ||
    hiddenLayerIds.length > 0;

  const resetWorkbench = () => {
    setStudioThemeId("original");
    setTypePairId("default");
    setHeadlineOverride(null);
    setHeadlineAlign(null);
    setHiddenLayerIds([]);
  };

  const switchHeroFormat = (id: string) => {
    setSelectedHeroId(id);
    setHeroSlideIdx(0);
    setHeadlineOverride(null);
    setHeadlineAlign(null);
    setHiddenLayerIds([]);
  };

  const moveSlide = (dir: -1 | 1) => {
    const nextIdx = heroSlideIdx + dir;
    if (nextIdx < 0 || nextIdx >= orderedPages.length) return;
    const currentOrder =
      pageOrderMap[heroTemplate.id] ?? heroTemplate.pages.map((_, idx) => idx);
    const updated = [...currentOrder];
    const [moved] = updated.splice(heroSlideIdx, 1);
    updated.splice(nextIdx, 0, moved);
    setPageOrderMap((prev) => ({ ...prev, [heroTemplate.id]: updated }));
    setHeroSlideIdx(nextIdx);
  };

  const toggleLayerVisibility = (elId: string) => {
    setHiddenLayerIds((prev) =>
      prev.includes(elId) ? prev.filter((id) => id !== elId) : [...prev, elId],
    );
  };

  // Interactive Chart Page for Craft Workbench (follows active light/dark theme)
  const liveChartPage: DesignPage = useMemo(() => {
    const ds = CHART_DATASETS[chartDatasetKey];
    const isDark = theme === "dark";
    return {
      id: "landing-chart",
      name: "Chart",
      background: isDark ? "#111115" : "#FFFFFF",
      elements: [
        {
          id: "chart-demo",
          type: "chart",
          name: ds.title,
          chartKind,
          title: ds.title,
          accentColor: isDark ? "#38BDF8" : "#2563EB",
          textColor: isDark ? "#F4F4F6" : "#111114",
          showValues: true,
          data: isDark ? ds.darkData : ds.lightData,
          x: 40,
          y: 28,
          width: 720,
          height: 364,
          rotation: 0,
          opacity: 1,
        },
      ],
    };
  }, [chartKind, chartDatasetKey, theme]);

  const activeBrandKit =
    BRAND_KIT_SYSTEMS.find((b) => b.id === brandKitId) ?? BRAND_KIT_SYSTEMS[0];

  const activePhotoFilter = useMemo(() => {
    const presetObj =
      FILTER_PRESETS.find((f) => f.id === photoPreset) ?? FILTER_PRESETS[0];
    return cssFilterFromImageFilters({
      preset: photoPreset,
      ...presetObj.values,
      contrast: Math.round((presetObj.values.contrast * photoContrast) / 100),
    });
  }, [photoPreset, photoContrast]);

  const activeExportTarget =
    EXPORT_TARGETS.find((t) => t.ext === exportExt) ?? EXPORT_TARGETS[0];

  const archiveTemplates = useMemo(() => {
    const list = ARCHIVE_IDS.map((id) =>
      BUILTIN_TEMPLATES.find((t) => t.id === id),
    ).filter((t): t is (typeof BUILTIN_TEMPLATES)[number] => Boolean(t));
    if (archiveFilter === "all") return list;
    return list.filter((t) => t.category === archiveFilter);
  }, [archiveFilter]);

  const startWorkspace = async () => {
    setLaunching(true);
    try {
      await login(false);
    } catch {
      setLaunching(false);
      router.push("/login");
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--bg)] text-[var(--fg)] selection:bg-[var(--accent)] selection:text-[var(--accent-fg)]">
      {/* Top Studio Bar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/88 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1220px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-9">
            <Link href="/" className="inline-flex items-center">
              <SlateWordmark size={24} />
            </Link>
            <nav className="hidden items-center gap-7 text-[13px] text-[var(--muted)] md:flex">
              <a href="#studio" className="transition hover:text-[var(--fg)]">
                Playground
              </a>
              <a href="#workbench" className="transition hover:text-[var(--fg)]">
                Craft
              </a>
              <a href="#formats" className="transition hover:text-[var(--fg)]">
                Formats
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "Light mode" : "Dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="rounded-md p-1.5 text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link
              href="/login"
              className="inline-flex h-8 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs font-medium text-[var(--fg)] transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]"
            >
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* ACT 1 — Editorial Hero & Live Playable Slate Studio */}
      <section id="studio" className="mx-auto max-w-[1220px] px-5 pt-12 pb-20 sm:px-8 sm:pt-16">
        {/* Asymmetric 12-Col Editorial Header */}
        <div className="grid grid-cols-1 items-end gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              <span>Visual Design Studio</span>
              <span className="h-px w-8 bg-[var(--border-strong)]" />
              <span>Browser Native</span>
            </div>
            <h1
              style={{ fontFamily: '"Inter Tight", "Plus Jakarta Sans", sans-serif' }}
              className="mt-4 text-[38px] font-semibold leading-[1.02] tracking-[-0.04em] text-[var(--fg)] sm:text-[52px] lg:text-[60px]"
            >
              Decks, graphics, and brand
              <br className="hidden sm:inline" /> systems{" "}
              <span
                style={{ fontFamily: '"Fraunces", Georgia, serif' }}
                className="font-normal italic tracking-[-0.025em]"
              >
                — in one studio.
              </span>
            </h1>
          </div>

          <div className="flex flex-col justify-end lg:col-span-4 lg:pb-1">
            <p className="text-[14px] leading-relaxed text-[var(--muted)]">
              Edit PowerPoint decks, style live charts, grade photography, and restyle every page
              from a shared brand kit. Try the live canvas below.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void startWorkspace()}
                disabled={launching}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--accent)] px-5 text-[13px] font-medium text-[var(--accent-fg)] transition hover:opacity-90 disabled:opacity-60 cursor-pointer"
              >
                <span>{launching ? "Opening…" : "Start designing"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <a
                href="#formats"
                className="inline-flex h-10 items-center px-2 text-[13px] font-medium text-[var(--muted)] transition hover:text-[var(--fg)]"
              >
                Browse formats
              </a>
            </div>
          </div>
        </div>

        {/* PLAYABLE MINI SLATE WORKBENCH */}
        <div className="mt-11 overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-[var(--surface)] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.22)]">
          {/* Top Application Chrome */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="truncate text-xs font-semibold text-[var(--fg)]">
                {heroTemplate.title}
              </span>
              <span className="hidden rounded border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--muted)] sm:inline">
                {heroTemplate.width} × {heroTemplate.height}
              </span>
            </div>

            {/* Format Tabs */}
            <div className="flex items-center gap-0.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-0.5">
              {HERO_FORMATS.map((fmt) => {
                const active = fmt.id === selectedHeroId;
                return (
                  <button
                    key={fmt.id}
                    type="button"
                    onClick={() => switchHeroFormat(fmt.id)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                      active
                        ? "bg-[var(--surface)] text-[var(--fg)] shadow-2xs"
                        : "text-[var(--muted)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {fmt.label}
                  </button>
                );
              })}
            </div>

            {/* Quick Brand Swatches & Reset */}
            <div className="hidden items-center gap-2.5 md:flex">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                Restyle
              </span>
              <div className="flex items-center gap-1.5">
                {STUDIO_THEMES.map((t) => {
                  const active = t.id === studioThemeId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      title={t.name}
                      aria-label={`Apply ${t.name} palette`}
                      onClick={() => setStudioThemeId(t.id)}
                      className={`flex h-5 w-5 items-center justify-center rounded-full border transition cursor-pointer ${
                        active
                          ? "scale-110 border-[var(--focus)] ring-2 ring-[var(--focus)]/30"
                          : "border-[var(--border-strong)] hover:scale-105"
                      }`}
                      style={{
                        background: `linear-gradient(135deg, ${t.swatches[0]} 50%, ${t.swatches[1]} 50%)`,
                      }}
                    />
                  );
                })}
              </div>
              {isCustomized && (
                <button
                  type="button"
                  onClick={resetWorkbench}
                  title="Reset canvas"
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2 py-0.5 text-[10px] font-medium text-[var(--muted)] transition hover:text-[var(--fg)] cursor-pointer"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* 3-Pane Studio Workspace */}
          <div className="grid grid-cols-1 lg:grid-cols-[48px_1fr_264px]">
            {/* Left Slim Tool Rail */}
            <div className="hidden flex-col items-center justify-between border-r border-[var(--border)] bg-[var(--surface)] py-3 lg:flex">
              <div className="flex flex-col items-center gap-1.5">
                {[
                  { id: "brand" as const, icon: Palette, label: "Brand & Type" },
                  { id: "type" as const, icon: Type, label: "Edit Copy" },
                  { id: "layers" as const, icon: Layers, label: "Layers" },
                ].map((tool) => {
                  const Icon = tool.icon;
                  const active = inspectorTab === tool.id;
                  return (
                    <button
                      key={tool.id}
                      type="button"
                      onClick={() => setInspectorTab(tool.id)}
                      title={tool.label}
                      aria-label={tool.label}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer ${
                        active
                          ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                          : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setShowGuides((v) => !v)}
                title={showGuides ? "Hide selection guides" : "Show selection guides"}
                aria-label="Toggle canvas guides"
                className={`rounded-md px-1.5 py-1 font-mono text-[9px] uppercase transition cursor-pointer ${
                  showGuides
                    ? "bg-[var(--surface-2)] text-[var(--fg)]"
                    : "text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                PX
              </button>
            </div>

            {/* Center Drafting Stage with Rulers & Live Canvas */}
            <div className="relative flex min-h-[340px] flex-col bg-[var(--stage)] sm:min-h-[456px]">
              {/* Top Ruler Strip */}
              <div className="hidden h-5 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/75 px-6 font-mono text-[9px] text-[var(--muted)] studio-ruler-x sm:flex">
                <span>0</span>
                <span>480</span>
                <span>960</span>
                <span>1440</span>
                <span>{heroTemplate.width}</span>
              </div>

              <div className="relative flex flex-1 items-center justify-center studio-dots px-5 py-9 sm:px-10">
                {/* Left Vertical Ruler Strip */}
                <div className="pointer-events-none absolute top-0 bottom-0 left-0 hidden w-4 border-r border-[var(--border)] bg-[var(--surface)]/65 studio-ruler-y sm:block" />

                {/* Multi-Slide Prev / Next Arrows */}
                {orderedPages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setHeroSlideIdx((i) => (i - 1 + orderedPages.length) % orderedPages.length)
                      }
                      aria-label="Previous slide"
                      className="absolute left-6 z-20 hidden h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]/90 text-[var(--fg)] shadow-xs transition hover:scale-105 sm:flex cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroSlideIdx((i) => (i + 1) % orderedPages.length)}
                      aria-label="Next slide"
                      className="absolute right-4 z-20 hidden h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)]/90 text-[var(--fg)] shadow-xs transition hover:scale-105 sm:flex cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}

                {/* Live Rendered Artboard + Precision Selection Chrome */}
                <div className="relative">
                  <div
                    className={`relative rounded-[4px] transition ${
                      showGuides ? "ring-1 ring-[var(--focus)]" : "ring-1 ring-black/10"
                    }`}
                  >
                    <PagePreview
                      page={liveHeroPage}
                      width={heroTemplate.width}
                      height={heroTemplate.height}
                      maxWidth={680}
                      maxHeight={364}
                      className="rounded-[4px] shadow-[0_24px_48px_-16px_rgba(0,0,0,0.35)]"
                    />

                    {/* Crisp Vector Corner Handles */}
                    {showGuides && (
                      <>
                        <span className="pointer-events-none absolute -top-1 -left-1 h-2 w-2 rounded-[1px] border border-[var(--focus)] bg-white" />
                        <span className="pointer-events-none absolute -top-1 -right-1 h-2 w-2 rounded-[1px] border border-[var(--focus)] bg-white" />
                        <span className="pointer-events-none absolute -bottom-1 -left-1 h-2 w-2 rounded-[1px] border border-[var(--focus)] bg-white" />
                        <span className="pointer-events-none absolute -bottom-1 -right-1 h-2 w-2 rounded-[1px] border border-[var(--focus)] bg-white" />
                        <span className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 rounded bg-[var(--focus)] px-1.5 py-0.5 font-mono text-[9px] font-medium text-white shadow-xs">
                          {heroTemplate.width} × {heroTemplate.height}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Live Interactive Inspector */}
            <aside className="flex flex-col border-t border-[var(--border)] bg-[var(--surface)] lg:border-t-0 lg:border-l">
              {/* Mobile/Desktop Inspector Tabs */}
              <div className="grid grid-cols-3 border-b border-[var(--border)] text-[11px] font-medium">
                {[
                  { id: "brand" as const, label: "Brand" },
                  { id: "type" as const, label: "Type" },
                  { id: "layers" as const, label: "Layers" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setInspectorTab(tab.id)}
                    className={`border-b-2 py-2.5 text-center transition cursor-pointer ${
                      inspectorTab === tab.id
                        ? "border-[var(--fg)] text-[var(--fg)]"
                        : "border-transparent text-[var(--muted)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 space-y-5 p-4 text-xs">
                {inspectorTab === "brand" && (
                  <>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                          Palette Restyle
                        </span>
                        <span className="font-mono text-[10px] text-[var(--muted)]">1-click</span>
                      </div>
                      <div className="mt-2.5 space-y-1.5">
                        {STUDIO_THEMES.map((t) => {
                          const active = t.id === studioThemeId;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => setStudioThemeId(t.id)}
                              className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left transition cursor-pointer ${
                                active
                                  ? "border-[var(--fg)] bg-[var(--surface-2)] text-[var(--fg)]"
                                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                              }`}
                            >
                              <span className="text-[11px] font-medium">{t.name}</span>
                              <span className="flex items-center gap-1">
                                {t.swatches.map((hex, i) => (
                                  <span
                                    key={i}
                                    className="h-3 w-3 rounded-full border border-black/15"
                                    style={{ backgroundColor: hex }}
                                  />
                                ))}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="border-t border-[var(--border)] pt-4">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                        Font Pairing
                      </span>
                      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
                        {TYPE_PAIRINGS.map((pair) => {
                          const active = pair.id === typePairId;
                          return (
                            <button
                              key={pair.id}
                              type="button"
                              onClick={() => setTypePairId(pair.id)}
                              className={`rounded-lg border px-2.5 py-2 text-left transition cursor-pointer ${
                                active
                                  ? "border-[var(--fg)] bg-[var(--surface-2)] text-[var(--fg)]"
                                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                              }`}
                            >
                              <div
                                style={pair.heading ? { fontFamily: pair.heading } : undefined}
                                className="text-[13px] font-semibold leading-tight text-[var(--fg)]"
                              >
                                Aa
                              </div>
                              <div className="mt-0.5 truncate text-[10px]">{pair.label}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {inspectorTab === "type" && (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="hero-headline-edit"
                        className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]"
                      >
                        Live Headline Copy
                      </label>
                      <textarea
                        id="hero-headline-edit"
                        rows={3}
                        value={
                          headlineOverride !== null
                            ? headlineOverride
                            : currentPrimaryText?.text ?? ""
                        }
                        onChange={(e) => setHeadlineOverride(e.target.value)}
                        placeholder="Type directly onto the slide…"
                        className="mt-2 w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2 text-xs leading-relaxed text-[var(--fg)] outline-none focus:border-[var(--focus)]"
                      />
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                        Alignment
                      </span>
                      <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] p-1">
                        {(
                          [
                            { id: "left", icon: AlignLeft },
                            { id: "center", icon: AlignCenter },
                            { id: "right", icon: AlignRight },
                          ] as const
                        ).map((item) => {
                          const Icon = item.icon;
                          const active =
                            (headlineAlign ?? currentPrimaryText?.align ?? "left") === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => setHeadlineAlign(item.id)}
                              aria-label={`Align ${item.id}`}
                              className={`flex h-7 items-center justify-center rounded-md transition cursor-pointer ${
                                active
                                  ? "bg-[var(--surface)] text-[var(--fg)] shadow-2xs"
                                  : "text-[var(--muted)] hover:text-[var(--fg)]"
                              }`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-[11px] leading-relaxed text-[var(--muted)]">
                      Every text block, chart, and vector shape in Slate edits directly on canvas
                      with full undo history.
                    </p>
                  </div>
                )}

                {inspectorTab === "layers" && (
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                        Artboard Layers
                      </span>
                      <span className="font-mono text-[10px] text-[var(--muted)]">
                        {rawHeroPage.elements.length}
                      </span>
                    </div>
                    <div className="mt-2.5 max-h-[270px] space-y-1 overflow-y-auto pr-0.5">
                      {[...rawHeroPage.elements].reverse().map((el) => {
                        const isHidden = hiddenSet.has(el.id);
                        return (
                          <button
                            key={el.id}
                            type="button"
                            onClick={() => toggleLayerVisibility(el.id)}
                            className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left transition cursor-pointer ${
                              isHidden
                                ? "border-transparent bg-[var(--surface-2)]/50 text-[var(--muted)] opacity-55"
                                : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg)] hover:border-[var(--border-strong)]"
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="truncate text-[11px] font-medium">
                                {el.name || el.type}
                              </div>
                              <div className="font-mono text-[9px] uppercase text-[var(--muted)]">
                                {el.type}
                              </div>
                            </div>
                            {isHidden ? (
                              <EyeOff className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                            ) : (
                              <Eye className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>

          {/* Bottom Canva-Style Filmstrip & Slide Reorder Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
            <div className="flex items-center gap-2 overflow-x-auto">
              {orderedPages.map((p, idx) => {
                const thumbPage = applyStudioMutations(p, {
                  theme: activeStudioTheme,
                  typePair: activeTypePair,
                  headlineOverride: idx === heroSlideIdx ? headlineOverride : null,
                  headlineAlign: idx === heroSlideIdx ? headlineAlign : null,
                  hiddenIds: idx === heroSlideIdx ? hiddenSet : new Set(),
                });
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setHeroSlideIdx(idx);
                      setHeadlineOverride(null);
                      setHeadlineAlign(null);
                      setHiddenLayerIds([]);
                    }}
                    title={`Slide ${idx + 1}: ${p.name}`}
                    className={`relative shrink-0 overflow-hidden rounded border transition cursor-pointer ${
                      idx === heroSlideIdx
                        ? "border-[var(--focus)] ring-1 ring-[var(--focus)]"
                        : "border-[var(--border-strong)] opacity-70 hover:opacity-100"
                    }`}
                  >
                    <PagePreview
                      page={thumbPage}
                      width={heroTemplate.width}
                      height={heroTemplate.height}
                      maxWidth={72}
                      maxHeight={40}
                      className="pointer-events-none"
                    />
                    <span className="pointer-events-none absolute bottom-0.5 left-0.5 rounded bg-black/70 px-1 font-mono text-[8px] font-semibold text-white">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}

              {orderedPages.length > 1 && (
                <div className="ml-1 flex items-center gap-1 border-l border-[var(--border)] pl-2.5">
                  <button
                    type="button"
                    onClick={() => moveSlide(-1)}
                    disabled={heroSlideIdx === 0}
                    title="Move slide left"
                    aria-label="Move slide left"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--fg)] disabled:opacity-35 cursor-pointer"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSlide(1)}
                    disabled={heroSlideIdx === orderedPages.length - 1}
                    title="Move slide right"
                    aria-label="Move slide right"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--fg)] disabled:opacity-35 cursor-pointer"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 text-[11px] text-[var(--muted)]">
              <span className="font-mono">
                Slide {heroSlideIdx + 1} / {orderedPages.length}
              </span>
              <button
                type="button"
                onClick={() => void startWorkspace()}
                className="inline-flex items-center gap-1 font-medium text-[var(--fg)] transition hover:opacity-75 cursor-pointer"
              >
                Open full editor
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ACT 2 — Interactive Craft Workbench (Theme-Aware) */}
      <section
        id="workbench"
        className="border-y border-[var(--border)] bg-[var(--surface)] py-20 text-[var(--fg)] sm:py-24"
      >
        <div className="mx-auto max-w-[1220px] px-5 sm:px-8">
          <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
                Studio Craft
              </div>
              <h2
                style={{ fontFamily: '"Inter Tight", "Plus Jakarta Sans", sans-serif' }}
                className="mt-3 text-3xl font-semibold leading-[1.04] tracking-[-0.035em] text-[var(--fg)] sm:text-[42px]"
              >
                Four dedicated engines,{" "}
                <span
                  style={{ fontFamily: '"Fraunces", Georgia, serif' }}
                  className="font-normal italic"
                >
                  zero tab-switching.
                </span>
              </h2>
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--muted)] lg:col-span-5 lg:pb-1">
              Brand systems, live data charts, non-destructive photo grading, and native PowerPoint
              round-tripping all share the same fast canvas.
            </p>
          </div>

          {/* 12-Col Architectural Hairline Grid */}
          <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] lg:grid-cols-12">
            {/* Panel 1 (7 cols): Live Brand Kit System */}
            <div className="flex flex-col justify-between bg-[var(--surface)] p-6 sm:p-8 lg:col-span-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    <Palette className="h-3.5 w-3.5" />
                    <span>01 · Shared Brand Kit</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--fg)]">
                    Upload custom fonts & restyle entire decks in one click.
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {BRAND_KIT_SYSTEMS.map((sys) => (
                    <button
                      key={sys.id}
                      type="button"
                      onClick={() => setBrandKitId(sys.id)}
                      className={`rounded-md border px-2.5 py-1 text-[11px] font-medium transition cursor-pointer ${
                        sys.id === brandKitId
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                          : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                      }`}
                    >
                      {sys.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Live Specimen Card */}
              <div
                className="mt-6 rounded-xl border border-[var(--border)] p-6 transition-colors duration-300"
                style={{ backgroundColor: activeBrandKit.bg, color: activeBrandKit.ink }}
              >
                <div className="flex items-center justify-between gap-4">
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.14em]"
                    style={{ color: activeBrandKit.accent }}
                  >
                    {activeBrandKit.tagline}
                  </span>
                  <span className="font-mono text-[10px] opacity-65">
                    {activeBrandKit.headingFont} + {activeBrandKit.bodyFont}
                  </span>
                </div>

                <div
                  style={{ fontFamily: activeBrandKit.headingFont }}
                  className="mt-4 text-3xl font-semibold leading-[1.08] tracking-[-0.025em] sm:text-4xl"
                >
                  Consistent brand craft across every slide.
                </div>

                <div className="mt-6 grid grid-cols-4 gap-2.5">
                  {activeBrandKit.hexes.map((hex) => (
                    <div key={hex} className="space-y-1.5">
                      <div
                        className="h-10 rounded-md border border-black/15 shadow-inner"
                        style={{ backgroundColor: hex }}
                      />
                      <div className="font-mono text-[10px] opacity-75">{hex}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Panel 2 (5 cols): Live Editable Charts */}
            <div className="flex flex-col justify-between bg-[var(--surface)] p-6 sm:p-8 lg:col-span-5">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span>02 · Live Charts</span>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-0.5 text-[10px]">
                    {(["bar", "line", "donut"] as const).map((kind) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setChartKind(kind)}
                        className={`rounded px-2 py-0.5 capitalize transition cursor-pointer ${
                          chartKind === kind
                            ? "bg-[var(--surface)] text-[var(--fg)] font-semibold shadow-2xs"
                            : "text-[var(--muted)] hover:text-[var(--fg)]"
                        }`}
                      >
                        {kind}
                      </button>
                    ))}
                  </div>
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--fg)]">
                  Data visuals that stay editable on the slide.
                </h3>
              </div>

              <div className="mt-5 flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                <PagePreview
                  page={liveChartPage}
                  width={800}
                  height={420}
                  maxWidth={410}
                  maxHeight={216}
                  className="rounded-md border border-[var(--border)]"
                />
                <div className="mt-3 flex w-full items-center justify-between border-t border-[var(--border)] pt-2.5 text-[11px]">
                  <span className="font-mono text-[10px] text-[var(--muted)]">Dataset</span>
                  <div className="flex gap-1.5">
                    {(
                      [
                        { id: "revenue", label: "Quarterly ARR" },
                        { id: "channels", label: "Channel Mix" },
                      ] as const
                    ).map((ds) => (
                      <button
                        key={ds.id}
                        type="button"
                        onClick={() => setChartDatasetKey(ds.id)}
                        className={`rounded px-2 py-0.5 text-[10px] font-medium transition cursor-pointer ${
                          chartDatasetKey === ds.id
                            ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                            : "text-[var(--muted)] hover:text-[var(--fg)]"
                        }`}
                      >
                        {ds.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Panel 3 (5 cols): Browser Photo Grading & Filters */}
            <div className="flex flex-col justify-between bg-[var(--surface)] p-6 sm:p-8 lg:col-span-5">
              <div>
                <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  <span>03 · Photo Studio</span>
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--fg)]">
                  Color grade, crop masks, and cutouts locally.
                </h3>
              </div>

              {/* Architectural Sunlit Composition Plate with Live Filter Pipeline */}
              <div className="mt-5 space-y-3">
                <div className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--stage)]">
                  <svg
                    viewBox="0 0 640 340"
                    className="block h-44 w-full object-cover transition-all duration-200"
                    style={{ filter: activePhotoFilter }}
                    aria-label="Architectural light study preview"
                  >
                    <defs>
                      <linearGradient id="skyWarm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1E3A5F" />
                        <stop offset="55%" stopColor="#4A6B8A" />
                        <stop offset="100%" stopColor="#D8B89C" />
                      </linearGradient>
                      <linearGradient id="wallSun" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#E9DFD1" />
                        <stop offset="100%" stopColor="#C4AD93" />
                      </linearGradient>
                      <linearGradient id="terracotta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C96442" />
                        <stop offset="100%" stopColor="#7C3420" />
                      </linearGradient>
                    </defs>
                    <rect width="640" height="340" fill="url(#skyWarm)" />
                    <circle cx="490" cy="96" r="46" fill="#F8E7CE" opacity="0.92" />
                    <rect x="44" y="88" width="290" height="252" fill="url(#wallSun)" />
                    <path d="M110 340 V192 A68 68 0 0 1 246 192 V340 Z" fill="#182230" />
                    <path
                      d="M210 340 V192 A68 68 0 0 0 162 128 A68 68 0 0 1 246 192 V340 Z"
                      fill="#A3876A"
                      opacity="0.55"
                    />
                    <rect x="292" y="168" width="220" height="172" fill="url(#terracotta)" />
                    <polygon points="292,168 512,168 512,248 292,290" fill="#F6D7B0" opacity="0.22" />
                    <rect x="0" y="302" width="640" height="38" fill="#1C1917" opacity="0.72" />
                  </svg>
                  <div className="pointer-events-none absolute top-2.5 right-2.5 rounded bg-black/65 px-2 py-0.5 font-mono text-[10px] text-white/90 backdrop-blur-xs">
                    {FILTER_PRESETS.find((p) => p.id === photoPreset)?.label} · {photoContrast}%
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {PHOTO_PRESETS.map((id) => {
                    const preset = FILTER_PRESETS.find((f) => f.id === id);
                    if (!preset) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setPhotoPreset(id)}
                        className={`rounded-md border px-2 py-1 text-[10px] font-medium transition cursor-pointer ${
                          photoPreset === id
                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                            : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                    Contrast
                  </span>
                  <input
                    type="range"
                    min={70}
                    max={150}
                    value={photoContrast}
                    onChange={(e) => setPhotoContrast(Number(e.target.value))}
                    aria-label="Photo contrast"
                    className="h-1 flex-1 accent-[var(--fg)] cursor-pointer"
                  />
                  <span className="w-9 text-right font-mono text-[10px] text-[var(--fg)]">
                    {photoContrast}%
                  </span>
                </div>
              </div>
            </div>

            {/* Panel 4 (7 cols): Native .pptx & Multi-Format Export */}
            <div className="flex flex-col justify-between bg-[var(--surface)] p-6 sm:p-8 lg:col-span-7">
              <div>
                <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">
                  <FileDown className="h-3.5 w-3.5" />
                  <span>04 · Native .PPTX & Export</span>
                </div>
                <h3 className="mt-2 text-lg font-semibold tracking-[-0.02em] text-[var(--fg)]">
                  Import PowerPoint decks intact. Export cleanly anywhere.
                </h3>
                <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
                  Drop an existing `.pptx` file into Slate to edit layouts, drag slides into a new
                  sequence, rehearse with speaker notes, and export back without broken formatting.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                {/* Export Target Selector */}
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {EXPORT_TARGETS.map((target) => {
                    const active = target.ext === exportExt;
                    return (
                      <button
                        key={target.ext}
                        type="button"
                        onClick={() => setExportExt(target.ext)}
                        className={`rounded-xl border p-3 text-left transition cursor-pointer ${
                          active
                            ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                            : "border-[var(--border)] bg-[var(--bg)] text-[var(--fg)] hover:border-[var(--border-strong)]"
                        }`}
                      >
                        <div className="font-mono text-xs font-semibold">{target.ext}</div>
                        <div
                          className={`mt-1 text-[11px] ${
                            active ? "opacity-80" : "text-[var(--muted)]"
                          }`}
                        >
                          {target.title}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Spec Readout Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3.5">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      Export specification · {activeExportTarget.ext}
                    </div>
                    <div className="mt-1 text-xs text-[var(--fg)]">{activeExportTarget.detail}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void startWorkspace()}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--fg)] transition hover:bg-[var(--accent)] hover:text-[var(--accent-fg)] cursor-pointer"
                  >
                    Import .pptx
                    <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ACT 3 — Curated Editorial Format Archive */}
      <section id="formats" className="mx-auto max-w-[1220px] px-5 py-20 sm:px-8 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Format Archive
            </div>
            <h2
              style={{ fontFamily: '"Inter Tight", "Plus Jakarta Sans", sans-serif' }}
              className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-[var(--fg)] sm:text-[40px]"
            >
              Start from real{" "}
              <span
                style={{ fontFamily: '"Fraunces", Georgia, serif' }}
                className="font-normal italic"
              >
                production layouts.
              </span>
            </h2>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
            {ARCHIVE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setArchiveFilter(f.id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition cursor-pointer ${
                  archiveFilter === f.id
                    ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                    : "text-[var(--muted)] hover:text-[var(--fg)]"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Asymmetric Editorial Grid */}
        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {archiveTemplates.map((tpl, idx) => {
            const featured = archiveFilter === "all" && idx === 0;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => void startWorkspace()}
                className={`group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] text-left transition duration-200 hover:border-[var(--border-strong)] hover:shadow-[0_18px_40px_-24px_rgba(0,0,0,0.22)] cursor-pointer ${
                  featured ? "sm:col-span-2" : ""
                }`}
              >
                <div
                  className={`flex items-center justify-center bg-[var(--stage)] studio-dots p-6 ${
                    featured ? "h-64 sm:h-72" : "h-56"
                  }`}
                >
                  {tpl.pages[0] && (
                    <PagePreview
                      page={tpl.pages[0]}
                      width={tpl.width}
                      height={tpl.height}
                      maxWidth={featured ? 460 : 250}
                      maxHeight={featured ? 236 : 182}
                      className="rounded-[4px] shadow-md ring-1 ring-black/10 transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-xl"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold tracking-[-0.01em] text-[var(--fg)]">
                      {tpl.title}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      <span>
                        {tpl.width} × {tpl.height}
                      </span>
                      {tpl.pages.length > 1 && (
                        <>
                          <span>·</span>
                          <span>{tpl.pages.length} slides</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition group-hover:border-[var(--fg)] group-hover:bg-[var(--fg)] group-hover:text-[var(--surface)]">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ACT 4 — Confident Editorial Closing & Minimal Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-[1220px] flex-col items-start justify-between gap-6 px-5 py-14 sm:flex-row sm:items-end sm:px-8">
          <div>
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Ready in the browser
            </div>
            <h2
              style={{ fontFamily: '"Inter Tight", "Plus Jakarta Sans", sans-serif' }}
              className="mt-2 text-3xl font-semibold leading-[1.06] tracking-[-0.035em] text-[var(--fg)] sm:text-4xl"
            >
              Open Slate for your next{" "}
              <span
                style={{ fontFamily: '"Fraunces", Georgia, serif' }}
                className="font-normal italic"
              >
                deck or launch.
              </span>
            </h2>
          </div>

          <button
            type="button"
            onClick={() => void startWorkspace()}
            disabled={launching}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--accent)] px-6 text-[13px] font-medium text-[var(--accent-fg)] transition hover:opacity-90 disabled:opacity-60 cursor-pointer"
          >
            <span>{launching ? "Opening…" : "Open Slate"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="border-t border-[var(--border)]">
          <div className="mx-auto flex max-w-[1220px] flex-wrap items-center justify-between gap-4 px-5 py-4 text-[11px] text-[var(--muted)] sm:px-8">
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-[var(--fg)]">Slate</span>
              <span>·</span>
              <span>Visual Design Studio</span>
            </div>
            <div className="flex items-center gap-5">
              <a href="#studio" className="transition hover:text-[var(--fg)]">
                Playground
              </a>
              <a href="#workbench" className="transition hover:text-[var(--fg)]">
                Craft
              </a>
              <a href="#formats" className="transition hover:text-[var(--fg)]">
                Formats
              </a>
              <Link href="/login" className="font-medium text-[var(--fg)] transition hover:opacity-75">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
