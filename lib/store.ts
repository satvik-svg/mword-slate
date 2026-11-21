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
  if (!rows[0]) return { ...DEFAULT_BRAND_KIT, customFonts: [] };
  const rawFonts = asJson<{
    heading?: string;
    subheading?: string;
    body?: string;
    custom?: BrandKit["customFonts"];
  }>(rows[0].fonts_json, DEFAULT_BRAND_KIT.fonts);
  return {
    name: rows[0].name || DEFAULT_BRAND_KIT.name,
    logos: asJson(rows[0].logos_json, DEFAULT_BRAND_KIT.logos),
    colors: asJson(rows[0].colors_json, DEFAULT_BRAND_KIT.colors),
    fonts: {
      heading: rawFonts.heading || DEFAULT_BRAND_KIT.fonts.heading,
      subheading: rawFonts.subheading || DEFAULT_BRAND_KIT.fonts.subheading,
      body: rawFonts.body || DEFAULT_BRAND_KIT.fonts.body,
    },
    customFonts: Array.isArray(rawFonts.custom) ? rawFonts.custom : [],
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
    customFonts: kit.customFonts ?? existing.customFonts ?? [],
    updatedAt: Date.now(),
  };
  const fontsPayload = {
    ...next.fonts,
    custom: next.customFonts ?? [],
  };
  await transact([
    {
      sql: `insert into brand_kits (bi_id, name, logos_json, colors_json, fonts_json, updated_at)
            values (?, ?, ?, ?, ?, ?)
            on conflict(bi_id) do update set
              name = excluded.name,
              logos_json = excluded.logos_json,
              colors_json = excluded.colors_json,
              fonts_json = excluded.fonts_json,
              updated_at = excluded.updated_at`,
      params: [
        biId,
        next.name,
        JSON.stringify(next.logos),
        JSON.stringify(next.colors),
        JSON.stringify(fontsPayload),
        next.updatedAt,
      ],
    },
  ]);
  return next;
}

export async function listMedia(biId: string): Promise<MediaAsset[]> {
  const { rows } = await query<{
    id: string;
    name: string;
    mime_type: string;
    data_url: string;
    width: number;
    height: number;
    size_bytes: number;
    created_at: number;
  }>(
    "select id, name, mime_type, data_url, width, height, size_bytes, created_at from media_assets where bi_id = ? order by created_at desc limit 100",
    [biId],
  );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    mimeType: r.mime_type,
    dataUrl: r.data_url,
    width: Number(r.width) || 0,
    height: Number(r.height) || 0,
    sizeBytes: Number(r.size_bytes) || 0,
    createdAt: Number(r.created_at) || Date.now(),
  }));
}

export async function createMedia(
  biId: string,
  input: {
    name: string;
    mimeType: string;
    dataUrl: string;
    width?: number;
    height?: number;
    sizeBytes?: number;
  },
): Promise<MediaAsset> {
  const asset: MediaAsset = {
    id: makeId("med"),
    name: input.name.trim() || "image",
    mimeType: input.mimeType || "image/png",
    dataUrl: input.dataUrl,
    width: Math.round(input.width || 0),
    height: Math.round(input.height || 0),
    sizeBytes: Math.round(input.sizeBytes || input.dataUrl.length),
    createdAt: Date.now(),
  };
  await transact([
    {
      sql: `insert into media_assets (id, bi_id, name, mime_type, data_url, width, height, size_bytes, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        asset.id,
        biId,
        asset.name,
        asset.mimeType,
        asset.dataUrl,
        asset.width,
        asset.height,
        asset.sizeBytes,
        asset.createdAt,
      ],
    },
  ]);
  return asset;
}

export async function deleteMedia(biId: string, id: string): Promise<void> {
  await transact([
    { sql: "delete from media_assets where id = ? and bi_id = ?", params: [id, biId] },
  ]);
}

export async function listTeamTemplates(biId: string): Promise<TemplateRecord[]> {
  const { rows } = await query<{
    id: string;
    title: string;
    category: string;
    width: number;
    height: number;
    thumbnail: string;
    pages_json: string;
  }>(
    "select id, title, category, width, height, thumbnail, pages_json from team_templates where bi_id = ? order by created_at desc limit 60",
    [biId],
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    category: (r.category as DesignCategory) || "custom",
    tags: ["Team"],
    width: Number(r.width) || 1080,
    height: Number(r.height) || 1080,
    thumbnail: r.thumbnail || "",
    isCustom: true,
    pages: asJson<DesignPage[]>(r.pages_json, []),
  }));
}

export async function saveTeamTemplate(
  biId: string,
  input: {
    title: string;
    category: DesignCategory;
    width: number;
    height: number;
    thumbnail?: string;
    pages: DesignPage[];
  },
): Promise<TemplateRecord> {
  const id = makeId("tpl");
  const now = Date.now();
  await transact([
    {
      sql: `insert into team_templates (id, bi_id, title, category, width, height, thumbnail, pages_json, created_at)
            values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        id,
        biId,
        input.title.trim() || "Team Template",
        input.category || "custom",
        Math.round(input.width || 1080),
        Math.round(input.height || 1080),
        input.thumbnail || "",
        JSON.stringify(input.pages),
        now,
      ],
    },
  ]);
  return {
    id,
    title: input.title.trim() || "Team Template",
    category: input.category || "custom",
    tags: ["Team"],
    width: Math.round(input.width || 1080),
    height: Math.round(input.height || 1080),
    thumbnail: input.thumbnail || "",
    isCustom: true,
    pages: input.pages,
  };
}

export async function deleteTeamTemplate(biId: string, id: string): Promise<void> {
  await transact([
    { sql: "delete from team_templates where id = ? and bi_id = ?", params: [id, biId] },
  ]);
}
