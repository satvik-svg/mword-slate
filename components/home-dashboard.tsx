"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Copy,
  FileUp,
  Folder,
  FolderPlus,
  Hexagon,
  Home,
  Image as ImageIcon,
  LayoutGrid,
  LayoutTemplate,
  LogOut,
  Moon,
  MoreHorizontal,
  Palette,
  Plus,
  Presentation,
  RotateCcw,
  Search,
  Square,
  Star,
  Sun,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { LogoMakerModal } from "@/components/logo-maker-modal";
import { PagePreview } from "@/components/page-preview";
import { SlateWordmark } from "@/components/slate-logo";
import { generateThumbnail } from "@/lib/exporter";
import { makeId } from "@/lib/id";
import { readImageFileOptimized } from "@/lib/photo-tools";
import { importPptxFile } from "@/lib/pptx-import";
import { FORMAT_PRESETS, GOOGLE_FONTS } from "@/lib/presets";
import { BUILTIN_TEMPLATES, instantiateTemplate } from "@/lib/templates";
import { workspaceLabel } from "@/lib/tenant";
import {
  DEFAULT_BRAND_KIT,
  DEFAULT_IMAGE_FILTERS,
  type BrandKit,
  type BrandLogoItem,
  type DesignCategory,
  type DesignPage,
  type DesignRecord,
  type DesignSummary,
  type FolderRecord,
  type TemplateRecord,
} from "@/lib/types";

type NavSection = "home" | "projects" | "templates" | "brand" | "starred" | "trash";

function formatRelativeDate(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function HomeDashboard() {
  const router = useRouter();
  const { user, theme, toggleTheme, logout } = useAuth();

  const [section, setSection] = useState<NavSection>("home");
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tplCategory, setTplCategory] = useState<string>("all");

  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [teamTemplates, setTeamTemplates] = useState<TemplateRecord[]>([]);
  const [brandKit, setBrandKit] = useState<BrandKit>(DEFAULT_BRAND_KIT);
  const [loading, setLoading] = useState(true);
  const [busyMsg, setBusyMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const [newDesignModalOpen, setNewDesignModalOpen] = useState(false);
  const [customW, setCustomW] = useState(1920);
  const [customH, setCustomH] = useState(1080);
  const [customTitle, setCustomTitle] = useState("Untitled");
  const [newFolderName, setNewFolderName] = useState("");
  const [addingFolder, setAddingFolder] = useState(false);
  const [brandSaved, setBrandSaved] = useState(false);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const pptxInputRef = useRef<HTMLInputElement>(null);
  const brandLogoInputRef = useRef<HTMLInputElement>(null);

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg((cur) => (cur === msg ? null : cur)), 5000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, fRes, bRes, tRes] = await Promise.all([
        fetch("/api/designs", { credentials: "include" }),
        fetch("/api/folders", { credentials: "include" }),
        fetch("/api/brand-kit", { credentials: "include" }),
        fetch("/api/templates", { credentials: "include" }),
      ]);
      if (dRes.ok) {
        const d = (await dRes.json()) as { designs?: DesignSummary[] };
        setDesigns(d.designs ?? []);
      }
      if (fRes.ok) {
        const f = (await fRes.json()) as { folders?: FolderRecord[] };
        setFolders(f.folders ?? []);
      }
      if (bRes.ok) {
        const b = (await bRes.json()) as { brandKit?: BrandKit };
        if (b.brandKit) setBrandKit(b.brandKit);
      }
      if (tRes.ok) {
        const t = (await tRes.json()) as { templates?: TemplateRecord[] };
        setTeamTemplates(t.templates ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => setOpenMenuId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [openMenuId]);

  useEffect(() => {
    if (!newDesignModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNewDesignModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [newDesignModalOpen]);

  const createAndOpen = async (input: {
    title: string;
    category: DesignCategory;
    width: number;
    height: number;
    pages?: DesignPage[];
    query?: string;
  }) => {
    setBusyMsg("Opening canvas…");
    try {
      let thumbnail = "";
      const firstPage = input.pages?.[0];
      if (
        firstPage &&
        (firstPage.elements.length > 0 ||
          !!firstPage.backgroundImage ||
          (firstPage.background && firstPage.background.toLowerCase() !== "#ffffff"))
      ) {
        try {
          thumbnail = await generateThumbnail(firstPage, input.width, input.height);
        } catch {
          // best-effort initial thumbnail
        }
      }

      const res = await fetch("/api/designs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: input.title,
          category: input.category,
          width: input.width,
          height: input.height,
          pages: input.pages,
          folderId: activeFolderId,
          thumbnail,
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        design?: DesignRecord;
        error?: string;
      } | null;
      if (!res.ok || !data?.design) {
        showError(data?.error || "Could not save design. If importing a large file, try reducing image size.");
        return;
      }
      router.push(`/design/${data.design.id}${input.query || ""}`);
    } catch {
      showError("Network error while creating design.");
    } finally {
      setBusyMsg(null);
    }
  };

  const handlePhotoEditLaunch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyMsg("Opening photo editor…");
    try {
      const opt = await readImageFileOptimized(file, 2000);
      await fetch("/api/media", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          mimeType: opt.mimeType,
          dataUrl: opt.dataUrl,
          width: opt.width,
          height: opt.height,
          sizeBytes: opt.sizeBytes,
        }),
      });
      const page: DesignPage = {
        id: makeId("pg"),
        name: "Photo",
        background: "#FFFFFF",
        elements: [
          {
            id: makeId("el"),
            type: "image",
            name: file.name,
            src: opt.dataUrl,
            x: 0,
            y: 0,
            width: opt.width,
            height: opt.height,
            rotation: 0,
            opacity: 1,
            fit: "cover",
            borderRadius: 0,
            mask: "none",
            filters: { ...DEFAULT_IMAGE_FILTERS },
          },
        ],
      };
      await createAndOpen({
        title: file.name.replace(/\.[^.]+$/, "") || "Photo Edit",
        category: "photo",
        width: opt.width,
        height: opt.height,
        pages: [page],
        query: "?tab=photo",
      });
    } catch {
      showError("Could not load that image file.");
      setBusyMsg(null);
    } finally {
      e.target.value = "";
    }
  };

  const handlePptxLaunch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusyMsg("Importing slides…");
    try {
      const imported = await importPptxFile(file);
      await createAndOpen({
        title: imported.title,
        category: "presentation",
        width: imported.width,
        height: imported.height,
        pages: imported.pages,
      });
    } catch {
      showError("Could not import that .pptx file. Please check that it is a valid PowerPoint presentation.");
      setBusyMsg(null);
    } finally {
      e.target.value = "";
    }
  };

  const toggleStar = async (d: DesignSummary) => {
    setDesigns((prev) =>
      prev.map((x) => (x.id === d.id ? { ...x, starred: !x.starred } : x)),
    );
    await fetch(`/api/designs/${d.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ starred: !d.starred }),
    });
  };

  const moveToTrash = async (d: DesignSummary, trashed: boolean) => {
    setOpenMenuId(null);
    setDesigns((prev) => prev.map((x) => (x.id === d.id ? { ...x, trashed } : x)));
    await fetch(`/api/designs/${d.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trashed }),
    });
  };

  const deleteForever = async (id: string) => {
    setDesigns((prev) => prev.filter((x) => x.id !== id));
    await fetch(`/api/designs/${id}`, { method: "DELETE", credentials: "include" });
  };

  const duplicateDesign = async (d: DesignSummary) => {
    setOpenMenuId(null);
    setBusyMsg("Duplicating…");
    try {
      const fullRes = await fetch(`/api/designs/${d.id}`, { credentials: "include" });
      if (!fullRes.ok) return;
      const full = (await fullRes.json()) as { design: DesignRecord };
      const res = await fetch("/api/designs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${full.design.title} (Copy)`,
          category: full.design.category,
          width: full.design.width,
          height: full.design.height,
          pages: full.design.pages,
          folderId: full.design.folderId,
          thumbnail: full.design.thumbnail,
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as { design: DesignRecord };
        setDesigns((prev) => [created.design, ...prev]);
      }
    } finally {
      setBusyMsg(null);
    }
  };
