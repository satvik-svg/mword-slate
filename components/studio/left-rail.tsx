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
  Hexagon,
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
import { VECTOR_ICONS } from "@/lib/icons";
import { makeId } from "@/lib/id";
import { applyCropToImage, readImageFileOptimized, removeBackgroundInBrowser } from "@/lib/photo-tools";
import { FILTER_PRESETS, FONT_PAIRINGS, GOOGLE_FONTS, SWATCH_PALETTES } from "@/lib/presets";
import { BUILTIN_TEMPLATES, instantiateTemplate } from "@/lib/templates";
import {
  DEFAULT_IMAGE_FILTERS,
  type BrandKit,
  type CanvasElement,
  type ChartKind,
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
  { kind: "pill", label: "Pill" },
  { kind: "triangle", label: "Triangle" },
  { kind: "diamond", label: "Diamond" },
  { kind: "pentagon", label: "Pentagon" },
  { kind: "hexagon", label: "Hexagon" },
  { kind: "star", label: "Star" },
  { kind: "arrow", label: "Arrow" },
  { kind: "bubble", label: "Speech" },
  { kind: "blob", label: "Blob" },
  { kind: "line", label: "Line" },
];

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
  onOpenLogoMaker,
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
  onUpdateBrandKit: (next: BrandKit) => Promise<void> | void;
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
  onOpenLogoMaker: () => void;
}) {
  const [iconQuery, setIconQuery] = useState("");
  const [tplFilter, setTplFilter] = useState<string>("all");
  const [qrInput, setQrInput] = useState("https://mworld-slate.laflabs-tech.workers.dev");
  const [uploading, setUploading] = useState(false);
  const [bgTolerance, setBgTolerance] = useState(36);
  const [bgBusy, setBgBusy] = useState(false);
  const [editingBrand, setEditingBrand] = useState(false);
  const [applyScope, setApplyScope] = useState<"page" | "deck">("page");
  const fileRef = useRef<HTMLInputElement>(null);
  const pptxRef = useRef<HTMLInputElement>(null);
  const brandLogoRef = useRef<HTMLInputElement>(null);

  const hasSelectedText = page.elements.some(
    (el) => selectedIds.includes(el.id) && (el.type === "text" || el.type === "table"),
  );

  const handleBrandLogoPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Failed to read logo"));
        reader.readAsDataURL(file);
      });
      await onUpdateBrandKit({
        ...brandKit,
        logos: [
          {
            id: makeId("logo"),
            name: file.name.replace(/\.[^.]+$/, ""),
            variant: "primary" as const,
            dataUrl,
            createdAt: Date.now(),
          },
          ...brandKit.logos,
        ].slice(0, 12),
      });
    } finally {
      e.target.value = "";
    }
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
      fontFamily: fontFamily || (preset === "heading" ? brandKit.fonts.heading : brandKit.fonts.body),
      fontSize,
      fontWeight: preset === "heading" ? 800 : preset === "subheading" ? 600 : 400,
      color: "#0F172A",
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
      textColor: "#0F172A",
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
      value: qrInput.trim() || "https://mworld-slate.laflabs-tech.workers.dev",
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
