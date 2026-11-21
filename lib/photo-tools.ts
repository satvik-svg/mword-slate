import type { ImageCrop } from "@/lib/types";

export async function readImageFileOptimized(
  file: File,
  maxDim = 2200,
): Promise<{ dataUrl: string; width: number; height: number; mimeType: string; sizeBytes: number }> {
  const rawUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });

  if (file.type === "image/svg+xml") {
    return {
      dataUrl: rawUrl,
      width: 512,
      height: 512,
      mimeType: file.type,
      sizeBytes: file.size,
    };
  }

  const img = await loadImage(rawUrl);
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  if (scale === 1 && file.size < 2_500_000) {
    return { dataUrl: rawUrl, width, height, mimeType: file.type || "image/png", sizeBytes: file.size };
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: rawUrl, width, height, mimeType: file.type, sizeBytes: file.size };
  ctx.drawImage(img, 0, 0, width, height);
  const outMime = file.type === "image/png" || file.type === "image/webp" ? "image/png" : "image/jpeg";
  const dataUrl = canvas.toDataURL(outMime, 0.88);
  return { dataUrl, width, height, mimeType: outMime, sizeBytes: dataUrl.length };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

/**
 * 100% browser-side edge-flood smart background remover (zero API keys).
 * Samples dense perimeter pixels, clusters dominant backdrop colors (supporting gradients
 * & slightly uneven lighting), flood-fills outward from borders with smooth cubic alpha
 * feathering, and runs a 1px edge halo decontamination pass.
 */
export async function removeBackgroundInBrowser(
  src: string,
  tolerance = 36,
): Promise<string> {
  const img = await loadImage(src);
  const maxDim = 1400;
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  // Perceptual weighted Euclidean RGB distance (normalized to 0..~441 scale)
  const colorDist = (r: number, g: number, b: number, sr: number, sg: number, sb: number) => {
    const dr = r - sr;
    const dg = g - sg;
    const db = b - sb;
    return Math.sqrt(dr * dr * 0.897 + dg * dg * 1.761 + db * db * 0.342);
  };

  // Sample perimeter densely (ignoring already-transparent pixels)
  const rawBorder: [number, number, number][] = [];
  const stepX = Math.max(1, Math.floor(w / 32));
  const stepY = Math.max(1, Math.floor(h / 32));
  const pushSample = (x: number, y: number) => {
    const idx = (y * w + x) * 4;
    if (data[idx + 3] < 20) return;
    rawBorder.push([data[idx], data[idx + 1], data[idx + 2]]);
  };
  for (let x = 0; x < w; x += stepX) {
    pushSample(x, 0);
    pushSample(x, h - 1);
  }
  for (let y = 0; y < h; y += stepY) {
    pushSample(0, y);
    pushSample(w - 1, y);
  }
  if (rawBorder.length === 0) return src;

  // Cluster border pixels into dominant backdrop centroids (ignores small foreground intrusions at an edge)
  type Cluster = { r: number; g: number; b: number; count: number };
  const clusters: Cluster[] = [];
  const mergeThreshold = Math.max(22, tolerance * 0.72);
  for (const [r, g, b] of rawBorder) {
    let best: Cluster | null = null;
    let bestDist = Infinity;
    for (const c of clusters) {
      const d = colorDist(r, g, b, c.r, c.g, c.b);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    if (best && bestDist <= mergeThreshold) {
      const n = best.count + 1;
      best.r = (best.r * best.count + r) / n;
      best.g = (best.g * best.count + g) / n;
      best.b = (best.b * best.count + b) / n;
      best.count = n;
    } else {
      clusters.push({ r, g, b, count: 1 });
    }
  }

  clusters.sort((a, b) => b.count - a.count);
  const minClusterSupport = Math.max(2, Math.floor(rawBorder.length * 0.08));
  const bgClusters = clusters.filter((c) => c.count >= minClusterSupport).slice(0, 5);
  const samples = (bgClusters.length > 0 ? bgClusters : clusters.slice(0, 2)).map(
    (c) => [c.r, c.g, c.b] as [number, number, number],
  );

  const minSampleDist = (idx: number) => {
    if (data[idx + 3] < 10) return 0;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    let best = 999;
    for (const [sr, sg, sb] of samples) {
      const d = colorDist(r, g, b, sr, sg, sb);
      if (d < best) best = d;
    }
    return best;
  };

  const featherLimit = tolerance * 1.65;
  const visited = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;

  const pushIfBg = (x: number, y: number) => {
    const pos = y * w + x;
    if (visited[pos]) return;
    const dist = minSampleDist(pos * 4);
    if (dist <= featherLimit) {
      visited[pos] = 1;
      stack[sp++] = pos;
    }
  };

  for (let x = 0; x < w; x++) {
    pushIfBg(x, 0);
    pushIfBg(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    pushIfBg(0, y);
    pushIfBg(w - 1, y);
  }

  while (sp > 0) {
    const pos = stack[--sp];
    const x = pos % w;
    const y = (pos - x) / w;
    const idx = pos * 4;
    const dist = minSampleDist(idx);

    if (dist <= tolerance) {
      data[idx + 3] = 0;
    } else {
      // Smoothstep cubic alpha feathering near boundary
      const t = Math.min(1, Math.max(0, (dist - tolerance) / Math.max(1, featherLimit - tolerance)));
      const smooth = t * t * (3 - 2 * t);
      data[idx + 3] = Math.round(data[idx + 3] * smooth);
    }

    // Only keep flood-filling through confident background pixels so feather fringe stops cleanly
    if (dist <= tolerance * 1.25) {
      if (x > 0) pushIfBg(x - 1, y);
      if (x < w - 1) pushIfBg(x + 1, y);
      if (y > 0) pushIfBg(x, y - 1);
      if (y < h - 1) pushIfBg(x, y + 1);
    }
  }

  // Edge halo softening: gently feather opaque foreground pixels immediately bordering cleared background
  // whose color still leans close to the backdrop
  const alphaCopy = new Uint8ClampedArray(w * h);
  for (let i = 0; i < w * h; i++) alphaCopy[i] = data[i * 4 + 3];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const pos = y * w + x;
      const a = alphaCopy[pos];
      if (a < 180) continue;
      const hasClearedNeighbor =
        alphaCopy[pos - 1] < 30 ||
        alphaCopy[pos + 1] < 30 ||
        alphaCopy[pos - w] < 30 ||
        alphaCopy[pos + w] < 30;
      if (!hasClearedNeighbor) continue;
      const dist = minSampleDist(pos * 4);
      if (dist < featherLimit * 1.25) {
        const ratio = Math.min(1, Math.max(0.25, (dist - tolerance * 0.6) / Math.max(1, featherLimit * 0.65)));
        data[pos * 4 + 3] = Math.round(a * ratio);
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

export async function applyCropToImage(src: string, crop: ImageCrop): Promise<string> {
  const img = await loadImage(src);
  const sx = Math.round((crop.x / 100) * img.naturalWidth);
  const sy = Math.round((crop.y / 100) * img.naturalHeight);
  const sw = Math.max(1, Math.round((crop.width / 100) * img.naturalWidth));
  const sh = Math.max(1, Math.round((crop.height / 100) * img.naturalHeight));

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL("image/png");
}

/**
 * Applies a smooth circular erase or restore brush stroke along the segment (x0, y0) -> (x1, y1)
 * directly on RGBA pixel buffers. Softness in [0, 1] controls radial edge feathering.
 */
export function applyMaskBrushStroke(params: {
  current: Uint8ClampedArray;
  original: Uint8ClampedArray;
  width: number;
  height: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  radius: number;
  softness?: number;
  mode: "erase" | "restore";
}): void {
  const { current, original, width, height, x0, y0, x1, y1, mode } = params;
  const radius = Math.max(1, params.radius);
  const softness = Math.max(0, Math.min(1, params.softness ?? 0.35));

  const dist = Math.hypot(x1 - x0, y1 - y0);
  const step = Math.max(1, radius * 0.25);
  const steps = Math.max(1, Math.ceil(dist / step));
  const innerR = radius * (1 - softness);
  const featherSpan = Math.max(0.0001, radius - innerR);

  for (let s = 0; s <= steps; s++) {
    const t = steps === 0 ? 1 : s / steps;
    const cx = x0 + (x1 - x0) * t;
    const cy = y0 + (y1 - y0) * t;
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(height - 1, Math.ceil(cy + radius));

    for (let y = minY; y <= maxY; y++) {
      const dy = y - cy;
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const d = Math.hypot(dx, dy);
        if (d > radius) continue;

        let strength = 1;
        if (softness > 0 && d > innerR) {
          const u = Math.min(1, Math.max(0, (d - innerR) / featherSpan));
          // Smoothstep falloff: 1 at innerR, 0 at radius
          strength = 1 - u * u * (3 - 2 * u);
        }

        const idx = (y * width + x) * 4;
        if (mode === "erase") {
          const targetAlpha = Math.round(current[idx + 3] * (1 - strength));
          if (targetAlpha < current[idx + 3]) {
            current[idx + 3] = targetAlpha;
          }
        } else {
          const origA = original[idx + 3];
          const nextA = Math.round(current[idx + 3] + (origA - current[idx + 3]) * strength);
          current[idx] = original[idx];
          current[idx + 1] = original[idx + 1];
          current[idx + 2] = original[idx + 2];
          current[idx + 3] = Math.min(origA, Math.max(current[idx + 3], nextA));
        }
      }
    }
  }
}

/**
 * Flood-erases a contiguous region starting at (startX, startY) whose perceptual RGB
 * color is within `tolerance` of the seed pixel — ideal for removing trapped interior
 * background pockets (e.g. inside handles or between arms).
 */
export function applyMagicWandErase(params: {
  current: Uint8ClampedArray;
  width: number;
  height: number;
  startX: number;
  startY: number;
  tolerance?: number;
}): number {
  const { current, width, height } = params;
  const sx = Math.floor(params.startX);
  const sy = Math.floor(params.startY);
  if (sx < 0 || sx >= width || sy < 0 || sy >= height) return 0;

  const seedIdx = (sy * width + sx) * 4;
  if (current[seedIdx + 3] < 10) return 0;

  const sr = current[seedIdx];
  const sg = current[seedIdx + 1];
  const sb = current[seedIdx + 2];
  const tolerance = Math.max(5, Math.min(140, params.tolerance ?? 32));
  const featherLimit = tolerance * 1.45;

  const colorDist = (idx: number) => {
    const dr = current[idx] - sr;
    const dg = current[idx + 1] - sg;
    const db = current[idx + 2] - sb;
    return Math.sqrt(dr * dr * 0.897 + dg * dg * 1.761 + db * db * 0.342);
  };

  const visited = new Uint8Array(width * height);
  const stack = new Int32Array(width * height);
  let sp = 0;
  const startPos = sy * width + sx;
  visited[startPos] = 1;
  stack[sp++] = startPos;

  let erased = 0;
  while (sp > 0) {
    const pos = stack[--sp];
    const x = pos % width;
    const y = (pos - x) / width;
    const idx = pos * 4;
    if (current[idx + 3] < 10) continue;

    const dist = colorDist(idx);
    if (dist <= tolerance) {
      current[idx + 3] = 0;
      erased += 1;
    } else if (dist <= featherLimit) {
      const t = (dist - tolerance) / Math.max(1, featherLimit - tolerance);
      const smooth = t * t * (3 - 2 * t);
      current[idx + 3] = Math.round(current[idx + 3] * smooth);
      erased += 1;
    }

    if (dist <= tolerance * 1.15) {
      const tryPush = (nx: number, ny: number) => {
        const npos = ny * width + nx;
        if (visited[npos]) return;
        const nidx = npos * 4;
        if (current[nidx + 3] < 10) return;
        if (colorDist(nidx) <= featherLimit) {
          visited[npos] = 1;
          stack[sp++] = npos;
        }
      };
      if (x > 0) tryPush(x - 1, y);
      if (x < width - 1) tryPush(x + 1, y);
      if (y > 0) tryPush(x, y - 1);
      if (y < height - 1) tryPush(x, y + 1);
    }
  }

  return erased;
}

/**
 * Downscales a fetched stock image dataUrl to a crisp canvas-friendly resolution so it
 * stays fast in SQLite/DO storage and never taints Canvas/PDF/PPTX exports.
 */
export async function optimizeDataUrlImage(
  rawDataUrl: string,
  maxDim = 1800,
): Promise<{ dataUrl: string; width: number; height: number; mimeType: string }> {
  const img = await loadImage(rawDataUrl);
  const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: rawDataUrl, width, height, mimeType: "image/jpeg" };
  ctx.drawImage(img, 0, 0, width, height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.86);
  return { dataUrl, width, height, mimeType: "image/jpeg" };
}

