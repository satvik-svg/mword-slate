import type { CustomFontItem } from "@/lib/types";

const loadedFontIds = new Set<string>();
const loadedGoogleFamilies = new Set<string>();

export function cleanFontNameFromFile(fileName: string): string {
  const base = fileName.replace(/\.(ttf|otf|woff2?|eot)$/i, "");
  const cleaned = base
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/["'\\<>]/g, "")
    .trim();
  return cleaned || "Custom Font";
}

export function fontFormatFromFile(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (ext === "woff2") return "woff2";
  if (ext === "woff") return "woff";
  if (ext === "otf") return "opentype";
  return "truetype";
}

export function googleFontStylesheetUrl(family: string): string {
  const encoded = encodeURIComponent(family.trim()).replace(/%20/g, "+");
  return `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,400;0,500;0,600;0,700;1,400;1,700&display=swap`;
}

export async function loadCustomFont(font: CustomFontItem): Promise<boolean> {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  if (font.source === "upload" && font.dataUrl) {
    const key = `upload:${font.id}:${font.name}`;
    if (loadedFontIds.has(key)) return true;
    try {
      const face = new FontFace(font.name, `url(${font.dataUrl})`);
      const loaded = await face.load();
      document.fonts.add(loaded);
      loadedFontIds.add(key);
      return true;
    } catch {
      return false;
    }
  }

  if (font.source === "google") {
    const family = font.name.trim();
    if (!family) return false;
    const key = family.toLowerCase();
    if (loadedGoogleFamilies.has(key)) return true;

    const url = googleFontStylesheetUrl(family);
    try {
      const probe = await fetch(url, { method: "GET" });
      if (!probe.ok) return false;
    } catch {
      // If CORS/network probe fails, still attempt stylesheet injection
    }

    const linkId = `slate-gfont-${key.replace(/[^a-z0-9]+/g, "-")}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = url;
      document.head.appendChild(link);
    }

    try {
      await document.fonts.load(`400 16px "${family}"`);
    } catch {
      // ignore load timing errors
    }
    loadedGoogleFamilies.add(key);
    return true;
  }

  return false;
}

export async function syncCustomFonts(fonts?: CustomFontItem[]): Promise<void> {
  if (!fonts?.length) return;
  await Promise.all(fonts.map((f) => loadCustomFont(f)));
}

export function readFontFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read font file"));
    reader.readAsDataURL(file);
  });
}
