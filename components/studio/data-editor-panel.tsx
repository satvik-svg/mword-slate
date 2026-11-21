"use client";

import { BarChart3, Plus, Table as TableIcon, Trash2, X } from "lucide-react";
import type { CanvasElement, ChartElement, ChartKind, TableElement } from "@/lib/types";

const CHART_PALETTE = [
  "#4F46E5",
  "#06B6D4",
  "#F43F5E",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#14B8A6",
];

const CHART_KINDS: { id: ChartKind; label: string }[] = [
  { id: "bar", label: "Bar" },
  { id: "line", label: "Line" },
  { id: "pie", label: "Pie" },
  { id: "donut", label: "Donut" },
];

export function DataEditorPanel({
  element,
  brandColors,
  onUpdate,
  onClose,
}: {
  element: ChartElement | TableElement;
  brandColors?: string[];
  onUpdate: (id: string, patch: Partial<CanvasElement>, commit?: boolean) => void;
  onClose: () => void;
}) {
  if (element.type === "chart") {
    return (
      <ChartDataPanel
        chart={element}
        brandColors={brandColors}
        onUpdate={onUpdate}
        onClose={onClose}
      />
    );
  }
  return <TableDataPanel table={element} onUpdate={onUpdate} onClose={onClose} />;
}

function ChartDataPanel({
  chart,
  brandColors,
  onUpdate,
  onClose,
}: {
  chart: ChartElement;
  brandColors?: string[];
  onUpdate: (id: string, patch: Partial<CanvasElement>, commit?: boolean) => void;
  onClose: () => void;
}) {
  const palette = brandColors && brandColors.length >= 3 ? brandColors : CHART_PALETTE;

  const updatePoint = (
    idx: number,
    patch: Partial<ChartElement["data"][number]>,
    commit = false,
  ) => {
    const next = chart.data.map((d, i) => (i === idx ? { ...d, ...patch } : d));
    onUpdate(chart.id, { data: next } as Partial<ChartElement>, commit);
  };

  const addPoint = () => {
    const nextIdx = chart.data.length;
    const nextColor = CHART_PALETTE[nextIdx % CHART_PALETTE.length];
    onUpdate(
      chart.id,
      {
        data: [
          ...chart.data,
          { label: `Item ${nextIdx + 1}`, value: 50, color: nextColor },
        ],
      } as Partial<ChartElement>,
      true,
    );
  };

  const removePoint = (idx: number) => {
    if (chart.data.length <= 1) return;
    onUpdate(
      chart.id,
      { data: chart.data.filter((_, i) => i !== idx) } as Partial<ChartElement>,
      true,
    );
  };

  const applySingleColor = (color: string) => {
    onUpdate(
      chart.id,
      {
        accentColor: color,
        data: chart.data.map((d) => ({ ...d, color })),
      } as Partial<ChartElement>,
      true,
    );
  };

  const applyPalette = (colors: string[]) => {
    onUpdate(
      chart.id,
      {
        accentColor: colors[0] || chart.accentColor,
        data: chart.data.map((d, i) => ({
          ...d,
          color: colors[i % colors.length],
        })),
      } as Partial<ChartElement>,
      true,
    );
  };

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)] text-xs">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2 font-semibold text-[var(--fg)]">
          <BarChart3 className="h-4 w-4 text-[var(--muted)]" />
          <span>Edit Chart Data</span>
        </div>
        <button
          onClick={onClose}
          title="Close Chart Data"
          className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Chart Type */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-[var(--muted)]">
            Chart Type
          </label>
          <div className="grid grid-cols-4 gap-1 rounded-xl bg-[var(--surface-2)] p-1">
            {CHART_KINDS.map((k) => {
              const active = chart.chartKind === k.id;
              return (
                <button
                  key={k.id}
                  onClick={() =>
                    onUpdate(chart.id, { chartKind: k.id } as Partial<ChartElement>, true)
                  }
                  className={`rounded-lg py-1.5 text-[11px] font-medium transition cursor-pointer ${
                    active
                      ? "bg-[var(--surface)] text-[var(--fg)] shadow-xs"
                      : "text-[var(--muted)] hover:text-[var(--fg)]"
                  }`}
                >
                  {k.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart Title */}
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-[var(--muted)]">
            Chart Title
          </label>
          <input
            value={chart.title ?? ""}
            onChange={(e) =>
              onUpdate(chart.id, { title: e.target.value } as Partial<ChartElement>)
            }
            onBlur={() => onUpdate(chart.id, { title: chart.title ?? "" } as Partial<ChartElement>, true)}
            placeholder="Optional chart title…"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-xs text-[var(--fg)] outline-none focus:border-[var(--border-strong)]"
          />
        </div>

        {/* Data Rows */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium text-[var(--muted)]">
              Bars / Slices ({chart.data.length})
            </span>
            <button
              onClick={addPoint}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-2 py-1 text-[11px] font-medium text-[var(--accent-fg)] hover:opacity-90 cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Add Item
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="grid grid-cols-[26px_1fr_72px_24px] items-center gap-1.5 px-1 text-[10px] font-medium text-[var(--muted)]">
              <span></span>
              <span>Label</span>
              <span>Value</span>
              <span></span>
            </div>

            {chart.data.map((item, idx) => {
              const colorVal = item.color || chart.accentColor || CHART_PALETTE[idx % CHART_PALETTE.length];
              return (
                <div
                  key={idx}
                  className="grid grid-cols-[26px_1fr_72px_24px] items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 p-1"
                >
                  <input
                    type="color"
                    value={colorVal}
                    onChange={(e) => updatePoint(idx, { color: e.target.value }, true)}
                    title={`Color for ${item.label}`}
                    className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updatePoint(idx, { label: e.target.value })}
                    onBlur={() => updatePoint(idx, { label: item.label }, true)}
                    placeholder="Label"
                    className="min-w-0 rounded-md border border-transparent bg-[var(--surface)] px-2 py-1 text-xs text-[var(--fg)] outline-none focus:border-[var(--border-strong)]"
                  />
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={Number.isFinite(item.value) ? item.value : 0}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      updatePoint(idx, { value: Number.isFinite(v) ? Math.max(0, v) : 0 });
                    }}
                    onBlur={() => updatePoint(idx, { value: item.value }, true)}
                    className="min-w-0 rounded-md border border-transparent bg-[var(--surface)] px-2 py-1 text-right text-xs font-medium tabular-nums text-[var(--fg)] outline-none focus:border-[var(--border-strong)]"
                  />
                  <button
                    onClick={() => removePoint(idx)}
                    disabled={chart.data.length <= 1}
                    title="Delete item"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface)] hover:text-rose-500 disabled:opacity-30 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Color Styling */}
        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <span className="block text-[11px] font-medium text-[var(--muted)]">
            Colors & Labels
          </span>

          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 px-2.5 py-2">
            <span className="text-[11px] text-[var(--fg)]">Label & Title Color</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  onUpdate(chart.id, { textColor: "#FFFFFF" } as Partial<ChartElement>, true)
                }
                title="Light text (for dark backgrounds)"
                className="rounded border border-[var(--border)] bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-white cursor-pointer"
              >
                Light
              </button>
              <button
                onClick={() =>
                  onUpdate(chart.id, { textColor: "#0F172A" } as Partial<ChartElement>, true)
                }
                title="Dark text (for light backgrounds)"
                className="rounded border border-[var(--border)] bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-900 cursor-pointer"
              >
                Dark
              </button>
              <input
                type="color"
                value={chart.textColor || "#0F172A"}
                onChange={(e) =>
                  onUpdate(chart.id, { textColor: e.target.value } as Partial<ChartElement>, true)
                }
                className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 px-2.5 py-2">
            <span className="text-[11px] text-[var(--fg)]">
              {chart.chartKind === "line" ? "Line Color" : "All Bars Color"}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => applyPalette(CHART_PALETTE)}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--fg)] hover:bg-[var(--surface-2)] cursor-pointer"
              >
                Multi
              </button>
              {palette !== CHART_PALETTE && (
                <button
                  onClick={() => applyPalette(palette)}
                  className="rounded border border-[var(--border)] bg-[var(--surface)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--fg)] hover:bg-[var(--surface-2)] cursor-pointer"
                >
                  Brand
                </button>
              )}
              <input
                type="color"
                value={chart.accentColor || "#4F46E5"}
                onChange={(e) => applySingleColor(e.target.value)}
                className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
              />
            </div>
          </div>

          <label className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 px-2.5 py-2 cursor-pointer">
            <span className="text-[11px] text-[var(--fg)]">Show numeric values</span>
            <input
              type="checkbox"
              checked={chart.showValues !== false}
              onChange={(e) =>
                onUpdate(chart.id, { showValues: e.target.checked } as Partial<ChartElement>, true)
              }
              className="h-3.5 w-3.5 accent-[var(--accent)] cursor-pointer"
            />
          </label>
        </div>
      </div>
    </aside>
  );
}

function TableDataPanel({
  table,
  onUpdate,
  onClose,
}: {
  table: TableElement;
  onUpdate: (id: string, patch: Partial<CanvasElement>, commit?: boolean) => void;
  onClose: () => void;
}) {
  const rowCount = table.rows.length;
  const colCount = table.rows[0]?.length || 1;

  const updateCell = (r: number, c: number, value: string, commit = false) => {
    const nextRows = table.rows.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : row,
    );
    onUpdate(table.id, { rows: nextRows } as Partial<TableElement>, commit);
  };

  const addRow = () => {
    onUpdate(
      table.id,
      { rows: [...table.rows, Array(colCount).fill("Cell")] } as Partial<TableElement>,
      true,
    );
  };

  const deleteRow = (rIdx: number) => {
    if (table.rows.length <= 1) return;
    onUpdate(
      table.id,
      { rows: table.rows.filter((_, i) => i !== rIdx) } as Partial<TableElement>,
      true,
    );
  };

  const addCol = () => {
    onUpdate(
      table.id,
      {
        rows: table.rows.map((r, i) => [...r, i === 0 ? `Col ${colCount + 1}` : "Cell"]),
      } as Partial<TableElement>,
      true,
    );
  };

  const deleteCol = (cIdx: number) => {
    if (colCount <= 1) return;
    onUpdate(
      table.id,
      {
        rows: table.rows.map((r) => r.filter((_, i) => i !== cIdx)),
      } as Partial<TableElement>,
      true,
    );
  };

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-[var(--border)] bg-[var(--surface)] text-xs">
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-2 font-semibold text-[var(--fg)]">
          <TableIcon className="h-4 w-4 text-[var(--muted)]" />
          <span>Edit Table ({rowCount} × {colCount})</span>
        </div>
        <button
          onClick={onClose}
          title="Close Table Editor"
          className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-[11px] text-[var(--muted)]">
          Edit cells here or double-click any cell directly on the canvas.
        </p>

        {/* Row / Column actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={addRow}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--border-strong)] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add Row
          </button>
          <button
            onClick={addCol}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--fg)] hover:border-[var(--border-strong)] cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add Column
          </button>
        </div>

        {/* Editable Spreadsheet Grid */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/50 p-2">
          <table className="w-full border-separate border-spacing-1">
            <thead>
              <tr>
                {Array.from({ length: colCount }).map((_, ci) => (
                  <th key={ci} className="pb-0.5 text-center">
                    <div className="flex items-center justify-between gap-1 px-1 text-[10px] font-medium text-[var(--muted)]">
                      <span>C{ci + 1}</span>
                      {colCount > 1 && (
                        <button
                          onClick={() => deleteCol(ci)}
                          title={`Delete column ${ci + 1}`}
                          className="rounded p-0.5 hover:bg-[var(--surface)] hover:text-rose-500 cursor-pointer"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-5" />
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri}>
                  {row.map((cell, ci) => (
                    <td key={ci}>
                      <input
                        value={cell}
                        onChange={(e) => updateCell(ri, ci, e.target.value)}
                        onBlur={() => updateCell(ri, ci, cell, true)}
                        className={`w-full min-w-[64px] rounded-md border px-2 py-1 text-[11px] outline-none focus:border-[var(--border-strong)] ${
                          ri === 0
                            ? "border-[var(--border-strong)] bg-[var(--surface)] font-semibold text-[var(--fg)]"
                            : "border-[var(--border)] bg-[var(--surface)] text-[var(--fg)]"
                        }`}
                      />
                    </td>
                  ))}
                  <td className="text-center">
                    {rowCount > 1 && (
                      <button
                        onClick={() => deleteRow(ri)}
                        title={`Delete row ${ri + 1}`}
                        className="rounded p-1 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Styling */}
        <div className="space-y-2 border-t border-[var(--border)] pt-3">
          <span className="block text-[11px] font-medium text-[var(--muted)]">
            Colors & Text Size
          </span>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: "headerBg", label: "Header Fill", val: table.headerBg },
                { key: "headerColor", label: "Header Text", val: table.headerColor },
                { key: "cellBg", label: "Cell Fill", val: table.cellBg },
                { key: "cellColor", label: "Cell Text", val: table.cellColor },
                { key: "borderColor", label: "Border", val: table.borderColor },
              ] as const
            ).map((item) => (
              <label
                key={item.key}
                className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 px-2.5 py-1.5 cursor-pointer"
              >
                <span className="text-[11px] text-[var(--fg)]">{item.label}</span>
                <input
                  type="color"
                  value={item.val}
                  onChange={(e) =>
                    onUpdate(table.id, { [item.key]: e.target.value } as Partial<TableElement>, true)
                  }
                  className="h-5 w-5 cursor-pointer rounded border-0 bg-transparent p-0"
                />
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)]/60 px-2.5 py-2">
            <span className="text-[11px] text-[var(--fg)]">Font Size</span>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={10}
                max={40}
                value={table.fontSize}
                onChange={(e) =>
                  onUpdate(
                    table.id,
                    { fontSize: Number(e.target.value) } as Partial<TableElement>,
                    true,
                  )
                }
                className="w-24 accent-[var(--accent)] cursor-pointer"
              />
              <span className="w-8 text-right text-[11px] font-medium tabular-nums text-[var(--muted)]">
                {table.fontSize}px
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
