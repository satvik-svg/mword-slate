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

        <div className="my-1 h-px w-8 bg-[var(--border)]" />

        <button
          onClick={onOpenLogoMaker}
          className="flex w-14 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-medium text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] transition cursor-pointer"
        >
          <Hexagon className="h-4 w-4" />
          <span>Logos</span>
        </button>
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
            {activeTab === "elements" && (
              <>
                <div>
                  <div className="mb-2 text-[11px] font-semibold text-[var(--muted)]">Shapes & Lines</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {SHAPE_LIST.map((s) => (
                      <button
                        key={s.kind}
                        onClick={() => addShape(s.kind)}
                        className="rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-2 py-2.5 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition cursor-pointer"
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[11px] font-semibold text-[var(--muted)]">Charts & Tables</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(["bar", "line", "pie", "donut"] as const).map((ck) => (
                      <button
                        key={ck}
                        onClick={() => addChart(ck)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 text-xs font-medium capitalize text-[var(--fg)] hover:border-[var(--accent)] cursor-pointer"
                      >
                        <BarChart3 className="h-3.5 w-3.5 text-[var(--accent)]" /> {ck}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={addTable}
                    className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] py-2 text-xs font-medium text-[var(--fg)] hover:border-[var(--accent)] cursor-pointer"
                  >
                    <TableIcon className="h-3.5 w-3.5 text-[var(--accent)]" /> Insert Editable Table
                  </button>
                </div>

                <div>
                  <div className="mb-2 text-[11px] font-semibold text-[var(--muted)]">QR Code Generator</div>
                  <div className="flex gap-1.5">
                    <input
                      value={qrInput}
                      onChange={(e) => setQrInput(e.target.value)}
                      placeholder="URL or text…"
                      className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none"
                    />
                    <button
                      onClick={addQr}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--accent)] px-2.5 text-xs font-semibold text-[var(--accent-fg)] cursor-pointer"
                    >
                      <QrCode className="h-3.5 w-3.5" /> Add
                    </button>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[11px] font-semibold text-[var(--muted)]">Vector Icons</div>
                  <div className="relative mb-2">
                    <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-[var(--muted)]" />
                    <input
                      value={iconQuery}
                      onChange={(e) => setIconQuery(e.target.value)}
                      placeholder="Search icons (rocket, leaf, tech…)"
                      className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-1.5 pl-8 pr-2.5 text-xs text-[var(--fg)] outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {filteredIcons.map((ic) => (
                      <button
                        key={ic.id}
                        onClick={() => addIcon(ic.id, ic.label)}
                        title={ic.label}
                        className="flex flex-col items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-[var(--fg)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition cursor-pointer"
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          {ic.paths.map((d, idx) => (
                            <path key={idx} d={d} />
                          ))}
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* TEXT */}
            {activeTab === "text" && (
              <>
                <div className="space-y-2">
                  <button
                    onClick={() => addText("heading")}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-3 text-left text-lg font-extrabold text-[var(--fg)] hover:border-[var(--accent)] cursor-pointer"
                  >
                    Add a heading
                  </button>
                  <button
                    onClick={() => addText("subheading")}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5 text-left text-sm font-semibold text-[var(--fg)] hover:border-[var(--accent)] cursor-pointer"
                  >
                    Add a subheading
                  </button>
                  <button
                    onClick={() => addText("body")}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2 text-left text-xs text-[var(--muted)] hover:border-[var(--accent)] cursor-pointer"
                  >
                    Add a little bit of body text
                  </button>
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
