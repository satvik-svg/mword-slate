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
