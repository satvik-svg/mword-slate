import JSZip from "jszip";
import { makeId } from "@/lib/id";
import {
  DEFAULT_IMAGE_FILTERS,
  type CanvasElement,
  type DesignPage,
  type ShapeKind,
  type TableElement,
  type TextElement,
} from "@/lib/types";

const EMU_PER_INCH = 914400;
const REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

// Lightweight XML tree abstraction so PPTX import works identically in browsers (DOMParser)
// and in Node.js unit tests (pure-TS fallback XML parser).
type XmlNode = {
  localName: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
};

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&");
}

function domElementToXmlNode(el: Element): XmlNode {
  const attrs: Record<string, string> = {};
  for (let i = 0; i < el.attributes.length; i++) {
    const a = el.attributes[i];
    attrs[a.name] = a.value;
    if (a.localName && a.localName !== a.name && !(a.localName in attrs)) {
      attrs[a.localName] = a.value;
    }
  }
  const children: XmlNode[] = [];
  let text = "";
  for (let i = 0; i < el.childNodes.length; i++) {
    const child = el.childNodes[i];
    if (child.nodeType === 1) {
      children.push(domElementToXmlNode(child as Element));
    } else if (child.nodeType === 3 || child.nodeType === 4) {
      text += child.nodeValue ?? "";
    }
  }
  return { localName: el.localName, attrs, children, text };
}

function parseXmlFallback(xmlStr: string): XmlNode {
  const root: XmlNode = { localName: "#root", attrs: {}, children: [], text: "" };
  const stack: XmlNode[] = [root];
  const tokenRe = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<!DOCTYPE[^>]*>|<(\/?)([A-Za-z0-9_.:-]+)((?:\s+[^<>]*?)?)\s*(\/?)>|([^<]+)/g;
  let match: RegExpExecArray | null;

  while ((match = tokenRe.exec(xmlStr)) !== null) {
    const [, cdata, closing, rawName, rawAttrs, selfClosing, textChunk] = match;
    const parent = stack[stack.length - 1];
    if (cdata !== undefined) {
      parent.text += cdata;
      continue;
    }
    if (textChunk !== undefined) {
      if (parent.children.length === 0 || textChunk.trim().length > 0 || textChunk.includes(" ")) {
        parent.text += decodeXmlEntities(textChunk);
      }
      continue;
    }
    if (!rawName) continue;
    const localName = rawName.includes(":") ? rawName.split(":").pop()! : rawName;
    if (closing === "/") {
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].localName === localName) {
          stack.length = i;
          break;
        }
      }
      continue;
    }
    const attrs: Record<string, string> = {};
    if (rawAttrs) {
      const attrRe = /([A-Za-z0-9_.:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let am: RegExpExecArray | null;
      while ((am = attrRe.exec(rawAttrs)) !== null) {
        const val = decodeXmlEntities(am[2] ?? am[3] ?? "");
        attrs[am[1]] = val;
        const localAttr = am[1].includes(":") ? am[1].split(":").pop()! : am[1];
        if (!(localAttr in attrs)) attrs[localAttr] = val;
      }
    }
    const node: XmlNode = { localName, attrs, children: [], text: "" };
    parent.children.push(node);
    if (selfClosing !== "/") {
      stack.push(node);
    }
  }
  return root.children[0] ?? root;
}

function parseXml(xmlStr: string): XmlNode {
  if (typeof DOMParser !== "undefined") {
    const doc = new DOMParser().parseFromString(xmlStr, "application/xml");
    if (doc.documentElement) {
      return domElementToXmlNode(doc.documentElement);
    }
  }
  return parseXmlFallback(xmlStr);
}

function getAttr(node: XmlNode | null | undefined, name: string): string | undefined {
  if (!node) return undefined;
  return node.attrs[name];
}

function directChild(node: XmlNode | null | undefined, localName: string): XmlNode | null {
  if (!node) return null;
  for (const c of node.children) {
    if (c.localName === localName) return c;
  }
  return null;
}

function directChildren(node: XmlNode | null | undefined, localName: string): XmlNode[] {
  if (!node) return [];
  return node.children.filter((c) => c.localName === localName);
}

function firstDescendant(node: XmlNode | null | undefined, localName: string): XmlNode | null {
  if (!node) return null;
  for (const c of node.children) {
    if (c.localName === localName) return c;
    const found = firstDescendant(c, localName);
    if (found) return found;
  }
  return null;
}

function allDescendants(node: XmlNode | null | undefined, localName: string, out: XmlNode[] = []): XmlNode[] {
  if (!node) return out;
  for (const c of node.children) {
    if (c.localName === localName) out.push(c);
    allDescendants(c, localName, out);
  }
  return out;
}

function resolveRelPath(baseFilePath: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const baseParts = baseFilePath.split("/");
  baseParts.pop(); // remove filename
  for (const seg of target.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") baseParts.pop();
    else baseParts.push(seg);
  }
  return baseParts.join("/");
}

function relsPathFor(filePath: string): string {
  const idx = filePath.lastIndexOf("/");
  if (idx === -1) return `_rels/${filePath}.rels`;
  return `${filePath.slice(0, idx)}/_rels/${filePath.slice(idx + 1)}.rels`;
}

type RelEntry = { id: string; type: string; target: string };

async function loadRels(zip: JSZip, filePath: string): Promise<Map<string, RelEntry>> {
  const map = new Map<string, RelEntry>();
  const xml = await zip.file(relsPathFor(filePath))?.async("string");
  if (!xml) return map;
  const doc = parseXml(xml);
  for (const rel of allDescendants(doc, "Relationship")) {
    const id = getAttr(rel, "Id");
    const target = getAttr(rel, "Target");
    const type = getAttr(rel, "Type") ?? "";
    if (id && target) {
      map.set(id, { id, type, target });
    }
  }
  return map;
}

// Color helpers (srgbClr, sysClr, schemeClr + lumMod/lumOff/tint/shade/alpha)
type ThemeColors = Record<string, string>;

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [clampByte(r), clampByte(g), clampByte(b)]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

function applyColorModifiers(hex: string, colorNode: XmlNode): { color: string; opacity: number } {
  let [r, g, b] = hexToRgb(hex);
  let opacity = 1;

  const alpha = directChild(colorNode, "alpha");
  if (alpha) {
    const v = Number(getAttr(alpha, "val"));
    if (!Number.isNaN(v)) opacity = Math.max(0, Math.min(1, v / 100000));
  }

  const tint = directChild(colorNode, "tint");
  if (tint) {
    const t = Number(getAttr(tint, "val")) / 100000;
    if (!Number.isNaN(t)) {
      r = r * t + 255 * (1 - t);
      g = g * t + 255 * (1 - t);
      b = b * t + 255 * (1 - t);
    }
  }

  const shade = directChild(colorNode, "shade");
  if (shade) {
    const s = Number(getAttr(shade, "val")) / 100000;
    if (!Number.isNaN(s)) {
      r *= s;
      g *= s;
      b *= s;
    }
  }

  const lumMod = directChild(colorNode, "lumMod");
  const lumOff = directChild(colorNode, "lumOff");
  if (lumMod || lumOff) {
    const mod = lumMod ? Number(getAttr(lumMod, "val")) / 100000 : 1;
    const off = lumOff ? Number(getAttr(lumOff, "val")) / 100000 : 0;
    // Approximate luminance transform in RGB space
    r = r * mod + 255 * off;
    g = g * mod + 255 * off;
    b = b * mod + 255 * off;
  }

  return { color: rgbToHex(r, g, b), opacity };
}

function extractColorInfo(
  node: XmlNode | null | undefined,
  themeColors: ThemeColors,
): { color: string; opacity: number } | null {
  if (!node) return null;

  const srgb = firstDescendant(node, "srgbClr");
  if (srgb) {
    const val = getAttr(srgb, "val");
    if (val && /^[0-9a-fA-F]{6}$/.test(val)) {
      return applyColorModifiers(`#${val.toUpperCase()}`, srgb);
    }
  }

  const scheme = firstDescendant(node, "schemeClr");
  if (scheme) {
    const val = getAttr(scheme, "val");
    if (val && themeColors[val]) {
      return applyColorModifiers(themeColors[val], scheme);
    }
  }

  const sys = firstDescendant(node, "sysClr");
  if (sys) {
    const last = getAttr(sys, "lastClr");
    if (last && /^[0-9a-fA-F]{6}$/.test(last)) {
      return applyColorModifiers(`#${last.toUpperCase()}`, sys);
    }
  }

  return null;
}

async function loadThemeColors(zip: JSZip): Promise<ThemeColors> {
  const defaults: ThemeColors = {
    dk1: "#111114",
    lt1: "#FFFFFF",
    dk2: "#334155",
    lt2: "#F1F5F9",
    accent1: "#2563EB",
    accent2: "#0EA5E9",
    accent3: "#10B981",
    accent4: "#F59E0B",
    accent5: "#EF4444",
    accent6: "#8B5CF6",
    tx1: "#111114",
    tx2: "#334155",
    bg1: "#FFFFFF",
    bg2: "#F1F5F9",
  };

  const themeFile = Object.keys(zip.files).find((n) => /^ppt\/theme\/theme\d+\.xml$/i.test(n));
  if (!themeFile) return defaults;
  const xml = await zip.file(themeFile)?.async("string");
  if (!xml) return defaults;
  const doc = parseXml(xml);
  const clrScheme = firstDescendant(doc, "clrScheme");
  if (!clrScheme) return defaults;

  for (const child of clrScheme.children) {
    const srgb = firstDescendant(child, "srgbClr");
    const sys = firstDescendant(child, "sysClr");
    const val = getAttr(srgb, "val") ?? getAttr(sys, "lastClr");
    if (val && /^[0-9a-fA-F]{6}$/.test(val)) {
      defaults[child.localName] = `#${val.toUpperCase()}`;
    }
  }
  defaults.tx1 = defaults.dk1;
  defaults.tx2 = defaults.dk2;
  defaults.bg1 = defaults.lt1;
  defaults.bg2 = defaults.lt2;
  return defaults;
}

function mimeFromExt(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  if (ext === "svg") return "image/svg+xml";
  return "image/png";
}

async function compressDataUrlInBrowser(dataUrl: string, mime: string): Promise<string> {
  if (typeof document === "undefined" || typeof Image === "undefined") return dataUrl;
  // Only compress large raster images so Durable Object SQLite stays fast & well under 2 MB
  if (mime === "image/svg+xml" || mime === "image/gif" || dataUrl.length < 220_000) {
    return dataUrl;
  }
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = dataUrl;
    });
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const w = Math.max(1, Math.round((img.naturalWidth || 1) * scale));
    const h = Math.max(1, Math.round((img.naturalHeight || 1) * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    const outMime = mime === "image/jpeg" ? "image/jpeg" : "image/webp";
    const compressed = canvas.toDataURL(outMime, 0.82);
    return compressed.length < dataUrl.length ? compressed : dataUrl;
  } catch {
    return dataUrl;
  }
}

function normalizeFontFamilyAndWeight(rawFont: string | undefined): {
  family: string;
  inferredWeight: number | null;
} {
  if (!rawFont || rawFont.startsWith("+")) {
    return { family: "Inter", inferredWeight: null };
  }
  const trimmed = rawFont.trim();
  const patterns: [RegExp, number][] = [
    [/\s+(Extra\s*Bold|Ultra\s*Bold|Black|Heavy)$/i, 800],
    [/\s+Bold$/i, 700],
    [/\s+(Semi\s*Bold|Demi\s*Bold)$/i, 600],
    [/\s+Medium$/i, 500],
    [/\s+(Regular|Normal|Book)$/i, 400],
    [/\s+(Light|Thin|Extra\s*Light)$/i, 300],
  ];
  for (const [re, weight] of patterns) {
    if (re.test(trimmed)) {
      return { family: trimmed.replace(re, "").trim() || "Inter", inferredWeight: weight };
    }
  }
  return { family: trimmed, inferredWeight: null };
}

function mapPresetShape(prst: string): ShapeKind {
  switch (prst) {
    case "ellipse":
    case "oval":
      return "circle";
    case "triangle":
    case "rtTriangle":
      return "triangle";
    case "diamond":
      return "diamond";
    case "pentagon":
      return "pentagon";
    case "hexagon":
      return "hexagon";
    case "star4":
    case "star5":
    case "star6":
      return "star";
    case "rightArrow":
    case "leftArrow":
      return "arrow";
    case "line":
    case "straightConnector1":
      return "line";
    default:
      return "rect";
  }
}

type TransformContext = {
  // Maps local EMU coords to canvas px
  mapX: (emuX: number) => number;
  mapY: (emuY: number) => number;
  scaleX: number;
  scaleY: number;
};

function parseXfrm(node: XmlNode, ctx: TransformContext) {
  const xfrm = directChild(directChild(node, "spPr"), "xfrm") ?? directChild(node, "xfrm");
  const off = directChild(xfrm, "off");
  const ext = directChild(xfrm, "ext");
  if (!off || !ext) return null;
  const rawX = Number(getAttr(off, "x") ?? 0) || 0;
  const rawY = Number(getAttr(off, "y") ?? 0) || 0;
  const rawCx = Number(getAttr(ext, "cx") ?? 0) || 0;
  const rawCy = Number(getAttr(ext, "cy") ?? 0) || 0;
  const rotAttr = Number(getAttr(xfrm, "rot") ?? 0);
  const rotation = rotAttr ? Math.round(rotAttr / 60000) : 0;
  const flipX = getAttr(xfrm, "flipH") === "1";
  const flipY = getAttr(xfrm, "flipV") === "1";

  return {
    x: Math.round(ctx.mapX(rawX)),
    y: Math.round(ctx.mapY(rawY)),
    w: Math.max(1, Math.round(rawCx * ctx.scaleX)),
    h: Math.max(1, Math.round(rawCy * ctx.scaleY)),
    rawX,
    rawY,
    rawCx,
    rawCy,
    rotation,
    flipX,
    flipY,
  };
}

function getBlipEmbedId(node: XmlNode): string | undefined {
  const blip = firstDescendant(node, "blip");
  if (!blip) return undefined;
  return getAttr(blip, "r:embed") ?? getAttr(blip, "embed") ?? getAttr(blip, `${REL_NS}:embed`);
}

function isPlaceholderShape(node: XmlNode): boolean {
  const nv =
    directChild(node, "nvSpPr") ??
    directChild(node, "nvPicPr") ??
    directChild(node, "nvGraphicFramePr");
  const nvPr = directChild(nv, "nvPr");
  return !!directChild(nvPr, "ph");
}

function extractNodeName(node: XmlNode, fallback: string): string {
  const cNvPr = firstDescendant(node, "cNvPr");
  return getAttr(cNvPr, "name") || fallback;
}

function extractGradFill(
  gradNode: XmlNode | null,
  themeColors: ThemeColors,
): { from: string; to?: string; angle: number; opacity: number } | null {
  if (!gradNode) return null;
  const stops = allDescendants(gradNode, "gs");
  if (stops.length === 0) return null;
  const first = extractColorInfo(stops[0], themeColors);
  const last = extractColorInfo(stops[stops.length - 1], themeColors);
  if (!first) return null;
  const lin = firstDescendant(gradNode, "lin");
  const angAttr = Number(getAttr(lin, "ang") ?? 0);
  // PowerPoint lin ang is clockwise from +X in 60000ths of a degree; CSS is clockwise from -Y
  const angle = lin ? Math.round(((angAttr / 60000) + 90) % 360) : 135;
  return {
    from: first.color,
    to: last && last.color !== first.color ? last.color : undefined,
    angle,
    opacity: first.opacity,
  };
}

function extractTableElement(
  gfNode: XmlNode,
  ctx: TransformContext,
  ptToPx: number,
  themeColors: ThemeColors,
): TableElement | null {
  const tbl = firstDescendant(gfNode, "tbl");
  if (!tbl) return null;
  const box = parseXfrm(gfNode, ctx);
  if (!box) return null;

  const trs = directChildren(tbl, "tr");
  if (trs.length === 0) return null;

  const rows: string[][] = [];
  let headerBg = "#F1F5F9";
  let headerColor = "#111114";
  let cellBg = "#FFFFFF";
  let cellColor = "#111114";
  let borderColor = "#D4D4D8";
  let fontSize = Math.round(14 * ptToPx);
  let fontFamily = "Inter";
  let totalRowHeightEmu = 0;

  trs.forEach((tr, rowIdx) => {
    const rowH = Number(getAttr(tr, "h") ?? 0);
    if (rowH > 0) totalRowHeightEmu += rowH;
    const tcs = directChildren(tr, "tc");
    const rowCells: string[] = [];
    tcs.forEach((tc, colIdx) => {
      const txBody = directChild(tc, "txBody");
      const paragraphs = directChildren(txBody, "p");
      const cellLines: string[] = [];
      for (const p of paragraphs) {
        let line = "";
        for (const r of directChildren(p, "r")) {
          const rPr = directChild(r, "rPr");
          if (rPr) {
            const sz = Number(getAttr(rPr, "sz"));
            if (sz > 0 && rowIdx === 0 && colIdx === 0) {
              fontSize = Math.max(12, Math.round((sz / 100) * ptToPx));
            }
            const latin = directChild(rPr, "latin");
            if (latin && rowIdx === 0 && colIdx === 0) {
              fontFamily = normalizeFontFamilyAndWeight(getAttr(latin, "typeface")).family;
            }
            const col = extractColorInfo(directChild(rPr, "solidFill"), themeColors);
            if (col) {
              if (rowIdx === 0 && colIdx === 0) headerColor = col.color;
              else if (rowIdx === 1 && colIdx === 0) cellColor = col.color;
            }
          }
          const t = directChild(r, "t");
          if (t?.text) line += t.text;
        }
        cellLines.push(line);
      }
      rowCells.push(cellLines.join("\n").trim());

      const tcPr = directChild(tc, "tcPr");
      if (tcPr) {
        const fill = extractColorInfo(directChild(tcPr, "solidFill"), themeColors);
        if (fill) {
          if (rowIdx === 0 && colIdx === 0) headerBg = fill.color;
          else if (rowIdx === 1 && colIdx === 0) cellBg = fill.color;
        }
        const lnB = directChild(tcPr, "lnB") ?? directChild(tcPr, "lnL");
        const borderCol = extractColorInfo(directChild(lnB, "solidFill"), themeColors);
        if (borderCol && rowIdx === 0 && colIdx === 0) borderColor = borderCol.color;
      }
    });
    rows.push(rowCells);
  });

  const computedH = Math.max(box.h, Math.round(totalRowHeightEmu * ctx.scaleY));
  return {
    id: makeId("el"),
    type: "table",
    name: extractNodeName(gfNode, "Table"),
    x: box.x,
    y: box.y,
    width: Math.max(120, box.w),
    height: Math.max(80, computedH),
    rotation: box.rotation,
    opacity: 1,
    rows,
    headerBg,
    headerColor,
    cellBg,
    cellColor,
    borderColor,
    fontSize: Math.min(48, Math.max(12, fontSize)),
    fontFamily,
  };
}

export async function importPptxBuffer(
  input: ArrayBuffer | Uint8Array | Blob | File,
  fileName = "Imported Presentation.pptx",
): Promise<{
  title: string;
  width: number;
  height: number;
  pages: DesignPage[];
}> {
  const zip = await JSZip.loadAsync(input);
  const themeColors = await loadThemeColors(zip);

  // Read presentation slide dimensions
  let slideCx = 12192000; // 16:9 default (13.333 in)
  let slideCy = 6858000; // 7.5 in
  const presXml = await zip.file("ppt/presentation.xml")?.async("string");
  if (presXml) {
    const doc = parseXml(presXml);
    const sldSz = firstDescendant(doc, "sldSz");
    if (sldSz) {
      const cx = Number(getAttr(sldSz, "cx"));
      const cy = Number(getAttr(sldSz, "cy"));
      if (cx > 0 && cy > 0) {
