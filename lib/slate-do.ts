/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { DurableObject } from "cloudflare:workers";

const SCHEMA = [
  `create table if not exists designs (
    id text primary key,
    bi_id text not null,
    title text not null,
    category text not null default 'custom',
    folder_id text,
    starred integer not null default 0,
    trashed integer not null default 0,
    width integer not null,
    height integer not null,
    thumbnail text not null default '',
    pages_json text not null,
    comments_json text not null default '[]',
    versions_json text not null default '[]',
    share_config_json text not null default '{"linkAccess":"off","people":[]}',
    created_by text not null default '',
    updated_by text not null default '',
    created_at integer not null,
    updated_at integer not null
  )`,
  `create index if not exists designs_bi_idx on designs (bi_id, trashed, updated_at desc)`,
  `create table if not exists folders (
    id text primary key,
    bi_id text not null,
    name text not null,
    created_at integer not null
  )`,
  `create index if not exists folders_bi_idx on folders (bi_id, created_at desc)`,
  `create table if not exists brand_kits (
    bi_id text primary key,
    name text not null default 'My Brand',
    logos_json text not null default '[]',
    colors_json text not null default '["#0F172A","#4F46E5","#06B6D4","#F43F5E","#F8FAFC"]',
    fonts_json text not null default '{"heading":"Plus Jakarta Sans","subheading":"Inter","body":"Inter"}',
    updated_at integer not null
  )`,
  `create table if not exists media_assets (
    id text primary key,
    bi_id text not null,
    name text not null,
    mime_type text not null,
    data_url text not null,
    width integer not null default 0,
    height integer not null default 0,
    size_bytes integer not null default 0,
    created_at integer not null
  )`,
  `create index if not exists media_bi_idx on media_assets (bi_id, created_at desc)`,
  `create table if not exists team_templates (
    id text primary key,
    bi_id text not null,
    title text not null,
    category text not null default 'custom',
    width integer not null,
    height integer not null,
    thumbnail text not null default '',
    pages_json text not null,
    created_at integer not null
  )`,
  `create index if not exists templates_bi_idx on team_templates (bi_id, created_at desc)`,
];

export type SqlValue = string | number | null;
export type SqlRow = Record<string, SqlValue>;
export type SqlStatement = { sql: string; params?: SqlValue[] };

function bind(params: SqlValue[] = []) {
  return params.map((value) => (value === undefined ? null : value));
}

export class SlateDB extends DurableObject {
  private ready = false;

  private ensureSchema() {
    if (this.ready) return;
    this.ctx.storage.sql.exec("PRAGMA foreign_keys = ON");
    for (const statement of SCHEMA) {
      this.ctx.storage.sql.exec(statement);
    }
    this.ready = true;
  }

  async query(sql: string, params: SqlValue[] = []): Promise<SqlRow[]> {
    this.ensureSchema();
    return this.ctx.storage.sql.exec(sql, ...bind(params)).toArray() as SqlRow[];
  }

  async transact(statements: SqlStatement[]): Promise<SqlRow[][]> {
    this.ensureSchema();
    return this.ctx.storage.transactionSync(() =>
      statements.map((statement) => {
        const rows = this.ctx.storage.sql.exec(statement.sql, ...bind(statement.params)).toArray();
        return rows as SqlRow[];
      }),
    );
  }
}
