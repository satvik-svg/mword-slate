"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Brush,
  Check,
  Eraser,
  Eye,
  Minus,
  Plus,
  Redo2,
  RotateCcw,
  Scissors,
  Undo2,
  Wand2,
  X,
} from "lucide-react";
import {
  applyMagicWandErase,
  applyMaskBrushStroke,
  loadImage,
  removeBackgroundInBrowser,
} from "@/lib/photo-tools";
import type { ImageElement } from "@/lib/types";

type RefineTool = "erase" | "restore" | "wand";
type BackdropMode = "checker" | "dark" | "light";

export function MagicEraserModal({
  open,
  element,
  onClose,
  onApply,
}: {
  open: boolean;
  element: ImageElement | null;
  onClose: () => void;
  onApply: (nextSrc: string, originalSrc: string) => void;
}) {
  const [tool, setTool] = useState<RefineTool>("erase");
  const [brushSize, setBrushSize] = useState(34);
  const [softness, setSoftness] = useState(35);
  const [wandTolerance, setWandTolerance] = useState(32);
  const [bgTolerance, setBgTolerance] = useState(36);
  const [zoom, setZoom] = useState(1);
  const [backdrop, setBackdrop] = useState<BackdropMode>("checker");
  const [peekingOriginal, setPeekingOriginal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoBusy, setAutoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [historyMeta, setHistoryMeta] = useState({ idx: 0, len: 1 });
  const [cursorInfo, setCursorInfo] = useState<{
    x: number;
    y: number;
    visible: boolean;
  }>({ x: 0, y: 0, visible: false });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const originalBufRef = useRef<Uint8ClampedArray | null>(null);
  const currentBufRef = useRef<Uint8ClampedArray | null>(null);
  const historyRef = useRef<Uint8ClampedArray[]>([]);
  const historyIdxRef = useRef(0);
  const paintingRef = useRef(false);
  const lastPtRef = useRef<{ x: number; y: number } | null>(null);
  const didMutateStrokeRef = useRef(false);

  const redrawCanvas = useCallback((showOrig = false) => {
    const canvas = canvasRef.current;
    const buf = showOrig ? originalBufRef.current : currentBufRef.current;
    if (!canvas || !buf || canvas.width === 0 || canvas.height === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imgData = new ImageData(new Uint8ClampedArray(buf), canvas.width, canvas.height);
    ctx.putImageData(imgData, 0, 0);
  }, []);

  const pushSnapshot = useCallback((buf: Uint8ClampedArray) => {
    const copy = new Uint8ClampedArray(buf);
    const next = historyRef.current.slice(0, historyIdxRef.current + 1);
    next.push(copy);
    if (next.length > 20) next.shift();
    historyRef.current = next;
    historyIdxRef.current = next.length - 1;
    setHistoryMeta({ idx: historyIdxRef.current, len: next.length });
  }, []);

  const undo = useCallback(() => {
    if (historyIdxRef.current <= 0) return;
    historyIdxRef.current -= 1;
    currentBufRef.current = new Uint8ClampedArray(historyRef.current[historyIdxRef.current]);
    setHistoryMeta({ idx: historyIdxRef.current, len: historyRef.current.length });
    redrawCanvas(false);
  }, [redrawCanvas]);

  const redo = useCallback(() => {
    if (historyIdxRef.current >= historyRef.current.length - 1) return;
    historyIdxRef.current += 1;
    currentBufRef.current = new Uint8ClampedArray(historyRef.current[historyIdxRef.current]);
    setHistoryMeta({ idx: historyIdxRef.current, len: historyRef.current.length });
    redrawCanvas(false);
  }, [redrawCanvas]);

  // Load current & original image buffers when opened
  useEffect(() => {
    if (!open || !element) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPeekingOriginal(false);

    const origSrc = element.originalSrc || element.src;
    const currSrc = element.src;

    const loadBuffers = async () => {
      try {
        const [origImg, currImg] = await Promise.all([
          loadImage(origSrc),
          currSrc === origSrc ? Promise.resolve(null) : loadImage(currSrc),
        ]);
        if (cancelled) return;

        const maxDim = 1400;
        const scale = Math.min(
          1,
          maxDim / Math.max(origImg.naturalWidth || 1, origImg.naturalHeight || 1),
        );
        const w = Math.max(1, Math.round((origImg.naturalWidth || 1) * scale));
        const h = Math.max(1, Math.round((origImg.naturalHeight || 1) * scale));

        const off = document.createElement("canvas");
        off.width = w;
        off.height = h;
        const octx = off.getContext("2d", { willReadFrequently: true });
        if (!octx) throw new Error("Canvas context unavailable");

        octx.drawImage(origImg, 0, 0, w, h);
        const origData = new Uint8ClampedArray(octx.getImageData(0, 0, w, h).data);

        let currData: Uint8ClampedArray;
        if (currImg) {
          octx.clearRect(0, 0, w, h);
          octx.drawImage(currImg, 0, 0, w, h);
          currData = new Uint8ClampedArray(octx.getImageData(0, 0, w, h).data);
        } else {
          currData = new Uint8ClampedArray(origData);
        }

        originalBufRef.current = origData;
        currentBufRef.current = currData;
        historyRef.current = [new Uint8ClampedArray(currData)];
        historyIdxRef.current = 0;
        setHistoryMeta({ idx: 0, len: 1 });
        setImgSize({ w, h });

        // Fit inside stage viewport
        const stage = stageRef.current;
        const availW = Math.max(320, (stage?.clientWidth || 760) - 64);
        const availH = Math.max(240, (stage?.clientHeight || 480) - 64);
        const fit = Math.min(1, availW / w, availH / h);
        setZoom(Math.max(0.2, Math.min(1.5, +fit.toFixed(2))));

        requestAnimationFrame(() => {
          if (cancelled) return;
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.width = w;
          canvas.height = h;
          redrawCanvas(false);
        });
      } catch {
        if (!cancelled) {
          setError(
            "Could not read pixels from this image (cross-origin restriction). Re-upload or insert from Stock Photos to refine it.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadBuffers();
    return () => {
      cancelled = true;
    };
  }, [open, element, redrawCanvas]);

  // Redraw when toggling original preview
  useEffect(() => {
    if (!open || imgSize.w === 0) return;
    redrawCanvas(peekingOriginal);
  }, [open, peekingOriginal, imgSize.w, redrawCanvas]);

  // Keyboard shortcuts while modal is open
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.key === "[") {
        setBrushSize((s) => Math.max(4, s - 6));
      } else if (e.key === "]") {
        setBrushSize((s) => Math.min(140, s + 6));
      } else if (e.key.toLowerCase() === "e") {
        setTool("erase");
      } else if (e.key.toLowerCase() === "r") {
        setTool("restore");
      } else if (e.key.toLowerCase() === "w") {
        setTool("wand");
      } else if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        setPeekingOriginal(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setPeekingOriginal(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [open, onClose, undo, redo]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return {
      x,
      y,
      localX: e.clientX - rect.left,
      localY: e.clientY - rect.top,
      scaleRatio: rect.width / Math.max(1, canvas.width),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (loading || autoBusy || error || !currentBufRef.current || !originalBufRef.current) return;
    if (e.button !== 0) return;
    const pt = getCanvasPoint(e);
    if (!pt) return;

    e.currentTarget.setPointerCapture(e.pointerId);

    if (tool === "wand") {
      const erased = applyMagicWandErase({
        current: currentBufRef.current,
        width: imgSize.w,
        height: imgSize.h,
        startX: pt.x,
        startY: pt.y,
        tolerance: wandTolerance,
      });
      if (erased > 0) {
        redrawCanvas(false);
        pushSnapshot(currentBufRef.current);
      }
      return;
    }

    paintingRef.current = true;
    didMutateStrokeRef.current = true;
    lastPtRef.current = { x: pt.x, y: pt.y };
    const radiusImgPx = Math.max(2, brushSize / Math.max(0.15, zoom) / 2);
    applyMaskBrushStroke({
      current: currentBufRef.current,
      original: originalBufRef.current,
      width: imgSize.w,
      height: imgSize.h,
      x0: pt.x,
      y0: pt.y,
      x1: pt.x,
      y1: pt.y,
      radius: radiusImgPx,
      softness: softness / 100,
      mode: tool,
    });
    redrawCanvas(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const pt = getCanvasPoint(e);
    if (pt) {
      setCursorInfo({ x: pt.localX, y: pt.localY, visible: true });
    }
    if (!paintingRef.current || !pt || !currentBufRef.current || !originalBufRef.current) return;
    if (tool === "wand") return;

    const prev = lastPtRef.current ?? { x: pt.x, y: pt.y };
    const radiusImgPx = Math.max(2, brushSize / Math.max(0.15, zoom) / 2);
    applyMaskBrushStroke({
      current: currentBufRef.current,
      original: originalBufRef.current,
      width: imgSize.w,
      height: imgSize.h,
      x0: prev.x,
      y0: prev.y,
      x1: pt.x,
      y1: pt.y,
      radius: radiusImgPx,
      softness: softness / 100,
      mode: tool,
    });
    lastPtRef.current = { x: pt.x, y: pt.y };
    redrawCanvas(false);
  };

  const finishStroke = () => {
    if (!paintingRef.current) return;
    paintingRef.current = false;
    lastPtRef.current = null;
    if (didMutateStrokeRef.current && currentBufRef.current) {
      didMutateStrokeRef.current = false;
      pushSnapshot(currentBufRef.current);
    }
  };

  const handleAutoRemoveBg = async () => {
    if (!element || autoBusy) return;
    setAutoBusy(true);
    try {
      const origSrc = element.originalSrc || element.src;
      const cutoutUrl = await removeBackgroundInBrowser(origSrc, bgTolerance);
      const cutoutImg = await loadImage(cutoutUrl);
      const off = document.createElement("canvas");
      off.width = imgSize.w;
      off.height = imgSize.h;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(cutoutImg, 0, 0, imgSize.w, imgSize.h);
      const nextData = new Uint8ClampedArray(octx.getImageData(0, 0, imgSize.w, imgSize.h).data);
      currentBufRef.current = nextData;
      redrawCanvas(false);
      pushSnapshot(nextData);
    } catch {
      setError("Auto background removal failed for this image.");
    } finally {
      setAutoBusy(false);
    }
  };

  const handleResetToOriginal = () => {
    if (!originalBufRef.current) return;
    currentBufRef.current = new Uint8ClampedArray(originalBufRef.current);
    redrawCanvas(false);
    pushSnapshot(currentBufRef.current);
  };

  const handleSave = () => {
    if (!element || !canvasRef.current || !currentBufRef.current) return;
    redrawCanvas(false);
    const dataUrl = canvasRef.current.toDataURL("image/png");
    onApply(dataUrl, element.originalSrc || element.src);
    onClose();
  };

  if (!open || !element) return null;

  const backdropStyle: React.CSSProperties =
    backdrop === "dark"
      ? { background: "#0F172A" }
      : backdrop === "light"
        ? { background: "#F8FAFC" }
        : {
            backgroundColor: "#E2E8F0",
            backgroundImage:
              "linear-gradient(45deg, #CBD5E1 25%, transparent 25%), linear-gradient(-45deg, #CBD5E1 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #CBD5E1 75%), linear-gradient(-45deg, transparent 75%, #CBD5E1 75%)",
            backgroundSize: "18px 18px",
            backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0",
          };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
              <Eraser className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--fg)]">Magic Eraser & Cutout Refine</h2>
              <p className="text-[11px] text-[var(--muted)]">
                Paint to erase or restore edges, or click trapped pockets with Magic Wand · Hold Space to compare
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={undo}
              disabled={historyMeta.idx <= 0}
              title="Undo (⌘Z)"
              className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--fg)] hover:bg-[var(--surface-2)] disabled:opacity-35 cursor-pointer"
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              onClick={redo}
              disabled={historyMeta.idx >= historyMeta.len - 1}
              title="Redo (⌘⇧Z)"
              className="rounded-lg border border-[var(--border)] p-1.5 text-[var(--fg)] hover:bg-[var(--surface-2)] disabled:opacity-35 cursor-pointer"
            >
              <Redo2 className="h-4 w-4" />
            </button>
            <button
              onPointerDown={() => setPeekingOriginal(true)}
              onPointerUp={() => setPeekingOriginal(false)}
              onPointerLeave={() => setPeekingOriginal(false)}
              title="Hold to view original image (Space)"
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                peekingOriginal
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "border-[var(--border)] text-[var(--fg)] hover:bg-[var(--surface-2)]"
              }`}
            >
              <Eye className="h-3.5 w-3.5" /> Original
            </button>
            <button
              onClick={handleResetToOriginal}
              title="Reset mask to original photo"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-xs font-medium text-[var(--fg)] hover:bg-[var(--surface-2)] cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="ml-1 rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)] cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body: Left Tool Controls + Right Canvas Stage */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          {/* Tool Sidebar */}
          <div className="flex w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-[var(--border)] bg-[var(--surface)] p-4 text-xs">
            {/* Mode Switcher */}
            <div>
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--muted)]">Tool</div>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setTool("erase")}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-semibold transition cursor-pointer ${
                    tool === "erase"
                      ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                      : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <Eraser className="h-4 w-4" />
                  Erase
                </button>
                <button
                  onClick={() => setTool("restore")}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-semibold transition cursor-pointer ${
                    tool === "restore"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <Brush className="h-4 w-4" />
                  Restore
                </button>
                <button
                  onClick={() => setTool("wand")}
                  className={`flex flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-semibold transition cursor-pointer ${
                    tool === "wand"
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "border-[var(--border)] bg-[var(--surface-2)] text-[var(--fg)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <Wand2 className="h-4 w-4" />
                  Wand
                </button>
              </div>
              <p className="mt-1.5 text-[10px] leading-relaxed text-[var(--muted)]">
                {tool === "erase" && "Paint over stray edges or objects to erase them cleanly. Shortcuts: [ / ] size."}
                {tool === "restore" && "Paint back hair, details, or edges from the original photo."}
                {tool === "wand" && "Click inside any leftover background pocket to flood-erase that color region."}
              </p>
            </div>

            {/* Brush / Wand Parameters */}
            {tool !== "wand" ? (
              <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3">
                <div>
                  <div className="flex justify-between text-[11px] text-[var(--muted)]">
                    <span>Brush Size</span>
                    <span className="font-mono text-[var(--fg)]">{brushSize}px</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={140}
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="mt-1 w-full accent-[var(--accent)]"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-[var(--muted)]">
                    <span>Edge Softness</span>
                    <span className="font-mono text-[var(--fg)]">{softness}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={softness}
                    onChange={(e) => setSoftness(Number(e.target.value))}
                    className="mt-1 w-full accent-[var(--accent)]"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3">
                <div className="flex justify-between text-[11px] text-[var(--muted)]">
                  <span>Wand Tolerance</span>
                  <span className="font-mono text-[var(--fg)]">{wandTolerance}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={100}
                  value={wandTolerance}
                  onChange={(e) => setWandTolerance(Number(e.target.value))}
                  className="w-full accent-[var(--accent)]"
                />
              </div>
            )}

            {/* One-Click Auto BG Remover */}
            <div className="space-y-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)]/60 p-3">
              <div className="flex items-center justify-between font-semibold text-[var(--fg)]">
                <span className="inline-flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5 text-[var(--accent)]" /> Auto Cutout
                </span>
                <span className="font-mono text-[10px] text-[var(--muted)]">{bgTolerance}</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                value={bgTolerance}
                onChange={(e) => setBgTolerance(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
              <button
                onClick={() => void handleAutoRemoveBg()}
                disabled={autoBusy || loading}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-1.5 font-semibold text-[var(--fg)] hover:border-[var(--accent)] disabled:opacity-50 cursor-pointer"
              >
                {autoBusy ? "Removing…" : "Auto Remove Backdrop"}
              </button>
            </div>

            {/* Preview Surface */}
            <div>
              <div className="mb-1.5 text-[11px] font-semibold text-[var(--muted)]">
                Preview Backdrop
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--surface-2)] p-1">
                {(
                  [
                    { id: "checker", label: "Grid" },
                    { id: "dark", label: "Dark" },
                    { id: "light", label: "Light" },
                  ] as const
                ).map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBackdrop(b.id)}
                    className={`rounded-lg py-1 text-[11px] font-medium cursor-pointer ${
                      backdrop === b.id
                        ? "bg-[var(--surface)] text-[var(--fg)] shadow-xs"
                        : "text-[var(--muted)] hover:text-[var(--fg)]"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Stage */}
          <div
            ref={stageRef}
            onWheel={(e) => {
              if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setZoom((z) => Math.max(0.2, Math.min(3, +(z - e.deltaY * 0.002).toFixed(2))));
              }
            }}
            className="relative flex flex-1 items-center justify-center overflow-auto bg-[var(--stage)] p-6"
          >
            {loading && (
              <div className="rounded-xl bg-[var(--surface)] px-4 py-2.5 text-xs font-medium text-[var(--muted)] shadow">
                Loading full-resolution pixel editor…
              </div>
            )}
            {error && (
              <div className="max-w-sm rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-center text-xs text-rose-500">
                {error}
              </div>
            )}

            {!loading && !error && imgSize.w > 0 && (
              <div
                className="relative shrink-0 overflow-hidden rounded-lg shadow-xl ring-1 ring-black/15"
                style={{
                  width: Math.round(imgSize.w * zoom),
                  height: Math.round(imgSize.h * zoom),
                  ...backdropStyle,
                }}
              >
                <canvas
                  ref={canvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={finishStroke}
                  onPointerCancel={finishStroke}
                  onPointerLeave={() => {
                    setCursorInfo((c) => ({ ...c, visible: false }));
                  }}
                  style={{
                    width: Math.round(imgSize.w * zoom),
                    height: Math.round(imgSize.h * zoom),
                    cursor: tool === "wand" ? "crosshair" : "none",
                    touchAction: "none",
                  }}
                  className="block select-none"
                />

                {/* Live Brush Ring Cursor */}
                {cursorInfo.visible && tool !== "wand" && (
                  <div
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm"
                    style={{
                      left: cursorInfo.x,
                      top: cursorInfo.y,
                      width: Math.max(6, brushSize),
                      height: Math.max(6, brushSize),
                      borderColor: tool === "erase" ? "#F43F5E" : "#10B981",
                      backgroundColor:
                        tool === "erase" ? "rgba(244,63,94,0.14)" : "rgba(16,185,129,0.14)",
                    }}
                  />
                )}
              </div>
            )}

            {/* Floating Zoom Controls */}
            {!loading && !error && imgSize.w > 0 && (
              <div className="fixed bottom-12 right-12 flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--surface)]/95 px-2.5 py-1 text-xs shadow-lg backdrop-blur">
                <button
                  onClick={() => setZoom((z) => Math.max(0.2, +(z - 0.15).toFixed(2)))}
                  className="rounded-full p-1 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                  title="Zoom out"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-11 text-center font-mono text-[11px] font-semibold text-[var(--fg)]">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))}
                  className="rounded-full p-1 text-[var(--muted)] hover:text-[var(--fg)] cursor-pointer"
                  title="Zoom in"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3">
          <span className="text-[11px] text-[var(--muted)]">
            {imgSize.w > 0 ? `${imgSize.w} × ${imgSize.h} px` : "Preparing…"} · Non-destructive (original photo preserved)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--fg)] hover:bg-[var(--surface-2)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !!error || imgSize.w === 0}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-[var(--accent-fg)] hover:opacity-95 disabled:opacity-40 cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" /> Apply Cutout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
