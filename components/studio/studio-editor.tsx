"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PagePreview } from "@/components/page-preview";
import { CanvasStage } from "@/components/studio/canvas-stage";
import { DataEditorPanel } from "@/components/studio/data-editor-panel";
import { LeftRail, type RailTab } from "@/components/studio/left-rail";
import { MagicEraserModal } from "@/components/studio/magic-eraser-modal";
import {
  CommentsDrawer,
  ExportModal,
  MagicResizeModal,
  PresentOverlay,
  ShareModal,
  VersionHistoryModal,
} from "@/components/studio/modals";
import { PageStrip } from "@/components/studio/page-strip";
import { TopToolbar } from "@/components/studio/top-toolbar";
import {
  applyStyleToPage,
  buildSwatchChartShades,
  isLightColor,
  pickContrastingText,
} from "@/lib/brand-style";
import {
  type CollabClientMessage,
  type CollabPeer,
  type CollabServerMessage,
} from "@/lib/collab";
import { syncCustomFonts } from "@/lib/custom-fonts";
import { generateThumbnail } from "@/lib/exporter";
import { computeAlignElements, computeDistributeElements } from "@/lib/geometry";
import { makeId } from "@/lib/id";
import { importPptxFile } from "@/lib/pptx-import";
import { magicResizePages } from "@/lib/resize";
import {
  DEFAULT_BRAND_KIT,
  type BrandKit,
  type CanvasElement,
  type CustomFontItem,
  type DesignComment,
  type DesignPage,
  type DesignRecord,
  type DesignVersion,
  type ImageElement,
  type MediaAsset,
  type ShareConfig,
  type TemplateRecord,
} from "@/lib/types";

type Snapshot = {
  pages: DesignPage[];
  width: number;
  height: number;
};

type CopiedStyleState = {
  type: CanvasElement["type"];
  patch: Partial<CanvasElement>;
};

export function StudioEditor({
  initialDesign,
  initialTab = "templates",
  readOnly = false,
  canComment = true,
  shareEndpoint,
  initialCustomFonts,
}: {
  initialDesign: DesignRecord;
  initialTab?: RailTab | null;
  readOnly?: boolean;
  canComment?: boolean;
  shareEndpoint?: string;
  initialCustomFonts?: CustomFontItem[];
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
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved" | "error">("saved");
  const [gridView, setGridView] = useState(false);
  const [gridDragIdx, setGridDragIdx] = useState<number | null>(null);
  const [gridOverIdx, setGridOverIdx] = useState<number | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const [filmstripOpen, setFilmstripOpen] = useState(true);

  const computeFitZoom = useCallback(() => {
    const el = stageContainerRef.current;
    if (!el) return null;
    const availW = Math.max(240, el.clientWidth - 96);
    const availH = Math.max(180, el.clientHeight - 88);
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
  const [dataEditorOpen, setDataEditorOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Workspace data
  const [brandKit, setBrandKit] = useState<BrandKit>(() => ({
    ...DEFAULT_BRAND_KIT,
    customFonts: initialCustomFonts ?? [],
  }));
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
  const [copiedStyle, setCopiedStyle] = useState<CopiedStyleState | null>(null);
  const clipboardRef = useRef<CanvasElement[]>([]);
  const [hasClipboard, setHasClipboard] = useState(false);
  const [croppingId, setCroppingId] = useState<string | null>(null);
  const [magicEraserTarget, setMagicEraserTarget] = useState<ImageElement | null>(null);

  // Live multiplayer collaboration (Cloudflare Durable Object WebSocket)
  const [remotePeers, setRemotePeers] = useState<CollabPeer[]>([]);
  const [collabConnected, setCollabConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const collabRevRef = useRef(0);
  const collabFirstMountRef = useRef(true);
  const suppressCollabBroadcastRef = useRef(false);
  const suppressAutoSaveRef = useRef(false);
  const lastCursorSentRef = useRef(0);
  const cursorPosRef = useRef<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: false,
  });

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
  const activeCroppingId = useMemo(() => {
    if (!croppingId || readOnly) return null;
    if (!selectedIds.includes(croppingId)) return null;
    const el = activePage.elements.find((e) => e.id === croppingId);
    return el && el.type === "image" && !el.locked ? croppingId : null;
  }, [croppingId, readOnly, selectedIds, activePage.elements]);

  const activePageIdRef = useRef(activePage.id);
  const selectedIdsRef = useRef<string[]>(selectedIds);
  useEffect(() => {
    activePageIdRef.current = activePage.id;
    selectedIdsRef.current = selectedIds;
  }, [activePage.id, selectedIds]);

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
        if (d?.brandKit) {
          const mergedFonts = [...(d.brandKit.customFonts ?? [])];
          for (const font of initialCustomFonts ?? []) {
            if (!mergedFonts.some((x) => x.name.toLowerCase() === font.name.toLowerCase())) {
              mergedFonts.push(font);
            }
          }
          setBrandKit({ ...d.brandKit, customFonts: mergedFonts });
        }
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
  }, [readOnly, initialCustomFonts]);

  useEffect(() => {
    void syncCustomFonts(brandKit.customFonts);
  }, [brandKit.customFonts]);

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
    const nextPages = JSON.parse(JSON.stringify(snap.pages)) as DesignPage[];
    setPages(nextPages);
    setActivePageIdx((cur) => Math.max(0, Math.min(cur, nextPages.length - 1)));
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
    const nextPages = JSON.parse(JSON.stringify(snap.pages)) as DesignPage[];
    setPages(nextPages);
    setActivePageIdx((cur) => Math.max(0, Math.min(cur, nextPages.length - 1)));
    setWidth(snap.width);
    setHeight(snap.height);
    setSelectedIds([]);
    setHistoryMeta({ idx: historyIdxRef.current, len: historyRef.current.length });
    setSaveStatus("unsaved");
  }, []);

  // Debounced auto-save + unsaved-changes guard + keepalive flush
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstMountRef = useRef(true);
  const dirtyRef = useRef(false);
  const latestDesignRef = useRef({
    title,
    width,
    height,
    pages,
    comments,
    versions,
    shareConfig,
    readOnly,
    endpoint: shareEndpoint || `/api/designs/${initialDesign.id}`,
  });

  useEffect(() => {
    latestDesignRef.current = {
      title,
      width,
      height,
      pages,
      comments,
      versions,
      shareConfig,
      readOnly,
      endpoint: shareEndpoint || `/api/designs/${initialDesign.id}`,
    };
  }, [title, width, height, pages, comments, versions, shareConfig, readOnly, shareEndpoint, initialDesign.id]);

  const flushPendingDesign = useCallback(() => {
    const latest = latestDesignRef.current;
    if (latest.readOnly) return;
    if (!dirtyRef.current && !saveTimerRef.current) return;
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    dirtyRef.current = false;
    const payload = JSON.stringify({
      title: latest.title,
      width: latest.width,
      height: latest.height,
      pages: latest.pages,
      comments: latest.comments,
      versions: latest.versions,
      shareConfig: latest.shareConfig,
    });
    // Browser fetch keepalive has a ~64 KB body limit; use keepalive when safely under it
    void fetch(latest.endpoint, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: payload.length < 60_000,
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (readOnly) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || saveTimerRef.current !== null) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const onPageHide = () => {
      flushPendingDesign();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("pagehide", onPageHide);
      flushPendingDesign();
    };
  }, [readOnly, flushPendingDesign]);

  const persistDesign = useCallback(
    async (overrides?: Partial<DesignRecord>) => {
      if (readOnly && !overrides?.comments) return;
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
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
        if (res.ok) {
          dirtyRef.current = false;
          setSaveStatus("saved");
        } else {
          dirtyRef.current = true;
          setSaveStatus("error");
          const err = (await res.json().catch(() => null)) as { error?: string } | null;
          notify(err?.error || "Could not save changes — click Retry");
        }
      } catch {
        dirtyRef.current = true;
        setSaveStatus("error");
        notify("Network error while saving — click Retry");
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
      notify,
    ],
  );

  useEffect(() => {
    if (firstMountRef.current) {
      firstMountRef.current = false;
      return;
    }
    if (readOnly) return;
    if (suppressAutoSaveRef.current) {
      suppressAutoSaveRef.current = false;
      return;
    }
    dirtyRef.current = true;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      void persistDesign();
    }, 1100);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [title, width, height, pages, shareConfig, versions, readOnly, persistDesign]);

  const sendCollab = useCallback((msg: CollabClientMessage) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      // ignore closed socket race
    }
  }, []);

  // Connect to Cloudflare Durable Object multiplayer room for this design
  useEffect(() => {
    if (typeof window === "undefined" || typeof WebSocket === "undefined") return;
    let disposed = false;
    let openedOnce = false;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/api/collab/${encodeURIComponent(initialDesign.id)}`;

    const connect = () => {
      if (disposed) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl);
      } catch {
        return;
      }
      wsRef.current = ws;

      ws.onopen = () => {
        if (disposed) {
          ws.close();
          return;
        }
        openedOnce = true;
        reconnectAttempt = 0;
        setCollabConnected(true);
        try {
          ws.send(
            JSON.stringify({
              type: "cursor",
              pageId: activePageIdRef.current,
              x: cursorPosRef.current.x,
              y: cursorPosRef.current.y,
              cursorVisible: cursorPosRef.current.visible,
              selectedIds: selectedIdsRef.current,
            } satisfies CollabClientMessage),
          );
        } catch {
          // ignore
        }
        if (pingTimer) clearInterval(pingTimer);
        pingTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: "ping" } satisfies CollabClientMessage));
            } catch {
              // ignore
            }
          }
        }, 25_000);
      };

      ws.onmessage = (ev) => {
        if (typeof ev.data !== "string") return;
        let msg: CollabServerMessage;
        try {
          msg = JSON.parse(ev.data) as CollabServerMessage;
        } catch {
          return;
        }

        if (msg.type === "welcome") {
          setRemotePeers(msg.peers);
        } else if (msg.type === "peer_join") {
          setRemotePeers((prev) => [
            ...prev.filter((p) => p.clientId !== msg.peer.clientId),
            msg.peer,
          ]);
        } else if (msg.type === "peer_leave") {
          setRemotePeers((prev) => prev.filter((p) => p.clientId !== msg.clientId));
        } else if (msg.type === "cursor") {
          setRemotePeers((prev) =>
            prev.map((p) =>
              p.clientId === msg.clientId
                ? {
                    ...p,
                    pageId: msg.pageId,
                    x: msg.x,
                    y: msg.y,
                    cursorVisible: msg.cursorVisible,
                    selectedIds: msg.selectedIds,
                    lastSeen: Date.now(),
                  }
                : p,
            ),
          );
        } else if (msg.type === "design_sync") {
          if (msg.rev < collabRevRef.current) return;
          collabRevRef.current = Math.max(collabRevRef.current, msg.rev);
          suppressCollabBroadcastRef.current = true;
          suppressAutoSaveRef.current = true;
          if (Array.isArray(msg.pages) && msg.pages.length > 0) {
            setPages(msg.pages);
            setActivePageIdx((cur) => Math.max(0, Math.min(cur, msg.pages.length - 1)));
          }
          if (typeof msg.title === "string") setTitle(msg.title);
          if (typeof msg.width === "number" && msg.width > 0) setWidth(msg.width);
          if (typeof msg.height === "number" && msg.height > 0) setHeight(msg.height);
        } else if (msg.type === "comments_sync") {
          if (Array.isArray(msg.comments)) {
            setComments(msg.comments);
          }
        }
      };

      ws.onclose = () => {
        if (pingTimer) {
          clearInterval(pingTimer);
          pingTimer = null;
        }
        if (wsRef.current === ws) wsRef.current = null;
        setCollabConnected(false);
        setRemotePeers([]);
        // Only retry if we previously established a real Worker WebSocket connection
        if (!disposed && openedOnce && reconnectAttempt < 6) {
          const delay = Math.min(10_000, 1200 * 2 ** reconnectAttempt);
          reconnectAttempt += 1;
          reconnectTimer = setTimeout(connect, delay);
        }
      };

      ws.onerror = () => {
        // onclose handles cleanup
      };
    };

    connect();
    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (pingTimer) clearInterval(pingTimer);
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        try {
          ws.close(1000, "unmount");
        } catch {
          // ignore
        }
      }
    };
  }, [initialDesign.id]);

  // Broadcast throttled pointer updates to peers
  const handleCursorMove = useCallback(
    (x: number, y: number, visible: boolean) => {
      cursorPosRef.current = { x, y, visible };
      const now = Date.now();
      if (visible && now - lastCursorSentRef.current < 45) return;
      lastCursorSentRef.current = now;
      sendCollab({
        type: "cursor",
        pageId: activePageIdRef.current,
        x: Math.round(x),
        y: Math.round(y),
        cursorVisible: visible,
        selectedIds: selectedIdsRef.current,
      });
    },
    [sendCollab],
  );

  // Sync active page & selected element outlines immediately on change
  useEffect(() => {
    if (!collabConnected) return;
    sendCollab({
      type: "cursor",
      pageId: activePage.id,
      x: Math.round(cursorPosRef.current.x),
      y: Math.round(cursorPosRef.current.y),
      cursorVisible: cursorPosRef.current.visible,
      selectedIds,
    });
  }, [collabConnected, activePage.id, selectedIds, sendCollab]);

  // Broadcast local design mutations to live peers (debounced 120ms)
  useEffect(() => {
    if (collabFirstMountRef.current) {
      collabFirstMountRef.current = false;
      return;
    }
    if (readOnly || !collabConnected) return;
    if (suppressCollabBroadcastRef.current) {
      suppressCollabBroadcastRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      collabRevRef.current += 1;
      sendCollab({
        type: "design_sync",
        rev: collabRevRef.current,
        title,
        width,
        height,
        pages,
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [title, width, height, pages, readOnly, collabConnected, sendCollab]);

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

  const updateActivePageNoHistory = useCallback(
    (patch: Partial<DesignPage>) => {
      setPages((prev) =>
        prev.map((p, idx) => (idx === activePageIdx ? { ...p, ...patch } : p)),
      );
      setSaveStatus("unsaved");
    },
    [activePageIdx],
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
      if (el.type === "chart" || el.type === "table") {
        setDataEditorOpen(true);
      }
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
                elements: computeAlignElements(p.elements, selectedIds, mode, width, height),
              }
            : p,
        );
        pushHistory(next);
        return next;
      });
    },
    [activePageIdx, height, width, selectedIds, pushHistory],
  );

  const handleDistribute = useCallback(
    (axis: "h" | "v") => {
      if (selectedIds.length < 3) return;
      setPages((prev) => {
        const next = prev.map((p, idx) =>
          idx === activePageIdx
            ? {
                ...p,
                elements: computeDistributeElements(p.elements, selectedIds, axis),
              }
            : p,
        );
        pushHistory(next);
        return next;
      });
      notify(axis === "h" ? "Distributed horizontally" : "Distributed vertically");
    },
    [activePageIdx, selectedIds, pushHistory, notify],
  );

  const handleReorderLayer = useCallback(
    (id: string, dir: "front" | "up" | "down" | "back") => {
      setPages((prev) => {
        const next = prev.map((p, idx) => {
          if (idx !== activePageIdx) return p;
          const arr = [...p.elements];
          const pos = arr.findIndex((e) => e.id === id);
          if (pos === -1) return p;
          let target = pos;
          if (dir === "front") target = arr.length - 1;
          else if (dir === "up") target = Math.min(arr.length - 1, pos + 1);
          else if (dir === "down") target = Math.max(0, pos - 1);
          else if (dir === "back") target = 0;
          if (target === pos) return p;
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

  const handleCopySelected = useCallback(() => {
    if (!selectedElements.length) return;
    clipboardRef.current = JSON.parse(JSON.stringify(selectedElements)) as CanvasElement[];
    setHasClipboard(true);
    notify(
      selectedElements.length === 1
        ? "Copied element"
        : `Copied ${selectedElements.length} elements`,
    );
  }, [selectedElements, notify]);

  const handlePasteSelected = useCallback(() => {
    if (!clipboardRef.current.length) return;
    const pasted = clipboardRef.current.map((el) => ({
      ...JSON.parse(JSON.stringify(el)),
      id: makeId("el"),
      x: el.x + 24,
      y: el.y + 24,
      groupId: undefined,
    })) as CanvasElement[];
    setPages((prev) => {
      const next = prev.map((p, idx) =>
        idx === activePageIdx ? { ...p, elements: [...p.elements, ...pasted] } : p,
      );
      pushHistory(next);
      return next;
    });
    setSelectedIds(pasted.map((p) => p.id));
  }, [activePageIdx, pushHistory]);

  const handleSelectAll = useCallback(() => {
    const unlocked = activePage.elements.filter((el) => !el.locked).map((el) => el.id);
    const ids = unlocked.length ? unlocked : activePage.elements.map((el) => el.id);
    setSelectedIds(ids);
  }, [activePage.elements]);

  const handleToggleLockSelected = useCallback(() => {
    if (!selectedElements.length) return;
    const allLocked = selectedElements.every((el) => !!el.locked);
    const nextLocked = !allLocked;
    setPages((prev) => {
      const next = prev.map((p, idx) =>
        idx === activePageIdx
          ? {
              ...p,
              elements: p.elements.map((el) =>
                selectedIds.includes(el.id) ? { ...el, locked: nextLocked } : el,
              ),
            }
          : p,
      );
      pushHistory(next);
      return next;
    });
    notify(nextLocked ? "Locked selection" : "Unlocked selection");
  }, [activePageIdx, selectedElements, selectedIds, pushHistory, notify]);

  const handleSetImageAsBackground = useCallback(
    (img: ImageElement) => {
      setPages((prev) => {
        const next = prev.map((p, idx) =>
          idx === activePageIdx
            ? {
                ...p,
                backgroundImage: img.src,
                elements: p.elements.filter((el) => el.id !== img.id),
              }
            : p,
        );
        pushHistory(next);
        return next;
      });
      setSelectedIds([]);
      setCroppingId(null);
      notify("Set image as page background");
    },
    [activePageIdx, pushHistory, notify],
  );

  const handleResetBackground = useCallback(() => {
    updateActivePage({
      background: "#FFFFFF",
      backgroundGradientTo: undefined,
      backgroundImage: undefined,
    });
    notify("Page background reset");
  }, [updateActivePage, notify]);

  const handleToggleCropImage = useCallback((id: string) => {
    setCroppingId((cur) => (cur === id ? null : id));
  }, []);

  const handleCopyStyle = useCallback(() => {
    if (!singleSelected) return;
    let patch: Partial<CanvasElement> | null = null;
    if (singleSelected.type === "text") {
      patch = {
        fontFamily: singleSelected.fontFamily,
        fontWeight: singleSelected.fontWeight,
        fontSize: singleSelected.fontSize,
        color: singleSelected.color,
        italic: singleSelected.italic,
        underline: singleSelected.underline,
        strikethrough: singleSelected.strikethrough,
        textTransform: singleSelected.textTransform,
        letterSpacing: singleSelected.letterSpacing,
        lineHeight: singleSelected.lineHeight,
        align: singleSelected.align,
        curve: singleSelected.curve,
        strokeColor: singleSelected.strokeColor,
        strokeWidth: singleSelected.strokeWidth,
        shadowBlur: singleSelected.shadowBlur,
        shadowColor: singleSelected.shadowColor,
        shadowOffsetY: singleSelected.shadowOffsetY,
        backgroundColor: singleSelected.backgroundColor,
        backgroundPadding: singleSelected.backgroundPadding,
        backgroundRadius: singleSelected.backgroundRadius,
        opacity: singleSelected.opacity,
      } as Partial<CanvasElement>;
    } else if (singleSelected.type === "shape") {
      patch = {
        fill: singleSelected.fill,
        gradientTo: singleSelected.gradientTo,
        gradientAngle: singleSelected.gradientAngle,
        stroke: singleSelected.stroke,
        strokeWidth: singleSelected.strokeWidth,
        strokeDash: singleSelected.strokeDash,
        borderRadius: singleSelected.borderRadius,
        opacity: singleSelected.opacity,
      } as Partial<CanvasElement>;
    } else if (singleSelected.type === "image") {
      patch = {
        filters: singleSelected.filters ? { ...singleSelected.filters } : undefined,
        borderRadius: singleSelected.borderRadius,
        mask: singleSelected.mask,
        fit: singleSelected.fit,
        opacity: singleSelected.opacity,
      } as Partial<CanvasElement>;
    } else if (singleSelected.type === "icon") {
      patch = {
        color: singleSelected.color,
        fillColor: singleSelected.fillColor,
        strokeWidth: singleSelected.strokeWidth,
        opacity: singleSelected.opacity,
      } as Partial<CanvasElement>;
    } else if (singleSelected.type === "table") {
      patch = {
        headerBg: singleSelected.headerBg,
        headerColor: singleSelected.headerColor,
        cellBg: singleSelected.cellBg,
        cellColor: singleSelected.cellColor,
        borderColor: singleSelected.borderColor,
        fontSize: singleSelected.fontSize,
        fontFamily: singleSelected.fontFamily,
        opacity: singleSelected.opacity,
      } as Partial<CanvasElement>;
    } else if (singleSelected.type === "chart") {
      patch = {
        accentColor: singleSelected.accentColor,
        textColor: singleSelected.textColor,
        showValues: singleSelected.showValues,
        opacity: singleSelected.opacity,
      } as Partial<CanvasElement>;
    } else if (singleSelected.type === "draw") {
      patch = {
        color: singleSelected.color,
        strokeWidth: singleSelected.strokeWidth,
        brush: singleSelected.brush,
        opacity: singleSelected.opacity,
      } as Partial<CanvasElement>;
    } else if (singleSelected.type === "qrcode") {
      patch = {
        fgColor: singleSelected.fgColor,
        bgColor: singleSelected.bgColor,
        opacity: singleSelected.opacity,
      } as Partial<CanvasElement>;
    }
    if (!patch) return;
    setCopiedStyle({ type: singleSelected.type, patch });
    notify(`Copied ${singleSelected.type} style`);
  }, [singleSelected, notify]);

  const handlePasteStyle = useCallback(() => {
    if (!copiedStyle || !singleSelected) return;
    if (copiedStyle.type !== singleSelected.type) {
      notify(`Can't paste ${copiedStyle.type} style onto ${singleSelected.type}`);
      return;
    }
    handleUpdateElement(singleSelected.id, copiedStyle.patch, true);
    notify("Style applied");
  }, [copiedStyle, singleSelected, handleUpdateElement, notify]);

  const styleShuffleRef = useRef<{ key: string; variant: number }>({ key: "", variant: 0 });
  const brandSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingBrandRef = useRef<BrandKit | null>(null);

  const flushBrandKit = useCallback(async (kit: BrandKit, keepalive = false) => {
    try {
      const res = await fetch("/api/brand-kit", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(kit),
        keepalive,
      });
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (brandSaveTimerRef.current) {
        clearTimeout(brandSaveTimerRef.current);
        brandSaveTimerRef.current = null;
      }
      if (pendingBrandRef.current) {
        void flushBrandKit(pendingBrandRef.current, true);
        pendingBrandRef.current = null;
      }
    };
  }, [flushBrandKit]);

  const handleUpdateBrandKit = useCallback(
    async (nextKit: BrandKit, opts?: { immediate?: boolean; toast?: string }) => {
      const updated: BrandKit = { ...nextKit, updatedAt: Date.now() };
      setBrandKit(updated);
      pendingBrandRef.current = updated;

      if (brandSaveTimerRef.current) {
        clearTimeout(brandSaveTimerRef.current);
        brandSaveTimerRef.current = null;
      }

      if (opts?.immediate) {
        pendingBrandRef.current = null;
        const ok = await flushBrandKit(updated);
        if (opts.toast) {
          notify(ok ? opts.toast : "Saved locally — couldn't sync Brand Kit");
        }
        return;
      }

      brandSaveTimerRef.current = setTimeout(() => {
        brandSaveTimerRef.current = null;
        const latest = pendingBrandRef.current;
        pendingBrandRef.current = null;
        if (latest) {
          void flushBrandKit(latest);
        }
      }, 320);

      if (opts?.toast) notify(opts.toast);
    },
    [flushBrandKit, notify],
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
              subheading: brandKit.fonts.subheading,
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

      const colorable = selectedElements.some(
        (el) => !el.locked && el.type !== "image",
      );
      if (!colorable) {
        notify("Select text, shape, icon, chart, or table to recolor — or deselect for background");
        return;
      }

      setPages((prev) => {
        const next = prev.map((p, idx) => {
          if (idx !== activePageIdx) return p;
          return {
            ...p,
            elements: p.elements.map((el) => {
              if (!selectedIds.includes(el.id) || el.locked) return el;
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
              if (el.type === "chart") {
                const shades = buildSwatchChartShades(color, el.data.length);
                return {
                  ...el,
                  accentColor: color,
                  data: el.data.map((d, dIdx) => ({ ...d, color: shades[dIdx] ?? color })),
                };
              }
              if (el.type === "table") {
                return {
                  ...el,
                  headerBg: color,
                  headerColor: pickContrastingText(color, "#111114", "#FFFFFF"),
                };
              }
              if (el.type === "qrcode") {
                return {
                  ...el,
                  fgColor: color,
                  bgColor: isLightColor(color) ? "#111114" : "#FFFFFF",
                };
              }
              return el;
            }),
          };
        });
        pushHistory(next);
        return next;
      });
      notify(`Applied ${color} to selection`);
    },
    [activePageIdx, selectedElements, selectedIds, pushHistory, updateActivePage, notify],
  );

  const handleApplyBrandFont = useCallback(
    (font: string): boolean => {
      const hasTextOrTable = selectedElements.some(
        (el) => !el.locked && (el.type === "text" || el.type === "table"),
      );
      if (!hasTextOrTable) return false;
      setPages((prev) => {
        const next = prev.map((p, idx) => {
          if (idx !== activePageIdx) return p;
          return {
            ...p,
            elements: p.elements.map((el) => {
              if (!selectedIds.includes(el.id) || el.locked) return el;
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
  const nudgeDirtyRef = useRef(false);

  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const targetEl = e.target as HTMLElement | null;
      const tag = targetEl?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || targetEl?.isContentEditable) {
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "0") {
        e.preventDefault();
        setAutoFit(true);
        const fit = computeFitZoom();
        if (fit !== null) setZoom(fit);
        return;
      }
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        handleSelectAll();
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
        e.preventDefault();
        handleCopySelected();
        return;
      }
      if (mod && e.key.toLowerCase() === "v" && clipboardRef.current.length) {
        e.preventDefault();
        handlePasteSelected();
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
        nudgeDirtyRef.current = true;
        updateActivePageElements((els) =>
          els.map((el) =>
            selectedIds.includes(el.id) && !el.locked
              ? { ...el, x: el.x + dx, y: el.y + dy }
              : el,
          ),
        );
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (
        nudgeDirtyRef.current &&
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
      ) {
        nudgeDirtyRef.current = false;
        commitCurrentToHistory();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [
    readOnly,
    undo,
    redo,
    computeFitZoom,
    handleSelectAll,
    handleCopySelected,
    handlePasteSelected,
    handleDuplicateSelected,
    handleGroupToggle,
    handleDeleteElements,
    selectedIds,
    commitCurrentToHistory,
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

  const reorderPage = (fromIdx: number, toIdx: number) => {
    if (
      fromIdx === toIdx ||
      fromIdx < 0 ||
      toIdx < 0 ||
      fromIdx >= pages.length ||
      toIdx >= pages.length
    ) {
      return;
    }
    const next = [...pages];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const activeId = pages[activePageIdx]?.id;
    const nextActive = next.findIndex((p) => p.id === activeId);
    setPages(next);
    setActivePageIdx(nextActive >= 0 ? nextActive : toIdx);
    pushHistory(next);
    notify(`Moved slide to #${toIdx + 1}`);
  };

  // Comments
  const handlePinComment = (xPct: number, yPct: number, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
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
      text: trimmed,
      createdAt: Date.now(),
      replies: [],
    };
    const nextComments = [...comments, nextComment];
    setComments(nextComments);
    setCommentMode(false);
    setCommentsOpen(true);
    sendCollab({ type: "comments_sync", comments: nextComments });
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
    sendCollab({ type: "comments_sync", comments: nextComments });
    void persistDesign({ comments: nextComments });
  };

  const handleResolveComment = (commentId: string) => {
    const nextComments = comments.map((c) =>
      c.id === commentId ? { ...c, resolved: true } : c,
    );
    setComments(nextComments);
    sendCollab({ type: "comments_sync", comments: nextComments });
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

  const handleDeleteTeamTemplate = async (id: string) => {
    setTeamTemplates((prev) => prev.filter((t) => t.id !== id));
    const res = await fetch(`/api/templates?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) notify("Template deleted");
    else notify("Could not delete template");
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      <TopToolbar
        title={title}
        onTitleChange={setTitle}
        saveStatus={saveStatus}
        onRetrySave={() => void persistDesign()}
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
        onCommitHistory={commitCurrentToHistory}
        onDuplicateSelected={handleDuplicateSelected}
        onDeleteSelected={() => handleDeleteElements(selectedIds)}
        onGroupToggle={handleGroupToggle}
        onAlign={handleAlign}
        onDistribute={handleDistribute}
        onReorderLayer={handleReorderLayer}
        onCopyStyle={handleCopyStyle}
        onPasteStyle={handlePasteStyle}
        hasCopiedStyle={!!copiedStyle}
        onOpenPhotoTab={() => setRailTab("photo")}
        croppingId={activeCroppingId}
        onToggleCropImage={handleToggleCropImage}
        onOpenMagicEraser={(img) => setMagicEraserTarget(img)}
        dataEditorOpen={dataEditorOpen}
        onToggleDataEditor={() => setDataEditorOpen((o) => !o)}
        customFonts={brandKit.customFonts}
        remotePeers={remotePeers}
        collabConnected={collabConnected}
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
            onCommitHistory={commitCurrentToHistory}
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
            onDeleteTeamTemplate={handleDeleteTeamTemplate}
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
            onOpenMagicEraser={(img) => setMagicEraserTarget(img)}
          />
        )}

        {/* Center Stage or Grid View */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div
            ref={stageContainerRef}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
          {gridView ? (
            <div className="flex-1 overflow-y-auto bg-[var(--stage)] p-8">
              {!readOnly && pages.length > 1 && (
                <p className="mx-auto mb-4 max-w-5xl text-xs text-[var(--muted)]">
                  Drag any slide card to reorder your deck. Click a slide to edit it.
                </p>
              )}
              <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {pages.map((p, idx) => (
                  <div
                    key={p.id}
                    draggable={!readOnly}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", String(idx));
                      setGridDragIdx(idx);
                      setGridOverIdx(idx);
                    }}
                    onDragOver={(e) => {
                      if (gridDragIdx === null) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (gridOverIdx !== idx) setGridOverIdx(idx);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const raw = e.dataTransfer.getData("text/plain");
                      const from =
                        raw !== "" && Number.isInteger(Number(raw)) ? Number(raw) : gridDragIdx;
                      if (from !== null && from !== idx) {
                        reorderPage(from, idx);
                      }
                      setGridDragIdx(null);
                      setGridOverIdx(null);
                    }}
                    onDragEnd={() => {
                      setGridDragIdx(null);
                      setGridOverIdx(null);
                    }}
                    onClick={() => {
                      setActivePageIdx(idx);
                      setGridView(false);
                    }}
                    className={`flex flex-col overflow-hidden rounded-2xl border bg-[var(--surface)] p-3 shadow-md transition select-none ${
                      readOnly ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
                    } ${
                      gridDragIdx === idx
                        ? "opacity-45 scale-[0.98]"
                        : gridDragIdx !== null && gridOverIdx === idx
                          ? "border-[var(--focus)] ring-2 ring-[var(--focus)]"
                          : idx === activePageIdx
                            ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/30"
                            : "border-[var(--border)] hover:border-[var(--accent)]"
                    }`}
                  >
                    <div className="flex h-44 items-center justify-center rounded-xl bg-[var(--stage)] p-2 pointer-events-none">
                      <PagePreview page={p} width={width} height={height} maxWidth={260} maxHeight={160} />
                    </div>
                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {idx + 1}. {p.name}
                      </span>
                      {!readOnly && (
                        <div className="flex gap-1">
                          <button
                            draggable={false}
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
                              draggable={false}
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
              onOpenDataEditor={() => setDataEditorOpen(true)}
              onCopySelected={handleCopySelected}
              onPasteSelected={handlePasteSelected}
              hasClipboard={hasClipboard}
              onDuplicateSelected={handleDuplicateSelected}
              onDeleteSelected={() => handleDeleteElements(selectedIds)}
              onGroupToggle={handleGroupToggle}
              onReorderLayer={handleReorderLayer}
              onCopyStyle={handleCopyStyle}
              onPasteStyle={handlePasteStyle}
              hasCopiedStyle={!!copiedStyle}
              onSetImageAsBackground={handleSetImageAsBackground}
              onSelectAll={handleSelectAll}
              onResetBackground={handleResetBackground}
              onToggleLockSelected={handleToggleLockSelected}
              canComment={canComment}
              croppingId={activeCroppingId}
              onChangeCroppingId={setCroppingId}
              remotePeers={remotePeers}
              onCursorMove={handleCursorMove}
            />
          )}
          </div>

          {/* Speaker Notes Bar */}
          {notesOpen && !readOnly && (
            <div className="border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
              <div className="mb-1 text-[11px] font-semibold text-[var(--muted)]">
                Speaker Notes — {activePage.name}
              </div>
              <textarea
                value={activePage.notes || ""}
                onChange={(e) => updateActivePageNoHistory({ notes: e.target.value })}
                onBlur={commitCurrentToHistory}
                rows={2}
                placeholder="Write talking points for Present Mode or PPTX export…"
                className="w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs text-[var(--fg)] outline-none"
              />
            </div>
          )}

          {/* Bottom Page Filmstrip + Zoom Controls */}
          <PageStrip
            pages={pages}
            activePageIdx={activePageIdx}
            width={width}
            height={height}
            readOnly={readOnly}
            open={filmstripOpen}
            onToggleOpen={() => setFilmstripOpen((v) => !v)}
            notesOpen={notesOpen}
            hasActiveNotes={Boolean(activePage.notes?.trim())}
            onToggleNotes={() => setNotesOpen((n) => !n)}
            gridView={gridView}
            onToggleGridView={() => setGridView((g) => !g)}
            zoom={zoom}
            onZoomChange={(nextZoom) => {
              setAutoFit(false);
              setZoom(nextZoom);
            }}
            onFitZoom={() => {
              setAutoFit(true);
              const fit = computeFitZoom();
              if (fit !== null) setZoom(fit);
            }}
            onSelectPage={(idx) => {
              setActivePageIdx(idx);
              setSelectedIds([]);
              if (gridView) setGridView(false);
            }}
            onAddPage={addPage}
            onDuplicatePage={duplicatePage}
            onDeletePage={deletePage}
            onReorderPage={reorderPage}
          />
        </div>

        {/* Chart & Table Data Editor Drawer */}
        {!readOnly &&
          dataEditorOpen &&
          singleSelected &&
          (singleSelected.type === "chart" || singleSelected.type === "table") && (
            <DataEditorPanel
              element={singleSelected}
              brandColors={brandKit.colors}
              onUpdate={handleUpdateElement}
              onClose={() => setDataEditorOpen(false)}
            />
          )}

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
          canComment={canComment}
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

      <MagicEraserModal
        open={!!magicEraserTarget}
        element={magicEraserTarget}
        onClose={() => setMagicEraserTarget(null)}
        onApply={(nextSrc, originalSrc) => {
          if (!magicEraserTarget) return;
          handleUpdateElement(
            magicEraserTarget.id,
            { src: nextSrc, originalSrc } as Partial<ImageElement>,
            true,
          );
          notify("Magic Eraser cutout applied");
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-xl transition-all ${
            filmstripOpen ? "bottom-32" : "bottom-12"
          }`}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
