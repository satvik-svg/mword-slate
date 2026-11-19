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
