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
