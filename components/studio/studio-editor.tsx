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
        setSelectedIds(pasted.map((p) => p.id));
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIds.length) {
        e.preventDefault();
        handleDeleteElements(selectedIds);
        return;
      }
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) &&
        selectedIds.length
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        updateActivePageElements((els) =>
          els.map((el) =>
            selectedIds.includes(el.id) && !el.locked
              ? { ...el, x: el.x + dx, y: el.y + dy }
              : el,
          ),
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    readOnly,
    undo,
    redo,
    computeFitZoom,
    handleDuplicateSelected,
    handleGroupToggle,
    handleDeleteElements,
    selectedIds,
    selectedElements,
    activePageIdx,
    pushHistory,
    updateActivePageElements,
  ]);

  // Page management
  const addPage = () => {
    const newPage: DesignPage = {
      id: makeId("pg"),
      name: `Page ${pages.length + 1}`,
      background: "#FFFFFF",
      elements: [],
    };
    const next = [...pages, newPage];
    setPages(next);
    setActivePageIdx(next.length - 1);
    setSelectedIds([]);
    pushHistory(next);
  };

  const duplicatePage = (idx: number) => {
    const src = pages[idx];
    if (!src) return;
    const copy: DesignPage = {
      ...JSON.parse(JSON.stringify(src)),
      id: makeId("pg"),
      name: `${src.name} (Copy)`,
      elements: src.elements.map((e) => ({ ...JSON.parse(JSON.stringify(e)), id: makeId("el") })),
    };
    const next = [...pages.slice(0, idx + 1), copy, ...pages.slice(idx + 1)];
    setPages(next);
    setActivePageIdx(idx + 1);
    pushHistory(next);
  };

  const deletePage = (idx: number) => {
    if (pages.length <= 1) return;
    const next = pages.filter((_, i) => i !== idx);
    setPages(next);
    setActivePageIdx(Math.max(0, Math.min(idx, next.length - 1)));
    setSelectedIds([]);
    pushHistory(next);
  };

  // Comments
  const handlePinComment = (xPct: number, yPct: number) => {
    const text = window.prompt("Add comment:");
    if (!text?.trim()) {
      setCommentMode(false);
      return;
    }
    const nextComment: DesignComment = {
      id: makeId("cmt"),
      pageId: activePage.id,
      x: xPct,
      y: yPct,
      authorName: user?.display_name || "Guest",
      authorEmail: user?.email || "",
      text: text.trim(),
      createdAt: Date.now(),
      replies: [],
    };
    const nextComments = [...comments, nextComment];
    setComments(nextComments);
    setCommentMode(false);
    setCommentsOpen(true);
    void persistDesign({ comments: nextComments });
  };

  const handleReplyComment = (commentId: string, text: string) => {
    const nextComments = comments.map((c) =>
      c.id === commentId
        ? {
            ...c,
            replies: [
              ...c.replies,
              {
                id: makeId("rep"),
                authorName: user?.display_name || "Guest",
                authorEmail: user?.email || "",
                text,
                createdAt: Date.now(),
              },
            ],
          }
        : c,
    );
    setComments(nextComments);
    void persistDesign({ comments: nextComments });
  };

  const handleResolveComment = (commentId: string) => {
    const nextComments = comments.map((c) =>
      c.id === commentId ? { ...c, resolved: true } : c,
    );
    setComments(nextComments);
    void persistDesign({ comments: nextComments });
  };

  // Magic Resize
  const handleMagicResize = async (newW: number, newH: number, asCopy: boolean) => {
    const resizedPages = magicResizePages(pages, width, height, newW, newH);
    if (asCopy) {
      const res = await fetch("/api/designs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${title} (${newW}×${newH})`,
          category: initialDesign.category,
          width: newW,
          height: newH,
          pages: resizedPages,
        }),
      });
      const data = (await res.json().catch(() => null)) as { design?: DesignRecord } | null;
      if (data?.design) {
        router.push(`/design/${data.design.id}`);
      }
      return;
    }
    setWidth(newW);
    setHeight(newH);
    setPages(resizedPages);
    pushHistory(resizedPages, newW, newH);
    notify(`Resized to ${newW} × ${newH} px`);
  };

  // PPTX Import inside Editor
  const handleImportPptx = async (file: File) => {
    try {
      notify("Importing PowerPoint slides…");
      const imported = await importPptxFile(file);
      setWidth(imported.width);
      setHeight(imported.height);
      setPages(imported.pages);
      setActivePageIdx(0);
      setTitle(imported.title);
      pushHistory(imported.pages, imported.width, imported.height);
      notify(`Imported ${imported.pages.length} editable slides!`);
    } catch {
      notify("Could not read PPTX file");
    }
  };

  // Upload media
  const handleUploadMedia = async (asset: {
    name: string;
    mimeType: string;
    dataUrl: string;
    width: number;
    height: number;
    sizeBytes: number;
  }) => {
    const res = await fetch("/api/media", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(asset),
    });
    const data = (await res.json().catch(() => null)) as { asset?: MediaAsset } | null;
    if (data?.asset) {
      setMedia((prev) => [data.asset!, ...prev]);
      return data.asset;
    }
    return null;
  };

  const handleDeleteMedia = async (id: string) => {
    setMedia((prev) => prev.filter((m) => m.id !== id));
    await fetch(`/api/media?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
  };

  const handleSaveAsTeamTemplate = async () => {
    let thumb = "";
    try {
      thumb = await generateThumbnail(pages[0], width, height);
    } catch {
      // ignore
    }
    const res = await fetch("/api/templates", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category: initialDesign.category,
        width,
        height,
        thumbnail: thumb,
        pages,
      }),
    });
    const data = (await res.json().catch(() => null)) as { template?: TemplateRecord } | null;
    if (data?.template) {
      setTeamTemplates((prev) => [data.template!, ...prev]);
      notify("Saved to Team Templates");
    }
  };

  const handleSaveLogoToBrand = async (
    logos: BrandLogoItem[],
    colors: string[],
    font: string,
  ) => {
    const nextKit: BrandKit = {
      ...brandKit,
      logos: [...logos, ...brandKit.logos].slice(0, 12),
      colors: Array.from(new Set([...colors, ...brandKit.colors])).slice(0, 8),
      fonts: { ...brandKit.fonts, heading: font },
      updatedAt: Date.now(),
    };
    setBrandKit(nextKit);
    await fetch("/api/brand-kit", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextKit),
    });
    notify("Logo & colors saved to Brand Kit");
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      <TopToolbar
        title={title}
        onTitleChange={setTitle}
        saveStatus={saveStatus}
        canUndo={historyMeta.idx > 0}
        canRedo={historyMeta.idx < historyMeta.len - 1}
        onUndo={undo}
        onRedo={redo}
        onOpenResize={() => setResizeOpen(true)}
        onOpenVersions={() => setVersionsOpen(true)}
        onToggleComments={() => setCommentsOpen((o) => !o)}
        commentCount={comments.filter((c) => !c.resolved).length}
        onOpenPresent={() => setPresentOpen(true)}
        onOpenShare={() => setShareOpen(true)}
        onOpenExport={() => setExportOpen(true)}
        readOnly={readOnly}
        page={activePage}
        onUpdatePage={updateActivePage}
        selectedElements={selectedElements}
        onUpdateElement={handleUpdateElement}
        onDuplicateSelected={handleDuplicateSelected}
        onDeleteSelected={() => handleDeleteElements(selectedIds)}
        onGroupToggle={handleGroupToggle}
        onAlign={handleAlign}
        onCopyStyle={handleCopyStyle}
        onPasteStyle={handlePasteStyle}
        hasCopiedStyle={!!copiedStyle}
        onOpenPhotoTab={() => setRailTab("photo")}
      />

      {/* Main Studio Body */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {!readOnly && (
          <LeftRail
            activeTab={railTab}
            onTabChange={setRailTab}
            width={width}
            height={height}
            page={activePage}
            selectedElement={singleSelected}
            selectedIds={selectedIds}
            onSelect={setSelectedIds}
            onAddElement={handleAddElement}
            onUpdateElement={handleUpdateElement}
            onDeleteElements={handleDeleteElements}
            onReorderLayer={handleReorderLayer}
            onApplyTemplate={(tplPages, tw, th) => {
              setWidth(tw);
              setHeight(th);
              setPages(tplPages);
              setActivePageIdx(0);
              setSelectedIds([]);
              pushHistory(tplPages, tw, th);
              notify("Template applied");
            }}
            teamTemplates={teamTemplates}
            onSaveAsTeamTemplate={handleSaveAsTeamTemplate}
            media={media}
            onUploadMedia={handleUploadMedia}
            onDeleteMedia={handleDeleteMedia}
            onImportPptx={handleImportPptx}
            brandKit={brandKit}
            pageCount={pages.length}
            onUpdateBrandKit={handleUpdateBrandKit}
            onApplyBrandStyle={handleApplyBrandStyle}
            onApplySwatchColor={handleApplySwatchColor}
            onApplyBrandFont={handleApplyBrandFont}
            drawTool={drawTool}
            onChangeDrawTool={setDrawTool}
            onOpenLogoMaker={() => setLogoMakerOpen(true)}
          />
        )}

        {/* Center Stage or Grid View */}
        <div
          ref={stageContainerRef}
          className="flex min-w-0 flex-1 flex-col overflow-hidden"
        >
          {gridView ? (
            <div className="flex-1 overflow-y-auto bg-[var(--stage)] p-8">
              <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {pages.map((p, idx) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setActivePageIdx(idx);
                      setGridView(false);
                    }}
                    className={`flex flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] p-3 shadow-md transition cursor-pointer ${
                      idx === activePageIdx
                        ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                        : "border-[var(--border)] hover:border-[var(--accent)]"
                    }`}
                  >
                    <div className="flex h-44 items-center justify-center rounded-xl bg-[var(--stage)] p-2">
                      <PagePreview page={p} width={width} height={height} maxWidth={260} maxHeight={160} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {idx + 1}. {p.name}
                      </span>
                      {!readOnly && (
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicatePage(idx);
                            }}
                            className="rounded p-1 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          {pages.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deletePage(idx);
                              }}
                              className="rounded p-1 text-[var(--muted)] hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <CanvasStage
              page={activePage}
              width={width}
              height={height}
              zoom={zoom}
              selectedIds={selectedIds}
              onSelect={setSelectedIds}
              onUpdateElements={updateActivePageElements}
              onCommitHistory={commitCurrentToHistory}
              onAddElement={handleAddElement}
              readOnly={readOnly}
              drawTool={drawTool}
              commentMode={commentMode && canComment}
              comments={comments}
              onPinComment={handlePinComment}
              onSelectComment={() => setCommentsOpen(true)}
              onQuickAddHeading={() => {
                const scale = Math.max(0.6, Math.min(1.4, width / 1080));
                const fontSize = Math.round(72 * scale);
                const w = Math.round(Math.min(width * 0.72, 760 * scale));
                const h = Math.round(fontSize * 1.45);
                handleAddElement({
                  id: makeId("el"),
                  type: "text",
                  name: "Heading",
                  text: "Your headline here",
                  x: Math.round((width - w) / 2),
                  y: Math.round((height - h) / 2),
                  width: w,
                  height: h,
                  rotation: 0,
                  opacity: 1,
                  fontFamily: brandKit.fonts.heading || "Plus Jakarta Sans",
                  fontSize,
                  fontWeight: 700,
                  color: "#111114",
                  align: "center",
                  lineHeight: 1.15,
                  letterSpacing: -1,
                });
              }}
              onQuickOpenUploads={() => setRailTab("uploads")}
              onQuickOpenTemplates={() => setRailTab("templates")}
            />
          )}

          {/* Speaker Notes Bar */}
          {notesOpen && !readOnly && (
            <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
              <div className="mb-1 text-[11px] font-semibold text-[var(--muted)]">
                Speaker Notes — {activePage.name}
              </div>
              <textarea
                value={activePage.notes || ""}
                onChange={(e) => updateActivePage({ notes: e.target.value })}
                rows={2}
                placeholder="Write talking points for Present Mode or PPTX export…"
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--fg)] outline-none"
              />
            </div>
          )}

          {/* Bottom Page Filmstrip + Zoom Controls */}
          <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-3">
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {pages.map((p, idx) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setActivePageIdx(idx);
                    setSelectedIds([]);
                  }}
                  className={`group flex shrink-0 items-center gap-2 rounded-lg border px-2 py-1 text-xs transition cursor-pointer ${
                    idx === activePageIdx
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] font-semibold"
                      : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)]"
                  }`}
                >
                  <span>{idx + 1}</span>
                  <span className="max-w-[80px] truncate">{p.name}</span>
                  {!readOnly && pages.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deletePage(idx);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-rose-500 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {!readOnly && (
                <>
                  <button
                    onClick={addPage}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Page
                  </button>
                  <button
                    onClick={() => duplicatePage(activePageIdx)}
                    title="Duplicate current page"
                    className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>

            <div className="flex shrink-0 items-center gap-2 text-xs">
              {!readOnly && (
                <button
                  onClick={() => setNotesOpen((n) => !n)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium cursor-pointer ${
                    notesOpen
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" /> Notes
                </button>
              )}

              <button
                onClick={() => setGridView((g) => !g)}
                className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium cursor-pointer ${
                  gridView
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <Grid className="h-3.5 w-3.5" /> Grid
              </button>

              <div className="h-4 w-px bg-[var(--border)]" />

              <button
                onClick={() => {
                  setAutoFit(false);
                  setZoom((z) => Math.max(0.15, +(z - 0.1).toFixed(2)));
                }}
                title="Zoom out"
                aria-label="Zoom out"
                className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] cursor-pointer"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setAutoFit(true);
                  const fit = computeFitZoom();
                  if (fit !== null) setZoom(fit);
                }}
                title="Fit canvas to screen (⌘0)"
                className="w-12 rounded py-0.5 text-center font-semibold text-[var(--fg)] hover:bg-[var(--surface-2)] cursor-pointer"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={() => {
                  setAutoFit(false);
                  setZoom((z) => Math.min(2.5, +(z + 0.1).toFixed(2)));
                }}
                title="Zoom in"
                aria-label="Zoom in"
                className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Comments Drawer */}
        <CommentsDrawer
          open={commentsOpen}
          onClose={() => {
            setCommentsOpen(false);
            setCommentMode(false);
          }}
          comments={comments}
          activePageId={activePage.id}
          commentMode={commentMode}
          onToggleCommentMode={() => setCommentMode((m) => !m)}
          onReply={handleReplyComment}
          onResolve={handleResolveComment}
        />
      </div>

      {/* Modals */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title={title}
        pages={pages}
        activePageIndex={activePageIdx}
        width={width}
        height={height}
      />

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        designId={initialDesign.id}
        shareConfig={shareConfig}
        onChangeShare={(next) => {
          setShareConfig(next);
          void persistDesign({ shareConfig: next });
        }}
      />

      <MagicResizeModal
        open={resizeOpen}
        onClose={() => setResizeOpen(false)}
        currentWidth={width}
        currentHeight={height}
        onResize={handleMagicResize}
      />

      <VersionHistoryModal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        versions={versions}
        onSaveVersion={(label) => {
          const snap: DesignVersion = {
            id: makeId("ver"),
            label,
            createdAt: Date.now(),
            createdBy: user?.display_name || "You",
            pages: JSON.parse(JSON.stringify(pages)) as DesignPage[],
            width,
            height,
          };
          const nextVersions = [snap, ...versions].slice(0, 20);
          setVersions(nextVersions);
          void persistDesign({ versions: nextVersions });
          notify(`Saved checkpoint "${label}"`);
        }}
        onRestoreVersion={(v) => {
          setWidth(v.width);
          setHeight(v.height);
          setPages(JSON.parse(JSON.stringify(v.pages)) as DesignPage[]);
          setActivePageIdx(0);
          setSelectedIds([]);
          pushHistory(v.pages, v.width, v.height);
          notify(`Restored "${v.label}"`);
        }}
      />

      <PresentOverlay
        open={presentOpen}
        onClose={() => setPresentOpen(false)}
        pages={pages}
        initialIndex={activePageIdx}
        width={width}
        height={height}
      />

      <LogoMakerModal
        open={logoMakerOpen}
        onClose={() => setLogoMakerOpen(false)}
        onInsertOnCanvas={(logoName, dataUrl) => {
          const size = Math.round(Math.min(width, height) * 0.34);
          handleAddElement({
            id: makeId("el"),
            type: "image",
            name: logoName,
            src: dataUrl,
            x: Math.round((width - size) / 2),
            y: Math.round((height - size) / 2),
            width: size,
            height: size,
            rotation: 0,
            opacity: 1,
            borderRadius: 0,
            fit: "contain",
            mask: "none",
            filters: { ...DEFAULT_IMAGE_FILTERS },
          });
          notify(`Inserted "${logoName}" onto slide`);
        }}
        onOpenInEditor={async (logoTitle, page) => {
          await persistDesign();
          const res = await fetch("/api/designs", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: logoTitle,
              category: "logo",
              width: 1000,
              height: 1000,
              pages: [page],
            }),
          });
          const data = (await res.json().catch(() => null)) as { design?: DesignRecord } | null;
          if (data?.design) {
            router.push(`/design/${data.design.id}`);
          } else {
            notify("Could not create new logo file");
          }
        }}
        onSaveToBrandKit={handleSaveLogoToBrand}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
