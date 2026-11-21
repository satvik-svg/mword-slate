"use client";

import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookmarkPlus,
  Check,
  Crop,
  Eraser,
  Eye,
  EyeOff,
  FileUp,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  Lock,
  Palette,
  Pencil,
  PenTool,
  Plus,
  QrCode,
  Scissors,
  Search,
  Shapes,
  Shuffle,
  Table as TableIcon,
  Trash2,
  Type,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import { PagePreview } from "@/components/page-preview";
import { isLightColor } from "@/lib/brand-style";
import {
  cleanFontNameFromFile,
  fontFormatFromFile,
  loadCustomFont,
  readFontFileAsDataUrl,
} from "@/lib/custom-fonts";
import { VECTOR_ICONS } from "@/lib/icons";
import { makeId } from "@/lib/id";
import { applyCropToImage, loadImage, readImageFileOptimized, removeBackgroundInBrowser } from "@/lib/photo-tools";
import { FILTER_PRESETS, FONT_PAIRINGS, GOOGLE_FONTS, SWATCH_PALETTES } from "@/lib/presets";
import { BUILTIN_TEMPLATES, instantiateTemplate } from "@/lib/templates";
import {
  DEFAULT_IMAGE_FILTERS,
  type BrandKit,
  type CanvasElement,
  type ChartKind,
  type CustomFontItem,
  type DesignPage,
  type FrameMask,
  type ImageElement,
  type MediaAsset,
  type ShapeKind,
  type TemplateRecord,
} from "@/lib/types";

export type RailTab =
  | "templates"
  | "elements"
  | "text"
  | "uploads"
  | "photo"
  | "draw"
  | "brand"
  | "layers";

const SHAPE_LIST: { kind: ShapeKind; label: string }[] = [
  { kind: "rect", label: "Rectangle" },
  { kind: "circle", label: "Circle" },
  { kind: "line", label: "Line" },
  { kind: "arrow", label: "Arrow" },
  { kind: "triangle", label: "Triangle" },
  { kind: "star", label: "Star" },
  { kind: "pill", label: "Pill" },
  { kind: "diamond", label: "Diamond" },
  { kind: "pentagon", label: "Pentagon" },
  { kind: "hexagon", label: "Hexagon" },
  { kind: "bubble", label: "Speech" },
  { kind: "blob", label: "Blob" },
];

function ShapeThumb({ kind }: { kind: ShapeKind }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--fg)]/80">
      {kind === "rect" && <rect x="3" y="5" width="18" height="14" rx="2.5" />}
      {kind === "circle" && <circle cx="12" cy="12" r="8.5" />}
      {kind === "pill" && <rect x="2.5" y="7" width="19" height="10" rx="5" />}
      {kind === "triangle" && <polygon points="12,3.5 21,19.5 3,19.5" />}
      {kind === "diamond" && <polygon points="12,2.5 21.5,12 12,21.5 2.5,12" />}
      {kind === "pentagon" && <polygon points="12,2.5 21,9.2 17.6,20 6.4,20 3,9.2" />}
      {kind === "hexagon" && <polygon points="7,3.5 17,3.5 21.5,12 17,20.5 7,20.5 2.5,12" />}
      {kind === "star" && (
        <polygon points="12,2.5 14.9,8.6 21.5,9.5 16.7,14.1 17.9,20.7 12,17.5 6.1,20.7 7.3,14.1 2.5,9.5 9.1,8.6" />
      )}
      {kind === "arrow" && (
        <path d="M3 10h11V6l7 6-7 6v-4H3z" />
      )}
      {kind === "bubble" && (
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8A2.5 2.5 0 0 1 17.5 16H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5v-8z" />
      )}
      {kind === "blob" && (
        <path d="M12.6 3.2c3.5-.3 7.1 2 8 5.4.8 3.2-.6 6.8-3.1 9-2.4 2.1-6 3-9.1 1.7-3.1-1.3-5.6-4.7-5.3-8.1.3-3.5 3.3-6.1 6.6-7.3.9-.4 1.9-.6 2.9-.7z" />
      )}
      {kind === "line" && (
        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      )}
    </svg>
  );
}

function ChartThumb({ kind }: { kind: ChartKind }) {
  if (kind === "bar") {
    return <BarChart3 className="h-4 w-4 text-[var(--muted)]" />;
  }
  if (kind === "line") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted)]">
        <path d="M3 3v18h18" />
        <path d="m7 15 4-4 3 3 5-6" />
      </svg>
    );
  }
  if (kind === "pie") {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted)]">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
        <path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--muted)]">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 3v4.5" />
      <path d="M16.5 12H21" />
    </svg>
  );
}

const MASKS: { id: FrameMask; label: string }[] = [
  { id: "none", label: "None" },
  { id: "rounded", label: "Rounded" },
  { id: "circle", label: "Circle" },
  { id: "arch", label: "Arch" },
  { id: "hexagon", label: "Hexagon" },
  { id: "star", label: "Star" },
  { id: "blob", label: "Blob" },
  { id: "phone", label: "Phone" },
  { id: "laptop", label: "Laptop" },
];

export function LeftRail({
  activeTab,
  onTabChange,
  width,
  height,
  page,
  selectedElement,
  selectedIds,
  onSelect,
  onAddElement,
  onUpdateElement,
  onDeleteElements,
  onReorderLayer,
  onApplyTemplate,
  teamTemplates,
  onSaveAsTeamTemplate,
  media,
  onUploadMedia,
  onDeleteMedia,
  onImportPptx,
  brandKit,
  pageCount,
  onUpdateBrandKit,
  onApplyBrandStyle,
  onApplySwatchColor,
  onApplyBrandFont,
  drawTool,
  onChangeDrawTool,
}: {
  activeTab: RailTab | null;
  onTabChange: (tab: RailTab | null) => void;
  width: number;
  height: number;
  page: DesignPage;
  selectedElement: CanvasElement | null;
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  onAddElement: (el: CanvasElement) => void;
  onUpdateElement: (id: string, patch: Partial<CanvasElement>, commit?: boolean) => void;
  onDeleteElements: (ids: string[]) => void;
  onReorderLayer: (id: string, direction: "up" | "down") => void;
  onApplyTemplate: (pages: DesignPage[], width: number, height: number) => void;
  teamTemplates: TemplateRecord[];
  onSaveAsTeamTemplate: () => Promise<void> | void;
  media: MediaAsset[];
  onUploadMedia: (asset: {
    name: string;
    mimeType: string;
    dataUrl: string;
    width: number;
    height: number;
    sizeBytes: number;
  }) => Promise<MediaAsset | null>;
  onDeleteMedia: (id: string) => void;
  onImportPptx: (file: File) => Promise<void>;
  brandKit: BrandKit;
  pageCount: number;
  onUpdateBrandKit: (
    next: BrandKit,
    opts?: { immediate?: boolean; toast?: string },
  ) => Promise<void> | void;
  onApplyBrandStyle: (opts?: {
    mode?: "all" | "colors" | "fonts";
    scope?: "page" | "deck";
    colors?: string[];
    label?: string;
  }) => void;
  onApplySwatchColor: (color: string) => void;
  onApplyBrandFont: (font: string) => boolean;
  drawTool: {
    active: boolean;
    brush: "pen" | "marker" | "highlighter";
    color: string;
    strokeWidth: number;
  };
  onChangeDrawTool: (next: {
    active: boolean;
    brush: "pen" | "marker" | "highlighter";
    color: string;
    strokeWidth: number;
  }) => void;
}) {
  const [iconQuery, setIconQuery] = useState("");
  const [elemCat, setElemCat] = useState<"all" | "shapes" | "charts" | "icons" | "qr">("all");
  const [tplFilter, setTplFilter] = useState<string>("all");
  const [qrInput, setQrInput] = useState("https://example.com");
  const [uploading, setUploading] = useState(false);
  const [bgTolerance, setBgTolerance] = useState(36);
  const [bgBusy, setBgBusy] = useState(false);
  const [editingBrand, setEditingBrand] = useState(false);
  const [applyScope, setApplyScope] = useState<"page" | "deck">("page");
  const [googleFontInput, setGoogleFontInput] = useState("");
  const [fontBusy, setFontBusy] = useState(false);
  const [fontStatus, setFontStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pptxRef = useRef<HTMLInputElement>(null);
  const brandLogoRef = useRef<HTMLInputElement>(null);
  const fontFileRef = useRef<HTMLInputElement>(null);

  const hasSelectedText = page.elements.some(
    (el) => selectedIds.includes(el.id) && !el.locked && (el.type === "text" || el.type === "table"),
  );
  const hasColorableSelection = page.elements.some(
    (el) => selectedIds.includes(el.id) && !el.locked && el.type !== "image",
  );

  const handleUploadFontFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFontStatus(null);
    if (file.size > 2 * 1024 * 1024) {
      setFontStatus({ ok: false, msg: "Font file must be under 2 MB." });
      e.target.value = "";
      return;
    }
    setFontBusy(true);
    try {
      const dataUrl = await readFontFileAsDataUrl(file);
      const name = cleanFontNameFromFile(file.name);
      const item: CustomFontItem = {
        id: makeId("fnt"),
        name,
        source: "upload",
        dataUrl,
        format: fontFormatFromFile(file.name),
        createdAt: Date.now(),
      };
      const loaded = await loadCustomFont(item);
      if (!loaded) {
        setFontStatus({ ok: false, msg: "Could not parse this font file. Try TTF, OTF, or WOFF2." });
        return;
      }
      const existing = (brandKit.customFonts ?? []).filter(
        (f) => f.name.toLowerCase() !== name.toLowerCase(),
      );
      await onUpdateBrandKit(
        {
          ...brandKit,
          customFonts: [item, ...existing].slice(0, 20),
        },
        { immediate: true },
      );
      onApplyBrandFont(name);
      setFontStatus({ ok: true, msg: `Imported “${name}”` });
    } catch {
      setFontStatus({ ok: false, msg: "Failed to read font file." });
    } finally {
      setFontBusy(false);
      e.target.value = "";
    }
  };

  const handleImportGoogleFont = async () => {
    const raw = googleFontInput.trim();
    if (!raw) return;
    const cleanName = raw.replace(/["'\\<>]/g, "").replace(/\s+/g, " ").trim();
    if (!cleanName) return;
    setFontStatus(null);
    setFontBusy(true);
    try {
      const item: CustomFontItem = {
        id: makeId("fnt"),
        name: cleanName,
        source: "google",
        createdAt: Date.now(),
      };
      const loaded = await loadCustomFont(item);
      if (!loaded) {
        setFontStatus({
          ok: false,
          msg: `Could not find “${cleanName}” on Google Fonts. Check spelling.`,
        });
        return;
      }
      const existing = (brandKit.customFonts ?? []).filter(
        (f) => f.name.toLowerCase() !== cleanName.toLowerCase(),
      );
      await onUpdateBrandKit(
        {
          ...brandKit,
          customFonts: [item, ...existing].slice(0, 20),
        },
        { immediate: true },
      );
      onApplyBrandFont(cleanName);
      setGoogleFontInput("");
      setFontStatus({ ok: true, msg: `Imported “${cleanName}” from Google Fonts` });
    } finally {
      setFontBusy(false);
    }
  };

  const handleDeleteCustomFont = async (fontId: string) => {
    await onUpdateBrandKit(
      {
        ...brandKit,
        customFonts: (brandKit.customFonts ?? []).filter((f) => f.id !== fontId),
      },
      { immediate: true },
    );
  };

  const handleBrandLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const opt = await readImageFileOptimized(file, 1024);
      await onUpdateBrandKit(
        {
          ...brandKit,
          logos: [
            {
              id: makeId("logo"),
              name: file.name.replace(/\.[^.]+$/, ""),
              variant: "primary" as const,
              dataUrl: opt.dataUrl,
              width: opt.width,
              height: opt.height,
              createdAt: Date.now(),
            },
            ...brandKit.logos,
          ].slice(0, 12),
        },
        { immediate: true, toast: "Logo added to Brand Kit" },
      );
    } finally {
      e.target.value = "";
    }
  };

  const handleDeleteBrandLogo = async (logoId: string) => {
    await onUpdateBrandKit(
      {
        ...brandKit,
        logos: brandKit.logos.filter((l) => l.id !== logoId),
      },
      { immediate: true, toast: "Logo removed from Brand Kit" },
    );
  };

  const insertLogoOnCanvas = async (logo: BrandKit["logos"][number]) => {
    let natW = logo.width || 0;
    let natH = logo.height || 0;
    if (!natW || !natH) {
      try {
        const img = await loadImage(logo.dataUrl);
        natW = img.naturalWidth || 500;
        natH = img.naturalHeight || 500;
      } catch {
        natW = 500;
        natH = 500;
      }
    }
    const maxW = width * 0.34;
    const maxH = height * 0.28;
    const ratio = natW / Math.max(1, natH);
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    onAddElement({
      id: makeId("el"),
      type: "image",
      name: logo.name || "Brand Logo",
      src: logo.dataUrl,
      originalSrc: logo.dataUrl,
      x: Math.round(centerX - w / 2),
      y: Math.round(centerY - h / 2),
      width: Math.max(40, Math.round(w)),
      height: Math.max(40, Math.round(h)),
      rotation: 0,
      opacity: 1,
      fit: "contain",
      borderRadius: 0,
      mask: "none",
      filters: { ...DEFAULT_IMAGE_FILTERS },
    });
  };

  const tabs: { id: RailTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "templates", label: "Templates", icon: LayoutTemplate },
    { id: "elements", label: "Elements", icon: Shapes },
    { id: "text", label: "Text", icon: Type },
    { id: "uploads", label: "Uploads", icon: Upload },
    { id: "photo", label: "Photo", icon: ImageIcon },
    { id: "draw", label: "Draw", icon: PenTool },
    { id: "brand", label: "Brand", icon: Palette },
    { id: "layers", label: "Layers", icon: Layers },
  ];

  const centerX = Math.round(width / 2);
  const centerY = Math.round(height / 2);

  const addText = (preset: "heading" | "subheading" | "body", fontFamily?: string) => {
    const scale = Math.max(0.6, Math.min(1.4, width / 1080));
    const fontSize = Math.round((preset === "heading" ? 72 : preset === "subheading" ? 42 : 26) * scale);
    const w = Math.round(Math.min(width * 0.72, 680 * scale));
    const h = Math.round(fontSize * 1.5);
    const darkBg = !isLightColor(page.background || "#FFFFFF");
    onAddElement({
      id: makeId("el"),
      type: "text",
      name: preset === "heading" ? "Heading" : preset === "subheading" ? "Subheading" : "Body text",
      text:
        preset === "heading"
          ? "Add a bold heading"
          : preset === "subheading"
            ? "Add a clear subheading"
            : "Double-click to edit body copy in Slate.",
      x: Math.round(centerX - w / 2),
      y: Math.round(centerY - h / 2),
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      fontFamily:
        fontFamily ||
        (preset === "heading"
          ? brandKit.fonts.heading
          : preset === "subheading"
            ? brandKit.fonts.subheading
            : brandKit.fonts.body),
      fontSize,
      fontWeight: preset === "heading" ? 800 : preset === "subheading" ? 600 : 400,
      color: darkBg ? "#FFFFFF" : "#0F172A",
      align: "center",
      lineHeight: 1.2,
      letterSpacing: preset === "heading" ? -1 : 0,
    });
  };

  const addShape = (shape: ShapeKind) => {
    const size = Math.round(Math.min(width, height) * 0.24);
    onAddElement({
      id: makeId("el"),
      type: "shape",
      name: shape.charAt(0).toUpperCase() + shape.slice(1),
      shape,
      x: Math.round(centerX - size / 2),
      y: Math.round(centerY - (shape === "line" ? 10 : size / 2)),
      width: shape === "pill" ? Math.round(size * 1.4) : size,
      height: shape === "line" ? 16 : shape === "pill" ? Math.round(size * 0.45) : size,
      rotation: 0,
      opacity: 1,
      fill: brandKit.colors[1] || "#4F46E5",
      stroke: shape === "line" ? brandKit.colors[0] || "#0F172A" : "transparent",
      strokeWidth: shape === "line" ? 6 : 0,
      borderRadius: shape === "rect" ? 16 : 0,
    });
  };

  const addIcon = (iconId: string, label: string) => {
    const size = Math.round(Math.min(width, height) * 0.16);
    onAddElement({
      id: makeId("el"),
      type: "icon",
      name: label,
      iconId,
      x: Math.round(centerX - size / 2),
      y: Math.round(centerY - size / 2),
      width: size,
      height: size,
      rotation: 0,
      opacity: 1,
      color: brandKit.colors[1] || "#4F46E5",
      strokeWidth: 2,
    });
  };

  const addChart = (kind: ChartKind) => {
    const w = Math.round(Math.min(width * 0.6, 560));
    const h = Math.round(Math.min(height * 0.48, 380));
    const darkBg = !isLightColor(page.background || "#FFFFFF");
    onAddElement({
      id: makeId("el"),
      type: "chart",
      name: `${kind.toUpperCase()} Chart`,
      chartKind: kind,
      title: "Performance Overview",
      x: Math.round(centerX - w / 2),
      y: Math.round(centerY - h / 2),
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      accentColor: brandKit.colors[1] || "#4F46E5",
      textColor: darkBg ? "#FFFFFF" : "#0F172A",
      showValues: true,
      data: [
        { label: "Q1", value: 38, color: "#4F46E5" },
        { label: "Q2", value: 54, color: "#06B6D4" },
        { label: "Q3", value: 72, color: "#F43F5E" },
        { label: "Q4", value: 91, color: "#10B981" },
      ],
    });
  };

  const addTable = () => {
    const w = Math.round(Math.min(width * 0.7, 680));
    const h = Math.round(Math.min(height * 0.4, 300));
    onAddElement({
      id: makeId("el"),
      type: "table",
      name: "Data Table",
      x: Math.round(centerX - w / 2),
      y: Math.round(centerY - h / 2),
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      headerBg: brandKit.colors[0] || "#0F172A",
      headerColor: "#FFFFFF",
      cellBg: "#FFFFFF",
      cellColor: "#0F172A",
      borderColor: "#CBD5E1",
      fontSize: Math.max(16, Math.round(width * 0.018)),
      fontFamily: brandKit.fonts.body || "Inter",
      rows: [
        ["Item", "Owner", "Status"],
        ["Brand Refresh", "Design", "Done"],
        ["Launch Deck", "Marketing", "In Review"],
        ["Social Kit", "Growth", "Scheduled"],
      ],
    });
  };

  const addQr = () => {
    const size = Math.round(Math.min(width, height) * 0.22);
    onAddElement({
      id: makeId("el"),
      type: "qrcode",
      name: "QR Code",
      value: qrInput.trim() || "https://slate.laflabs-tech.workers.dev",
      x: Math.round(centerX - size / 2),
      y: Math.round(centerY - size / 2),
      width: size,
      height: size,
      rotation: 0,
      opacity: 1,
      fgColor: "#0F172A",
      bgColor: "#FFFFFF",
    });
  };

  const insertImageOnCanvas = (src: string, name: string, naturalW = 600, naturalH = 400) => {
    const maxW = width * 0.58;
    const maxH = height * 0.58;
    const ratio = (naturalW || 600) / Math.max(1, naturalH || 400);
    let w = maxW;
    let h = w / ratio;
    if (h > maxH) {
      h = maxH;
      w = h * ratio;
    }
    onAddElement({
      id: makeId("el"),
      type: "image",
      name,
      src,
      originalSrc: src,
      x: Math.round(centerX - w / 2),
      y: Math.round(centerY - h / 2),
      width: Math.round(w),
      height: Math.round(h),
      rotation: 0,
      opacity: 1,
      fit: "cover",
      borderRadius: 0,
      mask: "none",
      filters: { ...DEFAULT_IMAGE_FILTERS },
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const opt = await readImageFileOptimized(file);
        const saved = await onUploadMedia({
          name: file.name,
          mimeType: opt.mimeType,
          dataUrl: opt.dataUrl,
          width: opt.width,
          height: opt.height,
          sizeBytes: opt.sizeBytes,
        });
        insertImageOnCanvas(saved?.dataUrl || opt.dataUrl, file.name, opt.width, opt.height);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handlePptxPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onImportPptx(file);
    e.target.value = "";
  };

  const selectedImg =
    selectedElement?.type === "image" ? (selectedElement as ImageElement) : null;

  const applyAspectCrop = async (ratio: number) => {
    if (!selectedImg) return;
    const baseSrc = selectedImg.originalSrc || selectedImg.src;
    const img = new Image();
    img.src = baseSrc;
    await new Promise<void>((res) => {
      img.onload = () => res();
      img.onerror = () => res();
    });
    const iw = img.naturalWidth || 1000;
    const ih = img.naturalHeight || 1000;
    const currRatio = iw / ih;
    let cw = 100;
    let ch = 100;
    let cx = 0;
    let cy = 0;
    if (currRatio > ratio) {
      cw = (ratio / currRatio) * 100;
      cx = (100 - cw) / 2;
    } else {
      ch = (currRatio / ratio) * 100;
      cy = (100 - ch) / 2;
    }
    const cropped = await applyCropToImage(baseSrc, { x: cx, y: cy, width: cw, height: ch });
    onUpdateElement(
      selectedImg.id,
      {
        src: cropped,
        height: Math.round(selectedImg.width / ratio),
      } as Partial<ImageElement>,
      true,
    );
  };

  const handleSmartBgRemove = async () => {
    if (!selectedImg) return;
    setBgBusy(true);
    try {
      const cutout = await removeBackgroundInBrowser(
        selectedImg.originalSrc || selectedImg.src,
        bgTolerance,
      );
      onUpdateElement(selectedImg.id, { src: cutout } as Partial<ImageElement>, true);
    } finally {
      setBgBusy(false);
    }
  };

  const filteredIcons = VECTOR_ICONS.filter((ic) => {
    if (!iconQuery.trim()) return true;
    const q = iconQuery.toLowerCase();
    return (
      ic.label.toLowerCase().includes(q) ||
      ic.category.includes(q) ||
      ic.tags.some((t) => t.includes(q))
    );
  });

  const allTemplates = [...teamTemplates, ...BUILTIN_TEMPLATES].filter(
    (t) => tplFilter === "all" || t.category === tplFilter || (tplFilter === "team" && t.isCustom),
  );

  return (
    <div className="flex h-full shrink-0">
      {/* Shared hidden file inputs so Uploads & Photo tabs can trigger upload */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={pptxRef}
        type="file"
        accept=".pptx"
        onChange={handlePptxPick}
        className="hidden"
      />
      <input
        ref={fontFileRef}
        type="file"
        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
        onChange={handleUploadFontFile}
        className="hidden"
      />

      {/* Slim Icon Rail */}
      <div className="flex w-[68px] flex-col items-center gap-1 border-r border-[var(--border)] bg-[var(--surface)] py-2.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                const next = active ? null : tab.id;
                onTabChange(next);
                if (next === "draw") {
                  onChangeDrawTool({ ...drawTool, active: true });
                } else if (drawTool.active) {
                  onChangeDrawTool({ ...drawTool, active: false });
                }
              }}
              className={`flex w-14 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium transition cursor-pointer ${
                active
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Expandable Drawer */}
      {activeTab && (
        <div className="flex h-full w-72 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--fg)]">
              {activeTab}
            </span>
            <button
              onClick={() => {
                onTabChange(null);
                if (drawTool.active) onChangeDrawTool({ ...drawTool, active: false });
              }}
              className="text-[11px] text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
            >
              Hide
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
            {/* TEMPLATES */}
            {activeTab === "templates" && (
              <>
                <div className="flex flex-wrap gap-1">
                  {["all", "team", "presentation", "social", "marketing", "document"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setTplFilter(cat)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-medium capitalize cursor-pointer ${
                        tplFilter === cat
                          ? "bg-[var(--fg)] text-[var(--surface)]"
                          : "bg-[var(--surface-2)] text-[var(--muted)]"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {allTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() =>
                        onApplyTemplate(instantiateTemplate(tpl), tpl.width, tpl.height)
                      }
                      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] text-left transition hover:border-[var(--accent)] cursor-pointer"
                    >
                      <div className="flex h-24 w-full items-center justify-center bg-[var(--stage)] p-1.5">
                        {tpl.pages[0] && (
                          <PagePreview
                            page={tpl.pages[0]}
                            width={tpl.width}
                            height={tpl.height}
                            maxWidth={110}
                            maxHeight={82}
                            className="rounded shadow-xs"
                          />
                        )}
                      </div>
                      <div className="p-2">
                        <div className="truncate text-[11px] font-semibold text-[var(--fg)]">
                          {tpl.title}
                        </div>
                        <div className="text-[10px] text-[var(--muted)]">
                          {tpl.pages.length > 1 ? `${tpl.pages.length} pages` : `${tpl.width}×${tpl.height}`}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                {page.elements.length > 0 && (
                  <button
                    onClick={onSaveAsTeamTemplate}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-2)] py-2 text-xs font-medium text-[var(--fg)] hover:border-[var(--accent)] cursor-pointer"
                  >
                    <BookmarkPlus className="h-3.5 w-3.5" /> Save Design as Template
                  </button>
                )}
              </>
            )}

            {/* ELEMENTS */}
            {activeTab === "elements" && (() => {
              const q = iconQuery.trim().toLowerCase();
              const searching = q.length > 0;
              const matchedShapes = searching
                ? SHAPE_LIST.filter((s) => s.label.toLowerCase().includes(q) || s.kind.includes(q))
                : elemCat === "all"
                  ? SHAPE_LIST.slice(0, 8)
                  : SHAPE_LIST;
              const chartItems: { id: ChartKind; label: string }[] = [
                { id: "bar", label: "Bar" },
                { id: "line", label: "Line" },
                { id: "pie", label: "Pie" },
                { id: "donut", label: "Donut" },
              ];
              const matchedCharts = searching
                ? chartItems.filter((c) => c.label.toLowerCase().includes(q) || "chart".includes(q))
                : chartItems;
              const showTable = !searching || "table".includes(q) || "grid".includes(q);
              const visibleIcons = searching || elemCat === "icons" ? filteredIcons : filteredIcons.slice(0, 8);
              const noResults =
                searching &&
                matchedShapes.length === 0 &&
                matchedCharts.length === 0 &&
                !showTable &&
                visibleIcons.length === 0;

              return (
                <div className="space-y-4">
                  {/* Unified Search */}
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--muted)]" />
                    <input
                      value={iconQuery}
                      onChange={(e) => setIconQuery(e.target.value)}
                      placeholder="Search shapes, charts, icons…"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-1.5 pl-8 pr-7 text-xs text-[var(--fg)] outline-none focus:border-[var(--border-strong)]"
                    />
                    {iconQuery && (
                      <button
                        onClick={() => setIconQuery("")}
                        aria-label="Clear search"
                        className="absolute right-2 top-1.5 rounded p-0.5 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Category Tabs */}
                  {!searching && (
                    <div className="flex gap-1 rounded-xl bg-[var(--surface-2)] p-1">
                      {(
                        [
                          { id: "all", label: "All" },
                          { id: "shapes", label: "Shapes" },
                          { id: "charts", label: "Charts" },
                          { id: "icons", label: "Icons" },
                          { id: "qr", label: "QR" },
                        ] as const
                      ).map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setElemCat(cat.id)}
                          className={`flex-1 rounded-lg py-1 text-[11px] font-medium transition cursor-pointer ${
                            elemCat === cat.id
                              ? "bg-[var(--surface)] text-[var(--fg)] shadow-xs"
                              : "text-[var(--muted)] hover:text-[var(--fg)]"
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {noResults && (
                    <div className="rounded-xl border border-dashed border-[var(--border)] py-8 text-center text-xs text-[var(--muted)]">
                      No elements match “{iconQuery}”.
                    </div>
                  )}

                  {/* Shapes Section */}
                  {(searching ? matchedShapes.length > 0 : elemCat === "all" || elemCat === "shapes") && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[var(--muted)]">Shapes & Lines</span>
                        {!searching && elemCat === "all" && (
                          <button
                            onClick={() => setElemCat("shapes")}
                            className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                          >
                            See all ({SHAPE_LIST.length})
                          </button>
                        )}
                      </div>
                      <div
                        className={
                          elemCat === "shapes"
                            ? "grid grid-cols-3 gap-2"
                            : "grid grid-cols-4 gap-1.5"
                        }
                      >
                        {matchedShapes.map((s) => (
                          <button
                            key={s.kind}
                            onClick={() => addShape(s.kind)}
                            title={s.label}
                            className={`flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 text-[var(--fg)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] transition cursor-pointer ${
                              elemCat === "shapes" ? "gap-1.5 py-3 px-2" : "aspect-square p-2"
                            }`}
                          >
                            <ShapeThumb kind={s.kind} />
                            {elemCat === "shapes" && (
                              <span className="text-[10px] font-medium text-[var(--muted)]">{s.label}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Charts & Tables Section */}
                  {(searching
                    ? matchedCharts.length > 0 || showTable
                    : elemCat === "all" || elemCat === "charts") && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[var(--muted)]">Charts & Tables</span>
                        {!searching && elemCat === "all" && (
                          <button
                            onClick={() => setElemCat("charts")}
                            className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                          >
                            See all
                          </button>
                        )}
                      </div>
                      {matchedCharts.length > 0 && (
                        <div className="grid grid-cols-2 gap-1.5">
                          {matchedCharts.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => addChart(c.id)}
                              className={`flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 text-xs font-medium text-[var(--fg)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] transition cursor-pointer ${
                                elemCat === "charts" ? "flex-col py-3.5" : "py-2.5 px-2.5"
                              }`}
                            >
                              <ChartThumb kind={c.id} />
                              <span>{elemCat === "charts" ? `${c.label} Chart` : c.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {showTable && (
                        <button
                          onClick={addTable}
                          className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 py-2.5 text-xs font-medium text-[var(--fg)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] transition cursor-pointer"
                        >
                          <TableIcon className="h-4 w-4 text-[var(--muted)]" />
                          Editable Table
                        </button>
                      )}
                      {elemCat === "charts" && !searching && (
                        <p className="mt-2.5 text-[11px] leading-relaxed text-[var(--muted)]">
                          Click any chart or table to open the data editor on the right and customize labels, values, and colors.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Vector Icons Section */}
                  {(searching ? visibleIcons.length > 0 : elemCat === "all" || elemCat === "icons") && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[var(--muted)]">
                          Icons {elemCat === "icons" ? `(${visibleIcons.length})` : ""}
                        </span>
                        {!searching && elemCat === "all" && (
                          <button
                            onClick={() => setElemCat("icons")}
                            className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                          >
                            See all ({VECTOR_ICONS.length})
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {visibleIcons.map((ic) => (
                          <button
                            key={ic.id}
                            onClick={() => addIcon(ic.id, ic.label)}
                            title={ic.label}
                            className="flex aspect-square items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 text-[var(--fg)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] transition cursor-pointer"
                          >
                            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                              {ic.paths.map((d, idx) => (
                                <path key={idx} d={d} />
                              ))}
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* QR Code Section */}
                  {!searching && elemCat === "all" && (
                    <button
                      onClick={() => setElemCat("qr")}
                      className="flex w-full items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/70 px-3 py-2.5 text-xs font-medium text-[var(--fg)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)] transition cursor-pointer"
                    >
                      <span className="inline-flex items-center gap-2">
                        <QrCode className="h-4 w-4 text-[var(--muted)]" />
                        QR Code Generator
                      </span>
                      <span className="text-[11px] text-[var(--muted)]">Open →</span>
                    </button>
                  )}

                  {!searching && elemCat === "qr" && (
                    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--fg)]">
                        <QrCode className="h-4 w-4 text-[var(--muted)]" />
                        Generate QR Code
                      </div>
                      <p className="text-[11px] text-[var(--muted)]">
                        Enter any website URL, link, or text to place a crisp scannable QR code on your canvas.
                      </p>
                      <input
                        value={qrInput}
                        onChange={(e) => setQrInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addQr()}
                        placeholder="https://example.com"
                        className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-2 text-xs text-[var(--fg)] outline-none focus:border-[var(--border-strong)]"
                      />
                      <button
                        onClick={addQr}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] py-2 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-90 cursor-pointer"
                      >
                        <QrCode className="h-3.5 w-3.5" /> Add QR Code to Canvas
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TEXT */}
            {activeTab === "text" && (
              <>
                <div className="space-y-2">
                  <button
                    onClick={() => addText("heading")}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-3 text-left text-lg font-extrabold text-[var(--fg)] hover:border-[var(--border-strong)] cursor-pointer"
                  >
                    Add a heading
                  </button>
                  <button
                    onClick={() => addText("subheading")}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-left text-sm font-semibold text-[var(--fg)] hover:border-[var(--border-strong)] cursor-pointer"
                  >
                    Add a subheading
                  </button>
                  <button
                    onClick={() => addText("body")}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-left text-xs text-[var(--muted)] hover:border-[var(--border-strong)] cursor-pointer"
                  >
                    Add a little bit of body text
                  </button>
                </div>

                {/* Custom Fonts (Upload .ttf/.otf/.woff2 or import any Google Font) */}
                <div className="space-y-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[var(--fg)]">Import Fonts</span>
                    <button
                      onClick={() => fontFileRef.current?.click()}
                      disabled={fontBusy}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--border-strong)] disabled:opacity-50 cursor-pointer"
                    >
                      <Upload className="h-3 w-3" />
                      {fontBusy ? "Loading…" : "Upload File"}
                    </button>
                  </div>

                  <p className="text-[10px] leading-relaxed text-[var(--muted)]">
                    Upload <span className="font-medium text-[var(--fg)]">.ttf, .otf, .woff, .woff2</span> or import any Google Font by name.
                  </p>

                  <div className="flex gap-1.5">
                    <input
                      value={googleFontInput}
                      onChange={(e) => {
                        setGoogleFontInput(e.target.value);
                        if (fontStatus) setFontStatus(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && void handleImportGoogleFont()}
                      placeholder="Google Font (e.g. Pacifico, Oswald)"
                      className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] text-[var(--fg)] outline-none focus:border-[var(--border-strong)]"
                    />
                    <button
                      onClick={() => void handleImportGoogleFont()}
                      disabled={fontBusy || !googleFontInput.trim()}
                      className="rounded-lg bg-[var(--accent)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--accent-fg)] hover:opacity-90 disabled:opacity-40 cursor-pointer"
                    >
                      Import
                    </button>
                  </div>

                  {fontStatus && (
                    <div
                      className={`text-[11px] ${
                        fontStatus.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                      }`}
                    >
                      {fontStatus.msg}
                    </div>
                  )}

                  {brandKit.customFonts && brandKit.customFonts.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <div className="text-[10px] font-medium text-[var(--muted)]">
                        Imported ({brandKit.customFonts.length}) — click to {hasSelectedText ? "apply" : "insert"}
                      </div>
                      {brandKit.customFonts.map((cf) => (
                        <div
                          key={cf.id}
                          className="group flex items-center justify-between gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 hover:border-[var(--border-strong)]"
                        >
                          <button
                            onClick={() => {
                              if (!onApplyBrandFont(cf.name)) {
                                addText("heading", cf.name);
                              }
                            }}
                            className="min-w-0 flex-1 truncate text-left text-xs font-medium text-[var(--fg)] cursor-pointer"
                            style={{ fontFamily: `"${cf.name}", sans-serif` }}
                            title={
                              hasSelectedText
                                ? `Apply ${cf.name} to selected text`
                                : `Insert heading in ${cf.name}`
                            }
                          >
                            {cf.name}
                          </button>
                          <span className="text-[9px] uppercase text-[var(--muted)]">
                            {cf.source === "google" ? "Google" : cf.format === "opentype" ? "OTF" : cf.format === "woff2" ? "WOFF2" : "File"}
                          </span>
                          <button
                            onClick={() => void handleDeleteCustomFont(cf.id)}
                            title={`Remove ${cf.name}`}
                            className="rounded p-0.5 text-[var(--muted)] opacity-0 transition hover:text-rose-500 group-hover:opacity-100 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-[11px] font-semibold text-[var(--muted)]">Curated Font Pairings</div>
                  <div className="space-y-2">
                    {FONT_PAIRINGS.map((pair) => (
                      <button
                        key={pair.name}
                        onClick={() => {
                          addText("heading", pair.heading);
                          addText("body", pair.body);
                        }}
                        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-left hover:border-[var(--accent)] cursor-pointer"
                      >
                        <div
                          className="text-base font-bold text-[var(--fg)]"
                          style={{ fontFamily: `"${pair.heading}", sans-serif` }}
                        >
                          {pair.name}
                        </div>
                        <div
                          className="mt-0.5 text-xs text-[var(--muted)]"
                          style={{ fontFamily: `"${pair.body}", sans-serif` }}
                        >
                          {pair.heading} + {pair.body}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* UPLOADS */}
            {activeTab === "uploads" && (
              <>
                <div className="space-y-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-95 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? "Uploading…" : "Upload Photos / SVGs"}
                  </button>
                  <button
                    onClick={() => pptxRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 text-xs font-semibold text-[var(--fg)] hover:border-[var(--accent)] cursor-pointer"
                  >
                    <FileUp className="h-3.5 w-3.5 text-[var(--accent)]" />
                    Import PowerPoint (.pptx)
                  </button>
                </div>

                {media.length === 0 ? (
                  <p className="py-6 text-center text-xs text-[var(--muted)]">
                    Uploaded images are saved to your workspace library for reuse across designs.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {media.map((asset) => (
                      <div
                        key={asset.id}
                        className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)]"
                      >
                        <button
                          onClick={() =>
                            insertImageOnCanvas(asset.dataUrl, asset.name, asset.width, asset.height)
                          }
                          className="block aspect-square w-full cursor-pointer"
                        >
                          <img
                            src={asset.dataUrl}
                            alt={asset.name}
                            className="h-full w-full object-cover"
                          />
                        </button>
                        <button
                          onClick={() => onDeleteMedia(asset.id)}
                          title="Delete from library"
                          className="absolute right-1.5 top-1.5 rounded-md bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-rose-600 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* PHOTO EDITOR */}
            {activeTab === "photo" && (
              <>
                {!selectedImg ? (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-center text-xs text-[var(--muted)]">
                    <ImageIcon className="mx-auto mb-2 h-6 w-6 text-[var(--accent)]" />
                    Select a photo on the canvas — or upload one to start editing filters, crop, masks, and background removal.
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="mt-3 w-full rounded-lg bg-[var(--accent)] py-2 font-semibold text-[var(--accent-fg)] cursor-pointer"
                    >
                      Upload Photo to Edit
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 text-xs">
                    {/* Background Remover */}
                    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                      <div className="flex items-center justify-between font-semibold text-[var(--fg)]">
                        <span className="inline-flex items-center gap-1.5">
                          <Scissors className="h-3.5 w-3.5 text-[var(--accent)]" /> Background Remover
                        </span>
                        <span className="text-[10px] text-[var(--muted)]">In-Browser</span>
                      </div>
                      <div className="mt-2">
                        <div className="flex justify-between text-[11px] text-[var(--muted)]">
                          <span>Edge Tolerance</span>
                          <span>{bgTolerance}</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={90}
                          value={bgTolerance}
                          onChange={(e) => setBgTolerance(Number(e.target.value))}
                          className="w-full accent-[var(--accent)]"
                        />
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <button
                          onClick={handleSmartBgRemove}
                          disabled={bgBusy}
                          className="flex-1 rounded-lg bg-[var(--accent)] py-1.5 font-semibold text-[var(--accent-fg)] cursor-pointer disabled:opacity-50"
                        >
                          {bgBusy ? "Removing…" : "Remove BG"}
                        </button>
                        {selectedImg.originalSrc && selectedImg.src !== selectedImg.originalSrc && (
                          <button
                            onClick={() =>
                              onUpdateElement(
                                selectedImg.id,
                                { src: selectedImg.originalSrc } as Partial<ImageElement>,
                                true,
                              )
                            }
                            className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 font-medium text-[var(--fg)] cursor-pointer"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Crop */}
                    <div>
                      <div className="mb-1.5 flex items-center gap-1.5 font-semibold text-[var(--fg)]">
                        <Crop className="h-3.5 w-3.5 text-[var(--accent)]" /> Quick Crop
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { label: "1:1", r: 1 },
                          { label: "4:5", r: 4 / 5 },
                          { label: "16:9", r: 16 / 9 },
                          { label: "3:2", r: 3 / 2 },
                        ].map((c) => (
                          <button
                            key={c.label}
                            onClick={() => void applyAspectCrop(c.r)}
                            className="rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-1.5 font-semibold text-[var(--fg)] hover:border-[var(--accent)] cursor-pointer"
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filter Presets */}
                    <div>
                      <div className="mb-1.5 font-semibold text-[var(--fg)]">Filter Presets</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {FILTER_PRESETS.map((fp) => (
                          <button
                            key={fp.id}
                            onClick={() =>
                              onUpdateElement(
                                selectedImg.id,
                                {
                                  filters: { preset: fp.id, ...fp.values },
                                } as Partial<ImageElement>,
                                true,
                              )
                            }
                            className={`rounded-lg border px-2.5 py-1.5 text-left font-medium cursor-pointer ${
                              selectedImg.filters?.preset === fp.id
                                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                                : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]"
                            }`}
                          >
                            {fp.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fine-Tune Sliders */}
                    <div className="space-y-2.5">
                      <div className="font-semibold text-[var(--fg)]">Adjustments</div>
                      {(
                        [
                          { key: "brightness", label: "Brightness", min: 30, max: 180 },
                          { key: "contrast", label: "Contrast", min: 30, max: 180 },
                          { key: "saturation", label: "Saturation", min: 0, max: 200 },
                          { key: "hue", label: "Warmth / Hue", min: -180, max: 180 },
                          { key: "blur", label: "Blur", min: 0, max: 16 },
                          { key: "vignette", label: "Vignette", min: 0, max: 100 },
                        ] as const
                      ).map((sl) => (
                        <div key={sl.key}>
                          <div className="flex justify-between text-[11px] text-[var(--muted)]">
                            <span>{sl.label}</span>
                            <span>{selectedImg.filters?.[sl.key] ?? 0}</span>
                          </div>
                          <input
                            type="range"
                            min={sl.min}
                            max={sl.max}
                            value={selectedImg.filters?.[sl.key] ?? 0}
                            onChange={(e) =>
                              onUpdateElement(selectedImg.id, {
                                filters: {
                                  ...(selectedImg.filters ?? DEFAULT_IMAGE_FILTERS),
                                  preset: "none",
                                  [sl.key]: Number(e.target.value),
                                },
                              } as Partial<ImageElement>)
                            }
                            className="w-full accent-[var(--accent)]"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Frame Masks */}
                    <div>
                      <div className="mb-1.5 font-semibold text-[var(--fg)]">Image Frame Mask</div>
                      <div className="grid grid-cols-3 gap-1.5">
                        {MASKS.map((m) => (
                          <button
                            key={m.id}
                            onClick={() =>
                              onUpdateElement(
                                selectedImg.id,
                                { mask: m.id } as Partial<ImageElement>,
                                true,
                              )
                            }
                            className={`rounded-lg border py-1.5 text-[11px] font-medium cursor-pointer ${
                              selectedImg.mask === m.id
                                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                                : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* DRAW */}
            {activeTab === "draw" && (
              <div className="space-y-4 text-xs">
                <div className="rounded-xl bg-[var(--accent-soft)] p-3 text-[var(--accent)]">
                  Freehand draw is <strong>{drawTool.active ? "ON" : "OFF"}</strong>. Drag anywhere on the canvas to sketch vector strokes.
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["pen", "marker", "highlighter"] as const).map((b) => (
                    <button
                      key={b}
                      onClick={() =>
                        onChangeDrawTool({
                          ...drawTool,
                          active: true,
                          brush: b,
                          strokeWidth: b === "pen" ? 4 : b === "marker" ? 12 : 24,
                        })
                      }
                      className={`rounded-xl border py-2 font-semibold capitalize cursor-pointer ${
                        drawTool.brush === b
                          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                          : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-[var(--muted)]">
                    <span>Stroke Thickness</span>
                    <span>{drawTool.strokeWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={48}
                    value={drawTool.strokeWidth}
                    onChange={(e) =>
                      onChangeDrawTool({ ...drawTool, strokeWidth: Number(e.target.value) })
                    }
                    className="mt-1 w-full accent-[var(--accent)]"
                  />
                </div>

                <div>
                  <div className="mb-1.5 font-semibold text-[var(--fg)]">Brush Color</div>
                  <div className="flex flex-wrap items-center gap-2">
                    {["#0F172A", "#4F46E5", "#06B6D4", "#F43F5E", "#F59E0B", "#10B981", "#FFFFFF"].map(
                      (col) => (
                        <button
                          key={col}
                          onClick={() => onChangeDrawTool({ ...drawTool, color: col })}
                          className={`h-7 w-7 rounded-full border-2 cursor-pointer ${
                            drawTool.color === col ? "border-[var(--accent)] scale-110" : "border-black/15"
                          }`}
                          style={{ background: col }}
                        />
                      ),
                    )}
                    <input
                      type="color"
                      value={drawTool.color}
                      onChange={(e) => onChangeDrawTool({ ...drawTool, color: e.target.value })}
                      className="h-7 w-7 cursor-pointer rounded"
                    />
                  </div>
                </div>

                <button
                  onClick={() => onChangeDrawTool({ ...drawTool, active: !drawTool.active })}
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 font-semibold text-[var(--fg)] cursor-pointer"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  {drawTool.active ? "Switch to Select Mode" : "Resume Drawing"}
                </button>
              </div>
            )}

            {/* BRAND KIT */}
            {activeTab === "brand" && (
              <div className="space-y-4 text-xs">
                <input
                  ref={brandLogoRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBrandLogoPick}
                  className="hidden"
                />

                {/* Workspace Brand Kit Card */}
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate font-semibold text-[var(--fg)]">
                      {brandKit.name || "My Brand"}
                    </div>
                    <button
                      onClick={() => {
                        if (editingBrand) {
                          const trimmed = brandKit.name.trim() || "My Brand";
                          void onUpdateBrandKit(
                            { ...brandKit, name: trimmed },
                            { immediate: true, toast: "Brand Kit saved" },
                          );
                        }
                        setEditingBrand((v) => !v);
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)] cursor-pointer"
                    >
                      {editingBrand ? (
                        <>
                          <Check className="h-3 w-3" /> Done
                        </>
                      ) : (
                        <>
                          <Pencil className="h-3 w-3" /> Edit
                        </>
                      )}
                    </button>
                  </div>

                  {editingBrand ? (
                    <div className="mt-2.5 space-y-2.5">
                      <div>
                        <label className="text-[10px] font-medium text-[var(--muted)]">
                          Brand name
                        </label>
                        <input
                          value={brandKit.name}
                          onChange={(e) =>
                            void onUpdateBrandKit({ ...brandKit, name: e.target.value })
                          }
                          placeholder="My Brand"
                          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--border-strong)]"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-medium text-[var(--muted)]">
                          Palette colors
                        </label>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          {brandKit.colors.map((c, idx) => (
                            <div key={idx} className="relative">
                              <input
                                type="color"
                                value={c}
                                onChange={(e) => {
                                  const nextColors = [...brandKit.colors];
                                  nextColors[idx] = e.target.value.toUpperCase();
                                  void onUpdateBrandKit({ ...brandKit, colors: nextColors });
                                }}
                                className="h-7 w-7 cursor-pointer rounded-md border border-black/15"
                              />
                              {brandKit.colors.length > 2 && (
                                <button
                                  onClick={() =>
                                    void onUpdateBrandKit(
                                      {
                                        ...brandKit,
                                        colors: brandKit.colors.filter((_, i) => i !== idx),
                                      },
                                      { immediate: true },
                                    )
                                  }
                                  title="Remove color"
                                  className="absolute -right-1 -top-1 rounded-full bg-neutral-900 p-0.5 text-white cursor-pointer"
                                >
                                  <X className="h-2 w-2" />
                                </button>
                              )}
                            </div>
                          ))}
                          {brandKit.colors.length < 8 && (
                            <button
                              onClick={() =>
                                void onUpdateBrandKit(
                                  {
                                    ...brandKit,
                                    colors: [...brandKit.colors, "#2563EB"],
                                  },
                                  { immediate: true },
                                )
                              }
                              title="Add color"
                              className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-[var(--border)] text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {(
                          [
                            { key: "heading" as const, label: "Heading font" },
                            { key: "subheading" as const, label: "Subheading font" },
                            { key: "body" as const, label: "Body font" },
                          ]
                        ).map((slot) => (
                          <div key={slot.key}>
                            <label className="text-[10px] font-medium text-[var(--muted)]">
                              {slot.label}
                            </label>
                            <select
                              value={brandKit.fonts[slot.key]}
                              onChange={(e) =>
                                void onUpdateBrandKit(
                                  {
                                    ...brandKit,
                                    fonts: { ...brandKit.fonts, [slot.key]: e.target.value },
                                  },
                                  { immediate: true },
                                )
                              }
                              className="mt-0.5 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] text-[var(--fg)] outline-none"
                            >
                              {brandKit.customFonts && brandKit.customFonts.length > 0 && (
                                <optgroup label="Custom Fonts">
                                  {brandKit.customFonts.map((f) => (
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
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--muted)]">
                        Apply your brand palette or typography while preserving layout &amp; text contrast. Click again to shuffle.
                      </p>

                      {pageCount > 1 && (
                        <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 text-[11px]">
                          <button
                            onClick={() => setApplyScope("page")}
                            className={`rounded-md py-1 font-medium transition cursor-pointer ${
                              applyScope === "page"
                                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                                : "text-[var(--muted)] hover:text-[var(--fg)]"
                            }`}
                          >
                            This page
                          </button>
                          <button
                            onClick={() => setApplyScope("deck")}
                            className={`rounded-md py-1 font-medium transition cursor-pointer ${
                              applyScope === "deck"
                                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                                : "text-[var(--muted)] hover:text-[var(--fg)]"
                            }`}
                          >
                            All {pageCount} pages
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() =>
                          onApplyBrandStyle({ mode: "all", scope: applyScope })
                        }
                        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] py-2 font-medium text-[var(--accent-fg)] hover:opacity-90 cursor-pointer"
                      >
                        <Shuffle className="h-3.5 w-3.5" /> Apply Brand Style
                      </button>

                      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() =>
                            onApplyBrandStyle({ mode: "colors", scope: applyScope })
                          }
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--border-strong)] cursor-pointer"
                        >
                          Colors only
                        </button>
                        <button
                          onClick={() =>
                            onApplyBrandStyle({ mode: "fonts", scope: applyScope })
                          }
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--border-strong)] cursor-pointer"
                        >
                          Fonts only
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Brand Colors */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-semibold text-[var(--fg)]">Brand Colors</span>
                    <span className="text-[10px] text-[var(--muted)]">
                      {hasColorableSelection
                        ? "Recolor selection"
                        : selectedIds.length > 0
                          ? "Select text/shape"
                          : "Set background"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {brandKit.colors.map((c, idx) => (
                      <button
                        key={idx}
                        onClick={() => onApplySwatchColor(c)}
                        title={
                          hasColorableSelection
                            ? `Apply ${c} to selection`
                            : selectedIds.length > 0
                              ? "Select text, shape, icon, chart, or table to recolor"
                              : `Set page background to ${c}`
                        }
                        className="h-8 w-8 rounded-lg border border-black/15 shadow-xs transition hover:scale-105 cursor-pointer"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>

                {/* Brand Fonts */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-semibold text-[var(--fg)]">Brand Fonts</span>
                    <span className="text-[10px] text-[var(--muted)]">
                      {hasSelectedText ? "Apply to text" : "Add to canvas"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {(
                      [
                        { kind: "heading" as const, label: "Heading", font: brandKit.fonts.heading },
                        { kind: "subheading" as const, label: "Subheading", font: brandKit.fonts.subheading },
                        { kind: "body" as const, label: "Body", font: brandKit.fonts.body },
                      ]
                    ).map((slot) => (
                      <div
                        key={slot.kind}
                        className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] pr-1.5 transition hover:border-[var(--border-strong)]"
                      >
                        <button
                          onClick={() => {
                            const applied = onApplyBrandFont(slot.font);
                            if (!applied) addText(slot.kind, slot.font);
                          }}
                          className="min-w-0 flex-1 px-3 py-1.5 text-left cursor-pointer"
                        >
                          <div className="text-[10px] text-[var(--muted)]">{slot.label}</div>
                          <div
                            className={`truncate text-[var(--fg)] ${
                              slot.kind === "heading"
                                ? "text-sm font-bold"
                                : slot.kind === "subheading"
                                  ? "text-xs font-semibold"
                                  : "text-xs"
                            }`}
                            style={{ fontFamily: `"${slot.font}", sans-serif` }}
                          >
                            {slot.font}
                          </div>
                        </button>
                        <button
                          onClick={() => addText(slot.kind, slot.font)}
                          title={`Insert new ${slot.label.toLowerCase()} in ${slot.font}`}
                          className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)] cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Brand Logos */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between font-semibold text-[var(--fg)]">
                    <span>Brand Logos</span>
                    <button
                      onClick={() => brandLogoRef.current?.click()}
                      className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                    >
                      + Upload
                    </button>
                  </div>
                  {brandKit.logos.length === 0 ? (
                    <p className="text-[11px] text-[var(--muted)]">
                      No brand logos saved yet. Upload a PNG or SVG logo to reuse across designs.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {brandKit.logos.map((logo) => (
                        <div
                          key={logo.id}
                          className="group relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] transition hover:border-[var(--border-strong)]"
                        >
                          <button
                            onClick={() => void insertLogoOnCanvas(logo)}
                            title={`Insert ${logo.name} onto canvas`}
                            className="flex aspect-square w-full items-center justify-center p-2.5 cursor-pointer"
                          >
                            <img
                              src={logo.dataUrl}
                              alt={logo.name}
                              className="max-h-full max-w-full object-contain"
                            />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDeleteBrandLogo(logo.id);
                            }}
                            title={`Remove ${logo.name} from Brand Logos`}
                            className="absolute right-1.5 top-1.5 rounded-md bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100 hover:bg-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Color Palettes */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-semibold text-[var(--fg)]">Color Palettes</span>
                    <span className="text-[10px] text-[var(--muted)]">Click to apply</span>
                  </div>
                  <div className="space-y-1.5">
                    {SWATCH_PALETTES.map((p) => (
                      <div
                        key={p.name}
                        className="group flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] pr-1 transition hover:border-[var(--border-strong)]"
                      >
                        <button
                          onClick={() =>
                            onApplyBrandStyle({
                              mode: "colors",
                              scope: applyScope,
                              colors: p.colors,
                              label: p.name,
                            })
                          }
                          title={`Apply ${p.name} colors (click again to shuffle)`}
                          className="flex min-w-0 flex-1 items-center justify-between gap-2 px-2.5 py-2 text-left cursor-pointer"
                        >
                          <span className="truncate text-[11px] font-medium text-[var(--fg)]">
                            {p.name}
                          </span>
                          <div className="flex shrink-0 gap-1">
                            {p.colors.map((c) => (
                              <span
                                key={c}
                                className="h-3 w-3 rounded-full border border-black/15"
                                style={{ background: c }}
                              />
                            ))}
                          </div>
                        </button>
                        <button
                          onClick={() =>
                            void onUpdateBrandKit(
                              {
                                ...brandKit,
                                colors: [...p.colors],
                              },
                              { immediate: true, toast: `Saved "${p.name}" to Brand Colors` },
                            )
                          }
                          title={`Save ${p.name} as your Brand Colors`}
                          className="shrink-0 rounded px-1.5 py-1 text-[10px] font-medium text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--fg)] cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LAYERS */}
            {activeTab === "layers" && (
              <div className="space-y-1.5">
                {page.elements.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[var(--muted)]">
                    No elements on this page yet.
                  </p>
                ) : (
                  [...page.elements].reverse().map((el) => {
                    const selected = selectedIds.includes(el.id);
                    return (
                      <div
                        key={el.id}
                        onClick={() => onSelect([el.id])}
                        className={`flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2 text-xs transition cursor-pointer ${
                          selected
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--fg)]"
                            : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {el.name || (el.type === "text" ? el.text.slice(0, 20) : el.type)}
                          </div>
                          <div className="text-[10px] capitalize text-[var(--muted)]">
                            {el.type}
                            {el.groupId ? " • Grouped" : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReorderLayer(el.id, "up");
                            }}
                            title="Bring Forward"
                            className="rounded p-1 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReorderLayer(el.id, "down");
                            }}
                            title="Send Backward"
                            className="rounded p-1 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateElement(el.id, { hidden: !el.hidden }, true);
                            }}
                            title={el.hidden ? "Show" : "Hide"}
                            className="rounded p-1 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                          >
                            {el.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateElement(el.id, { locked: !el.locked }, true);
                            }}
                            title={el.locked ? "Unlock" : "Lock"}
                            className="rounded p-1 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                          >
                            {el.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteElements([el.id]);
                            }}
                            title="Delete"
                            className="rounded p-1 text-[var(--muted)] hover:text-rose-500 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
