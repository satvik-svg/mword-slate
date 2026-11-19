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
 * Samples border pixels to detect background color and flood-fills outward from edges
 * with smooth alpha feathering so logos, products, and studio photos cut out cleanly.
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

  // Collect corner/edge color samples
  const samplePoints: [number, number][] = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [Math.floor(w / 2), 0],
    [Math.floor(w / 2), h - 1],
    [0, Math.floor(h / 2)],
    [w - 1, Math.floor(h / 2)],
  ];
  const samples = samplePoints.map(([sx, sy]) => {
    const idx = (sy * w + sx) * 4;
    return [data[idx], data[idx + 1], data[idx + 2]] as [number, number, number];
  });

  const colorDist = (r: number, g: number, b: number, sr: number, sg: number, sb: number) =>
    Math.sqrt((r - sr) ** 2 + (g - sg) ** 2 + (b - sb) ** 2);

  const minSampleDist = (idx: number) => {
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

  const visited = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;

  const pushIfBg = (x: number, y: number) => {
    const pos = y * w + x;
    if (visited[pos]) return;
    const dist = minSampleDist(pos * 4);
    if (dist <= tolerance * 1.45) {
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
      // Soft feather near threshold
      const ratio = (dist - tolerance) / Math.max(1, tolerance * 0.45);
      data[idx + 3] = Math.round(data[idx + 3] * Math.min(1, Math.max(0, ratio)));
    }

    if (x > 0) pushIfBg(x - 1, y);
    if (x < w - 1) pushIfBg(x + 1, y);
    if (y > 0) pushIfBg(x, y - 1);
    if (y < h - 1) pushIfBg(x, y + 1);
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
