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
