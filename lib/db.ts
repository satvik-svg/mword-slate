import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { SqlRow, SqlStatement, SqlValue } from "@/lib/slate-do";

export type QueryResult<T = SqlRow> = { rows: T[]; rowCount: number };

function bindable(value: unknown): SqlValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "string") return value;
  return JSON.stringify(value);
}

type SlateStub = {
  query(sql: string, params?: SqlValue[]): Promise<SqlRow[]>;
  transact(statements: SqlStatement[]): Promise<SqlRow[][]>;
};

async function stub(): Promise<SlateStub> {
  const { env } = await getCloudflareContext({ async: true });
  const ns = (
    env as {
      SLATE_DB?: { idFromName(name: string): unknown; get(id: unknown): SlateStub };
    }
  ).SLATE_DB;
  if (!ns) {
    throw new Error("SLATE_DB Durable Object binding is not available");
  }
  return ns.get(ns.idFromName("primary"));
}

export async function query<T = SqlRow>(
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  const rows = (await (await stub()).query(sql, params.map(bindable))) as unknown as T[];
  return { rows, rowCount: rows.length };
}

export async function transact(
  statements: { sql: string; params?: unknown[] }[],
): Promise<SqlRow[][]> {
  const payload: SqlStatement[] = statements.map((statement) => ({
    sql: statement.sql,
    params: (statement.params ?? []).map(bindable),
  }));
  return (await stub()).transact(payload);
}

export function asBool(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

export function asJson<T>(value: unknown, fallback: T): T {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  if (Array.isArray(value) || (value && typeof value === "object")) return value as T;
  return fallback;
}
