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

  const moveToFolder = async (designId: string, folderId: string | null) => {
    setDesigns((prev) => prev.map((x) => (x.id === designId ? { ...x, folderId } : x)));
    await fetch(`/api/designs/${designId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId }),
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const res = await fetch("/api/folders", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim() }),
    });
    if (res.ok) {
      const data = (await res.json()) as { folder: FolderRecord };
      setFolders((prev) => [data.folder, ...prev]);
      setNewFolderName("");
      setAddingFolder(false);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    setFolders((prev) => prev.filter((f) => f.id !== id));
    if (activeFolderId === id) setActiveFolderId(null);
    await fetch(`/api/folders?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      credentials: "include",
    });
  };

  const saveBrand = async (nextKit: BrandKit) => {
    setBrandKit(nextKit);
    await fetch("/api/brand-kit", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextKit),
    });
    setBrandSaved(true);
    setTimeout(() => setBrandSaved(false), 1800);
  };

  const handleBrandLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const opt = await readImageFileOptimized(file, 1024);
    const item: BrandLogoItem = {
      id: makeId("logo"),
      name: file.name.replace(/\.[^.]+$/, ""),
      variant: "primary",
      dataUrl: opt.dataUrl,
      createdAt: Date.now(),
    };
    await saveBrand({ ...brandKit, logos: [item, ...brandKit.logos], updatedAt: Date.now() });
    e.target.value = "";
  };

  const queryLower = search.trim().toLowerCase();
  const visibleDesigns = designs.filter((d) => {
    if (section === "trash") return d.trashed;
    if (d.trashed) return false;
    if (section === "starred" && !d.starred) return false;
    if (activeFolderId && d.folderId !== activeFolderId) return false;
    if (queryLower && !d.title.toLowerCase().includes(queryLower)) return false;
    return true;
  });

  const allTemplates = [...teamTemplates, ...BUILTIN_TEMPLATES].filter((t) => {
    if (tplCategory !== "all" && tplCategory !== "team" && t.category !== tplCategory) return false;
    if (tplCategory === "team" && !t.isCustom) return false;
    if (
      queryLower &&
      !t.title.toLowerCase().includes(queryLower) &&
      !t.tags.some((tag) => tag.toLowerCase().includes(queryLower))
    ) {
      return false;
    }
    return true;
  });

  const sectionHeading = activeFolderId
    ? folders.find((f) => f.id === activeFolderId)?.name || "Folder"
    : section === "trash"
      ? "Trash"
      : section === "starred"
        ? "Starred"
        : section === "projects"
          ? "All projects"
          : "Recent";

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--bg)] text-[var(--fg)]">
      {/* Hidden quick file inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoEditLaunch}
        className="hidden"
      />
      <input
        ref={pptxInputRef}
        type="file"
        accept=".pptx"
        onChange={handlePptxLaunch}
        className="hidden"
      />
      <input
        ref={brandLogoInputRef}
        type="file"
        accept="image/*"
        onChange={handleBrandLogoUpload}
        className="hidden"
      />

      {/* Left Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--border)] bg-[var(--surface)]">
        <div className="flex h-14 items-center justify-between px-4">
          <SlateWordmark size={24} />
          <button
            onClick={toggleTheme}
            title="Toggle appearance"
            className="rounded-md p-1.5 text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
          >
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="px-3 pb-3">
          <button
            onClick={() => setNewDesignModalOpen(true)}
            className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] text-[13px] font-medium text-[var(--accent-fg)] transition hover:opacity-90 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> New design
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 text-[13px]">
          {(
            [
              { id: "home", label: "Home", icon: Home },
              { id: "projects", label: "Projects", icon: LayoutGrid },
              { id: "templates", label: "Templates", icon: LayoutTemplate },
              { id: "brand", label: "Brand kit", icon: Palette },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = section === item.id && !activeFolderId;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSection(item.id);
                  setActiveFolderId(null);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition cursor-pointer ${
                  active
                    ? "bg-[var(--accent-soft)] font-medium text-[var(--fg)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}

          <button
            onClick={() => setLogoModalOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
          >
            <Hexagon className="h-4 w-4 shrink-0" />
            Logo studio
          </button>

          <div className="my-2.5 h-px bg-[var(--border)]" />

          {(
            [
              { id: "starred", label: "Starred", icon: Star },
              { id: "trash", label: "Trash", icon: Trash2 },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = section === item.id && !activeFolderId;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setSection(item.id);
                  setActiveFolderId(null);
                }}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition cursor-pointer ${
                  active
                    ? "bg-[var(--accent-soft)] font-medium text-[var(--fg)]"
                    : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}

          {/* Folders */}
          <div className="pt-4">
            <div className="flex items-center justify-between px-2.5 pb-1 text-[11px] font-medium text-[var(--muted)]">
              <span>Folders</span>
              <button
                onClick={() => setAddingFolder((a) => !a)}
                className="rounded p-0.5 hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
                title="New folder"
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </button>
            </div>

            {addingFolder && (
              <div className="mb-1.5 flex gap-1 px-1.5">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void handleCreateFolder()}
                  placeholder="Folder name"
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-2 py-1 text-xs outline-none focus:border-[var(--border-strong)]"
                />
                <button
                  onClick={() => void handleCreateFolder()}
                  className="rounded-md bg-[var(--accent)] px-2 text-xs font-medium text-[var(--accent-fg)] cursor-pointer"
                >
                  Add
                </button>
              </div>
            )}

            <div className="space-y-0.5">
              {folders.map((f) => (
                <div
                  key={f.id}
                  onClick={() => {
                    setSection("projects");
                    setActiveFolderId(f.id);
                  }}
                  className={`group flex items-center justify-between rounded-lg px-2.5 py-1.5 text-[13px] cursor-pointer ${
                    activeFolderId === f.id
                      ? "bg-[var(--accent-soft)] font-medium text-[var(--fg)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Folder className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteFolder(f.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-rose-500 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </nav>

        {/* Account Footer */}
        <div className="border-t border-[var(--border)] px-3.5 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-xs font-medium text-[var(--fg)]">
                {user?.display_name || "Local Workspace"}
              </div>
              <div className="truncate text-[11px] text-[var(--muted)]">
                {user?.bi_id ? workspaceLabel(user.bi_id) : "Slate"}
              </div>
            </div>
            {user?.mauth_enabled && (
              <button
                onClick={() => void logout()}
                title="Log out"
                className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-6">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search designs and templates…"
              className="h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/70 pl-8 pr-3 text-[13px] text-[var(--fg)] placeholder:text-[var(--muted)] outline-none transition focus:border-[var(--border-strong)] focus:bg-[var(--surface)]"
            />
          </div>

          {section !== "home" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => pptxInputRef.current?.click()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--fg)] transition hover:bg-[var(--surface-2)] cursor-pointer"
              >
                <FileUp className="h-3.5 w-3.5 text-[var(--muted)]" /> Import PPTX
              </button>
              <button
                onClick={() => photoInputRef.current?.click()}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-xs font-medium text-[var(--fg)] transition hover:bg-[var(--surface-2)] cursor-pointer"
              >
                <ImageIcon className="h-3.5 w-3.5 text-[var(--muted)]" /> Edit Photo
              </button>
            </div>
          )}
        </header>

        {/* Scrollable Workspace Canvas */}
        <div className="flex-1 overflow-y-auto px-8 py-7">
          <div className="mx-auto max-w-6xl space-y-9">
            {errorMsg && (
              <div className="flex items-center justify-between rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-600 dark:text-rose-400">
                <span>{errorMsg}</span>
                <button onClick={() => setErrorMsg(null)} className="p-0.5 cursor-pointer">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* HOME: Compact Quick Start Row */}
            {section === "home" && (
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-[13px] font-medium text-[var(--muted)]">Start new</h2>
                  <div className="flex items-center gap-4 text-xs">
                    <button
                      onClick={() => setNewDesignModalOpen(true)}
                      className="text-[var(--muted)] transition hover:text-[var(--fg)] cursor-pointer"
                    >
                      All formats
                    </button>
                    <button
                      onClick={() => setSection("templates")}
                      className="inline-flex items-center gap-1 font-medium text-[var(--fg)] transition hover:opacity-75 cursor-pointer"
                    >
                      Templates <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <button
                    onClick={() =>
                      void createAndOpen({
                        title: "Untitled Presentation",
                        category: "presentation",
                        width: 1920,
                        height: 1080,
                      })
                    }
                    className="group flex items-center gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/40 cursor-pointer"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--fg)]">
                      <Presentation className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[var(--fg)]">Presentation</div>
                      <div className="text-[11px] text-[var(--muted)]">16:9 widescreen deck</div>
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      void createAndOpen({
                        title: "Untitled Graphic",
                        category: "social",
                        width: 1080,
                        height: 1080,
                      })
                    }
                    className="group flex items-center gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/40 cursor-pointer"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--fg)]">
                      <Square className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[var(--fg)]">Social graphic</div>
                      <div className="text-[11px] text-[var(--muted)]">1080 × 1080 square</div>
                    </div>
                  </button>

                  <button
                    onClick={() => pptxInputRef.current?.click()}
                    className="group flex items-center gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/40 cursor-pointer"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--fg)]">
                      <FileUp className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[var(--fg)]">Import PowerPoint</div>
                      <div className="text-[11px] text-[var(--muted)]">Edit any .pptx deck</div>
                    </div>
                  </button>

                  <button
                    onClick={() => photoInputRef.current?.click()}
                    className="group flex items-center gap-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-left transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-2)]/40 cursor-pointer"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--fg)]">
                      <ImageIcon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[var(--fg)]">Photo editor</div>
                      <div className="text-[11px] text-[var(--muted)]">Filters, crop & cutout</div>
                    </div>
                  </button>
                </div>
              </section>
            )}

            {/* DESIGNS GRID (Home, Projects, Starred, Trash) */}
            {(section === "home" ||
              section === "projects" ||
              section === "starred" ||
              section === "trash") && (
              <section>
                <div className="mb-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-[13px] font-medium text-[var(--muted)]">
                      {sectionHeading}
                    </h2>
                    <span className="text-xs text-[var(--muted)]/70">{visibleDesigns.length}</span>
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="aspect-[16/12] animate-pulse rounded-xl bg-[var(--surface-2)]"
                      />
                    ))}
                  </div>
                ) : visibleDesigns.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
                    <p className="text-sm font-medium text-[var(--fg)]">
                      {section === "trash"
                        ? "Trash is empty"
                        : section === "starred"
                          ? "No starred designs"
                          : "No designs yet"}
                    </p>
                    {section !== "trash" && section !== "starred" && (
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        Start a blank canvas, import a PowerPoint, or pick a template.
                      </p>
                    )}
                    {section !== "trash" && section !== "starred" && (
                      <div className="mt-4 flex items-center gap-2">
                        <button
                          onClick={() => setNewDesignModalOpen(true)}
                          className="rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent-fg)] hover:opacity-90 cursor-pointer"
                        >
                          New design
                        </button>
                        <button
                          onClick={() => setSection("templates")}
                          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-2)] cursor-pointer"
                        >
                          Browse templates
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleDesigns.map((d) => (
                      <div
                        key={d.id}
                        className="group relative flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] transition hover:border-[var(--border-strong)]"
                      >
                        <div
                          onClick={() => !d.trashed && router.push(`/design/${d.id}`)}
                          className="relative flex aspect-[16/10] items-center justify-center overflow-hidden rounded-t-[11px] bg-[var(--stage)] p-3 cursor-pointer"
                        >
                          {d.thumbnail ? (
                            <img
                              src={d.thumbnail}
                              alt={d.title}
                              className="max-h-full max-w-full rounded-[4px] object-contain shadow-xs ring-1 ring-black/5"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-[11px] text-[var(--muted)]">
                              <LayoutTemplate className="h-5 w-5 opacity-35" />
                              <span>
                                {d.width} × {d.height}
                              </span>
                            </div>
                          )}

                          {!d.trashed && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void toggleStar(d);
                              }}
                              title={d.starred ? "Remove star" : "Star design"}
                              className={`absolute right-2 top-2 rounded-md p-1.5 transition cursor-pointer ${
                                d.starred
                                  ? "bg-[var(--surface)]/95 text-amber-500 shadow-xs"
                                  : "bg-[var(--surface)]/85 text-[var(--muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--fg)]"
                              }`}
                            >
                              <Star className={`h-3.5 w-3.5 ${d.starred ? "fill-current" : ""}`} />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 px-3.5 py-3">
                          <div
                            onClick={() => !d.trashed && router.push(`/design/${d.id}`)}
                            className="min-w-0 flex-1 cursor-pointer"
                          >
                            <div className="truncate text-[13px] font-medium text-[var(--fg)]">
                              {d.title}
                            </div>
                            <div className="mt-0.5 text-[11px] text-[var(--muted)]">
                              {d.pageCount > 1 ? `${d.pageCount} pages` : `${d.width}×${d.height}`} ·{" "}
                              {formatRelativeDate(d.updatedAt)}
                            </div>
                          </div>

                          {d.trashed ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => void moveToTrash(d, false)}
                                title="Restore"
                                className="rounded-md p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => void deleteForever(d.id)}
                                title="Delete permanently"
                                className="rounded-md p-1.5 text-[var(--muted)] hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === d.id ? null : d.id);
                                }}
                                className="rounded-md p-1 text-[var(--muted)] opacity-0 transition group-hover:opacity-100 focus:opacity-100 hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
                                title="Options"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>

                              {openMenuId === d.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 bottom-8 z-30 w-44 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg"
                                >
                                  <button
                                    onClick={() => void duplicateDesign(d)}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-[var(--fg)] hover:bg-[var(--surface-2)] cursor-pointer"
                                  >
                                    <Copy className="h-3.5 w-3.5 text-[var(--muted)]" /> Duplicate
                                  </button>

                                  {folders.length > 0 && (
                                    <div className="px-2 py-1.5">
                                      <label className="block text-[10px] font-medium text-[var(--muted)] mb-1">
                                        Folder
                                      </label>
                                      <select
                                        value={d.folderId || ""}
                                        onChange={(e) => {
                                          void moveToFolder(d.id, e.target.value || null);
                                          setOpenMenuId(null);
                                        }}
                                        className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-1.5 py-1 text-[11px] text-[var(--fg)] outline-none"
                                      >
                                        <option value="">None</option>
                                        {folders.map((f) => (
                                          <option key={f.id} value={f.id}>
                                            {f.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  <div className="my-1 h-px bg-[var(--border)]" />
                                  <button
                                    onClick={() => void moveToTrash(d, true)}
                                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Move to trash
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* TEMPLATES TAB */}
            {section === "templates" && (
              <section className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h1 className="text-lg font-semibold tracking-tight text-[var(--fg)]">
                      Templates
                    </h1>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      Start from an editable layout for presentations, social, marketing, or docs.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
                    {["all", "team", "presentation", "social", "marketing", "document"].map(
                      (cat) => (
                        <button
                          key={cat}
                          onClick={() => setTplCategory(cat)}
                          className={`rounded-md px-2.5 py-1 text-xs font-medium capitalize transition cursor-pointer ${
                            tplCategory === cat
                              ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                              : "text-[var(--muted)] hover:text-[var(--fg)]"
                          }`}
                        >
                          {cat === "team" ? "Team" : cat}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {allTemplates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() =>
                        void createAndOpen({
                          title: tpl.title,
                          category: tpl.category,
                          width: tpl.width,
                          height: tpl.height,
                          pages: instantiateTemplate(tpl),
                        })
                      }
                      className="group flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] text-left transition hover:border-[var(--border-strong)] cursor-pointer"
                    >
                      <div className="flex aspect-[16/10] w-full items-center justify-center bg-[var(--stage)] p-3">
                        {tpl.pages[0] && (
                          <PagePreview
                            page={tpl.pages[0]}
                            width={tpl.width}
                            height={tpl.height}
