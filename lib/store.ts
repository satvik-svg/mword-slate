import "server-only";

import { asBool, asJson, query, transact } from "@/lib/db";
import { makeId } from "@/lib/id";
import {
  DEFAULT_BRAND_KIT,
  type BrandKit,
  type DesignCategory,
  type DesignComment,
  type DesignPage,
  type DesignRecord,
  type DesignSummary,
  type DesignVersion,
  type FolderRecord,
  type MediaAsset,
  type ShareConfig,
  type TemplateRecord,
} from "@/lib/types";

type DesignRow = {
  id: string;
  bi_id: string;
  title: string;
  category: string;
  folder_id: string | null;
  starred: number;
  trashed: number;
  width: number;
  height: number;
  thumbnail: string;
  pages_json: string;
  comments_json: string;
  versions_json: string;
  share_config_json: string;
  created_by: string;
  updated_by: string;
  created_at: number;
  updated_at: number;
};

const DEFAULT_SHARE: ShareConfig = { linkAccess: "off", people: [] };

function rowToSummary(row: DesignRow): DesignSummary {
  const pages = asJson<DesignPage[]>(row.pages_json, []);
  return {
    id: row.id,
    title: row.title,
    category: (row.category as DesignCategory) || "custom",
    folderId: row.folder_id || null,
    starred: asBool(row.starred),
    trashed: asBool(row.trashed),
    width: Number(row.width) || 1080,
    height: Number(row.height) || 1080,
    pageCount: Math.max(1, pages.length),
    thumbnail: row.thumbnail || "",
    shareConfig: asJson<ShareConfig>(row.share_config_json, DEFAULT_SHARE),
    createdBy: row.created_by || "",
    updatedBy: row.updated_by || "",
    createdAt: Number(row.created_at) || Date.now(),
    updatedAt: Number(row.updated_at) || Date.now(),
  };
}

function rowToRecord(row: DesignRow): DesignRecord {
  const summary = rowToSummary(row);
  return {
    ...summary,
    pages: asJson<DesignPage[]>(row.pages_json, []),
    comments: asJson<DesignComment[]>(row.comments_json, []),
    versions: asJson<DesignVersion[]>(row.versions_json, []),
  };
}

export async function listDesigns(biId: string): Promise<DesignSummary[]> {
  const { rows } = await query<DesignRow>(
    "select * from designs where bi_id = ? order by updated_at desc limit 200",
    [biId],
  );
  return rows.map(rowToSummary);
}

export async function getDesign(biId: string, id: string): Promise<DesignRecord | null> {
  const { rows } = await query<DesignRow>(
    "select * from designs where id = ? and bi_id = ?",
    [id, biId],
  );
  if (!rows[0]) return null;
  return rowToRecord(rows[0]);
}

export async function getDesignById(id: string): Promise<{ record: DesignRecord; biId: string } | null> {
  const { rows } = await query<DesignRow>("select * from designs where id = ?", [id]);
  if (!rows[0]) return null;
  return { record: rowToRecord(rows[0]), biId: rows[0].bi_id };
}

export async function createDesign(input: {
  biId: string;
  title: string;
  category: DesignCategory;
  width: number;
  height: number;
  pages?: DesignPage[];
  folderId?: string | null;
  thumbnail?: string;
  actor: string;
}): Promise<DesignRecord> {
  const now = Date.now();
  const id = makeId("des");
  const pages: DesignPage[] =
    input.pages && input.pages.length > 0
      ? input.pages
      : [
          {
            id: makeId("pg"),
            name: "Page 1",
            background: "#FFFFFF",
            elements: [],
          },
        ];

  await transact([
    {
      sql: `insert into designs (
        id, bi_id, title, category, folder_id, starred, trashed, width, height,
        thumbnail, pages_json, comments_json, versions_json, share_config_json,
        created_by, updated_by, created_at, updated_at
      ) values (?, ?, ?, ?, ?, 0, 0, ?, ?, ?, ?, '[]', '[]', ?, ?, ?, ?, ?)`,
      params: [
        id,
        input.biId,
        input.title.trim() || "Untitled Design",
        input.category || "custom",
        input.folderId ?? null,
        Math.max(100, Math.round(input.width || 1080)),
        Math.max(100, Math.round(input.height || 1080)),
        input.thumbnail || "",
        JSON.stringify(pages),
        JSON.stringify(DEFAULT_SHARE),
        input.actor,
        input.actor,
        now,
        now,
      ],
    },
  ]);

  return {
    id,
    title: input.title.trim() || "Untitled Design",
    category: input.category || "custom",
    folderId: input.folderId ?? null,
    starred: false,
    trashed: false,
    width: Math.max(100, Math.round(input.width || 1080)),
    height: Math.max(100, Math.round(input.height || 1080)),
    pageCount: pages.length,
    thumbnail: input.thumbnail || "",
    shareConfig: DEFAULT_SHARE,
    createdBy: input.actor,
    updatedBy: input.actor,
    createdAt: now,
    updatedAt: now,
    pages,
    comments: [],
    versions: [],
  };
}

export async function updateDesign(
  biId: string,
  id: string,
  patch: Partial<{
    title: string;
    category: DesignCategory;
    folderId: string | null;
    starred: boolean;
    trashed: boolean;
    width: number;
    height: number;
    thumbnail: string;
    pages: DesignPage[];
    comments: DesignComment[];
    versions: DesignVersion[];
    shareConfig: ShareConfig;
  }>,
  actor: string,
): Promise<DesignRecord | null> {
  const existing = await getDesign(biId, id);
  if (!existing) return null;

  const next: DesignRecord = {
    ...existing,
    title: patch.title !== undefined ? patch.title.trim() || "Untitled Design" : existing.title,
    category: patch.category !== undefined ? patch.category : existing.category,
    folderId: patch.folderId !== undefined ? patch.folderId : existing.folderId,
    starred: patch.starred !== undefined ? patch.starred : existing.starred,
    trashed: patch.trashed !== undefined ? patch.trashed : existing.trashed,
    width: patch.width !== undefined ? Math.max(100, Math.round(patch.width)) : existing.width,
    height: patch.height !== undefined ? Math.max(100, Math.round(patch.height)) : existing.height,
    thumbnail: patch.thumbnail !== undefined ? patch.thumbnail : existing.thumbnail,
    pages: patch.pages !== undefined ? patch.pages : existing.pages,
    comments: patch.comments !== undefined ? patch.comments : existing.comments,
    versions: patch.versions !== undefined ? patch.versions.slice(0, 20) : existing.versions,
    shareConfig: patch.shareConfig !== undefined ? patch.shareConfig : existing.shareConfig,
    updatedBy: actor,
    updatedAt: Date.now(),
    pageCount: patch.pages ? Math.max(1, patch.pages.length) : existing.pageCount,
  };

  await transact([
    {
      sql: `update designs set
        title = ?, category = ?, folder_id = ?, starred = ?, trashed = ?,
        width = ?, height = ?, thumbnail = ?, pages_json = ?, comments_json = ?,
        versions_json = ?, share_config_json = ?, updated_by = ?, updated_at = ?
        where id = ? and bi_id = ?`,
      params: [
        next.title,
        next.category,
        next.folderId,
        next.starred ? 1 : 0,
        next.trashed ? 1 : 0,
        next.width,
        next.height,
        next.thumbnail,
        JSON.stringify(next.pages),
        JSON.stringify(next.comments),
        JSON.stringify(next.versions),
        JSON.stringify(next.shareConfig),
        next.updatedBy,
        next.updatedAt,
        id,
        biId,
      ],
    },
  ]);

  return next;
}

export async function updateSharedDesignById(
  id: string,
  patch: Partial<{
    title: string;
    pages: DesignPage[];
    comments: DesignComment[];
    thumbnail: string;
  }>,
  actor: string,
): Promise<DesignRecord | null> {
  const found = await getDesignById(id);
  if (!found) return null;
  return updateDesign(found.biId, id, patch, actor);
}

export async function deleteDesign(biId: string, id: string): Promise<boolean> {
  const existing = await getDesign(biId, id);
  if (!existing) return false;
  await transact([{ sql: "delete from designs where id = ? and bi_id = ?", params: [id, biId] }]);
  return true;
}

export async function listFolders(biId: string): Promise<FolderRecord[]> {
  const { rows } = await query<{ id: string; name: string; created_at: number }>(
    "select id, name, created_at from folders where bi_id = ? order by created_at desc",
    [biId],
  );
  return rows.map((r) => ({ id: r.id, name: r.name, createdAt: Number(r.created_at) }));
}

export async function createFolder(biId: string, name: string): Promise<FolderRecord> {
  const folder: FolderRecord = {
    id: makeId("fld"),
    name: name.trim() || "Untitled Folder",
    createdAt: Date.now(),
  };
  await transact([
    {
      sql: "insert into folders (id, bi_id, name, created_at) values (?, ?, ?, ?)",
      params: [folder.id, biId, folder.name, folder.createdAt],
    },
  ]);
  return folder;
}

export async function deleteFolder(biId: string, id: string): Promise<void> {
  await transact([
    { sql: "update designs set folder_id = null where folder_id = ? and bi_id = ?", params: [id, biId] },
    { sql: "delete from folders where id = ? and bi_id = ?", params: [id, biId] },
  ]);
}

export async function getBrandKit(biId: string): Promise<BrandKit> {
  const { rows } = await query<{
    name: string;
    logos_json: string;
    colors_json: string;
    fonts_json: string;
    updated_at: number;
  }>("select name, logos_json, colors_json, fonts_json, updated_at from brand_kits where bi_id = ?", [
    biId,
  ]);
  if (!rows[0]) return { ...DEFAULT_BRAND_KIT };
  return {
    name: rows[0].name || DEFAULT_BRAND_KIT.name,
    logos: asJson(rows[0].logos_json, DEFAULT_BRAND_KIT.logos),
    colors: asJson(rows[0].colors_json, DEFAULT_BRAND_KIT.colors),
    fonts: asJson(rows[0].fonts_json, DEFAULT_BRAND_KIT.fonts),
    updatedAt: Number(rows[0].updated_at) || Date.now(),
  };
}

export async function saveBrandKit(biId: string, kit: Partial<BrandKit>): Promise<BrandKit> {
  const existing = await getBrandKit(biId);
  const next: BrandKit = {
    name: kit.name?.trim() || existing.name,
    logos: kit.logos ?? existing.logos,
    colors: kit.colors ?? existing.colors,
    fonts: kit.fonts ?? existing.fonts,
    updatedAt: Date.now(),
  };
  await transact([
    {
      sql: `insert into brand_kits (bi_id, name, logos_json, colors_json, fonts_json, updated_at)
            values (?, ?, ?, ?, ?, ?)
            on conflict(bi_id) do update set
              name = excluded.name,
