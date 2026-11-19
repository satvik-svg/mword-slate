"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  FileText,
  Grid,
  Minus,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { LogoMakerModal } from "@/components/logo-maker-modal";
import { PagePreview } from "@/components/page-preview";
import { CanvasStage } from "@/components/studio/canvas-stage";
import { LeftRail, type RailTab } from "@/components/studio/left-rail";
import {
  CommentsDrawer,
  ExportModal,
  MagicResizeModal,
  PresentOverlay,
  ShareModal,
  VersionHistoryModal,
} from "@/components/studio/modals";
import { TopToolbar } from "@/components/studio/top-toolbar";
import { applyStyleToPage } from "@/lib/brand-style";
import { generateThumbnail } from "@/lib/exporter";
import { makeId } from "@/lib/id";
import { importPptxFile } from "@/lib/pptx-import";
import { magicResizePages } from "@/lib/resize";
import {
  DEFAULT_BRAND_KIT,
  DEFAULT_IMAGE_FILTERS,
  type BrandKit,
  type BrandLogoItem,
  type CanvasElement,
  type DesignComment,
  type DesignPage,
  type DesignRecord,
  type DesignVersion,
  type MediaAsset,
  type ShareConfig,
  type TemplateRecord,
} from "@/lib/types";

type Snapshot = {
  pages: DesignPage[];
  width: number;
  height: number;
};

export function StudioEditor({
  initialDesign,
  initialTab = "templates",
  readOnly = false,
  canComment = true,
  shareEndpoint,
}: {
  initialDesign: DesignRecord;
  initialTab?: RailTab | null;
  readOnly?: boolean;
  canComment?: boolean;
  shareEndpoint?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();

  const [title, setTitle] = useState(initialDesign.title);
  const [width, setWidth] = useState(initialDesign.width);
  const [height, setHeight] = useState(initialDesign.height);
  const [pages, setPages] = useState<DesignPage[]>(
    initialDesign.pages.length
      ? initialDesign.pages
      : [{ id: makeId("pg"), name: "Page 1", background: "#FFFFFF", elements: [] }],
  );
  const [activePageIdx, setActivePageIdx] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (initialTab === "photo") {
      const firstImg = initialDesign.pages[0]?.elements.find((e) => e.type === "image");
      return firstImg ? [firstImg.id] : [];
    }
    return [];
  });
  const [comments, setComments] = useState<DesignComment[]>(initialDesign.comments ?? []);
  const [versions, setVersions] = useState<DesignVersion[]>(initialDesign.versions ?? []);
  const [shareConfig, setShareConfig] = useState<ShareConfig>(
    initialDesign.shareConfig ?? { linkAccess: "off", people: [] },
  );

  // Studio UI states
  const [railTab, setRailTab] = useState<RailTab | null>(() => {
    if (readOnly) return null;
    if (initialTab && initialTab !== "templates") return initialTab;
    const hasContent = (initialDesign.pages[0]?.elements.length ?? 0) > 0;
    return hasContent ? null : initialTab;
  });
  const stageContainerRef = useRef<HTMLDivElement>(null);
  const [autoFit, setAutoFit] = useState(true);
  const [zoom, setZoom] = useState(() => {
    const maxDim = Math.max(initialDesign.width, initialDesign.height);
    return Math.max(0.2, Math.min(0.85, +(760 / maxDim).toFixed(2)));
  });
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [gridView, setGridView] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);

  const computeFitZoom = useCallback(() => {
    const el = stageContainerRef.current;
    if (!el) return null;
    const availW = Math.max(240, el.clientWidth - 112);
    const availH = Math.max(200, el.clientHeight - 168);
    const ratio = Math.min(availW / Math.max(1, width), availH / Math.max(1, height));
    const floored = Math.floor(ratio * 100) / 100;
    return Math.max(0.15, Math.min(1, floored));
  }, [width, height]);

  useEffect(() => {
    if (!autoFit) return;
    const sync = () => {
      const next = computeFitZoom();
      if (next !== null) setZoom(next);
    };
    sync();
    const el = stageContainerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => sync());
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoFit, computeFitZoom]);

  // Modals
  const [exportOpen, setExportOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [presentOpen, setPresentOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentMode, setCommentMode] = useState(false);
  const [logoMakerOpen, setLogoMakerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Workspace data
  const [brandKit, setBrandKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [teamTemplates, setTeamTemplates] = useState<TemplateRecord[]>([]);

  // Drawing & Style copy
  const [drawTool, setDrawTool] = useState<{
    active: boolean;
    brush: "pen" | "marker" | "highlighter";
    color: string;
    strokeWidth: number;
  }>({
    active: false,
    brush: "pen",
    color: "#0F172A",
    strokeWidth: 4,
  });
  const [copiedStyle, setCopiedStyle] = useState<Partial<CanvasElement> | null>(null);
  const clipboardRef = useRef<CanvasElement[]>([]);

  // Undo / Redo stack
  const historyRef = useRef<Snapshot[]>([{ pages: initialDesign.pages, width: initialDesign.width, height: initialDesign.height }]);
  const historyIdxRef = useRef(0);
  const [historyMeta, setHistoryMeta] = useState({ idx: 0, len: 1 });

  const activePage = pages[activePageIdx] ?? pages[0];
  const selectedElements = useMemo(
    () => activePage.elements.filter((el) => selectedIds.includes(el.id)),
    [activePage.elements, selectedIds],
  );
  const singleSelected = selectedElements.length === 1 ? selectedElements[0] : null;

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 2600);
  }, []);

  // Load workspace assets (Brand Kit, Media, Team Templates)
  useEffect(() => {
    if (readOnly) return;
    void fetch("/api/brand-kit", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { brandKit?: BrandKit } | null) => {
        if (d?.brandKit) setBrandKit(d.brandKit);
      })
      .catch(() => undefined);

    void fetch("/api/media", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { media?: MediaAsset[] } | null) => {
        if (d?.media) setMedia(d.media);
      })
      .catch(() => undefined);

    void fetch("/api/templates", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { templates?: TemplateRecord[] } | null) => {
        if (d?.templates) setTeamTemplates(d.templates);
      })
      .catch(() => undefined);
  }, [readOnly]);

  // History helpers
  const pushHistory = useCallback((nextPages: DesignPage[], nextW = width, nextH = height) => {
    const snap: Snapshot = {
      pages: JSON.parse(JSON.stringify(nextPages)) as DesignPage[],
      width: nextW,
      height: nextH,
    };
    const truncated = historyRef.current.slice(0, historyIdxRef.current + 1);
    truncated.push(snap);
    if (truncated.length > 50) truncated.shift();
    historyRef.current = truncated;
    historyIdxRef.current = truncated.length - 1;
    setHistoryMeta({ idx: historyIdxRef.current, len: truncated.length });
    setSaveStatus("unsaved");
  }, [width, height]);

  const commitCurrentToHistory = useCallback(() => {
    pushHistory(pages, width, height);
  }, [pages, width, height, pushHistory]);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    const snap = historyRef.current[historyIdxRef.current];
    setPages(JSON.parse(JSON.stringify(snap.pages)) as DesignPage[]);
    setWidth(snap.width);
    setHeight(snap.height);
    setSelectedIds([]);
    setHistoryMeta({ idx: historyIdxRef.current, len: historyRef.current.length });
    setSaveStatus("unsaved");
  }, []);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    const snap = historyRef.current[historyIdxRef.current];
    setPages(JSON.parse(JSON.stringify(snap.pages)) as DesignPage[]);
    setWidth(snap.width);
    setHeight(snap.height);
    setSelectedIds([]);
    setHistoryMeta({ idx: historyIdxRef.current, len: historyRef.current.length });
    setSaveStatus("unsaved");
  }, []);

  // Debounced auto-save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstMountRef = useRef(true);

  const persistDesign = useCallback(
    async (overrides?: Partial<DesignRecord>) => {
      if (readOnly && !overrides?.comments) return;
      setSaveStatus("saving");
      try {
        let thumbnail = initialDesign.thumbnail;
        if (!readOnly && pages[0]) {
          try {
            thumbnail = await generateThumbnail(pages[0], width, height);
          } catch {
            // keep existing thumbnail
          }
        }
        const endpoint = shareEndpoint || `/api/designs/${initialDesign.id}`;
        const body = readOnly
          ? { comments: overrides?.comments ?? comments }
          : {
              title: overrides?.title ?? title,
              width: overrides?.width ?? width,
              height: overrides?.height ?? height,
              pages: overrides?.pages ?? pages,
              comments: overrides?.comments ?? comments,
              versions: overrides?.versions ?? versions,
              shareConfig: overrides?.shareConfig ?? shareConfig,
              thumbnail,
            };
        const res = await fetch(endpoint, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) setSaveStatus("saved");
      } catch {
        setSaveStatus("unsaved");
      }
    },
    [
      readOnly,
      shareEndpoint,
      initialDesign.id,
      initialDesign.thumbnail,
      title,
      width,
      height,
      pages,
      comments,
      versions,
      shareConfig,
    ],
  );

  useEffect(() => {
    if (firstMountRef.current) {
      firstMountRef.current = false;
      return;
    }
    if (readOnly) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void persistDesign();
    }, 1100);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [title, width, height, pages, shareConfig, versions, readOnly, persistDesign]);

  // Element & page mutation helpers
  const updateActivePageElements = useCallback(
    (updater: (els: CanvasElement[]) => CanvasElement[]) => {
      setPages((prev) =>
        prev.map((p, idx) => (idx === activePageIdx ? { ...p, elements: updater(p.elements) } : p)),
      );
      setSaveStatus("unsaved");
    },
    [activePageIdx],
  );

  const updateActivePage = useCallback(
    (patch: Partial<DesignPage>) => {
      setPages((prev) => {
        const next = prev.map((p, idx) => (idx === activePageIdx ? { ...p, ...patch } : p));
        pushHistory(next);
        return next;
      });
    },
    [activePageIdx, pushHistory],
  );

  const handleAddElement = useCallback(
    (el: CanvasElement) => {
      setPages((prev) => {
        const next = prev.map((p, idx) =>
          idx === activePageIdx ? { ...p, elements: [...p.elements, el] } : p,
        );
        pushHistory(next);
        return next;
      });
      setSelectedIds([el.id]);
    },
    [activePageIdx, pushHistory],
  );

  const handleUpdateElement = useCallback(
    (id: string, patch: Partial<CanvasElement>, commit = false) => {
      setPages((prev) => {
        const next = prev.map((p, idx) =>
          idx === activePageIdx
            ? {
                ...p,
                elements: p.elements.map((el) =>
                  el.id === id ? ({ ...el, ...patch } as CanvasElement) : el,
                ),
              }
            : p,
        );
        if (commit) pushHistory(next);
        return next;
      });
      setSaveStatus("unsaved");
    },
    [activePageIdx, pushHistory],
  );

  const handleDeleteElements = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      setPages((prev) => {
        const next = prev.map((p, idx) =>
          idx === activePageIdx
            ? { ...p, elements: p.elements.filter((el) => !ids.includes(el.id)) }
            : p,
        );
        pushHistory(next);
        return next;
      });
      setSelectedIds([]);
    },
    [activePageIdx, pushHistory],
  );

  const handleDuplicateSelected = useCallback(() => {
    if (!selectedIds.length) return;
    const clones = activePage.elements
      .filter((el) => selectedIds.includes(el.id))
      .map((el) => ({
        ...JSON.parse(JSON.stringify(el)),
        id: makeId("el"),
        x: el.x + 28,
        y: el.y + 28,
        groupId: undefined,
      })) as CanvasElement[];
    setPages((prev) => {
      const next = prev.map((p, idx) =>
        idx === activePageIdx ? { ...p, elements: [...p.elements, ...clones] } : p,
      );
      pushHistory(next);
      return next;
    });
    setSelectedIds(clones.map((c) => c.id));
  }, [activePage.elements, activePageIdx, selectedIds, pushHistory]);

  const handleGroupToggle = useCallback(() => {
    if (!selectedElements.length) return;
    const allGrouped = selectedElements.every((e) => !!e.groupId);
    const gid = allGrouped ? undefined : makeId("grp");
    setPages((prev) => {
      const next = prev.map((p, idx) =>
        idx === activePageIdx
          ? {
              ...p,
              elements: p.elements.map((el) =>
                selectedIds.includes(el.id) ? { ...el, groupId: gid } : el,
              ),
            }
          : p,
      );
      pushHistory(next);
      return next;
    });
  }, [activePageIdx, selectedElements, selectedIds, pushHistory]);

  const handleAlign = useCallback(
    (mode: "left" | "centerX" | "right" | "top" | "centerY" | "bottom") => {
      if (!selectedIds.length) return;
      setPages((prev) => {
        const next = prev.map((p, idx) =>
          idx === activePageIdx
            ? {
                ...p,
                elements: p.elements.map((el) => {
                  if (!selectedIds.includes(el.id) || el.locked) return el;
                  if (mode === "left") return { ...el, x: 0 };
                  if (mode === "centerX") return { ...el, x: Math.round((width - el.width) / 2) };
                  if (mode === "right") return { ...el, x: width - el.width };
                  if (mode === "top") return { ...el, y: 0 };
                  if (mode === "centerY") return { ...el, y: Math.round((height - el.height) / 2) };
                  return { ...el, y: height - el.height };
                }),
              }
            : p,
        );
        pushHistory(next);
        return next;
      });
    },
    [activePageIdx, height, width, selectedIds, pushHistory],
  );

  const handleReorderLayer = useCallback(
    (id: string, dir: "up" | "down") => {
      setPages((prev) => {
        const next = prev.map((p, idx) => {
          if (idx !== activePageIdx) return p;
          const arr = [...p.elements];
          const pos = arr.findIndex((e) => e.id === id);
          if (pos === -1) return p;
          const target = dir === "up" ? Math.min(arr.length - 1, pos + 1) : Math.max(0, pos - 1);
          const [moved] = arr.splice(pos, 1);
          arr.splice(target, 0, moved);
          return { ...p, elements: arr };
        });
        pushHistory(next);
        return next;
      });
    },
    [activePageIdx, pushHistory],
  );

  const handleCopyStyle = useCallback(() => {
    if (!singleSelected) return;
    if (singleSelected.type === "text") {
      setCopiedStyle({
        fontFamily: singleSelected.fontFamily,
        fontWeight: singleSelected.fontWeight,
        color: singleSelected.color,
        italic: singleSelected.italic,
        letterSpacing: singleSelected.letterSpacing,
      } as Partial<CanvasElement>);
    } else if (singleSelected.type === "shape") {
      setCopiedStyle({
        fill: singleSelected.fill,
        gradientTo: singleSelected.gradientTo,
        stroke: singleSelected.stroke,
        strokeWidth: singleSelected.strokeWidth,
        borderRadius: singleSelected.borderRadius,
      } as Partial<CanvasElement>);
    } else if (singleSelected.type === "image") {
      setCopiedStyle({
        filters: singleSelected.filters,
        borderRadius: singleSelected.borderRadius,
        mask: singleSelected.mask,
      } as Partial<CanvasElement>);
    }
    notify("Style copied");
  }, [singleSelected, notify]);

  const handlePasteStyle = useCallback(() => {
    if (!copiedStyle || !singleSelected) return;
    handleUpdateElement(singleSelected.id, copiedStyle, true);
    notify("Style applied");
  }, [copiedStyle, singleSelected, handleUpdateElement, notify]);

  const styleShuffleRef = useRef<{ key: string; variant: number }>({ key: "", variant: 0 });

  const handleUpdateBrandKit = useCallback(
    async (nextKit: BrandKit) => {
      const updated: BrandKit = { ...nextKit, updatedAt: Date.now() };
      setBrandKit(updated);
      try {
        await fetch("/api/brand-kit", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        });
      } catch {
        // keep optimistic local state
      }
    },
    [],
  );

  const handleApplyBrandStyle = useCallback(
    (opts?: {
      mode?: "all" | "colors" | "fonts";
      scope?: "page" | "deck";
      colors?: string[];
      label?: string;
    }) => {
      const mode = opts?.mode ?? "all";
      const scope = opts?.scope ?? "page";
      const colors = opts?.colors ?? brandKit.colors;
      const applyColors = mode === "all" || mode === "colors";
      const applyFonts = mode === "all" || mode === "fonts";

      const key = `${mode}:${scope}:${opts?.label ?? "brand"}:${colors.join(",")}`;
      const nextVariant =
        applyColors && styleShuffleRef.current.key === key
          ? (styleShuffleRef.current.variant + 1) % 3
          : 0;
      styleShuffleRef.current = { key, variant: nextVariant };

      setPages((prev) => {
        const next = prev.map((p, idx) => {
          if (scope === "page" && idx !== activePageIdx) return p;
          return applyStyleToPage(p, {
            colors,
            fonts: {
              heading: brandKit.fonts.heading,
              body: brandKit.fonts.body,
            },
            applyColors,
            applyFonts,
            variant: nextVariant,
            pageWidth: width,
            pageHeight: height,
          });
        });
        pushHistory(next);
        return next;
      });

      const targetLabel =
        scope === "deck" && pages.length > 1 ? `all ${pages.length} pages` : "this page";
      if (mode === "fonts") {
        notify(`Applied brand fonts to ${targetLabel}`);
      } else if (opts?.label) {
        notify(
          `Applied ${opts.label} to ${targetLabel}${nextVariant > 0 ? ` (variation ${nextVariant + 1})` : ""}`,
        );
      } else {
        notify(
          `Applied brand ${mode === "colors" ? "colors" : "style"} to ${targetLabel}${nextVariant > 0 ? ` (variation ${nextVariant + 1})` : ""}`,
        );
      }
    },
    [activePageIdx, brandKit, height, pages.length, pushHistory, width, notify],
  );

  const handleApplySwatchColor = useCallback(
    (color: string) => {
      if (selectedIds.length === 0) {
        updateActivePage({ background: color, backgroundGradientTo: undefined });
        notify(`Page background set to ${color}`);
        return;
      }

      setPages((prev) => {
        const next = prev.map((p, idx) => {
          if (idx !== activePageIdx) return p;
          return {
            ...p,
            elements: p.elements.map((el) => {
              if (!selectedIds.includes(el.id)) return el;
              if (el.type === "text") return { ...el, color };
              if (el.type === "shape") {
                if (el.shape === "line" || el.shape === "arrow") {
                  return { ...el, fill: color, stroke: color };
                }
                if (el.fill === "transparent" || el.fill === "none") {
                  return { ...el, stroke: color };
                }
                return { ...el, fill: color, gradientTo: undefined };
              }
              if (el.type === "icon") return { ...el, color };
              if (el.type === "draw") return { ...el, color };
              if (el.type === "chart") return { ...el, accentColor: color };
              if (el.type === "table") return { ...el, headerBg: color };
              if (el.type === "qrcode") return { ...el, fgColor: color };
              return el;
            }),
          };
        });
        pushHistory(next);
        return next;
      });
    },
    [activePageIdx, selectedIds, pushHistory, updateActivePage, notify],
  );

  const handleApplyBrandFont = useCallback(
    (font: string): boolean => {
      const hasTextOrTable = selectedElements.some(
        (el) => el.type === "text" || el.type === "table",
      );
      if (!hasTextOrTable) return false;
      setPages((prev) => {
        const next = prev.map((p, idx) => {
          if (idx !== activePageIdx) return p;
          return {
            ...p,
            elements: p.elements.map((el) => {
              if (!selectedIds.includes(el.id)) return el;
              if (el.type === "text" || el.type === "table") {
                return { ...el, fontFamily: font };
              }
              return el;
            }),
          };
        });
        pushHistory(next);
        return next;
      });
      notify(`Font set to ${font}`);
      return true;
    },
    [activePageIdx, selectedElements, selectedIds, pushHistory, notify],
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "0") {
        e.preventDefault();
        setAutoFit(true);
        const fit = computeFitZoom();
        if (fit !== null) setZoom(fit);
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDuplicateSelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        handleGroupToggle();
        return;
      }
      if (mod && e.key.toLowerCase() === "c" && selectedIds.length) {
        clipboardRef.current = JSON.parse(JSON.stringify(selectedElements)) as CanvasElement[];
        return;
      }
      if (mod && e.key.toLowerCase() === "v" && clipboardRef.current.length) {
        e.preventDefault();
        const pasted = clipboardRef.current.map((el) => ({
          ...JSON.parse(JSON.stringify(el)),
          id: makeId("el"),
          x: el.x + 24,
          y: el.y + 24,
        })) as CanvasElement[];
        setPages((prev) => {
          const next = prev.map((p, idx) =>
            idx === activePageIdx ? { ...p, elements: [...p.elements, ...pasted] } : p,
          );
          pushHistory(next);
          return next;
        });
